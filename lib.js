const XHR = window.XMLHttpRequest
const _xhr = new XHR()

class _Headers {
  get = key => _xhr.getResponseHeader(key)
}

class _Response {
  get ok () {
    return _xhr.status === 200
  }

  get headers () {
    return new _Headers()
  }

  text = () => new Promise((resolve, reject) => {
    resolve(_xhr.responseText)
  })
}

const fetch = url => new Promise((resolve, reject) => {
  _xhr.open('GET', url, true)
  _xhr.send()
  _xhr.onreadystatechange = () => {
    if (_xhr.readyState === XHR.DONE) resolve(new _Response())
    if (_xhr.status >= 500) reject(new Error('fetch error'))
  }
})

export { fetch }
