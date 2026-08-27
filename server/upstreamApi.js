const DEFAULT_TIMEOUT_MS = 150000

function configuredUrls() {
  return String(process.env.UPSTREAM_API_URLS || '')
    .split(',')
    .map((url) => url.trim().replace(/\/$/, ''))
    .filter(Boolean)
}

export function hasUpstreamApi() {
  return configuredUrls().length > 0
}

export async function fetchUpstreamJson(pathname, query = {}) {
  const urls = configuredUrls()
  const token = String(process.env.UPSTREAM_API_TOKEN || '')
  const timeoutMs = Number(process.env.UPSTREAM_API_TIMEOUT_MS || DEFAULT_TIMEOUT_MS)
  let lastError

  if (!urls.length) throw new Error('UPSTREAM_API_URLS no está configurado.')
  if (!token) throw new Error('UPSTREAM_API_TOKEN no está configurado.')

  for (const baseUrl of urls) {
    const url = new URL(pathname, `${baseUrl}/`)
    Object.entries(query).forEach(([key, value]) => {
      if (value) url.searchParams.set(key, String(value))
    })

    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), timeoutMs)

    try {
      const response = await fetch(url, {
        headers: { authorization: `Bearer ${token}` },
        signal: controller.signal,
      })
      const payload = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(payload.message || `El puente respondió HTTP ${response.status}.`)
      return payload
    } catch (error) {
      lastError = error
    } finally {
      clearTimeout(timeout)
    }
  }

  if (lastError?.name === 'AbortError') throw new Error('El puente de la oficina agotó el tiempo de espera.')
  throw new Error(`Ningún puente de la oficina respondió. ${lastError?.message || ''}`.trim())
}
