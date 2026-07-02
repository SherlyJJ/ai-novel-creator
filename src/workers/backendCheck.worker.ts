const API_BASE = 'http://127.0.0.1:3001'

self.onmessage = async () => {
  try {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), 2500)
    const response = await fetch(`${API_BASE}/health`, {
      signal: controller.signal,
      method: 'GET',
    })
    clearTimeout(timer)
    self.postMessage({ available: response.ok })
  } catch {
    self.postMessage({ available: false })
  }
}

export {}
