// Mermaid keeps a shared configuration. Serialize initialize + render together
// so concurrent figures and theme switches cannot use each other's palette.
let queue = Promise.resolve()
let sequence = 0

export function renderDiagram(source, dark, isCurrent = () => true) {
  const job = queue.then(async () => {
    if (!isCurrent()) return null
    const { default: mermaid } = await import('mermaid')
    if (!isCurrent()) return null
    const palette = dark
      ? { background: '#162238', primaryColor: '#233c63', primaryTextColor: '#e3eafa', primaryBorderColor: '#91aaf2', lineColor: '#a9bde5', secondaryColor: '#1c454b', tertiaryColor: '#42325f', edgeLabelBackground: '#162238', noteBkgColor: '#39344a', noteTextColor: '#e3eafa', textColor: '#e3eafa' }
      : { background: '#ffffff', primaryColor: '#eef2ff', primaryTextColor: '#233253', primaryBorderColor: '#8299db', lineColor: '#65789d', secondaryColor: '#e5f4f3', tertiaryColor: '#fff5e5', edgeLabelBackground: '#ffffff', noteBkgColor: '#fff5e5', noteTextColor: '#233253', textColor: '#233253' }
    mermaid.initialize({
      startOnLoad: false,
      securityLevel: 'strict',
      theme: 'base',
      fontFamily: 'PingFang SC, Microsoft YaHei, sans-serif',
      themeVariables: { ...palette, darkMode: dark, fontSize: '14px' },
      flowchart: { htmlLabels: false, curve: 'basis', useMaxWidth: true },
      sequence: { useMaxWidth: true, wrap: true },
    })
    const { svg } = await mermaid.render(`book-diagram-${++sequence}`, source)
    if (!isCurrent()) return null
    const document = new DOMParser().parseFromString(svg, 'image/svg+xml')
    const root = document.documentElement
    const bounds = root.getAttribute('viewBox')?.trim().split(/[\s,]+/).map(Number) || []
    const validBounds = Number.isFinite(bounds[2]) && bounds[2] > 0 && Number.isFinite(bounds[3]) && bounds[3] > 0
    const width = validBounds ? Math.max(300, bounds[2]) : 300
    const height = validBounds ? width * bounds[3] / bounds[2] : 200
    root.style.width = `${width}px`
    root.style.maxWidth = 'none'
    root.style.backgroundColor = palette.background
    return { svg: new XMLSerializer().serializeToString(root), width, height }
  })
  queue = job.catch(() => {})
  return job
}
