const RETRYABLE_STATUS = new Set([408, 425, 429, 500, 502, 503, 504])

function wait(milliseconds) {
  return new Promise((resolve) => window.setTimeout(resolve, milliseconds))
}

export async function fetchWithRetry(url, options = {}) {
  const { attempts = 2, timeoutMs = 90000, ...fetchOptions } = options
  let lastError

  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    const controller = new AbortController()
    const timeout = window.setTimeout(() => controller.abort(), timeoutMs)

    try {
      const response = await fetch(url, { ...fetchOptions, signal: controller.signal })
      if (!RETRYABLE_STATUS.has(response.status) || attempt === attempts) return response
      lastError = new Error(`El servidor respondió HTTP ${response.status}.`)
    } catch (error) {
      lastError = error
      if (attempt === attempts) throw error
    } finally {
      window.clearTimeout(timeout)
    }

    await wait(attempt * 1500)
  }

  throw lastError
}

export async function checkApiHealth() {
  const response = await fetchWithRetry('/api/health', { attempts: 1, timeoutMs: 10000, cache: 'no-store' })
  if (!response.ok) throw new Error('El servicio de datos no está disponible.')
  return response.json()
}
