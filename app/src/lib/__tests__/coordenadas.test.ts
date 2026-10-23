import { describe, expect, it } from 'vitest'
import { lerCoordenadas, textoCoordenadas, textoGMS } from '../coordenadas'

describe('coordenadas coladas do Google Maps', () => {
  it('números com ponto (o que o Maps copia)', () => {
    expect(lerCoordenadas('-10.8775, -61.9512')).toEqual({ lat: -10.8775, lng: -61.9512 })
    expect(lerCoordenadas('-10.877512345,-61.951234567')).toEqual({ lat: -10.877512, lng: -61.951235 })
    expect(lerCoordenadas('(-9.9133, -63.0408)')).toEqual({ lat: -9.9133, lng: -63.0408 })
  })
  it('números com vírgula decimal', () => {
    expect(lerCoordenadas('-10,8775; -61,9512')).toEqual({ lat: -10.8775, lng: -61.9512 })
    expect(lerCoordenadas('-10,8775 -61,9512')).toEqual({ lat: -10.8775, lng: -61.9512 })
  })
  it('graus, minutos e segundos', () => {
    const r = lerCoordenadas(`10°52'39.0"S 61°57'04.3"W`)!
    expect(r.lat).toBeCloseTo(-10.8775, 4)
    expect(r.lng).toBeCloseTo(-61.951194, 4)
  })
  it('o formato que o Google Maps copia (exemplo do usuário) e o caminho de volta', () => {
    const r = lerCoordenadas(`9°52'45.8"S 63°02'23.5"W`)!
    expect(r.lat).toBeCloseTo(-9.879389, 5)
    expect(r.lng).toBeCloseTo(-63.039861, 5)
    expect(textoGMS(r.lat, r.lng)).toBe(`9°52'45.8"S 63°02'23.5"W`)
    expect(textoGMS(-10.8775, -61.9512)).toBe(`10°52'39.0"S 61°57'04.3"W`)
    expect(textoGMS(undefined, 1)).toBe('')
  })
  it('link do Google Maps', () => {
    expect(lerCoordenadas('https://www.google.com/maps/@-10.8775,-61.9512,17z')).toEqual({ lat: -10.8775, lng: -61.9512 })
    expect(lerCoordenadas('https://www.google.com/maps/search/?api=1&query=-10.8775,-61.9512')).toEqual({ lat: -10.8775, lng: -61.9512 })
  })
  it('recusa o que não é coordenada', () => {
    expect(lerCoordenadas('')).toBeNull()
    expect(lerCoordenadas('Av. Brasil, 241')).toBeNull()
    expect(lerCoordenadas('-100, 20')).toBeNull()
  })
  it('texto para mostrar e copiar', () => {
    expect(textoCoordenadas(-10.8775, -61.9512)).toBe('-10.8775, -61.9512')
    expect(textoCoordenadas(undefined, 1)).toBe('')
  })
})
