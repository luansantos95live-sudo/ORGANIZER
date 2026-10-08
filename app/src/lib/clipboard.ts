/** Copia texto para a área de transferência, com plano B para navegadores que recusam a API moderna. */
export async function copiar(texto: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(texto)
    return true
  } catch {
    try {
      const t = document.createElement('textarea')
      t.value = texto
      t.style.position = 'fixed'
      t.style.opacity = '0'
      document.body.appendChild(t)
      t.select()
      const ok = document.execCommand('copy')
      document.body.removeChild(t)
      return ok
    } catch {
      return false
    }
  }
}
