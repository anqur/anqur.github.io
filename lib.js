const XHR = window.XMLHttpRequest
const xhr = new XHR()

class _Response {
  constructor () {
    this.headers = {
      get: this._getResHeader
    }
  }

  ok = xhr.status === 200

  text = () => new Promise((resolve, reject) => {
    resolve(xhr.responseText)
  })

  _getResHeader = key => xhr.getResponseHeader(key)
}

const fetch = url => new Promise((resolve, reject) => {
  xhr.open('GET', url, true)
  xhr.send()
  xhr.onreadystatechange = () => {
    if (xhr.readyState === XHR.DONE && xhr.status === 200) {
      resolve(new _Response())
    } else {
      if (xhr.status !== 200) reject(new Error('fetch not ok'))
    }
  }
})

export { fetch }
