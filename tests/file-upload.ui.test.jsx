import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it } from 'vitest'
import { App } from '../frontend/src/App.jsx'
import { MAX_FILE_SIZE_BYTES, validateSelectedFile } from '../frontend/src/file-validation.js'

afterEach(cleanup)

const pendingUpload = () => new Promise(() => {})

describe('selector de archivo', () => {
  it('acepta un único CSV y refleja su nombre', () => {
    render(<App uploadFile={pendingUpload} />)
    const input = screen.getByLabelText('Seleccionar archivo CSV')
    const file = new File(['observation_date,DEXUSEU'], 'rates.csv', { type: 'text/csv' })

    fireEvent.change(input, { target: { files: [file] } })

    expect(input.multiple).toBe(false)
    expect(input.accept).toBe('.csv,text/csv')
    expect(screen.getByText('rates.csv')).toBeTruthy()
  })

  it('rechaza preliminarmente una extensión distinta de CSV', () => {
    render(<App />)
    const file = new File(['contenido'], 'rates.txt', { type: 'text/plain' })

    fireEvent.change(screen.getByLabelText('Seleccionar archivo CSV'), { target: { files: [file] } })

    expect(screen.getByText('Selecciona un archivo CSV válido con extensión .csv.')).toBeTruthy()
  })

  it('rechaza preliminarmente archivos superiores a 10 MB', () => {
    const file = new File(['contenido'], 'rates.csv', { type: 'text/csv' })
    Object.defineProperty(file, 'size', { value: MAX_FILE_SIZE_BYTES + 1 })

    expect(validateSelectedFile(file)?.code).toBe('FILE_TOO_LARGE')
  })

  it('reemplaza el archivo anterior sin recargar la página', () => {
    render(<App uploadFile={pendingUpload} />)
    const input = screen.getByLabelText('Seleccionar archivo CSV')

    fireEvent.change(input, { target: { files: [new File(['a'], 'first.csv', { type: 'text/csv' })] } })
    fireEvent.change(input, { target: { files: [new File(['b'], 'second.csv', { type: 'text/csv' })] } })

    expect(screen.queryByText('first.csv')).toBeNull()
    expect(screen.getByText('second.csv')).toBeTruthy()
  })

  it('tiene nombre accesible y recibe foco con teclado', async () => {
    const user = userEvent.setup()
    render(<App />)

    await user.tab()

    expect(document.activeElement).toBe(screen.getByLabelText('Seleccionar archivo CSV'))
  })
})
