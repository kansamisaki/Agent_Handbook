import Teek from 'vitepress-theme-teek'
import 'vitepress-theme-teek/index.css'
import './style.css'
import MermaidDiagram from './MermaidDiagram.vue'
import BookHome from './BookHome.vue'
import BookLayout from './BookLayout.vue'

export default {
  ...Teek,
  Layout: BookLayout,
  async enhanceApp(ctx) {
    await Teek.enhanceApp(ctx)
    ctx.app.component('MermaidDiagram', MermaidDiagram)
    ctx.app.component('BookHome', BookHome)
  },
}
