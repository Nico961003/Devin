import fs from 'node:fs'
import request from 'supertest'
import { describe, expect, it, vi } from 'vitest'
import {
  createApp,
  MAX_FILE_SIZE_BYTES,
  releaseFileBuffer,
  resolveFileSizeLimit,
} from '../server/src/app.js'

const validCsv = Buffer.from('observation_date,DEXUSEU\n2025-01-01,1.1\n2025-01-02,1.2')

function upload(app, csv, filename = 'rates.csv') {
  return request(app).post('/api/exchange-rates').attach('file', csv, { filename, contentType: 'text/csv' })
}

describe('POST /api/exchange-rates', () => {
  it('procesa en memoria un único archivo y responde conforme al contrato', async () => {
    const response = await upload(createApp(), validCsv)

    expect(response.status).toBe(200)
    expect(response.body.data).toEqual([
      { date: '2025-01-01', usdPerEur: 1.1, eurPerUsd: 1 / 1.1 },
      { date: '2025-01-02', usdPerEur: 1.2, eurPerUsd: 1 / 1.2 },
    ])
    expect(response.body.summary).toEqual({
      totalRows: 2,
      validRows: 2,
      discardedRows: 0,
      minDate: '2025-01-01',
      maxDate: '2025-01-02',
    })
  })

  it('responde FILE_REQUIRED cuando falta el archivo', async () => {
    const response = await request(createApp()).post('/api/exchange-rates')

    expect(response.status).toBe(400)
    expect(response.body.error.code).toBe('FILE_REQUIRED')
  })

  it.each([
    ['columnas ausentes', Buffer.from('date,value\n2025-01-01,1.1'), 'MISSING_COLUMNS'],
    ['CSV ilegible', Buffer.from('observation_date,DEXUSEU\n"sin cierre,1.1'), 'INVALID_CSV'],
    ['datos no válidos', Buffer.from('observation_date,DEXUSEU\n2025-02-29,0'), 'NO_VALID_DATA'],
  ])('responde el error previsto para %s', async (_case, csv, code) => {
    const response = await upload(createApp(), csv)

    expect(response.status).toBe(400)
    expect(response.body).toEqual({ error: { code, message: expect.any(String) } })
  })

  it('entrega un búfer en memoria al procesador', async () => {
    let uploadedFile
    const app = createApp({
      processor: (buffer) => {
        uploadedFile = buffer
        return { data: [], summary: {} }
      },
    })
    const response = await upload(app, validCsv)

    expect(response.status).toBe(200)
    expect(Buffer.isBuffer(uploadedFile)).toBe(true)
  })
})

describe('seguridad de la carga', () => {
  it('usa 10 MB por defecto y limita cualquier configuración al máximo funcional', () => {
    expect(resolveFileSizeLimit()).toBe(MAX_FILE_SIZE_BYTES)
    expect(resolveFileSizeLimit(1024)).toBe(1024)
    expect(resolveFileSizeLimit(MAX_FILE_SIZE_BYTES * 2)).toBe(MAX_FILE_SIZE_BYTES)
    expect(resolveFileSizeLimit('inválido')).toBe(MAX_FILE_SIZE_BYTES)
  })

  it('responde FILE_TOO_LARGE cuando el archivo supera el límite configurado', async () => {
    const response = await upload(createApp({ fileSizeLimitBytes: 16 }), Buffer.alloc(17, 'a'))

    expect(response.status).toBe(413)
    expect(response.body.error.code).toBe('FILE_TOO_LARGE')
  })

  it.each([
    ['rates.txt', 'text/csv'],
    ['rates.csv', 'application/pdf'],
  ])('rechaza la combinación no admitida %s / %s', async (filename, contentType) => {
    const response = await request(createApp())
      .post('/api/exchange-rates')
      .attach('file', validCsv, { filename, contentType })

    expect(response.status).toBe(415)
    expect(response.body.error.code).toBe('UNSUPPORTED_FILE_TYPE')
  })

  it('rechaza más de un archivo', async () => {
    const response = await request(createApp())
      .post('/api/exchange-rates')
      .attach('file', validCsv, { filename: 'one.csv', contentType: 'text/csv' })
      .attach('file', validCsv, { filename: 'two.csv', contentType: 'text/csv' })

    expect(response.status).toBe(400)
    expect(response.body.error.code).toBe('INVALID_CSV')
  })

  it('no registra ni refleja el nombre o contenido del archivo', async () => {
    const log = vi.spyOn(console, 'log').mockImplementation(() => {})
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const error = vi.spyOn(console, 'error').mockImplementation(() => {})

    try {
      const response = await upload(createApp(), validCsv, '<script>alert(1)</script>.csv')
      const body = JSON.stringify(response.body)

      expect(response.status).toBe(200)
      expect(body).not.toContain('script')
      expect(body).not.toContain('observation_date')
      expect(log).not.toHaveBeenCalled()
      expect(warn).not.toHaveBeenCalled()
      expect(error).not.toHaveBeenCalled()
    } finally {
      log.mockRestore()
      warn.mockRestore()
      error.mockRestore()
    }
  })

  it('no utiliza escritura en disco durante la carga', async () => {
    const createWriteStream = vi.spyOn(fs, 'createWriteStream')
    const writeFile = vi.spyOn(fs, 'writeFile')
    const writeFileSync = vi.spyOn(fs, 'writeFileSync')

    try {
      const response = await upload(createApp(), validCsv)

      expect(response.status).toBe(200)
      expect(createWriteStream).not.toHaveBeenCalled()
      expect(writeFile).not.toHaveBeenCalled()
      expect(writeFileSync).not.toHaveBeenCalled()
    } finally {
      createWriteStream.mockRestore()
      writeFile.mockRestore()
      writeFileSync.mockRestore()
    }
  })

  it('elimina la referencia al búfer', () => {
    const file = { buffer: Buffer.from('contenido') }

    releaseFileBuffer(file)

    expect(file.buffer).toBeUndefined()
  })

  it('oculta detalles internos en errores inesperados', async () => {
    const app = createApp({
      processor: () => {
        throw new Error('C:\\ruta\\secreta\\archivo.csv')
      },
    })
    const response = await upload(app, validCsv)
    const body = JSON.stringify(response.body)

    expect(response.status).toBe(500)
    expect(response.body.error.code).toBe('INTERNAL_ERROR')
    expect(body).not.toContain('ruta')
    expect(body).not.toContain('stack')
  })
})
