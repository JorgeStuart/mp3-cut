export {}

declare global {
  interface Window {
    electronAPI?: {
      abrirArquivo: () => Promise<{
        ok: boolean
        cancelado?: boolean
        erro?: string
        nome?: string
        dados?: Uint8Array
      }>
      salvarAudio: (payload: {
        nomeSugerido: string
        dados: Uint8Array
        extensao: string
        transcodificarDeWav: boolean
      }) => Promise<{ ok: boolean; cancelado?: boolean; erro?: string; caminho?: string }>
    }
  }
}
