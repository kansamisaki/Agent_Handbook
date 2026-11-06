<script setup>
import { computed, ref } from 'vue'
import { withBase } from 'vitepress'

const views = [
  { id: 'agent', name: 'Agent', title: '让每一步决策都有边界', description: '构建上下文，校验工具调用，用证据判断是否完成。执行循环始终受预算和停止条件约束。', link: '/project/agent-runtime.html', linkText: '阅读 Agent 运行时' },
  { id: 'memory', name: 'Memory', title: '让信息能被更新，也能被遗忘', description: '记忆携带来源、作用域和版本。读取校验权限与有效期，删除同时考虑索引和迟到事件。', link: '/project/memory.html', linkText: '阅读 Memory 生命周期' },
  { id: 'infra', name: 'Infra', title: '让一次成功变成持续可靠', description: '持久化状态与事件，通过租约、幂等和恢复机制，承接进程退出、重复请求与并发执行。', link: '/project/infra.html', linkText: '阅读 Infra 实战' },
]
const active = ref('agent')
const selected = computed(() => views.find(view => view.id === active.value))
const nodes = [
  { id: 'context', x: 28, y: 50, title: 'Context', detail: '目标 / 证据 / 预算', view: 'agent' },
  { id: 'tools', x: 392, y: 50, title: 'Tools', detail: '校验 / 授权 / 执行', view: 'agent' },
  { id: 'memory', x: 28, y: 238, title: 'Memory', detail: '作用域 / 版本 / 遗忘', view: 'memory' },
  { id: 'infra', x: 392, y: 238, title: 'Business API', detail: '审批 / 幂等 / 审计', view: 'infra' },
]
</script>

<template>
  <figure class="agent-blueprint" :data-view="active">
    <div class="blueprint-bar">
      <span class="blueprint-title"><span aria-hidden="true" class="blueprint-mark"></span>系统剖面</span>
      <div class="blueprint-switch" role="group" aria-label="切换系统观察视角">
        <button v-for="view in views" :key="view.id" :aria-pressed="active === view.id" @click="active = view.id">{{ view.name }}</button>
      </div>
    </div>
    <div class="blueprint-canvas">
      <svg viewBox="0 0 560 365" role="img" aria-labelledby="blueprint-title blueprint-description">
        <title id="blueprint-title">Agent 系统的职责关系</title>
        <desc id="blueprint-description">Agent 运行时组织上下文与工具，按权限访问记忆，通过业务 API 执行动作，并将状态和事件保存到 Checkpoint。高亮表示当前选中的观察视角。</desc>
        <defs>
          <pattern id="blueprint-grid" width="24" height="24" patternUnits="userSpaceOnUse"><circle cx="1" cy="1" r="0.8" fill="#7893bf" opacity="0.3" /></pattern>
          <linearGradient id="runtime-fill" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#3659df"/><stop offset="1" stop-color="#567be8"/></linearGradient>
          <marker id="blueprint-arrow" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="5" markerHeight="5" orient="auto-start-reverse"><path d="M1 1 7 4 1 7" fill="none" stroke="context-stroke" stroke-width="1.5" /></marker>
        </defs>
        <rect width="560" height="365" fill="url(#blueprint-grid)" />
        <g class="blueprint-edges" fill="none" stroke-width="1.6" marker-end="url(#blueprint-arrow)">
          <path :class="{ active: active === 'agent' }" d="M168 85 H184 Q198 85 198 99 V153 Q198 167 210 167" />
          <path :class="{ active: active === 'agent' }" d="M350 167 Q364 167 364 153 V99 Q364 85 378 85 H392" />
          <path :class="{ active: active === 'memory' }" marker-start="url(#blueprint-arrow)" d="M168 273 H184 Q198 273 198 259 V203 Q198 189 210 189" />
          <path :class="{ active: active === 'infra' }" d="M350 189 Q364 189 364 203 V259 Q364 273 378 273 H392" />
          <path :class="{ active: active === 'infra' }" d="M280 218 V286" />
          <path class="blueprint-loop" :class="{ active: active === 'agent' }" d="M250 138 V120 Q250 110 260 110 H300 Q310 110 310 120 V138" />
        </g>
        <g v-for="node in nodes" :key="node.id" :transform="`translate(${node.x}, ${node.y})`" class="blueprint-node" :class="{ active: node.view === active }">
          <rect width="140" height="70" rx="10" />
          <circle cx="15" cy="20" r="3" />
          <text x="28" y="25" class="node-title">{{ node.title }}</text>
          <text x="15" y="49" class="node-detail">{{ node.detail }}</text>
        </g>
        <g transform="translate(210,138)" class="blueprint-core">
          <rect x="-6" y="-6" width="152" height="92" rx="18" fill="none" stroke="#86a4ff" stroke-opacity=".24" />
          <rect width="140" height="80" rx="12" fill="url(#runtime-fill)" />
          <text x="70" y="33" text-anchor="middle">Agent runtime</text>
          <text x="70" y="56" text-anchor="middle" class="core-detail">决策 → 行动 → 验证</text>
        </g>
        <g transform="translate(210,286)" class="blueprint-node" :class="{ active: active === 'infra' }">
          <rect width="140" height="57" rx="10" />
          <text x="70" y="24" text-anchor="middle" class="node-title">Checkpoint</text>
          <text x="70" y="43" text-anchor="middle" class="node-detail">状态 / 事件 / 恢复</text>
        </g>
        <text x="280" y="95" text-anchor="middle" class="blueprint-annotation">有预算的执行循环</text>
      </svg>
    </div>
    <figcaption class="blueprint-caption" aria-live="polite" aria-atomic="true">
      <span class="blueprint-scroll-hint">横向滑动图表，查看完整架构</span>
      <strong>{{ selected.title }}</strong>
      <p>{{ selected.description }}</p>
      <a :href="withBase(selected.link)">{{ selected.linkText }} <span aria-hidden="true">↗</span></a>
    </figcaption>
  </figure>
</template>
