/** Gera picos downsampled para o WaveSurfer a partir de um AudioBuffer. */
export function gerarPicosOnda(
  buffer: AudioBuffer,
  pontos = 1200
): Array<Float32Array | number[]> {
  const canais = buffer.numberOfChannels
  const total = buffer.length
  const passo = Math.max(1, Math.floor(total / pontos))
  const picos: Float32Array[] = []

  for (let c = 0; c < canais; c++) {
    const canal = buffer.getChannelData(c)
    const serie = new Float32Array(pontos)

    for (let i = 0; i < pontos; i++) {
      const ini = i * passo
      const fim = Math.min(ini + passo, total)
      let max = 0
      for (let j = ini; j < fim; j++) {
        const v = Math.abs(canal[j])
        if (v > max) max = v
      }
      serie[i] = max
    }

    picos.push(serie)
  }

  return picos
}
