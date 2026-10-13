export class ApiClientError extends Error {
  constructor(code, message) {
    super(message)
    this.name = 'ApiClientError'
    this.code = code
  }
}

export async function uploadExchangeRates(file, { signal } = {}) {
  const formData = new FormData()
  formData.append('file', file)

  let response

  try {
    response = await fetch('/api/exchange-rates', {
      method: 'POST',
      body: formData,
      signal,
    })
  } catch (error) {
    if (error.name === 'AbortError') {
      throw error
    }

    throw new ApiClientError('NETWORK_ERROR', 'No se pudo conectar con el servidor. Inténtalo de nuevo.')
  }

  let body

  try {
    body = await response.json()
  } catch {
    throw new ApiClientError('INVALID_RESPONSE', 'El servidor devolvió una respuesta no válida.')
  }

  if (!response.ok) {
    throw new ApiClientError(body?.error?.code ?? 'INTERNAL_ERROR', body?.error?.message ?? 'No se pudo procesar el archivo.')
  }

  return body
}
