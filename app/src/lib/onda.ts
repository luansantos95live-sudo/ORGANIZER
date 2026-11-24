/**
 * Curva suave ("onda") que passa por todos os pontos sem ultrapassar os vizinhos (cúbica monotônica,
 * Fritsch–Carlson): a linha não desce abaixo de zero nem inventa picos entre um mês e outro.
 * Pontos com x igualmente espaçados, em coordenadas do SVG.
 */
export function caminhoOnda(p: [number, number][]): string {
  const n = p.length
  if (!n) return ''
  if (n === 1) return `M${p[0][0]},${p[0][1]}`
  const dx = p[1][0] - p[0][0]
  const d = p.slice(1).map((q, i) => (q[1] - p[i][1]) / dx)
  const m = p.map((_, i) =>
    i === 0
      ? d[0]
      : i === n - 1
        ? d[n - 2]
        : d[i - 1] * d[i] <= 0
          ? 0
          : (d[i - 1] + d[i]) / 2,
  )
  for (let i = 0; i < n - 1; i++) {
    if (d[i] === 0) {
      m[i] = 0
      m[i + 1] = 0
      continue
    }
    const a = m[i] / d[i]
    const b = m[i + 1] / d[i]
    const s = a * a + b * b
    if (s > 9) {
      const t = 3 / Math.sqrt(s)
      m[i] = t * a * d[i]
      m[i + 1] = t * b * d[i]
    }
  }
  const f = (v: number) => Math.round(v * 100) / 100
  let c = `M${f(p[0][0])},${f(p[0][1])}`
  for (let i = 0; i < n - 1; i++) {
    const [x0, y0] = p[i]
    const [x1, y1] = p[i + 1]
    c += ` C${f(x0 + dx / 3)},${f(y0 + (m[i] * dx) / 3)} ${f(x1 - dx / 3)},${f(y1 - (m[i + 1] * dx) / 3)} ${f(x1)},${f(y1)}`
  }
  return c
}

/** Teto do eixo: um pouco acima do maior valor, num número redondo (no mínimo 4). */
export function tetoDoEixo(max: number): number {
  if (max <= 3) return 4
  const alvo = max * 1.15
  const passo = alvo <= 10 ? 2 : alvo <= 40 ? 5 : 10
  return Math.ceil(alvo / passo) * passo
}
