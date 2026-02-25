# OpenAI Gateway Context

这是一个极简、高性能且可扩展的 OpenAI 兼容 API 代理层。

## 项目愿景
核心目标是建立一个轻量级中间层，提供以下能力：
- [x] **安全性**: 隐藏真实的 API Key，防止泄露。
- [x] **透明转发**: 保持对官方 SDK 和流式响应（Streaming）的 100% 兼容。
- [x] **可观测性**: 基础日志与耗时记录。
- [ ] **审计与限流**: 后续扩展功能。
- [ ] **模型路由与缓存**: 根据 `model` 参数分发请求或缓存响应。

## 架构概览
- **核心逻辑**: 基于 Go 标准库 `httputil.ReverseProxy`。
- **请求注入**: 在 `Rewrite` 回调中动态设置 `Authorization` Header 及 `Upstream` URL。
- **日志审计**: 通过自定义 `RoundTripper`（包装 `http.DefaultTransport`）拦截请求响应周期，记录状态码及精确到 3 位小数的耗时。

## 运行配置
- **入口**: `go run main.go`
- **环境变量**:
  - `OPENAI_API_KEY`: 必需，上游服务的真实 Key。
  - `OPENAI_BASE_URL`: 可选，默认为 `https://api.openai.com/v1`。
  - `PORT`: 可选，监听端口，默认为 `8080`。

## 开发约定
- **极简主义**: 核心代码量控制在百行以内，优先使用 Go 标准库。
- **并发安全**: 代理逻辑应保持 Stateless，确保在高并发下的稳定性。
- **透明性**: 除非进行审计或缓存，否则不应修改请求/响应的 Body，确保流式数据无损。
