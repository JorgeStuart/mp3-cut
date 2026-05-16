import { contextBridge, ipcRenderer } from 'electron'

/**
 * Ponte de IPC mínima: diálogo de salvar no formato original do arquivo.
 * Processamento de áudio fica no renderer (offline).
 */
contextBridge.exposeInMainWorld('electronAPI', {
  abrirArquivo: async () => {
    return ipcRenderer.invoke('abrir-arquivo') as Promise<{
      ok: boolean
      cancelado?: boolean
      erro?: string
      nome?: string
      dados?: Uint8Array
    }>
  },
  salvarAudio: async (payload: {
    nomeSugerido: string
    dados: Uint8Array
    extensao: string
    transcodificarDeWav: boolean
  }) => {
    return ipcRenderer.invoke('salvar-audio', payload) as Promise<{
      ok: boolean
      cancelado?: boolean
      erro?: string
      caminho?: string
    }>
  }
})
