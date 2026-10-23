/**
 * Coordenadas coladas do Google Maps, nos jeitos que o Maps entrega:
 *  - números: "-10.8775, -61.9512" (botão direito no mapa → clicar nos números copia assim);
 *  - com vírgula decimal: "-10,8775; -61,9512" ou "-10,8775 -61,9512";
 *  - graus, minutos e segundos: 10°52'39.1"S 61°57'04.4"W;
 *  - o link do Maps: …/@-10.8775,-61.9512,17z ou …?q=-10.8775,-61.9512.
 * Devolve null se não der para ler ou se estiver fora do mundo (latitude ±90, longitude ±180).
 */
export function lerCoordenadas(texto: string): { lat: number; lng: number } | null {
  const t = texto.trim()
  if (!t) return null
  const ok = (lat: number, lng: number) => (Number.isFinite(lat) && Number.isFinite(lng) && Math.abs(lat) <= 90 && Math.abs(lng) <= 180 ? { lat: arred(lat), lng: arred(lng) } : null)

  // link do Maps
  const url = t.match(/@(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)/) ?? t.match(/[?&](?:q|query|ll|center)=(-?\d+(?:\.\d+)?)(?:,|%2C)\s*(-?\d+(?:\.\d+)?)/i)
  if (url) return ok(Number(url[1]), Number(url[2]))

  // graus, minutos e segundos
  const gms = [...t.matchAll(/(\d+(?:[.,]\d+)?)\s*°\s*(?:(\d+(?:[.,]\d+)?)\s*['′]\s*)?(?:(\d+(?:[.,]\d+)?)\s*(?:"|″|'')\s*)?([NSLOEW])/gi)]
  if (gms.length === 2) {
    const val = (m: RegExpMatchArray) => {
      const n = (s?: string) => (s ? Number(s.replace(',', '.')) : 0)
      const v = n(m[1]) + n(m[2]) / 60 + n(m[3]) / 3600
      return /[SOW]/i.test(m[4]) ? -v : v
    }
    const [a, b] = gms
    const aLat = /[NS]/i.test(a[4])
    return aLat ? ok(val(a), val(b)) : ok(val(b), val(a))
  }

  // dois números com ponto decimal ("-10.8775, -61.9512")
  const ponto = t.match(/^\(?\s*(-?\d+(?:\.\d+)?)\s*[,;\s]\s*(-?\d+(?:\.\d+)?)\s*\)?$/)
  if (ponto) return ok(Number(ponto[1]), Number(ponto[2]))
  // dois números com vírgula decimal ("-10,8775; -61,9512" ou "-10,8775 -61,9512")
  const virgula = t.match(/^\(?\s*(-?\d+(?:,\d+)?)\s*(?:;\s*|\s+)(-?\d+(?:,\d+)?)\s*\)?$/)
  if (virgula) return ok(Number(virgula[1].replace(',', '.')), Number(virgula[2].replace(',', '.')))
  return null
}

const arred = (n: number) => Math.round(n * 1e6) / 1e6

/** Coordenadas no jeito de colar no Google Maps. */
export const textoCoordenadas = (lat?: number, lng?: number) => (lat === undefined || lng === undefined ? '' : `${lat}, ${lng}`)

/**
 * Coordenadas no formato do Google Maps em graus, minutos e segundos (o que o Maps mostra e copia),
 * ex.: 9°52'45.8"S 63°02'23.5"W.
 */
export function textoGMS(lat?: number, lng?: number): string {
  if (lat === undefined || lng === undefined || !Number.isFinite(lat) || !Number.isFinite(lng)) return ''
  const um = (v: number, pos: string, neg: string) => {
    const a = Math.abs(v)
    let g = Math.floor(a)
    let m = Math.floor((a - g) * 60)
    let s = Math.round(((a - g) * 60 - m) * 600) / 10 // segundos com 1 casa
    if (s >= 60) { s = 0; m += 1 }
    if (m >= 60) { m = 0; g += 1 }
    const ss = s.toFixed(1).padStart(4, '0')
    return `${g}°${String(m).padStart(2, '0')}'${ss}"${v < 0 ? neg : pos}`
  }
  return `${um(lat, 'N', 'S')} ${um(lng, 'E', 'W')}`
}
