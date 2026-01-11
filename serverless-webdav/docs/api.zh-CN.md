# WebDAV API 参考文档

本文档提供了使用 `curl` 进行常见 WebDAV 操作的示例。

**基础 URL**: `https://your-worker.workers.dev` (请替换为您的实际部署 URL，本地开发通常为 `http://127.0.0.1:8787`)
**认证**: Basic Auth (`-u user:pass`)

## 1. 列出目录 (PROPFIND)

获取资源属性。要列出目录内容，请使用 `Depth: 1`。

```bash
# 列出根目录
curl -X PROPFIND -u user:pass "https://your-worker.workers.dev/" -H "Depth: 1"

# 列出特定文件夹
curl -X PROPFIND -u user:pass "https://your-worker.workers.dev/docs/" -H "Depth: 1"
```

## 2. 上传文件 (PUT)

上传文件到服务器。

```bash
# 上传文本内容
curl -X PUT -u user:pass "https://your-worker.workers.dev/notes.txt" --data "Hello WebDAV"

# 上传本地二进制文件
curl -X PUT -u user:pass "https://your-worker.workers.dev/image.png" --data-binary @/path/to/local/image.png
```

## 3. 下载文件 (GET)

获取文件内容。

```bash
# 下载到标准输出
curl -X GET -u user:pass "https://your-worker.workers.dev/notes.txt"

# 下载并保存为文件
curl -X GET -u user:pass "https://your-worker.workers.dev/image.png" -o downloaded_image.png
```

## 4. 创建目录 (MKCOL)

创建一个新的集合（目录）。

```bash
curl -X MKCOL -u user:pass "https://your-worker.workers.dev/new-folder"
```

## 5. 移动 / 重命名 (MOVE)

将资源移动到新的 URI。用于移动和重命名操作。

```bash
# 重命名文件
curl -X MOVE -u user:pass "https://your-worker.workers.dev/old.txt" \
     -H "Destination: /new.txt"

# 移动文件到另一个文件夹
curl -X MOVE -u user:pass "https://your-worker.workers.dev/file.txt" \
     -H "Destination: /archive/file.txt"
```

_注意：`Destination` 头部支持绝对 URL 和绝对路径（以 `/` 开头）。_

## 6. 复制 (COPY)

将资源复制到新的 URI。

```bash
curl -X COPY -u user:pass "https://your-worker.workers.dev/source.txt" \
     -H "Destination: /backup/source_copy.txt"
```

## 7. 删除 (DELETE)

移除资源。如果是目录，将递归删除。

```bash
curl -X DELETE -u user:pass "https://your-worker.workers.dev/file-to-delete.txt"
```

## 8. 获取目录索引 (自定义 GET)

我们的实现支持在浏览器中查看目录，或获取 JSON 格式的列表。

```bash
# 获取 HTML 视图 (默认)
curl -X GET -u user:pass "https://your-worker.workers.dev/docs/"

# 获取 JSON 列表
curl -X GET -u user:pass "https://your-worker.workers.dev/docs/" -H "Accept: application/json"
```

**JSON 响应示例:**

```json
[
	{
		"name": "notes.txt",
		"path": "/docs/notes.txt",
		"is_directory": false,
		"size": 12,
		"mime_type": "text/plain",
		"modified_at": "2023-10-27T10:00:00.000Z",
		"created_at": "2023-10-27T10:00:00.000Z"
	}
]
```
