# Serverless WebDAV

> [中文版](./README.zh-CN.md) | [English](./README.md)

基于 **Cloudflare Workers** 和 **Cloudflare D1 数据库** 构建的轻量级、可扩展的 WebDAV 服务器实现。

## 特性

- **完善的 WebDAV 支持**: 实现了核心方法，包括 `OPTIONS`, `PROPFIND`, `GET`, `HEAD`, `PUT`, `MKCOL`, `DELETE`, `MOVE` 和 `COPY`。
- **无服务器架构**: 完全运行在 Cloudflare Workers 边缘网络，无需维护永久服务器。
- **数据库驱动**: 文件元数据和内容（作为 BLOB 存储）由 Cloudflare D1 (SQLite) 管理。
- **安全可靠**: 支持通过 Cloudflare Secrets Store 配置 Basic 认证。
- **易于部署**: 使用 Wrangler 进行快速部署。

## 限制

- **文件大小**: 由于 [Cloudflare D1 的行大小限制](https://developers.cloudflare.com/d1/platform/limits/)，单个文件（BLOB）不能超过 **2 MB**。如需支持更大文件，建议集成 Cloudflare R2。

## 相关文档

- [架构设计](docs/arch.zh-CN.md): 数据库 Schema 及 WebDAV 实现的详细说明。
- [API 参考](docs/api.zh-CN.md): 常见 WebDAV 操作的 `curl` 示例。

## 前置要求

- 已安装 [Node.js](https://nodejs.org/)。
- 拥有 Cloudflare 账号。

## 快速入门

### 1. 克隆并安装

```bash
git clone https://github.com/your-username/serverless-webdav.git
cd serverless-webdav
npm install
```

### 2. 配置

编辑 `wrangler.jsonc`。你需要创建一个 D1 数据库：

```bash
npx wrangler d1 create webdav-db
```

将上面命令提供的 `database_id` 更新到 `wrangler.jsonc` 中。

### 3. 设置认证信息

#### 本地开发

在本地开发中使用 **Wrangler Secrets Store**。请按如下方式创建密钥：

```bash
# 在您的 Store 中设置密钥
npx wrangler secrets-store secret create 1f9c517029c347819072fcb45994c5ae --name WEBDAV_AUTH_PASS --value 123 --scopes workers
npx wrangler secrets-store secret create 1f9c517029c347819072fcb45994c5ae --name WEBDAV_AUTH_USER --value admin --scopes workers
```

这将把 Basic 认证的用户名设置为 `admin`，密码设置为 `123`。

#### 生产环境 (Cloudflare Secrets Store)

在 Cloudflare 仪表板中，前往 [Secrets Store 页面](https://developers.cloudflare.com/secrets-store/manage-secrets/how-to/) 并创建以下密钥：

- `WEBDAV_AUTH_USER`: 您期望的用户名。
- `WEBDAV_AUTH_PASS`: 您期望的密码。

### 4. 开发与测试

```bash
# 启动本地开发服务器
npm run dev

# 运行单元测试
npm test

# 运行 Bash 集成测试（需服务器已启动）
chmod +x integration-test.sh
./integration-test.sh
```

### 5. 部署

```bash
npm run deploy
```

## 支持的客户端

由于遵循标准 WebDAV 协议，它可以与以下客户端协作：

- macOS Finder (`前往` -> `连接服务器...`)
- Windows 文件资源管理器 (`添加一个网络位置`)
- Cyberduck
- Transmit
- Rclone

## 项目结构

- **`src/index.ts`**: 主入口，处理 HTTP 路由和 WebDAV XML 生成。
- **`src/db.ts`**: 数据库 Schema 定义以及文件管理的 CRUD 操作。

## 许可证

MIT
