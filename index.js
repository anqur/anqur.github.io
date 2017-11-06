import qs from 'querystring'
import marked from 'marked'
import hljs from 'highlight.js/lib/highlight'

import langset from './langset'

import './style.css'
import 'highlight.js/styles/default.css'

const [
  $lastModified,
  $footerTitle,
  $scrollToTop,
  $spinner,
  $loader
] = [
  'last-modified',
  'footer-title',
  'scroll-to-top',
  'spinner',
  'loader'
].map(id => document.getElementById(id))

class Spinner {
  constructor () {
    this.arr = ['⣾', '⣽', '⣻', '⢿', '⡿', '⣟', '⣯', '⣷']
    this.idx = 0
    this.timer = setInterval(this._update, 75)
    this.$spinner = document.getElementById('spinner')
  }

  spin = () => {
    $spinner.textContent = this.arr[this.idx]
  }
  destroy = () => {
    clearInterval(this.timer)
    $loader.remove()
  }
  _update = () => {
    let idx = this.idx
    idx = idx === this.arr.length - 1 ? 0 : idx + 1
    this.idx = idx
    this.spin()
  }
}


const render = (title, body, mod) => {
  document.title = title
  document.querySelector('main').insertAdjacentHTML('beforeend', marked(body))
  $lastModified.textContent = mod
  $footerTitle.textContent = title
}

;(async () => {
  // Boot.

  const spinner = new Spinner()
  spinner.spin()

  // Scroll to top.

  $scrollToTop.onclick = () => {
    window.scrollTo(0, 0)
    return false
  }

  // Code highlighting.

  langset.forEach(lang => {
    const hlmodule = require(`highlight.js/lib/languages/${lang}`)
    hljs.registerLanguage(lang, hlmodule)
  })

  marked.setOptions({
    highlight: code => {
      return hljs.highlightAuto(code).value
    }
  })

  // Routes.

  const title = qs.parse(window.location.search.slice(1)).p || 'contents'
  const res = await window.fetch(`/content/${title}.md`)

  if (!res.ok) {
    render('Error', '```bash\n$ echo $?\n404 # :(\n```', 'Page Not Found')
    return
  }

  const lastModified = res.headers.get('last-modified')
  const body = await res.text()

  spinner.destroy()
  render(title, body, lastModified)
})()
