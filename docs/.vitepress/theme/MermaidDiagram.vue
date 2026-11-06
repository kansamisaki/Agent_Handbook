<script setup>
import { ref, onMounted, onBeforeUnmount } from 'vue'
const props=defineProps({code:{type:String,required:true}})
const source=decodeURIComponent(props.code)
const svg=ref(''), error=ref(''), dialog=ref(null)
let alive=true
onBeforeUnmount(()=>alive=false)
onMounted(async()=>{
  try{
    const {default:mermaid}=await import('mermaid')
    mermaid.initialize({startOnLoad:false,securityLevel:'strict',theme:'base',fontFamily:'PingFang SC, Microsoft YaHei, sans-serif',themeVariables:{primaryColor:'#edf5f2',primaryTextColor:'#203d36',primaryBorderColor:'#6d9d8e',lineColor:'#5d7d8f',secondaryColor:'#eaf1f7',tertiaryColor:'#f6f4ed',fontSize:'14px'},flowchart:{htmlLabels:false,curve:'basis',useMaxWidth:true},sequence:{useMaxWidth:true,wrap:true}})
    const id='diagram-'+Math.random().toString(36).slice(2)
    const rendered=await mermaid.render(id,source)
    // Preserve natural label size; wide diagrams scroll instead of shrinking to unreadable text.
    const doc=new DOMParser().parseFromString(rendered.svg,'image/svg+xml')
    const root=doc.documentElement
    const width=Number(root.getAttribute('viewBox')?.split(/\s+/)[2])
    if(width>0){root.style.width=`${Math.max(300,width)}px`;root.style.maxWidth='none'}
    if(alive)svg.value=new XMLSerializer().serializeToString(root)
  }catch(e){if(alive)error.value=String(e.message||e)}
})
</script>

<template>
  <figure class="book-diagram">
    <div class="diagram-toolbar"><span>架构与流程图 · 可横向滚动</span><button v-if="svg" @click="dialog.showModal()" aria-label="放大查看图表">放大查看</button></div>
    <div v-if="svg" class="diagram-canvas" v-html="svg"></div>
    <div v-else-if="error" class="diagram-error">图表解析失败，请查看源码。<pre>{{error}}</pre></div>
    <div v-else class="diagram-loading" role="status">正在绘制图表…</div>
    <details class="diagram-source"><summary>查看 Mermaid 源码</summary><pre>{{ source }}</pre></details>
    <dialog ref="dialog" class="diagram-dialog" @click="e=>{if(e.target===dialog)dialog.close()}">
      <div class="diagram-toolbar"><span>图表详情 · 可横向滚动</span><button @click="dialog.close()">关闭</button></div>
      <div class="diagram-canvas expanded" v-html="svg"></div>
    </dialog>
  </figure>
</template>
