import { defineConfig } from 'vitepress'
import { defineTeekConfig } from 'vitepress-theme-teek/config'
import book from './book.json' with { type: 'json' }

// configure-pages supplies either '/repository' or '' for a root/custom domain.
const basePath = (process.env.VITEPRESS_BASE || '/').replace(/^\/+|\/+$/g, '')
const base = basePath ? `/${basePath}/` : '/'

const teek = defineTeekConfig({
  teekHome: false,
  vpHome: false,
  pageStyle: 'default',
  anchorScroll: false,
  windowTransition: false,
  themeEnhance: { enabled: false },
  codeBlock: { enabled: true, collapseHeight: false, langTextTransform: 'none' },
  articleAnalyze: { showInfo: false },
  breadcrumb: { enabled: false },
  comment: false,
  toComment: { enabled: false },
  articleShare: { enabled: false },
  articleUpdate: { enabled: false },
  vitePlugins: { sidebar: false, permalink: false, mdH1: false, autoFrontmatter: false, docAnalysis: true },
  backTop: { enabled: true },
})

export default defineConfig({
  extends: teek,
  base,
  lang: 'zh-CN',
  title: 'Agent 工程手册',
  description: '面向 Python 与 Java 后端工程师的系统化知识博客：模型、Agent、Memory、RAG、Infra、评测、安全与求职。',
  cleanUrls: false,
  ignoreDeadLinks: false,
  appearance: true,
  lastUpdated: false,
  head: [['link',{rel:'icon',href:`${base}favicon.svg`}]],
  themeConfig: {
    logo: '/favicon.svg',
    siteTitle: 'Agent 工程手册',
    nav: [
      { text: '全书目录', link: '/guide/catalog' },
      { text: '学习路线', link: '/guide/roadmap' },
      { text: '项目实战', link: '/project/overview' },
      { text: '面试与资料', items: [{ text: '面试题与准备', link: '/guide/interview' },{ text: '术语字典',link:'/guide/glossary'},{text:'原始资料',link:'/guide/references'},{text:'交互实验附录',link:'/guide/labs'}] },
    ],
    sidebar: [
      { text:'阅读导航',items:[{text:'如何使用这本手册',link:'/guide/start'},{text:'全书目录',link:'/guide/catalog'}]},
      { text:'贯穿项目 · Ops Copilot',collapsed:false,items:[
        {text:'业务设计与架构',link:'/project/overview'},
        {text:'本机运行完整闭环',link:'/project/quickstart'},
        {text:'Agent 运行时深挖',link:'/project/agent-runtime'},
        {text:'Memory 生命周期实战',link:'/project/memory'},
        {text:'Java 审批与原子幂等',link:'/project/java-business'},
        {text:'Infra 部署与扩容',link:'/project/infra'},
        {text:'排障与故障演练',link:'/project/troubleshooting'},
        {text:'实际验证报告',link:'/project/verification'},
        {text:'完整源码导读',link:'/project/source-index'},
      ]},
      ...book.volumes.map(v=>({text:v.name,collapsed:false,items:v.ids.map(id=>{const c=book.chapters.find(x=>x.id===id);return {text:String(id).padStart(2,'0')+' '+c.shortTitle,link:'/chapters/'+String(id).padStart(2,'0')}})})),
      {text:'项目与求职',collapsed:false,items:[{text:'16 周学习路线',link:'/guide/roadmap'},{text:'毕业项目实施手册',link:'/guide/projects'},{text:'面试题与自评',link:'/guide/interview'},{text:'60 个核心术语',link:'/guide/glossary'},{text:'官方资料与阅读顺序',link:'/guide/references'},{text:'交互实验附录',link:'/guide/labs'}]},
    ],
    search: { provider:'local', options:{locales:{root:{translations:{button:{buttonText:'搜索知识',buttonAriaLabel:'搜索知识'},modal:{noResultsText:'没有找到相关内容',resetButtonTitle:'清除搜索',footer:{selectText:'选择',navigateText:'切换',closeText:'关闭'}}}}}}},
    outline: { level:[2,3], label:'本章内容' },
    docFooter:{prev:'上一章',next:'下一章'},
    returnToTopLabel:'回到顶部',sidebarMenuLabel:'目录',darkModeSwitchLabel:'切换明暗主题',
    footer:{message:'VitePress + Teek · 本地知识博客',copyright:'内容核对于 2026-11-05；案例参数与学习时间为教学假设。'},
  },
  markdown:{
    math:true,
    lineNumbers:false,
    config(md){
      const fence=md.renderer.rules.fence.bind(md.renderer.rules)
      md.renderer.rules.fence=(tokens,idx,options,env,self)=>{
        if(tokens[idx].info.trim()==='mermaid')return `<MermaidDiagram code="${encodeURIComponent(tokens[idx].content)}" />`
        return fence(tokens,idx,options,env,self)
      }
    }
  },
})
