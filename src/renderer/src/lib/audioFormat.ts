/** Família MPEG-1 Audio Layer III (.mp3, .mpeg, .mpga, etc.) — exporta com lamejs. */
export const EXTENSOES_MP3_FAMILIA = new Set(['mp3', 'mpeg', 'mpg', 'mpga'])

/** MPEG Layer II — só via ffmpeg. */
export const EXTENSOES_MP2 = new Set(['mp2'])

/** Extensões que o app exporta no renderer (sem ffmpeg). */
export const FORMATOS_EXPORT_LOCAL = new Set(['wav', 'wave', ...EXTENSOES_MP3_FAMILIA])

/** Extensões exportadas via ffmpeg a partir de WAV intermediário. */
export const FORMATOS_EXPORT_FFMPEG = new Set([
  ...EXTENSOES_MP2,
  'ogg',
  'oga',
  'flac',
  'm4a',
  'aac',
  'opus',
  'wma',
  'webm',
  'weba',
  'mkv',
  'mp4'
])

/** Extensões reconhecidas ao abrir arquivo (nome ou MIME). */
const EXTENSOES_AUDIO_NOME =
  /\.(mp3|mpeg|mpg|mp2|mpga|wav|wave|ogg|oga|flac|m4a|aac|opus|wma|webm|weba|mp4|mkv)$/i

/** Valor do `<input accept>` — inclui .mpeg e video/mpeg (GTK no Linux costuma ocultar .mpeg com só audio/*). */
export const ACCEPT_INPUT_ARQUIVO = [
  'audio/*',
  'video/mpeg',
  '.mp3',
  '.mpeg',
  '.mpg',
  '.mpga',
  '.mp2',
  '.wav',
  '.wave',
  '.ogg',
  '.oga',
  '.flac',
  '.m4a',
  '.aac',
  '.opus',
  '.wma',
  '.webm',
  '.weba',
  '.mp4',
  '.mkv'
].join(',')

const MIME_POR_EXT: Record<string, string> = {
  mp3: 'audio/mpeg',
  mpeg: 'audio/mpeg',
  mpg: 'audio/mpeg',
  mpga: 'audio/mpeg',
  mp2: 'audio/mpeg',
  wav: 'audio/wav',
  wave: 'audio/wav',
  ogg: 'audio/ogg',
  oga: 'audio/ogg',
  flac: 'audio/flac',
  m4a: 'audio/mp4',
  aac: 'audio/aac',
  opus: 'audio/opus',
  wma: 'audio/x-ms-wma',
  webm: 'audio/webm',
  weba: 'audio/webm',
  mp4: 'audio/mp4',
  mkv: 'video/webm'
}

export function extrairExtensao(nomeArquivo: string): string {
  const base = nomeArquivo.trim()
  const ponto = base.lastIndexOf('.')
  if (ponto <= 0 || ponto === base.length - 1) return ''
  return base.slice(ponto + 1).toLowerCase()
}

export function nomeSemExtensao(nomeArquivo: string): string {
  const base = nomeArquivo.trim()
  const ponto = base.lastIndexOf('.')
  if (ponto <= 0) return base
  return base.slice(0, ponto)
}

export function mimePorExtensao(ext: string): string {
  return MIME_POR_EXT[ext.toLowerCase()] ?? 'audio/*'
}

export function ehFormatoMp3Familia(ext: string): boolean {
  return EXTENSOES_MP3_FAMILIA.has(ext.toLowerCase())
}

export function extensaoExportavel(ext: string): boolean {
  const e = ext.toLowerCase()
  return FORMATOS_EXPORT_LOCAL.has(e) || FORMATOS_EXPORT_FFMPEG.has(e)
}

export function pareceArquivoAudio(nomeArquivo: string, mime = ''): boolean {
  const m = mime.toLowerCase()
  if (m.startsWith('audio/')) return true
  if (m.includes('mpeg')) return true
  if (m === 'application/octet-stream' && EXTENSOES_AUDIO_NOME.test(nomeArquivo.trim())) return true
  return EXTENSOES_AUDIO_NOME.test(nomeArquivo.trim())
}

export function rotuloFormato(ext: string): string {
  return ext.toUpperCase()
}

/** Infere extensão pelo nome ou pelo tipo MIME do arquivo. */
export function inferirExtensao(nomeArquivo: string, mime = ''): string {
  const ext = extrairExtensao(nomeArquivo)
  if (ext) return ext

  const m = mime.toLowerCase()
  if (m.includes('mpeg') || m.includes('mp3')) return 'mp3'
  if (m.includes('wav')) return 'wav'
  if (m.includes('ogg')) return 'ogg'
  if (m.includes('flac')) return 'flac'
  if (m.includes('aac')) return 'aac'
  if (m.includes('mp4') || m.includes('m4a')) return 'm4a'
  if (m.includes('opus')) return 'opus'
  if (m.includes('webm')) return 'webm'
  if (m.includes('wma')) return 'wma'

  return 'wav'
}
