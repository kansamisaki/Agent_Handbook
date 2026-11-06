<script setup>
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useData, withBase } from 'vitepress'
import Teek from 'vitepress-theme-teek'
import book from '../book.json'

const { page, frontmatter } = useData()
const progress = ref(0)
const isDoc = computed(() => !frontmatter.value.layout || frontmatter.value.layout === 'doc')
const chapterId = computed(() => Number(page.value.relativePath?.match(/^chapters\/(\d+)\.md$/)?.[1]))
const volume = computed(() => book.volumes.find(item => item.ids.includes(chapterId.value)))
const sectionName = computed(() => volume.value?.name || (page.value.relativePath?.startsWith('project/') ? '贯穿项目 · Ops Copilot' : '阅读与实践'))
const sectionLink = computed(() => page.value.relativePath?.startsWith('project/') ? '/project/overview.html' : '/guide/catalog.html')
let frame = 0
let observer

function measureProgress() {
  frame = 0
  const article = document.querySelector('.VPDoc .vp-doc')
  if (!article || !isDoc.value) { progress.value = 0; return }
  const rect = article.getBoundingClientRect()
  const start = rect.top + window.scrollY - 100
  const distance = rect.height - window.innerHeight + 100
  progress.value = distance > 0 ? Math.max(0, Math.min(100, ((window.scrollY - start) / distance) * 100)) : 100
}
function scheduleMeasure() {
  if (!frame) frame = window.requestAnimationFrame(measureProgress)
}
async function observeArticle() {
  progress.value = 0
  await nextTick()
  observer?.disconnect()
  const article = document.querySelector('.VPDoc .vp-doc')
  if (article) observer?.observe(article)
  scheduleMeasure()
}
onMounted(() => {
  if ('ResizeObserver' in window) observer = new ResizeObserver(scheduleMeasure)
  window.addEventListener('scroll', scheduleMeasure, { passive: true })
  window.addEventListener('resize', scheduleMeasure, { passive: true })
  observeArticle()
})
watch(() => page.value.relativePath, () => {
  if (typeof window !== 'undefined') observeArticle()
})
onBeforeUnmount(() => {
  if (frame) window.cancelAnimationFrame(frame)
  observer?.disconnect()
  window.removeEventListener('scroll', scheduleMeasure)
  window.removeEventListener('resize', scheduleMeasure)
})
</script>

<template>
  <Teek.Layout>
    <template #layout-top><div v-if="isDoc" class="reading-progress" aria-hidden="true"><span :style="{ transform: `scaleX(${progress / 100})` }"></span></div></template>
    <template #doc-before><nav class="book-breadcrumb" aria-label="面包屑"><a :href="withBase('/')">手册</a><span aria-hidden="true">/</span><a :href="withBase(sectionLink)">{{ sectionName }}</a><span v-if="chapterId" class="chapter-pill">第 {{ String(chapterId).padStart(2, '0') }} 章</span></nav></template>
    <template #doc-footer-before><aside class="chapter-contribute"><div><strong>让这份知识更准确。</strong><p>发现错误或有可复现的案例？欢迎一起完善。</p></div><a href="https://github.com/kansamisaki/Agent_Handbook/issues/new">反馈问题 <span aria-hidden="true">↗</span></a></aside></template>
  </Teek.Layout>
</template>
