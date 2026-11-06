<script setup>
import { computed, ref, onMounted, onBeforeUnmount, useId, watch } from 'vue'
import { useData } from 'vitepress'
import { renderDiagram } from './renderDiagram.mjs'

const props = defineProps({ code: { type: String, required: true } })
const { isDark } = useData()
const source = computed(() => decodeURIComponent(props.code))
const svg = ref(''), error = ref(''), rendering = ref(false)
const dialog = ref(null), expandedCanvas = ref(null)
const width = ref(300), height = ref(200), scale = ref(1)
const titleId = `diagram-title-${useId()}`
// The image has its own SVG document, avoiding duplicate IDs from inline copies.
const imageSource = computed(() => svg.value ? `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg.value)}` : '')
const percent = computed(() => Math.round(scale.value * 100))
let mounted = false, revision = 0, backdropPointer = false

async function draw() {
  if (!mounted) return
  const current = ++revision
  rendering.value = true
  error.value = ''
  try {
    const result = await renderDiagram(source.value, isDark.value, () => mounted && current === revision)
    if (!result || !mounted || current !== revision) return
    svg.value = result.svg
    width.value = result.width
    height.value = result.height
  } catch (exception) {
    if (!mounted || current !== revision) return
    svg.value = ''
    error.value = String(exception.message || exception)
  } finally {
    if (mounted && current === revision) rendering.value = false
  }
}
function openDiagram() {
  scale.value = 1
  if (!dialog.value.open) dialog.value.showModal()
}
function zoom(value) {
  scale.value = Math.max(.1, Math.min(3, Math.round(value * 100) / 100))
}
function fitWidth() {
  zoom(Math.min(1, (expandedCanvas.value.clientWidth - 32) / width.value))
}
function closeOnBackdrop(event) {
  if (backdropPointer && event.target === dialog.value) dialog.value.close()
  backdropPointer = false
}
onMounted(() => { mounted = true; draw() })
watch([source, isDark], draw)
onBeforeUnmount(() => { mounted = false; revision++; dialog.value?.close() })
</script>

<template>
  <figure class="book-diagram">
    <div class="diagram-toolbar"><span>架构与流程图 · 可横向滚动</span><button v-if="svg" type="button" @click="openDiagram" aria-label="放大查看图表">放大查看</button></div>
    <div v-if="svg" class="diagram-canvas" tabindex="0" role="region" aria-label="图表，可使用方向键滚动" :aria-busy="rendering" v-html="svg"></div>
    <div v-else-if="error" class="diagram-error" role="alert"><p>图表暂时无法绘制，可查看源码或重试。</p><button type="button" @click="draw">重新绘制</button><details><summary>错误详情</summary><pre>{{ error }}</pre></details></div>
    <div v-else class="diagram-loading" role="status">正在绘制图表…</div>
    <details class="diagram-source"><summary>查看 Mermaid 源码</summary><pre>{{ source }}</pre></details>
    <dialog ref="dialog" class="diagram-dialog" :aria-labelledby="titleId" @pointerdown="event => { backdropPointer = event.target === dialog }" @click="closeOnBackdrop">
      <div class="diagram-toolbar diagram-dialog-header"><span :id="titleId">图表详情</span><button type="button" @click="dialog.close()" autofocus>关闭</button></div>
      <div class="diagram-zoom-controls" role="group" aria-label="图表缩放">
        <button type="button" @click="zoom(scale - .25)" :disabled="scale <= .1" aria-label="缩小图表">−</button>
        <button type="button" @click="zoom(1)" :aria-label="`当前 ${percent}%，还原为 100%`">{{ percent }}%</button>
        <button type="button" @click="zoom(scale + .25)" :disabled="scale >= 3" aria-label="放大图表">+</button>
        <button type="button" @click="fitWidth">适合宽度</button>
      </div>
      <div ref="expandedCanvas" class="diagram-canvas expanded" tabindex="0" role="region" aria-label="放大图表，可使用方向键滚动">
        <img v-if="svg" class="diagram-zoom-image" :src="imageSource" :width="width" :height="height" :style="{ width: `${width * scale}px` }" alt="放大的架构与流程图" />
      </div>
    </dialog>
  </figure>
</template>
