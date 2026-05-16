/** Máximo de dígitos (MMSS → até 99:59) — um a mais não entra. */
export const MAX_DIGITOS_TEMPO = 4

/** Formata segundos como minutos:segundos (ex.: 1:05, 90:00). */
export function formatarTempo(seg: number): string {
  if (!Number.isFinite(seg) || seg < 0) return '0:00'
  const total = Math.floor(seg)
  const m = Math.floor(total / 60)
  const s = total % 60
  return `${m}:${s.toString().padStart(2, '0')}`
}

/** Converte segundos para dígitos compactos sem ":" (ex.: 90 → "130"). */
export function segundosParaDigitos(seg: number): string {
  if (!Number.isFinite(seg) || seg < 0) return '0'
  const total = Math.floor(seg)
  const m = Math.floor(total / 60)
  const s = total % 60
  if (m === 0) return String(s)
  return `${m}${s.toString().padStart(2, '0')}`
}

/** Exibe min:seg com ":" enquanto digita (só números por baixo). */
export function formatarDigitosComColons(digitos: string): string {
  const d = digitos.replace(/\D/g, '').slice(0, MAX_DIGITOS_TEMPO)
  if (!d) return ''

  if (d.length <= 2) {
    return `0:${d.padStart(2, '0')}`
  }

  const m = d.slice(0, -2)
  const s = d.slice(-2)
  return `${m}:${s}`
}

/** Extrai só dígitos de texto colado (ex.: "12:30" → "1230"). */
export function extrairDigitosTempo(texto: string): string {
  return texto.replace(/\D/g, '').slice(0, MAX_DIGITOS_TEMPO)
}

function partesMinSeg(d: string): { m: number; s: number } | null {
  const len = d.length

  if (len <= 2) {
    const s = Number(d)
    if (!Number.isFinite(s) || s < 0 || s >= 60) return null
    return { m: 0, s }
  }

  const m = Number(d.slice(0, -2))
  const s = Number(d.slice(-2))

  if (!Number.isFinite(m) || !Number.isFinite(s) || m < 0 || s < 0 || s >= 60) {
    return null
  }

  return { m, s }
}

/** Converte dígitos compactos em segundos (só min:seg); inválido → null. */
export function parsearDigitosTempo(digitos: string): number | null {
  const d = digitos.replace(/\D/g, '')
  if (!d) return null
  const partes = partesMinSeg(d)
  if (!partes) return null
  return partes.m * 60 + partes.s
}

/**
 * Enquanto digita: bloqueia o 5º dígito e segundos ≥ 60.
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

  return Number(d.slice(-2)) < 60
}

export function limitarSeg(seg: number, min: number, max: number): number {
  return Math.min(Math.max(seg, min), max)
}
