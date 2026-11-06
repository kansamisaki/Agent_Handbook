<script setup>
import { withBase } from 'vitepress'
import book from '../book.json'
import AgentBlueprint from './AgentBlueprint.vue'

const chapter = id => book.chapters.find(c => c.id === id)
const chapterUrl = id => withBase(`/chapters/${String(id).padStart(2, '0')}.html`)
const tracks = [
  { name: 'Agent', label: '决策与执行', description: '从一次工具调用，走到可以暂停、恢复和验证的长任务。', ids: [4, 5, 6, 7], icon: 'M6 12h12M12 6v12M4 4h5M4 4v5M20 4h-5M20 4v5M4 20h5M4 20v-5M20 20h-5M20 20v-5' },
  { name: 'Memory', label: '记忆与知识', description: '从存储一条信息，走到可追溯、可更新、可遗忘的记忆。', ids: [8, 9, 10, 11], icon: 'M4 7c0-5 16-5 16 0s-16 5-16 0Zm0 0v10c0 5 16 5 16 0V7M4 12c0 5 16 5 16 0' },
  { name: 'Infra', label: '承载与可靠性', description: '从本机运行，走到多租户、可观测和可恢复的系统设计。', ids: [17, 18, 20, 21], icon: 'M4 3h16v7H4zM4 14h16v7H4zM8 6v1M8 17v1M16 6h1M16 17h1' },
]
const projectSteps = [
  { title: '接收告警', detail: '身份与任务预算' },
  { title: '查询证据', detail: '监控与知识检索' },
  { title: '生成草案', detail: '来源与参数校验' },
  { title: '人工审批', detail: '绑定具体动作' },
  { title: '幂等提交', detail: 'Java 事务与审计' },
]
</script>

<template>
  <div class="book-home">
    <header class="book-cover">
      <div class="cover-copy">
        <p class="cover-kicker"><span aria-hidden="true" class="cover-kicker-line"></span>Agent Handbook <span class="cover-edition">工程实践手册</span></p>
        <h1>把 Agent<br>做成可靠的系统。</h1>
        <p class="cover-subtitle">给 Python 与 Java 后端工程师的进阶指南</p>
        <p class="cover-description">理解决策循环，设计记忆与知识系统，打通业务和基础设施。沿着一个完整项目，从机制、实现，一直读到部署与排障。</p>
        <div class="cover-actions">
          <a class="cover-primary" :href="withBase('/guide/start.html')">开始阅读 <span aria-hidden="true">↗</span></a>
          <a class="cover-secondary" :href="withBase('/project/quickstart.html')">运行实战项目</a>
        </div>
        <p class="cover-footnote">中文长篇讲解 / 可运行 Python & Java / 本地闭环无需 Docker</p>
      </div>
      <AgentBlueprint />
    </header>

    <section class="book-index-strip" aria-label="手册内容概览">
      <a :href="withBase('/guide/catalog.html')"><b>{{ book.chapters.length }}</b><span>系统章节<small>六卷知识体系</small></span></a>
      <a :href="withBase('/guide/catalog.html')"><b>70</b><span>架构与流程图<small>展开机制与边界</small></span></a>
      <a :href="withBase('/project/source-index.html')"><b>22</b><span>源码导读<small>对应完整工程</small></span></a>
      <a :href="withBase('/project/overview.html')"><b>1</b><span>贯穿业务项目<small>从设计到故障恢复</small></span></a>
    </section>

    <section class="home-tracks" aria-labelledby="tracks-heading">
      <div class="home-section-title"><div><p>从核心能力进入</p><h2 id="tracks-heading">三个视角，看懂同一套系统。</h2></div><a :href="withBase('/guide/catalog.html')">查看完整目录 <span aria-hidden="true">↗</span></a></div>
      <div class="track-grid">
        <article v-for="track in tracks" :key="track.name" class="learning-track" :data-track="track.name.toLowerCase()">
          <div class="track-heading"><svg viewBox="0 0 24 24" aria-hidden="true"><path :d="track.icon" /></svg><span>{{ track.label }}</span></div>
          <h3>{{ track.name }}</h3><p>{{ track.description }}</p>
          <ul><li v-for="id in track.ids" :key="id"><a :href="chapterUrl(id)"><span>{{ String(id).padStart(2, '0') }}</span>{{ chapter(id).shortTitle }}<span class="track-link-arrow" aria-hidden="true">↗</span></a></li></ul>
        </article>
      </div>
    </section>

    <section class="home-project" aria-labelledby="project-heading">
      <div class="project-intro"><div><p class="project-kicker">贯穿全书的参考工程</p><h2 id="project-heading">Ops Copilot</h2><p>一次支付告警，串起 Agent 工程的完整链路。</p></div><a :href="withBase('/project/overview.html')">阅读项目设计 <span aria-hidden="true">↗</span></a></div>
      <ol class="project-pipeline"><li v-for="(step, index) in projectSteps" :key="step.title"><span class="pipeline-index">{{ String(index + 1).padStart(2, '0') }}</span><strong>{{ step.title }}</strong><small>{{ step.detail }}</small></li></ol>
      <div class="project-bottom"><p><span>Python / FastAPI</span><span>Java / Spring Boot</span><span>SQLite / H2</span></p><a :href="withBase('/project/verification.html')">查看测试与验证边界 <span aria-hidden="true">↗</span></a></div>
    </section>

    <section class="home-volumes" aria-labelledby="volumes-heading">
      <div class="home-section-title"><div><p>按知识依赖循序深入</p><h2 id="volumes-heading">从原理到交付，一章一章建立理解。</h2></div><span>六卷 / 27 章</span></div>
      <div class="volume-grid">
        <article v-for="(volume, index) in book.volumes" :key="volume.name" class="volume">
          <div class="volume-heading"><span class="volume-number">卷{{ ['一', '二', '三', '四', '五', '六'][index] }}</span><span class="volume-range">{{ String(volume.ids[0]).padStart(2, '0') }} — {{ String(volume.ids.at(-1)).padStart(2, '0') }}</span></div>
          <h3>{{ volume.title }}</h3><p>{{ volume.description }}</p>
          <ul><li v-for="id in volume.ids" :key="id"><a :href="chapterUrl(id)"><span>{{ String(id).padStart(2, '0') }}</span>{{ chapter(id).shortTitle }}</a></li></ul>
        </article>
      </div>
    </section>

    <section class="home-paths" aria-labelledby="paths-heading">
      <div><p>把学习变成可以展示的作品</p><h2 id="paths-heading">读懂，也动手验证。</h2></div>
      <nav aria-label="实践与求职入口"><a :href="withBase('/guide/roadmap.html')"><b>16 周学习路线</b><span>阶段目标、每周任务与过关条件</span></a><a :href="withBase('/project/troubleshooting.html')"><b>故障演练与排障</b><span>复现崩溃、重复提交与状态恢复</span></a><a :href="withBase('/guide/interview.html')"><b>面试与系统设计</b><span>用实现、指标与取舍回答问题</span></a></nav>
    </section>

    <section class="home-repository" aria-labelledby="repository-heading">
      <div><h2 id="repository-heading">一起完善这本手册。</h2><p>发现问题、补充案例，或记录你的工程实践。</p><a href="https://github.com/kansamisaki/Agent_Handbook">在 GitHub 查看项目 <span aria-hidden="true">↗</span></a></div>
      <div class="repository-badges">
        <a href="https://github.com/kansamisaki/Agent_Handbook/stargazers"><img src="https://img.shields.io/github/stars/kansamisaki/Agent_Handbook?style=flat-square&amp;label=Stars&amp;color=4768EB" alt="GitHub Stars" loading="lazy" height="20" /></a>
        <a href="https://github.com/kansamisaki/Agent_Handbook/forks"><img src="https://img.shields.io/github/forks/kansamisaki/Agent_Handbook?style=flat-square&amp;label=Forks&amp;color=008B8B" alt="GitHub Forks" loading="lazy" height="20" /></a>
        <a href="https://github.com/kansamisaki/Agent_Handbook/actions/workflows/deploy.yml"><img src="https://img.shields.io/github/actions/workflow/status/kansamisaki/Agent_Handbook/deploy.yml?branch=main&amp;style=flat-square&amp;label=Docs%20build" alt="文档构建与部署状态" loading="lazy" height="20" /></a>
        <small>仓库状态由 GitHub / Shields.io 提供，刷新可能有缓存延迟。</small>
      </div>
    </section>
  </div>
</template>
