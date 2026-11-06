# GitHub Pages 静态部署

本博客使用 VitePress 1.6.4，`npm run build` 生成的全部静态文件在 `docs/.vitepress/dist/`。文章、浏览器内搜索、Mermaid 图和交互实验可静态托管，不需要 Python、Java 或 Docker 服务。

Ops Copilot 的 Python/Java 服务仍是独立后端项目；GitHub Pages 可以展示它的教程和提供工程包下载，不能在 Pages 上运行这些后端进程。

## 推荐方式：GitHub Actions

1. 将**本目录的内容**放到 GitHub 仓库根目录，`package.json` 与 `.github/` 位于同一级。不要把整个外层 `outputs/` 上传为仓库根。
2. 仓库中进入 **Settings → Pages → Build and deployment → Source**，选择 **GitHub Actions**。
3. 将源码推送到 `main`，或在 Actions 页面手动运行 **Deploy Agent Handbook to GitHub Pages**。

工作流在 Node.js 22 下安装锁定依赖、校验图表、构建、检查静态链接并部署。`configure-pages` 读取实际 Pages 地址，自动将 `/仓库名/` 或根路径传给 `VITEPRESS_BASE`；不需要在源码中写死 GitHub 用户名。默认分支若不是 main，修改 `.github/workflows/deploy.yml` 的 branches。

构建产物已加入 `.gitignore`，GitHub Actions 会自行生成。源码中的 `docs/public/downloads/ops-copilot.zip` 是博客的工程下载附件，需要随仓库提交。

## 本机手动构建

```sh
npm ci
npm run build
node verify-static.mjs
```

上面得到根路径 `/` 版本，适用于本地阅读、用户主页仓库或独立域名。

若手动部署到 `https://用户名.github.io/agent-engineering-blog/`，则构建时指定对应的仓库名：

```sh
VITEPRESS_BASE=/agent-engineering-blog/ npm run build
VITEPRESS_BASE=/agent-engineering-blog/ node verify-static.mjs
```

构建目标路径与部署路径必须一致。子路径产物不适合直接用现有 `serve.py` 在根路径预览；本地阅读重新执行普通 `npm run build` 即可。Actions 自动处理这个区别。

## 当前交付状态

已经提供 workflow 与 base 适配；本地分别检查根路径和仓库子路径的构建。没有创建 GitHub 仓库、推送源码或实际发布，GitHub 托管工作流尚未执行。

参考：[VitePress 官方部署指南](https://vitepress.dev/guide/deploy#github-pages)、[GitHub configure-pages 的路径输出](https://github.com/actions/configure-pages)。
