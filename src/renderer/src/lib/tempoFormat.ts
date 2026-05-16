/** Máximo de dígitos (HHMMSS) — um a mais não entra. */
export const MAX_DIGITOS_TEMPO = 6

/** Formata segundos como m:ss ou h:mm:ss quando passa de 1 hora. */
export function formatarTempo(seg: number): string {
  if (!Number.isFinite(seg) || seg < 0) return '0:00'
  return formatarDigitosComColons(segundosParaDigitos(seg))
}

/** Converte segundos para a sequência numérica compacta (sem ":"). */
export function segundosParaDigitos(seg: number): string {
  if (!Number.isFinite(seg) || seg < 0) return '0'
  const total = Math.floor(seg)
  const h = Math.floor(total / 3600)
  const m = Math.floor((total % 3600) / 60)
  const s = total % 60

  if (h > 0) {
    return `${h}${m.toString().padStart(2, '0')}${s.toString().padStart(2, '0')}`
  }
  if (m > 0) {
    return `${m}${s.toString().padStart(2, '0')}`
  }
  return String(s)
}

/** Exibe sempre com ":" enquanto o usuário digita (só números por baixo). */
export function formatarDigitosComColons(digitos: string): string {
  const d = digitos.replace(/\D/g, '').slice(0, MAX_DIGITOS_TEMPO)
  const len = d.length

  if (len === 0) return ''
  if (len <= 2) return `0:${d.padStart(2, '0')}`
  if (len === 3) return `${d[0]}:${d.slice(1).padStart(2, '0')}`
  if (len === 4) return `${d.slice(0, 2)}:${d.slice(2)}`
  if (len === 5) return `${d[0]}:${d.slice(1, 3)}:${d.slice(3)}`
  return `${d.slice(0, 2)}:${d.slice(2, 4)}:${d.slice(4)}`
}

/** Extrai só dígitos de texto colado (ex.: "1:30" → "130"). */
export function extrairDigitosTempo(texto: string): string {
  return texto.replace(/\D/g, '').slice(0, MAX_DIGITOS_TEMPO)
}

function partesDeDigitos(d: string): { h: number; m: number; s: number } | null {
  const len = d.length

  if (len <= 2) {
    const s = Number(d)
    if (!Number.isFinite(s) || s < 0 || s >= 60) return null
    return { h: 0, m: 0, s }
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
  } else if (len === 6) {
    h = Number(d.slice(0, 2))
    m = Number(d.slice(2, 4))
    s = Number(d.slice(4))
  } else {
    return null
  }

  if (![h, m, s].every((n) => Number.isFinite(n)) || h < 0 || m < 0 || s < 0 || m >= 60 || s >= 60) {
    return null
  }

  return { h, m, s }
}

/** Converte dígitos compactos em segundos; inválido → null. */
export function parsearDigitosTempo(digitos: string): number | null {
  const d = digitos.replace(/\D/g, '')
  if (!d) return null
  const partes = partesDeDigitos(d)
  if (!partes) return null
  return partes.h * 3600 + partes.m * 60 + partes.s
}

/**
 * Enquanto digita: bloqueia o 7º dígito e combinações impossíveis (ex.: segundos ≥ 60).
 */
export function podeAceitarDigitos(digitos: string): boolean {
  const d = digitos.replace(/\D/g, '')
  if (d.length > MAX_DIGITOS_TEMPO) return false
  if (d.length === 0) return true
  if (parsearDigitosTempo(d) !== null) return true

  if (d.length <= 2) {
    if (d.length === 1) return true
    return Number(d) < 60
  }

  if (d.length === 3) {
    return Number(d.slice(1)) < 60
  }

  if (d.length === 4) {
    return Number(d.slice(0, 2)) < 60 && Number(d.slice(2)) < 60
  }

  if (d.length === 5) {
    return Number(d.slice(1, 3)) < 60
  }

  return false
}

export function limitarSeg(seg: number, min: number, max: number): number {
  return Math.min(Math.max(seg, min), max)
}
