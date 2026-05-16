/** Formata segundos como m:ss ou h:mm:ss quando passa de 1 hora. */
export function formatarTempo(seg: number): string {
  if (!Number.isFinite(seg) || seg < 0) return '0:00'
  const total = Math.floor(seg)
  const h = Math.floor(total / 3600)
  const m = Math.floor((total % 3600) / 60)
  const s = total % 60
  if (h > 0) {
    return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
  }
  return `${m}:${s.toString().padStart(2, '0')}`
}

/**
 * Só dígitos, sem ":" — lê da direita para a esquerda (ss, mm, hh).
 * 5 → 5s | 130 → 1:30 | 1230 → 12:30 | 10130 → 1:01:30 | 123045 → 12:30:45
 */
function parsearDigitosCompactos(digitos: string): number | null {
  const d = digitos.replace(/\D/g, '')
  if (!d) return null

  const len = d.length

  if (len <= 2) {
    const n = Number(d)
    return Number.isFinite(n) && n >= 0 ? n : null
  }

  let h = 0
  let m = 0
  let s = 0

  if (len === 3) {
    m = Number(d[0])
    s = Number(d.slice(1))
  } else if (len === 4) {
    m = Number(d.slice(0, 2))
    s = Number(d.slice(2))
  } else if (len === 5) {
    h = Number(d[0])
    m = Number(d.slice(1, 3))
    s = Number(d.slice(3))
  } else {
    const tail = d.slice(-6).padStart(6, '0')
    h = Number(tail.slice(0, 2))
    m = Number(tail.slice(2, 4))
    s = Number(tail.slice(4))
  }

  if (![h, m, s].every((n) => Number.isFinite(n)) || h < 0 || m < 0 || s < 0 || m >= 60 || s >= 60) {
    return null
  }

  return h * 3600 + m * 60 + s
}

/**
 * Converte texto digitado em segundos.
 * Aceita: "90", "130" (1:30), "10130" (1:01:30), "1:30", "1:01:30"
 */
export function parsearTempoTexto(texto: string): number | null {
  const t = texto.trim().replace(',', '.')
  if (!t) return null

  if (t.includes(':')) {
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

  if (/^\d+$/.test(t)) {
    return parsearDigitosCompactos(t)
  }

  if (/^\d+(\.\d+)?$/.test(t)) {
    const n = Number(t)
    return Number.isFinite(n) && n >= 0 ? n : null
  }

  return null
}

export function limitarSeg(seg: number, min: number, max: number): number {
  return Math.min(Math.max(seg, min), max)
}
