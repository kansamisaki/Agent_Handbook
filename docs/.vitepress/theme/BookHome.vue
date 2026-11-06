<script setup>
import {withBase} from 'vitepress'
import book from '../book.json'
const featured=[7,9,18,19]
const chapter=id=>book.chapters.find(c=>c.id===id)
</script>
<template>
  <div class="book-home">
    <header class="book-cover">
      <div class="cover-copy"><p class="cover-kicker">给 Python 与 Java 后端工程师的系统学习笔记</p><h1>Agent 工程手册</h1><p class="cover-subtitle">从模型的工作原理，到一个可靠系统的全部边界。</p><p class="cover-description">沿着一套企业运维 Agent 的设计过程，逐章理解工具、状态、记忆、知识检索与基础设施。每个机制都有图解，每个方案都有取舍，每项能力都有验证方式。</p><div class="cover-actions"><a class="cover-primary" :href="withBase('/guide/start.html')">开始阅读</a><a :href="withBase('/guide/catalog.html')">浏览完整目录</a></div></div>
      <div class="cover-book" aria-label="全书知识结构"><div class="book-spine"></div><div class="book-face"><p>一套系统，六个观察角度</p><ol><li><b>模型与决策</b><span>理解行为的来源</span></li><li><b>记忆与知识</b><span>组织可信的信息</span></li><li><b>协议与业务</b><span>把行动接到现实</span></li><li><b>平台与推理</b><span>承接状态与负载</span></li><li><b>质量与安全</b><span>验证系统的边界</span></li><li><b>进阶与求职</b><span>形成可审查的作品</span></li></ol><small>长篇讲解 / 架构图 / 时序图 / 代码 / 故障案例</small></div></div>
    </header>
    <div class="reading-note"><strong>跟着一个完整项目读</strong><p>支付告警 → 查证据 → 工单草案 → 参数审批 → 幂等提交。已有可运行 Python/Java 工程、Memory 生命周期和真实故障测试。<a :href="withBase('/project/overview.html')">进入项目实战 →</a></p></div>
    <section class="home-volumes"><div class="home-section-title"><h2>按知识的依赖顺序阅读</h2><span>27 章，六卷</span></div><div class="volume-grid"><article v-for="(v,i) in book.volumes" :key="v.name" class="volume"><div class="volume-number">{{['一','二','三','四','五','六'][i]}}</div><div><h3>{{v.title}}</h3><p>{{v.description}}</p><ul><li v-for="id in v.ids" :key="id"><a :href="withBase('/chapters/'+String(id).padStart(2,'0')+'.html')"><span>{{String(id).padStart(2,'0')}}</span>{{chapter(id).shortTitle}}</a></li></ul></div></article></div></section>
    <section class="home-deepdives"><div class="home-section-title"><h2>先读四个关键问题</h2><span>从具体故障理解系统</span></div><a class="deepdive" v-for="id in featured" :key="id" :href="withBase('/chapters/'+String(id).padStart(2,'0')+'.html')"><span class="deep-num">{{String(id).padStart(2,'0')}}</span><div><h3>{{chapter(id).title}}</h3><p>{{chapter(id).summary}}</p></div><span class="deep-arrow" aria-hidden="true">↗</span></a></section>
    <section class="home-paths"><h2>把阅读变成工程证据</h2><div><a :href="withBase('/guide/roadmap.html')"><b>16 周学习路线</b><span>按每周投入时间推进项目，给每个阶段设置过关条件。</span></a><a :href="withBase('/project/quickstart.html')"><b>运行 Python / Java 项目</b><span>从本机启动到真实 HTTP 联调，再复现写后崩溃与恢复。</span></a><a :href="withBase('/project/verification.html')"><b>查看实际验证报告</b><span>核对测试结果、运行环境和未执行范围，形成可审查的作品。</span></a></div></section>
  </div>
</template>
