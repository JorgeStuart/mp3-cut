/** Converte o payload do IPC em Buffer (Electron às vezes não preserva Uint8Array). */
export function bytesFromIpc(dados: Uint8Array | Buffer | ArrayBuffer | { data?: number[]; type?: string }): Buffer {
  if (Buffer.isBuffer(dados)) {
    return dados
  }

  if (dados instanceof Uint8Array) {
    return Buffer.from(dados.buffer, dados.byteOffset, dados.byteLength)
  }

  if (dados instanceof ArrayBuffer) {
    return Buffer.from(dados)
  }

  if (dados && typeof dados === 'object' && 'data' in dados && Array.isArray(dados.data)) {
    return Buffer.from(dados.data)
  }

  return Buffer.from(dados as Uint8Array)
}
