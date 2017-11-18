const XHR = window.XMLHttpRequest
const _xhr = new XHR()

class _Header {
  get = key => _xhr.getResponseHeader(key)
}

class _Response {
  get ok () {
    return _xhr.status === 200
  }

  get headers () {
    return new _Header()
  }

  text = () => new Promise((resolve, reject) => {
    resolve(_xhr.responseText)
  })
}

const fetch = url => new Promise((resolve, reject) => {
  _xhr.open('GET', url, true)
  _xhr.send()
  _xhr.onreadystatechange = () => {
    if (_xhr.readyState === XHR.DONE && _xhr.status === 200) {
      resolve(new _Response())
    } else {
      if (_xhr.status !== 200) reject(new Error('fetch not ok'))
    }
  }
})

export { fetch }
