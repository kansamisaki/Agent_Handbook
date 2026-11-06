# Agent 工程手册

面向会 Python、具有 Java 后端经验的开发者的本地知识博客。

采用 **VitePress 1.6.4 + Teek 1.6.2**。27 章均已加深，另有 8 篇项目实战与验证说明、22 份完整源码导读；章节与项目讲解合计约 8.9 万汉字（不含代码块和其他附录）。每章原有两张图，全站现有 70 张 Mermaid 图，支持放大、查看源码、公式排版、全文搜索、明暗主题与手机目录。

贯穿项目为 **Ops Copilot：支付告警 → 证据 → 工单草案 → 参数审批 → 幂等提交**。Python/FastAPI 与 Java/Spring Boot 均提供完整可运行代码，本机使用 SQLite 与 H2。工程包含预构建 Java JAR、依赖锁、启动器、样本数据、实际测试和报告。默认是确定性策略基线；真实 HTTP 模型适配器已提供，尚未执行付费模型质量评测。

内容核对日期：2026-11-05。示意代码、案例参数、实验结果和学习时间均已注明教学边界。

打开博客后点击“项目实战”，从本机运行指南开始。完整项目压缩包位于 `docs/public/downloads/ops-copilot.zip`，也可在博客内下载。不会自动运行项目，不需要启动 Docker。容器配置和 PostgreSQL 迁移设计均明确标注为未执行方案。

## 直接阅读

构建后的站点已经包含在 `docs/.vitepress/dist/`，阅读无需 npm 安装，不需要模型密钥。

macOS 可双击 `打开知识博客.command`，或在本目录执行：

```sh
python3 serve.py
```

浏览器打开 `http://127.0.0.1:4173/`。保持终端运行；按 Ctrl+C 停止。若端口占用，可执行 `python3 serve.py --port 4174`。服务仅监听本机，不会发布到互联网。

不要直接双击构建后的 index.html：VitePress 的路由、脚本与本地搜索需要通过 HTTP 读取。

## 修改文章与主题

需要部署到 GitHub Pages 时，请看 [静态部署说明](DEPLOY.md)。已包含 `.github/workflows/deploy.yml`，自动适配仓库子路径；本次交付未推送或发布。

需要 Node.js 22 和 npm。首次安装依赖需要网络；日常阅读无需网络。

```sh
npm ci
npm run dev
```

文章在 `docs/chapters/`，项目实战和源码导读在 `docs/project/`，附录在 `docs/guide/`，主题在 `docs/.vitepress/theme/`，目录与导航配置在 `docs/.vitepress/config.mjs`。每篇正文是可直接编辑的 Markdown 文件。

```sh
npm run build
npm run check:diagrams
```

构建会更新本地阅读版本。包中的 `package-lock.json` 锁定依赖。Teek 提供文章布局与代码块等能力，项目进一步定制了书籍首页、阅读排版和图表组件。

## 文件结构

```text
docs/
  chapters/              27 章长篇正文
  project/               项目实战、完整源码与验证报告
  guide/                 学习、项目、面试与资料
  public/labs.html       本地交互实验附录
  public/downloads/      完整 Python/Java 工程包
  .vitepress/
    config.mjs           站点配置
    theme/               首页、图表、排版主题
    dist/                已构建静态站点
serve.py                 无依赖本地阅读服务
打开知识博客.command     macOS 启动入口
verify-diagrams.mjs       Mermaid 语法检查
```

## 验证与边界

所有章节检查结构与图表语法，站点经过生产构建与站内链接检查；既有阅读布局此前已做浏览器检查，本次主要扩充内容与源码。公式由 MathJax 在构建时排版，Mermaid 从本地依赖渲染。概念章中的伪代码用于解释，项目源码页和下载包提供完整实现；本地参考系统的生产扩展边界在文中单独说明。

没有部署至 Sites 或其他托管平台；没有接入统计、广告、云端评论或外部字体。原始资料链接在主动点击时访问外部网站。
