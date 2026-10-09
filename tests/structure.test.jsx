import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { App, getSelectedFileName } from '../frontend/src/App.jsx'

describe('estructura visual inicial', () => {
  const markup = renderToStaticMarkup(<App />)

  it('muestra título, instrucciones y las áreas en el orden requerido', () => {
    const labels = [
      'Tipo de cambio USD-EUR',
      'Carga un CSV',
      'Archivo de datos',
      'Estado',
      'Intervalo',
      'Leyenda',
      'Evolución del tipo de cambio',
    ]
    const positions = labels.map((label) => markup.indexOf(label))

    expect(positions.every((position) => position >= 0)).toBe(true)
    expect(positions).toEqual([...positions].sort((left, right) => left - right))
  })

  it('mantiene deshabilitados los controles dependientes de datos', () => {
    expect(markup.match(/<button[^>]*disabled/g)).toHaveLength(4)
    expect(markup).toContain('aria-disabled="true"')
    expect(markup).toContain('No se ha seleccionado ningún archivo.')
  })

  it('obtiene el nombre del archivo seleccionado para reflejarlo en la interfaz', () => {
    expect(getSelectedFileName([{ name: 'DEXUSEU.csv' }])).toBe('DEXUSEU.csv')
    expect(getSelectedFileName([])).toBe('')
  })
})
