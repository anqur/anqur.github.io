import qs from 'querystring'
import marked from 'marked'
import hljs from 'highlight.js/lib/highlight'

import './style.css'
import 'highlight.js/styles/default.css'

(async () => {
  [
    'javascript', 'python', 'bash', 'cpp', 'java', 'go', 'clojure'
  ].forEach(lang => {
    const module = require(`highlight.js/lib/languages/${lang}`)
    hljs.registerLanguage(lang, module)
  })

  marked.setOptions({
    highlight: code => {
      return hljs.highlightAuto(code).value
    }
  })

  const title = qs.parse(window.location.search.slice(1)).p || 'contents'
  const res = await window.fetch(`/content/${title}.md`)
  const lastModified = res.headers.get('last-modified')
  const body = await res.text()

  document.querySelector('main').insertAdjacentHTML('beforeend', marked(body))
  document.getElementById('last-modified').textContent = lastModified
  document.getElementById('footer-title').textContent = title
})()
