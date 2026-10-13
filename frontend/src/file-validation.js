export const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024

export function validateSelectedFile(file) {
  if (!file) {
    return { code: 'FILE_REQUIRED', message: 'Selecciona un archivo CSV para continuar.' }
  }

  if (!file.name.toLowerCase().endsWith('.csv')) {
    return { code: 'UNSUPPORTED_FILE_TYPE', message: 'Selecciona un archivo con extensión .csv.' }
  }

  if (file.size > MAX_FILE_SIZE_BYTES) {
    return { code: 'FILE_TOO_LARGE', message: 'El archivo no puede superar los 10 MB.' }
  }

  return null
}
