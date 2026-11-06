import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { JSDOM } from 'jsdom'

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), 'docs/.vitepress/dist')
const prefix = (process.env.VITEPRESS_BASE || '/').replace(/^\/+|\/+$/g, '')
const base = prefix ? `/${prefix}/` : '/'
const files = fs.readdirSync(root, { recursive: true }).filter(p => p.endsWith('.html'))
const failures = []
let checked = 0
for (const file of files) {
  const dom = new JSDOM(fs.readFileSync(path.join(root, file), 'utf8'))
  for (const element of dom.window.document.querySelectorAll('[href], [src]')) {
    const value = element.getAttribute('href') || element.getAttribute('src')
    if (!value || /^(#|[a-z][a-z\d+.-]*:|\/\/)/i.test(value)) continue
    const url = new URL(value, `https://static-check.invalid${base}${file}`)
    if (!url.pathname.startsWith(base)) {
      failures.push({ file, value, error: 'escapes deployment base' })
      continue
    }
    let target = path.join(root, decodeURIComponent(url.pathname.slice(base.length)))
    if (fs.existsSync(target) && fs.statSync(target).isDirectory()) target = path.join(target, 'index.html')
    checked++
    if (!fs.existsSync(target)) failures.push({ file, value, error: 'missing file' })
  }
  dom.window.close()
}
console.log(JSON.stringify({ base, pages: files.length, checked, failures }, null, 2))
if (failures.length) process.exit(1)
