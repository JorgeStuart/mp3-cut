/** Extensões listadas no diálogo “Abrir arquivo” do sistema. */
export const EXTENSOES_ABRIR = [
  'mp3',
  'mpeg',
  'mpg',
  'mpga',
  'mp2',
  'wav',
  'wave',
  'ogg',
  'oga',
  'flac',
  'm4a',
  'aac',
  'opus',
  'wma',
  'webm',
  'weba',
  'mp4',
  'mkv'
] as const

export function opcoesDialogoAbrir(): {
  title: string
  properties: Array<'openFile'>
  filters: { name: string; extensions: string[] }[]
} {
  return {
    title: 'Escolher arquivo de áudio',
    properties: ['openFile'],
    filters: [
      { name: 'Áudio (todos os formatos suportados)', extensions: [...EXTENSOES_ABRIR] },
      { name: 'MPEG / MP3', extensions: ['mpeg', 'mpg', 'mpga', 'mp3'] },
      { name: 'WAV', extensions: ['wav', 'wave'] },
      { name: 'OGG', extensions: ['ogg', 'oga'] },
      { name: 'FLAC', extensions: ['flac'] },
      { name: 'Todos os arquivos', extensions: ['*'] }
    ]
  }
}
