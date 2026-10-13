export const ERROR_MESSAGES = Object.freeze({
  FILE_REQUIRED: 'Selecciona un archivo CSV para continuar.',
  INVALID_CSV: 'No se pudo leer el CSV. Comprueba que use UTF-8, comas y una fila de encabezado.',
  MISSING_COLUMNS: 'El archivo debe incluir las columnas observation_date y DEXUSEU.',
  NO_VALID_DATA: 'No hay observaciones válidas. Revisa las fechas y los tipos de cambio.',
  FILE_TOO_LARGE: 'El archivo no puede superar los 10 MB.',
  UNSUPPORTED_FILE_TYPE: 'Selecciona un archivo CSV válido con extensión .csv.',
  INTERNAL_ERROR: 'Ocurrió un error interno. Inténtalo de nuevo.',
  NETWORK_ERROR: 'No se pudo conectar con el servidor. Comprueba la conexión e inténtalo de nuevo.',
  INVALID_RESPONSE: 'El servidor devolvió una respuesta no válida. Inténtalo de nuevo.',
})

export function getErrorMessage(error) {
  return ERROR_MESSAGES[error?.code] ?? error?.message ?? ERROR_MESSAGES.INTERNAL_ERROR
}

export function getUiState({ isProcessing, error, result }) {
  if (isProcessing) {
    return 'loading'
  }

  if (error) {
    return 'error'
  }

  if (result?.summary?.discardedRows > 0) {
    return 'partial'
  }

  if (result?.data?.length) {
    return 'success'
  }

  return 'idle'
}
