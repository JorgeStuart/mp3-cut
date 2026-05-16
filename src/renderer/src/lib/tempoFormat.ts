/** Formata segundos como m:ss (ex.: 1:05). */
export function formatarTempo(seg: number): string {
  if (!Number.isFinite(seg) || seg < 0) return '0:00'
  const total = Math.floor(seg)
  const m = Math.floor(total / 60)
  const s = total % 60
  return `${m}:${s.toString().padStart(2, '0')}`
}

/**
 * Converte texto digitado em segundos.
 * Aceita: "90", "1:30", "01:05", "0:45.5"
 */
export function parsearTempoTexto(texto: string): number | null {
  const t = texto.trim().replace(',', '.')
  if (!t) return null

  if (/^\d+(\.\d+)?$/.test(t)) {
    const n = Number(t)
    return Number.isFinite(n) && n >= 0 ? n : null
  }

  const partes = t.split(':')
  if (partes.length === 2) {
    const m = Number(partes[0])
    const s = Number(partes[1])
    if (!Number.isFinite(m) || !Number.isFinite(s) || m < 0 || s < 0 || s >= 60) return null
    return m * 60 + s
  }

  if (partes.length === 3) {
    const h = Number(partes[0])
    const m = Number(partes[1])
    const s = Number(partes[2])
    if (![h, m, s].every(Number.isFinite) || h < 0 || m < 0 || s < 0 || m >= 60 || s >= 60) {
      return null
    }
    return h * 3600 + m * 60 + s
  }

  return null
}

export function limitarSeg(seg: number, min: number, max: number): number {
  return Math.min(Math.max(seg, min), max)
}
