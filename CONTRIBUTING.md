# 参与完善 Agent 工程手册

欢迎提交内容纠错、图解改进和可复现案例。每次贡献尽量围绕一个明确问题，方便讨论和审阅。

## 内容修改

1. 在 Issue 或 Pull Request 中标明章节与小节，解释原内容的问题。
2. 涉及 API、协议、框架行为时，附官方文档或论文链接，以及适用版本。
3. 区分可运行代码、解释性伪代码和未验证的部署设计。性能数据需注明环境、样本、日期和测量方法。
4. 示例使用虚构或脱敏数据，不要提交密钥、个人信息或生产日志。

## 本地检查

使用 Node.js 22，首次运行 `npm ci`。修改后执行：

```bash
npm run check:diagrams
npm run build
node verify-static.mjs
```

修改页面布局时，用 `npm run preview` 检查明暗主题、手机宽度、键盘操作以及长代码和宽图表。

站点部署在仓库子路径下。新增 Vue 组件中的站内地址应使用 VitePress 的 `withBase()`；Markdown 文章继续使用 `/chapters/06` 这样的站内链接。可以按下面方式检查正式路径：

```bash
VITEPRESS_BASE=/Agent_Handbook/ npm run build
VITEPRESS_BASE=/Agent_Handbook/ node verify-static.mjs
```

## 提交 Pull Request

描述中写清楚问题、修改后的行为、验证方法与未验证范围。无需提交 `node_modules/`、缓存或 `docs/.vitepress/dist/`。

正文位于 `docs/chapters/`；项目教程位于 `docs/project/`；导航、首页和主题位于 `docs/.vitepress/`。涉及章节标题或目录调整时，请同步检查 `docs/.vitepress/book.json` 与 `docs/guide/catalog.md`。

若修改了可下载的 Ops Copilot 工程，请同步更新源码导读与下载包，执行相关工程测试，并在验证报告中注明此次实际运行的结果。
