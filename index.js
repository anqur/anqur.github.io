'use strict'

import qs from 'querystring'
import marked from 'marked'
import hljs from 'highlight.js/lib/highlight'

import langset from './langset'

import './style.css'
import 'highlight.js/styles/default.css'

const fetch = window.fetch
const MathJax = window.MathJax

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
    $loader.insertAdjacentHTML('beforeend', 'Fetching...')
  }

  _spin () {
    $spinner.textContent = this.arr[this.idx]
  }

  remove () {
    clearInterval(this.timer)
    $loader.remove()
  }

  _update () {
    let idx = this.idx
    idx = idx === this.arr.length - 1 ? 0 : idx + 1
    this.idx = idx
    this._spin()
  }
}

const render = (title, body, mod) => new Promise(resolve => {
  document.title = `cd ~/${title === 'contents' ? '' : title}`
  document.querySelector('main').insertAdjacentHTML('beforeend', marked(body))
  $lastModified.textContent = mod
  $footerTitle.textContent = title
  resolve()
})

;(async () => {
  const spinner = new Spinner()

  $scrollToTop.onclick = () => {
    window.scrollTo(0, 0)
    return false
  }

  langset.forEach(lang => hljs.registerLanguage(lang,
    require(`highlight.js/lib/languages/${lang}`)))
  marked.setOptions({ highlight: code => hljs.highlightAuto(code).value })

  const title = qs.parse(window.location.search.slice(1)).p || 'contents'
  const res = await fetch(`/content/${title}.md`)

  spinner.remove()

  if (res.ok) {
    const lastModified = res.headers.get('last-modified')
    const body = await res.text()
    await render(title, body, lastModified)

    if (title !== 'contents') {
      MathJax.Hub.Queue(['Typeset', MathJax.Hub])
    }
  } else {
    await render('err', '```bash\n$ echo $?\n404 # :(\n```', 'Page Not Found')
  }
})()
