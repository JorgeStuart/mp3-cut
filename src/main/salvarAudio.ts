import { existsSync, statSync, writeFileSync } from 'node:fs'

import { bytesFromIpc } from './bytesFromIpc'
import { transcodificarWavPara } from './ffmpegTranscode'

const FILTROS: Record<string, { name: string; extensions: string[] }> = {
  mp3: { name: 'Áudio MP3', extensions: ['mp3'] },
  mpeg: { name: 'Áudio MPEG', extensions: ['mpeg', 'mpg', 'mpga'] },
  mp2: { name: 'Áudio MP2', extensions: ['mp2'] },
  wav: { name: 'Áudio WAV', extensions: ['wav', 'wave'] },
  ogg: { name: 'Áudio OGG', extensions: ['ogg', 'oga'] },
  flac: { name: 'Áudio FLAC', extensions: ['flac'] },
  m4a: { name: 'Áudio M4A', extensions: ['m4a'] },
  aac: { name: 'Áudio AAC', extensions: ['aac'] },
  opus: { name: 'Áudio Opus', extensions: ['opus'] },
  wma: { name: 'Áudio WMA', extensions: ['wma'] },
  webm: { name: 'Áudio WebM', extensions: ['webm', 'weba'] },
  mp4: { name: 'Áudio MP4', extensions: ['mp4'] },
  mkv: { name: 'Áudio MKV', extensions: ['mkv'] }
}

function filtroDialogo(ext: string): { name: string; extensions: string[] } {
  return FILTROS[ext] ?? { name: 'Áudio', extensions: [ext] }
}

function garantirExtensao(caminho: string, ext: string): string {
  const e = ext.toLowerCase()
  if (caminho.toLowerCase().endsWith(`.${e}`)) {
    return caminho
  }
  return `${caminho}.${e}`
}

function confirmarArquivoGravado(caminho: string): void {
  if (!existsSync(caminho)) {
    throw new Error('O arquivo não foi criado no disco.')
  }
  if (statSync(caminho).size === 0) {
    throw new Error('O arquivo foi criado vazio — tente outro formato ou reabra o áudio.')
  }
}

export async function gravarAudioExportado(
  caminhoDestino: string,
  dados: Uint8Array | Buffer | ArrayBuffer,
  extensao: string,
  transcodificarDeWav: boolean
): Promise<string> {
  const ext = extensao.toLowerCase()
  const destino = garantirExtensao(caminhoDestino, ext)
  const buffer = bytesFromIpc(dados)

  if (buffer.length === 0) {
    throw new Error('Não há dados de áudio para salvar.')
  }

  if (transcodificarDeWav) {
    await transcodificarWavPara(buffer, ext, destino)
    confirmarArquivoGravado(destino)
    return destino
  }

  writeFileSync(destino, buffer)
  confirmarArquivoGravado(destino)
  return destino
}

export function opcoesDialogoSalvar(nomeSugerido: string, extensao: string): {
  title: string
  defaultPath: string
  filters: { name: string; extensions: string[] }[]
} {
  const ext = extensao.toLowerCase()
  return {
    title: 'Onde guardar o áudio editado?',
    defaultPath: nomeSugerido,
    filters: [filtroDialogo(ext), { name: 'Todos os arquivos', extensions: ['*'] }]
  }
}
