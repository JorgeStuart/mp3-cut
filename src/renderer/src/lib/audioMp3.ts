/** Utilitários de áudio — decodificar, cortar, juntar e exportar (MP3, WAV, etc.). */

/**
 * Limita um índice de amostra ao tamanho do buffer.
 */
function clampSampleIndex(i: number, max: number): number {
  if (Number.isNaN(i) || !Number.isFinite(i)) return 0
  return Math.max(0, Math.min(max, Math.floor(i)))
}

/**
 * Converte tempo em segundos em índice de amostra.
 */
function secToIndex(sec: number, sampleRate: number, maxLength: number): number {
  return clampSampleIndex(sec * sampleRate, maxLength)
}

/**
 * Copia um trecho contínuo do buffer de áudio (em memória).
 */
export function fatiarBuffer(origem: AudioBuffer, inicioSec: number, fimSec: number): AudioBuffer {
  const sr = origem.sampleRate
  const canais = origem.numberOfChannels
  const inicio = secToIndex(inicioSec, sr, origem.length)
  const fim = secToIndex(fimSec, sr, origem.length)
  const comprimento = Math.max(0, fim - inicio)

  const destino = new AudioBuffer({
    length: comprimento,
    numberOfChannels: canais,
    sampleRate: sr
  })

  for (let c = 0; c < canais; c++) {
    const fonte = origem.getChannelData(c)
    const alvo = destino.getChannelData(c)
    alvo.set(fonte.subarray(inicio, fim))
  }

  return destino
}

/**
 * Junta vários trechos em ordem, copiando amostra a amostra.
 */
export function concatenarBuffers(partes: AudioBuffer[]): AudioBuffer {
  if (partes.length === 0) {
    throw new Error('Nada para juntar.')
  }

  const sr = partes[0].sampleRate
  const canais = partes[0].numberOfChannels

  for (const p of partes) {
    if (p.sampleRate !== sr || p.numberOfChannels !== canais) {
      throw new Error('Partes incompatíveis (taxa ou canais diferentes).')
    }
  }

  const total = partes.reduce((acc, p) => acc + p.length, 0)
  const saida = new AudioBuffer({
    length: total,
    numberOfChannels: canais,
    sampleRate: sr
  })

  let deslocamento = 0
  for (const p of partes) {
    for (let c = 0; c < canais; c++) {
      saida.getChannelData(c).set(p.getChannelData(c), deslocamento)
    }
    deslocamento += p.length
  }

  return saida
}

/**
 * Junta dois buffers com um cruzamento curto (crossfade) para reduzir estalos na emenda.
 * O trecho final de `a` e o trecho inicial de `b` se sobrepõem em `sobreposicao` amostras.
 */
export function juntarComCrossfade(a: AudioBuffer, b: AudioBuffer, sobreposicao: number): AudioBuffer {
  const sr = a.sampleRate
  const canais = a.numberOfChannels

  if (b.sampleRate !== sr || b.numberOfChannels !== canais) {
    throw new Error('Buffers incompatíveis para juntar.')
  }

  const n = Math.max(0, Math.min(sobreposicao, a.length, b.length))
  if (n === 0) {
    return concatenarBuffers([a, b])
  }

  /** Comprimento resultante sem duplicar a região cruzada. */
  const total = a.length + b.length - n
  const saida = new AudioBuffer({
    length: total,
    numberOfChannels: canais,
    sampleRate: sr
  })

  for (let c = 0; c < canais; c++) {
    const out = saida.getChannelData(c)
    const da = a.getChannelData(c)
    const db = b.getChannelData(c)

    /** Tronco inicial: tudo até o começo do crossfade na parte `a`. */
    const antes = Math.max(0, a.length - n)
    out.set(da.subarray(0, antes), 0)

    /** Região cruzada. */
    for (let i = 0; i < n; i++) {
      const t = i / Math.max(1, n - 1)
      const amostraA = da[a.length - n + i]
      const amostraB = db[i]
      out[antes + i] = amostraA * (1 - t) + amostraB * t
    }

    /** Restante de `b` após a sobreposição. */
    const inicioCopia = n
    out.set(db.subarray(inicioCopia), antes + n)
  }

  return saida
}

/** Converte amostras em ponto flutuante [-1,1] para inteiro PCM 16 bits. */
function floatTo16(pcm: Float32Array): Int16Array {
  const out = new Int16Array(pcm.length)
  for (let i = 0; i < pcm.length; i++) {
    const s = Math.max(-1, Math.min(1, pcm[i]))
    out[i] = s < 0 ? Math.round(s * 0x8000) : Math.round(s * 0x7fff)
  }
  return out
}

/**
 * Codifica um `AudioBuffer` em arquivo MP3 (mono ou estéreo) usando lamejs.
 * Esta etapa existe porque o navegador decodifica MP3 com facilidade, mas não o gera de volta.
 */
export async function codificarBufferParaMp3(buffer: AudioBuffer, bitrateKbps = 128): Promise<Uint8Array> {
  const lame = await import('lamejs')
  const Mp3Encoder = lame.Mp3Encoder

  const canais = buffer.numberOfChannels
  const sr = buffer.sampleRate

  if (canais <= 0 || canais > 2) {
    throw new Error('Use faixas mono ou estéreo — este app suporta até 2 canais.')
  }

  const encoder = new Mp3Encoder(canais, sr, bitrateKbps)
  const bloco = 1152
  const saida: number[] = []

  const mono = canais === 1
  const esquerda = floatTo16(buffer.getChannelData(0))
  const direita = mono ? null : floatTo16(buffer.getChannelData(1))

  for (let i = 0; i < esquerda.length; i += bloco) {
    const trechoE = esquerda.subarray(i, i + bloco)

    /** API do lamejs: mono recebe apenas um canal, estéreo recebe dois. */
    const mp3buf = mono ? encoder.encodeBuffer(trechoE) : encoder.encodeBuffer(trechoE, direita!.subarray(i, i + bloco))

    if (mp3buf.length > 0) {
      for (let j = 0; j < mp3buf.length; j++) {
        saida.push(mp3buf[j])
      }
    }
  }

  const fim = encoder.flush()
  if (fim.length > 0) {
    for (let j = 0; j < fim.length; j++) {
      saida.push(fim[j])
    }
  }

  return new Uint8Array(saida)
}

/**
 * Decodifica bytes de um arquivo de áudio suportado pelo navegador para `AudioBuffer`.
 */
export async function decodificarArquivo(arrayBuffer: ArrayBuffer, ctx: AudioContext): Promise<AudioBuffer> {
  const copia = arrayBuffer.slice(0)
  return await ctx.decodeAudioData(copia)
}

function escreverString(view: DataView, offset: number, texto: string): void {
  for (let i = 0; i < texto.length; i++) {
    view.setUint8(offset + i, texto.charCodeAt(i))
  }
}

/**
 * Codifica um `AudioBuffer` em WAV PCM 16 bits (mono ou estéreo intercalado).
 */
export function codificarBufferParaWav(buffer: AudioBuffer): Uint8Array {
  const canais = buffer.numberOfChannels
  const sr = buffer.sampleRate
  const bitsPerSample = 16
  const blockAlign = canais * (bitsPerSample / 8)
  const byteRate = sr * blockAlign
  const amostras = buffer.length
  const dataLength = amostras * blockAlign
  const headerLength = 44
  const total = headerLength + dataLength
  const saida = new Uint8Array(total)
  const view = new DataView(saida.buffer)

  escreverString(view, 0, 'RIFF')
  view.setUint32(4, total - 8, true)
  escreverString(view, 8, 'WAVE')
  escreverString(view, 12, 'fmt ')
  view.setUint32(16, 16, true)
  view.setUint16(20, 1, true)
  view.setUint16(22, canais, true)
  view.setUint32(24, sr, true)
  view.setUint32(28, byteRate, true)
  view.setUint16(32, blockAlign, true)
  view.setUint16(34, bitsPerSample, true)
  escreverString(view, 36, 'data')
  view.setUint32(40, dataLength, true)

  let offset = headerLength
  for (let i = 0; i < amostras; i++) {
    for (let c = 0; c < canais; c++) {
      const s = Math.max(-1, Math.min(1, buffer.getChannelData(c)[i]))
      const pcm = s < 0 ? Math.round(s * 0x8000) : Math.round(s * 0x7fff)
      view.setInt16(offset, pcm, true)
      offset += 2
    }
  }

  return saida
}
