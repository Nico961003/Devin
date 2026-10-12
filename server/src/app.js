import path from 'node:path'
import express from 'express'
import multer from 'multer'
import { API_ERROR_CODES, createApiError } from '../../shared/contracts.js'
import { ApiError } from './api-error.js'
import { processCsv } from './csv-processor.js'

export const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024

const ALLOWED_CSV_TYPES = new Set(['text/csv', 'application/csv', 'application/vnd.ms-excel'])

export function resolveFileSizeLimit(value) {
  const parsedValue = Number(value)

  if (!Number.isFinite(parsedValue) || parsedValue <= 0) {
    return MAX_FILE_SIZE_BYTES
  }

  return Math.min(Math.floor(parsedValue), MAX_FILE_SIZE_BYTES)
}

export function releaseFileBuffer(file) {
  if (file) {
    file.buffer = undefined
  }
}

export function createApp({ processor = processCsv, fileSizeLimitBytes } = {}) {
  const app = express()
  const upload = multer({
    storage: multer.memoryStorage(),
    limits: {
      fileSize: resolveFileSizeLimit(fileSizeLimitBytes ?? process.env.CSV_FILE_SIZE_LIMIT_BYTES),
      files: 1,
      fields: 0,
    },
    fileFilter: (_request, file, callback) => {
      const validExtension = path.extname(file.originalname).toLowerCase() === '.csv'
      const validType = ALLOWED_CSV_TYPES.has(file.mimetype.toLowerCase())

      if (!validExtension || !validType) {
        callback(new ApiError(415, API_ERROR_CODES.UNSUPPORTED_FILE_TYPE, 'Selecciona un archivo con extensión .csv y tipo CSV válido.'))
        return
      }

      callback(null, true)
    },
  }).single('file')

  app.disable('x-powered-by')
  app.get('/api/health', (_request, response) => {
    response.json({ status: 'ok' })
  })

  app.post('/api/exchange-rates', (request, response, next) => {
    upload(request, response, (error) => (error ? next(error) : next()))
  }, (request, response, next) => {
    if (!request.file) {
      next(new ApiError(400, API_ERROR_CODES.FILE_REQUIRED, 'Selecciona un archivo CSV para continuar.'))
      return
    }

    try {
      response.json(processor(request.file.buffer))
    } catch (error) {
      next(error)
    } finally {
      releaseFileBuffer(request.file)
    }
  })

  app.use((error, _request, response, _next) => {
    if (error instanceof multer.MulterError && error.code === 'LIMIT_FILE_SIZE') {
      response.status(413).json(createApiError(API_ERROR_CODES.FILE_TOO_LARGE, 'El archivo supera el límite permitido.'))
      return
    }

    if (error instanceof multer.MulterError) {
      response.status(400).json(createApiError(API_ERROR_CODES.INVALID_CSV, 'Envía un único archivo CSV en el campo file.'))
      return
    }

    if (error instanceof ApiError) {
      response.status(error.status).json(createApiError(error.code, error.message))
      return
    }

    response.status(500).json(createApiError(API_ERROR_CODES.INTERNAL_ERROR, 'Ocurrió un error interno. Inténtalo de nuevo.'))
  })

  return app
}
