export type ArquivoParaBaixar = {
  url: string
  nome: string
  mime: string
  bytes: Uint8Array
}

export function criarArquivoParaBaixar(bytes: Uint8Array, nome: string, mime: string): ArquivoParaBaixar {
  const copia = new Uint8Array(bytes)
  const blob = new Blob([copia.buffer.slice(copia.byteOffset, copia.byteOffset + copia.byteLength)], {
    type: mime
  })
  return {
    url: URL.createObjectURL(blob),
    nome,
    mime,
    bytes: copia
  }
}

export function revogarArquivoParaBaixar(arquivo: ArquivoParaBaixar | null): void {
  if (arquivo?.url) {
    URL.revokeObjectURL(arquivo.url)
  }
}

/** Desktop: clique programático no link (funciona na maioria dos navegadores de PC). */
export function dispararDownloadPorLink(url: string, nome: string): void {
  const a = document.createElement('a')
  a.href = url
  a.download = nome
  a.rel = 'noopener'
  a.style.display = 'none'
  document.body.appendChild(a)
  a.click()
  a.remove()
}

export function podeCompartilharArquivo(arquivo: ArquivoParaBaixar): boolean {
  if (typeof navigator.share !== 'function' || typeof navigator.canShare !== 'function') {
    return false
  }
  try {
    const file = new File([arquivo.bytes], arquivo.nome, { type: arquivo.mime })
    return navigator.canShare({ files: [file] })
  } catch {
    return false
  }
}

/** iPhone/Android: folha nativa → “Salvar em Arquivos”, Drive, WhatsApp, etc. */
export async function compartilharArquivo(arquivo: ArquivoParaBaixar): Promise<void> {
  const file = new File([arquivo.bytes], arquivo.nome, { type: arquivo.mime })
  await navigator.share({ files: [file], title: arquivo.nome })
}
