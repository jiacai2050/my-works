# 数据库架构

本项目使用 **Cloudflare D1**（基于 SQLite）来存储文件元数据和内容。

## 模式概览

数据库包含一个单表 `files`，使用层级结构（邻接列表模型）来表示文件系统树。

### 表结构：`files`

| 列名           | 类型        | 约束                              | 描述                                               |
| :------------- | :---------- | :-------------------------------- | :------------------------------------------------- |
| `id`           | `INTEGER`   | `PRIMARY KEY AUTOINCREMENT`       | 文件或目录的唯一标识符。                           |
| `name`         | `TEXT`      | `NOT NULL`                        | 文件或目录的名称。                                 |
| `parent_id`    | `INTEGER`   | `FOREIGN KEY`                     | 引用父目录的 `id`。根目录为 `NULL`。               |
| `path`         | `TEXT`      | `NOT NULL UNIQUE`                 | 完整路径（例如 `/docs/notes.txt`）。用于快速查找。 |
| `is_directory` | `BOOLEAN`   | `NOT NULL DEFAULT 0`              | `1` 表示目录，`0` 表示文件。                       |
| `content`      | `BLOB`      | -                                 | 文件的二进制内容。目录为 `NULL`。                  |
| `size`         | `INTEGER`   | `DEFAULT 0`                       | 文件大小（字节）。                                 |
| `mime_type`    | `TEXT`      | `默认 'application/octet-stream'` | 文件的 MIME 类型。                                 |
| `etag`         | `TEXT`      | -                                 | 用于缓存验证的实体标签。                           |
| `created_at`   | `TIMESTAMP` | `DEFAULT CURRENT_TIMESTAMP`       | 创建时间戳。                                       |
| `modified_at`  | `TIMESTAMP` | `DEFAULT CURRENT_TIMESTAMP`       | 最后修改时间戳。                                   |

### 关系与索引

- **外键**: `parent_id` 引用 `files(id)` 并设置了 `ON DELETE CASCADE`。这确保了当删除一个目录时，其所有子项（文件和子目录）会被数据库引擎自动删除。
- **唯一索引 `idx_path`**: 确保系统中的文件路径是唯一的。
- **索引 `idx_parent_id`**: 优化列出目录内容（`PROPFIND`）的查询性能。
- **唯一索引 `idx_name_parent`**: 确保同一目录下不能有两个同名文件。

## 关键操作

### 路径解析

虽然采用了层级结构（`parent_id`），但我们为每条记录存储了完整的 `path`，以便在通过 URL 访问文件时实现 O(1) 的查找速度。

### 目录列表

列出目录内容只需一个简单的查询：

```sql
SELECT * FROM files WHERE parent_id = ? ORDER BY is_directory DESC, name ASC
```

### 移动/重命名

移动文件涉及更新其 `parent_id`、`name` 和 `path`。
**注意**: 如果移动的是目录，必须递归更新所有子项的 `path` 字段以反映新位置。

### 初始化

如果数据库中不存在根目录（`/`），系统会自动进行初始化。

## WebDAV 实现细节

核心逻辑分布在 `src/handlers.ts` 和 `src/db.ts` 中。

| 方法         | 处理函数         | 实现逻辑                                                                                                                                                                                                                                            |
| :----------- | :--------------- | :-------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **OPTIONS**  | `handleOptions`  | 返回标准的 WebDAV 响应头 (`DAV`, `Allow`)，告知客户端支持的功能。                                                                                                                                                                                   |
| **PROPFIND** | `handlePropfind` | 检索文件属性。<br> - **Depth 0**: 仅返回指定文件/目录的属性。<br> - **Depth 1**: 如果是目录，还会使用 `listDirectory` 列出直接子项。<br> - 生成符合 RFC 4918 标准的 XML 响应。                                                                      |
| **GET**      | `handleGet`      | - **文件**: 返回带有正确 MIME 类型的文件内容 (`BLOB`)。<br> - **目录**: <br> &nbsp;&nbsp; - 如果 `Accept: application/json`: 返回子项的 JSON 数组。<br> &nbsp;&nbsp; - 否则: 渲染一个简单的 HTML 索引页面。                                         |
| **HEAD**     | `handleHead`     | 与 `GET` 相同但不返回 Body。用于检查存在性和元数据。                                                                                                                                                                                                |
| **PUT**      | `handlePut`      | 创建或更新文件。<br> - 如果文件存在: 更新内容、大小和修改时间。<br> - 如果是新文件: 创建新记录。<br> - 拒绝针对现有目录的 PUT 操作。                                                                                                                |
| **MKCOL**    | `handleMkcol`    | 创建新的目录记录。如果路径已存在则失败。                                                                                                                                                                                                            |
| **DELETE**   | `handleDelete`   | 删除文件/目录。<br> - 依赖外键的 `ON DELETE CASCADE` 特性，删除目录会自动移除所有后代项。                                                                                                                                                           |
| **MOVE**     | `handleMove`     | 重命名或移动文件/目录。<br> - 解析 `Destination` 头（支持相对路径）。<br> - 如果目标存在: 检查 `Overwrite` 头。如果允许覆盖，先删除目标。<br> - 更新 `path`, `parent_id`, 和 `name`。<br> - **递归**: 如果移动的是目录，递归更新所有子项的 `path`。 |
| **COPY**     | `handleCopy`     | 复制文件/目录。<br> - **文件**: 创建包含重复内容的新记录。<br> - **目录**: 递归遍历源树并在目标位置创建对应的副本。<br> - 处理 `Overwrite` 逻辑与 `MOVE` 类似。                                                                                     |
