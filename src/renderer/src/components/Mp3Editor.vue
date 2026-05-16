<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, ref, shallowRef, watch } from 'vue'
import WaveSurfer from 'wavesurfer.js'
import RegionsPlugin from 'wavesurfer.js/dist/plugins/regions.esm.js'

import {
  ACCEPT_INPUT_ARQUIVO,
  ehFormatoMp3Familia,
  extensaoExportavel,
  FORMATOS_EXPORT_FFMPEG,
  inferirExtensao,
  nomeSemExtensao,
  pareceArquivoAudio,
  rotuloFormato
} from '@renderer/lib/audioFormat'
import {
  codificarBufferParaMp3,
  codificarBufferParaWav,
  decodificarArquivo,
  fatiarBuffer,
  juntarComCrossfade
} from '@renderer/lib/audioMp3'
import {
  compartilharArquivo,
  criarArquivoParaBaixar,
  dispararDownloadPorLink,
  podeCompartilharArquivo,
  revogarArquivoParaBaixar,
  type ArquivoParaBaixar
} from '@renderer/lib/downloadArquivo'
import { formatarTempo, limitarSeg } from '@renderer/lib/tempoFormat'
import TempoInput from './TempoInput.vue'
import { ehMobile, ehWeb } from '@renderer/lib/plataforma'
import { gerarPicosOnda } from '@renderer/lib/waveformPeaks'

type Modo = 'aparar' | 'remover-meio'
type Aparo = 'terminar-aqui' | 'comecar-aqui'

const inputArquivo = ref<HTMLInputElement | null>(null)
const areaOnda = ref<HTMLDivElement | null>(null)

const arrastando = ref(false)
const carregando = ref(false)
const processando = ref(false)
const mensagem = ref<string | null>(null)
/** Arquivo pronto na web — link visível no celular (iOS ignora download automático). */
const arquivoExportado = ref<ArquivoParaBaixar | null>(null)
const compartilhando = ref(false)

const nomeBase = ref('')
const extensaoArquivo = ref('')
const duracao = ref(0)

const nomeArquivoExibicao = computed(() => {
  if (!nomeBase.value) return ''
  return extensaoArquivo.value ? `${nomeBase.value}.${extensaoArquivo.value}` : nomeBase.value
})

/** Buffer decodificado na memória — base de todos os cortes. */
const bufferDecodificado = shallowRef<AudioBuffer | null>(null)

const modo = ref<Modo>('aparar')
const tipoAparo = ref<Aparo>('terminar-aqui')

/** Valores em segundos usados quando o plug-in de regiões ainda não está pronto. */
const aparoInicio = ref(0)
const aparoFim = ref(0)
const remInicio = ref(0)
const remFim = ref(0)

const ondaPronta = ref(false)
const ondaFalhou = ref(false)

type CampoTempo = 'aparoFim' | 'aparoInicio' | 'remInicio' | 'remFim'

let audioContext: AudioContext | null = null

/** Instância do WaveSurfer — guardada como ref rasa para Vue não mexer dentro do objeto enorme da biblioteca. */
const wavesurfer = shallowRef<WaveSurfer | null>(null)
let regioes: RegionsPlugin | null = null
let regiaoAtual: ReturnType<RegionsPlugin['addRegion']> | null = null
let urlObjeto: string | null = null

const tituloRegiao = computed(() => (modo.value === 'remover-meio' ? 'Trecho a ser removido' : 'Parte que fica na faixa final'))

function definirMensagem(texto: string | null): void {
  mensagem.value = texto
}

function limparArquivoExportado(): void {
  revogarArquivoParaBaixar(arquivoExportado.value)
  arquivoExportado.value = null
}

const podeUsarCompartilhar = computed(() => {
  const arq = arquivoExportado.value
  return arq !== null && podeCompartilharArquivo(arq)
})

async function aoCompartilharExportado(): Promise<void> {
  const arq = arquivoExportado.value
  if (!arq) return

  compartilhando.value = true
  try {
    await compartilharArquivo(arq)
    definirMensagem('Use “Salvar em Arquivos” ou outro app na lista para guardar o áudio.')
  } catch (e) {
    if (e instanceof Error && e.name === 'AbortError') {
      definirMensagem('Compartilhamento cancelado.')
      return
    }
    const texto = e instanceof Error ? e.message : String(e)
    definirMensagem(`Não foi possível abrir o compartilhamento: ${texto}`)
  } finally {
    compartilhando.value = false
  }
}

function obterContextoAudio(): AudioContext {
  if (!audioContext) {
    audioContext = new AudioContext()
  }
  return audioContext
}

async function garantirContextoAtivo(): Promise<void> {
  const ctx = obterContextoAudio()
  if (ctx.state === 'suspended') {
    await ctx.resume()
  }
}

function limparWaveform(): void {
  regiaoAtual = null
  regioes = null
  ondaPronta.value = false
  ondaFalhou.value = false

  wavesurfer.value?.destroy()
  wavesurfer.value = null

  if (urlObjeto) {
    URL.revokeObjectURL(urlObjeto)
    urlObjeto = null
  }
}

function moverRegiao(inicio: number, fim: number): void {
  if (regiaoAtual) {
    regiaoAtual.setOptions({ start: inicio, end: fim })
    return
  }
  aplicarRegiaoVisual(inicio, fim)
}

function avisoTempoInvalido(): void {
  definirMensagem(
    'Tempo inválido. Digite só números (até 6) — o campo formata com ":" (ex.: 130 vira 1:30).'
  )
}

/**
 * Aplica tempo em segundos e sincroniza com a região na onda.
 */
function aplicarTempoSegundos(campo: CampoTempo, seg: number): void {
  const dur = bufferDecodificado.value?.duration
  if (!dur) return

  if (modo.value === 'aparar') {
    if (tipoAparo.value === 'terminar-aqui' && campo === 'aparoFim') {
      aparoFim.value = limitarSeg(seg, 0.05, dur)
      moverRegiao(0, aparoFim.value)
    } else if (tipoAparo.value === 'comecar-aqui' && campo === 'aparoInicio') {
      aparoInicio.value = limitarSeg(seg, 0, dur - 0.05)
      moverRegiao(aparoInicio.value, dur)
    }
  } else {
    if (campo === 'remInicio') {
      remInicio.value = limitarSeg(seg, 0, dur - 0.05)
    } else if (campo === 'remFim') {
      remFim.value = limitarSeg(seg, remInicio.value + 0.05, dur)
    }
    if (remFim.value <= remInicio.value) {
      remFim.value = Math.min(remInicio.value + 0.05, dur)
    }
    moverRegiao(remInicio.value, remFim.value)
  }
}

/**
 * Desenha a onda a partir dos picos do buffer (sem recodificar o arquivo — mais estável com .mpeg etc.).
 */
async function montarWaveform(buf: AudioBuffer): Promise<void> {
  ondaFalhou.value = false
  ondaPronta.value = false
  regiaoAtual = null
  regioes = null

  wavesurfer.value?.destroy()
  wavesurfer.value = null

  await nextTick()
  await nextTick()

  if (!areaOnda.value) {
    throw new Error('Área da linha do tempo indisponível.')
  }

  areaOnda.value.replaceChildren()

  const pluginRegioes = RegionsPlugin.create()
  regioes = pluginRegioes
  const picos = gerarPicosOnda(buf)

  return new Promise<void>((resolve, reject) => {
    const container = areaOnda.value
    if (!container) {
      reject(new Error('Área da linha do tempo indisponível.'))
      return
    }

    const ws = WaveSurfer.create({
      container,
      peaks: picos,
      duration: buf.duration,
      height: 128,
      waveColor: '#ced4e0',
      progressColor: '#2d6a9f',
      cursorColor: '#1a1c1f',
      normalize: true,
      interact: true,
      dragToSeek: false,
      plugins: [pluginRegioes]
    })

    wavesurfer.value = ws

    const timeout = window.setTimeout(() => {
      if (!ondaPronta.value) {
        reject(new Error('A linha do tempo demorou demais para carregar.'))
      }
    }, 20000)

    ws.once('ready', () => {
      window.clearTimeout(timeout)
      ondaPronta.value = true
      iniciarOuAtualizarRegiao()
      resolve()
    })

    ws.once('error', (err) => {
      window.clearTimeout(timeout)
      reject(err instanceof Error ? err : new Error('Erro ao desenhar a linha do tempo.'))
    })
  })
}

/**
 * Escolhe a região desenhada pelo usuário e mantém só um retângulo editável ao mesmo tempo,
 * como pede a experiência enxuta.
 */
function iniciarOuAtualizarRegiao(): void {
  if (!regioes || !bufferDecodificado.value) return

  const dur = bufferDecodificado.value.duration

  if (modo.value === 'aparar') {
    if (tipoAparo.value === 'terminar-aqui') {
      const inicio = 0
      const minimo = inicio + 0.05
      const candidato = Number.isFinite(aparoFim.value) ? aparoFim.value : dur
      const fim = Math.min(Math.max(candidato, minimo), dur)
      aparoFim.value = fim
      moverRegiao(inicio, fim)
    } else {
      const inicio = Math.min(Math.max(aparoInicio.value, 0), dur - 0.05)
      const fim = dur
      aparoInicio.value = inicio
      moverRegiao(inicio, fim)
    }
  } else {
    const i = Math.min(Math.max(remInicio.value, 0), dur - 0.1)
    const f = Math.min(Math.max(remFim.value, i + 0.05), dur)
    remInicio.value = i
    remFim.value = f
    moverRegiao(i, f)
  }
}

function aplicarRegiaoVisual(inicio: number, fim: number): void {
  if (!regioes) return

  regiaoAtual?.remove()

  const cor =
    modo.value === 'remover-meio' ? 'rgba(220, 88, 88, 0.22)' : 'rgba(45, 106, 159, 0.18)'

  regiaoAtual = regioes.addRegion({
    start: inicio,
    end: fim,
    color: cor,
    drag: true,
    resize: true
  })

  regiaoAtual.on('update', () => {
    sincronizarEstadoComRegiao()
  })

  regiaoAtual.on('update-end', () => {
    sincronizarEstadoComRegiao()
  })
}

function sincronizarEstadoComRegiao(): void {
  if (!regiaoAtual || !bufferDecodificado.value) return

  const inicio = regiaoAtual.start
  const fim = regiaoAtual.end
  const dur = bufferDecodificado.value.duration

  if (modo.value === 'aparar') {
    if (tipoAparo.value === 'terminar-aqui') {
      aparoFim.value = Math.min(fim, dur)
    } else {
      aparoInicio.value = Math.max(0, inicio)
    }
  } else {
    remInicio.value = Math.max(0, inicio)
    remFim.value = Math.min(fim, dur)
  }
}

function prepararValoresIniciais(buf: AudioBuffer): void {
  const dur = buf.duration
  duracao.value = dur
  aparoInicio.value = 0
  aparoFim.value = dur
  remInicio.value = Math.min(dur * 0.25, dur * 0.5)
  remFim.value = Math.min(dur * 0.5, dur * 0.75)
}

function bytesParaArrayBuffer(dados: Uint8Array): ArrayBuffer {
  return dados.buffer.slice(dados.byteOffset, dados.byteOffset + dados.byteLength) as ArrayBuffer
}

/**
 * Carrega o arquivo de áudio, decodifica e monta a onda com regiões arrastáveis.
 */
async function carregarDeOrigem(nome: string, bytes: ArrayBuffer, mime = ''): Promise<void> {
  if (!pareceArquivoAudio(nome, mime)) {
    definirMensagem('Escolha um arquivo de áudio (MP3, MPEG, WAV, OGG, FLAC, etc.).')
    return
  }

  carregando.value = true
  definirMensagem(null)
  limparArquivoExportado()

  try {
    await garantirContextoAtivo()

    const ctx = obterContextoAudio()
    const decodificado = await decodificarArquivo(bytes, ctx)

    const ext = inferirExtensao(nome, mime)

    bufferDecodificado.value = decodificado
    nomeBase.value = nomeSemExtensao(nome) || 'faixa'
    extensaoArquivo.value = ext
    prepararValoresIniciais(decodificado)

    if (!extensaoExportavel(ext)) {
      definirMensagem(
        `Arquivo aberto para edição. Ao salvar, o formato .${ext} pode não ser suportado — prefira MP3, WAV, OGG, FLAC, M4A ou AAC.`
      )
    }

    ondaFalhou.value = false
    await nextTick()
    try {
      await montarWaveform(decodificado)
    } catch (erroOnda) {
      ondaFalhou.value = true
      const detalhe = erroOnda instanceof Error ? erroOnda.message : String(erroOnda)
      definirMensagem(
        `Áudio carregado. A linha do tempo não apareceu (${detalhe}) — use os campos de tempo abaixo para cortar.`
      )
    }
  } catch (e) {
    const texto = e instanceof Error ? e.message : String(e)
    definirMensagem(`Não foi possível abrir este arquivo. Detalhe técnico: ${texto}`)
    limparWaveform()
    bufferDecodificado.value = null
    ondaFalhou.value = false
  } finally {
    carregando.value = false
  }
}

async function carregarArquivo(arquivo: File): Promise<void> {
  await carregarDeOrigem(arquivo.name, await arquivo.arrayBuffer(), arquivo.type)
}

async function abrirSeletor(): Promise<void> {
  if (window.electronAPI?.abrirArquivo) {
    const res = await window.electronAPI.abrirArquivo()
    if (res.cancelado) return
    if (!res.ok || !res.nome || !res.dados) {
      definirMensagem(res.erro ?? 'Não foi possível abrir o arquivo.')
      return
    }
    await carregarDeOrigem(res.nome, bytesParaArrayBuffer(res.dados))
    return
  }

  inputArquivo.value?.click()
}

function aoEscolherArquivo(e: Event): void {
  const alvo = e.target as HTMLInputElement
  const arquivo = alvo.files?.[0]
  if (arquivo) {
    void carregarArquivo(arquivo)
  }
  alvo.value = ''
}

function aoSoltarArquivo(e: DragEvent): void {
  e.preventDefault()
  arrastando.value = false
  const arquivo = e.dataTransfer?.files?.[0]
  if (arquivo) {
    void carregarArquivo(arquivo)
  }
}

/**
 * Monta o áudio final em memória conforme o modo escolhido.
 */
function montarBufferFinal(): AudioBuffer {
  const base = bufferDecodificado.value
  if (!base) {
    throw new Error('Nenhum áudio carregado.')
  }

  if (modo.value === 'aparar') {
    if (tipoAparo.value === 'terminar-aqui') {
      const fim = Math.min(Math.max(aparoFim.value, 0.05), base.duration)
      return fatiarBuffer(base, 0, fim)
    }

    const ini = Math.min(Math.max(aparoInicio.value, 0), base.duration - 0.05)
    return fatiarBuffer(base, ini, base.duration)
  }

  const i = Math.min(Math.max(remInicio.value, 0), base.duration - 0.05)
  const f = Math.min(Math.max(remFim.value, i + 0.02), base.duration)

  const antes = fatiarBuffer(base, 0, i)
  const depois = fatiarBuffer(base, f, base.duration)

  const cross = Math.min(Math.round(0.02 * base.sampleRate), antes.length, depois.length)
  return juntarComCrossfade(antes, depois, cross)
}

/**
 * Codifica no mesmo formato do arquivo original e pede ao sistema onde salvar.
 */
async function salvarArquivoEditado(): Promise<void> {
  if (!bufferDecodificado.value) {
    definirMensagem('Escolha um arquivo de áudio antes de salvar.')
    return
  }

  const ext = extensaoArquivo.value.toLowerCase()
  if (!extensaoExportavel(ext)) {
    definirMensagem('Este formato não pode ser exportado nesta versão.')
    return
  }

  processando.value = true
  definirMensagem(null)

  try {
    const finalBuffer = montarBufferFinal()
    const sugerido = `${nomeBase.value || 'faixa'}-editado.${ext}`

    let bytes: Uint8Array
    let mime: string
    let transcodificarDeWav = false

    if (window.electronAPI) {
      /** No app: WAV na memória + ffmpeg no sistema (estável para .mpeg, .mp3, .ogg…). */
      bytes = codificarBufferParaWav(finalBuffer)
      transcodificarDeWav = ext !== 'wav' && ext !== 'wave'
      mime = 'audio/wav'
    } else if (ehFormatoMp3Familia(ext)) {
      bytes = await codificarBufferParaMp3(finalBuffer, 128)
      mime = 'audio/mpeg'
    } else if (ext === 'wav' || ext === 'wave') {
      bytes = codificarBufferParaWav(finalBuffer)
      mime = 'audio/wav'
    } else if (FORMATOS_EXPORT_FFMPEG.has(ext)) {
      definirMensagem(
        ehWeb
          ? `No navegador só exportamos MP3 ou WAV. Para ${rotuloFormato(ext)}, use o app instalado no PC ou converta depois.`
          : `Para salvar em ${rotuloFormato(ext)}, use o app instalado (Electron). No navegador só exportamos MP3 ou WAV.`
      )
      return
    } else {
      throw new Error(`Formato .${ext} não suportado para exportação.`)
    }

    if (bytes.length === 0) {
      throw new Error('O áudio processado ficou vazio. Ajuste os tempos de corte e tente de novo.')
    }

    if (window.electronAPI) {
      const res = await window.electronAPI.salvarAudio({
        nomeSugerido: sugerido,
        dados: bytes,
        extensao: ext,
        transcodificarDeWav
      })
      if (res.cancelado) {
        definirMensagem('Salvamento cancelado — nada foi alterado no disco.')
      } else if (!res.ok) {
        definirMensagem(res.erro ?? 'Não foi possível salvar.')
      } else {
        definirMensagem(`Pronto! Arquivo salvo em: ${res.caminho ?? ''}`)
      }
    } else {
      limparArquivoExportado()
      const pronto = criarArquivoParaBaixar(bytes, sugerido, mime)
      arquivoExportado.value = pronto

      if (ehMobile) {
        definirMensagem(
          'Arquivo pronto! Toque em “Baixar arquivo” abaixo. No iPhone, use “Compartilhar” → Salvar em Arquivos.'
        )
      } else {
        dispararDownloadPorLink(pronto.url, pronto.nome)
        definirMensagem('Download iniciado no navegador.')
      }
    }
  } catch (e) {
    const texto = e instanceof Error ? e.message : String(e)
    definirMensagem(`Algo deu errado ao preparar o arquivo: ${texto}`)
  } finally {
    processando.value = false
  }
}

const rotuloSalvar = computed(() => {
  const ext = extensaoArquivo.value
  if (!ext) return ehWeb ? 'Baixar arquivo editado' : 'Salvar arquivo editado'
  return ehWeb ? `Baixar ${rotuloFormato(ext)} editado` : `Salvar ${rotuloFormato(ext)} editado`
})

const textoProcessando = computed(() => {
  const ext = extensaoArquivo.value
  return ext ? `Preparando ${rotuloFormato(ext)}…` : 'Preparando arquivo…'
})

watch([modo, tipoAparo], () => {
  if (ondaPronta.value) {
    iniciarOuAtualizarRegiao()
  }
})

onBeforeUnmount(() => {
  limparWaveform()
  limparArquivoExportado()
  void audioContext?.close()
  audioContext = null
})
</script>

<template>
  <section class="card-app overflow-hidden p-4 sm:p-6 md:p-8">
    <input
      ref="inputArquivo"
      class="hidden"
      type="file"
      :accept="ACCEPT_INPUT_ARQUIVO"
      @change="aoEscolherArquivo"
    />

    <!-- Área grande e amigável para arrastar arquivo -->
    <div
      class="relative flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed border-accent/35 bg-gradient-to-br from-accent/10 via-white to-paper px-4 py-10 text-center transition active:scale-[0.99] sm:px-6 sm:py-14 md:py-16 hover:border-accent/60 hover:shadow-soft"
      :class="{ 'border-accent bg-accent/5 shadow-soft': arrastando }"
      role="button"
      tabindex="0"
      aria-label="Arrastar arquivo de áudio ou clicar para selecionar"
      @click="void abrirSeletor()"
      @keydown.enter.prevent="void abrirSeletor()"
      @keydown.space.prevent="void abrirSeletor()"
      @dragenter.prevent="arrastando = true"
      @dragover.prevent="arrastando = true"
      @dragleave.prevent="arrastando = false"
      @drop.prevent="aoSoltarArquivo"
    >
      <div
        class="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-accent/15 text-2xl text-accent"
        aria-hidden="true"
      >
        ♪
      </div>
      <p class="text-base font-semibold text-ink sm:text-lg">Arraste seu áudio aqui</p>
      <p class="mt-2 max-w-sm px-2 text-sm leading-relaxed text-ink/70">
        MP3, MPEG, WAV, OGG, FLAC e mais. O arquivo salvo fica no mesmo formato.
      </p>
      <button
        type="button"
        class="btn-primario mt-6 max-w-xs sm:mt-8"
        @click.stop="void abrirSeletor()"
      >
        Escolher arquivo
      </button>
      <p v-if="carregando" class="mt-6 text-sm text-accent">Abrindo o áudio…</p>
    </div>

    <div v-if="bufferDecodificado" class="mt-6 space-y-5 sm:mt-10 sm:space-y-8">
      <div class="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
        <div class="min-w-0 flex-1">
          <p class="text-xs uppercase tracking-wide text-ink/50">Arquivo carregado</p>
          <p class="mt-1 break-all text-base font-semibold sm:text-lg">{{ nomeArquivoExibicao }}</p>
          <p class="mt-1 text-sm text-ink/60">Duração: {{ formatarTempo(duracao) }}</p>
        </div>
        <button type="button" class="btn-secundario shrink-0" @click="void abrirSeletor()">
          Trocar arquivo
        </button>
      </div>

      <!-- Onda -->
      <div class="rounded-2xl border border-line bg-paper/50 p-4 sm:bg-white sm:p-6">
        <div class="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
          <div class="min-w-0">
            <p class="text-xs uppercase tracking-wide text-ink/50">Linha do tempo</p>
            <p class="text-base font-semibold leading-snug text-ink sm:text-lg">
              Arraste na onda ou digite o tempo nos campos
            </p>
          </div>
          <span
            class="w-fit shrink-0 rounded-full bg-accent/10 px-3 py-1.5 text-xs font-medium text-accent"
            :title="tituloRegiao"
          >
            {{ tituloRegiao }}
          </span>
        </div>

        <div class="relative mt-4 min-h-[100px] w-full overflow-hidden rounded-xl sm:mt-6 sm:min-h-[132px]">
          <p
            v-if="!ondaPronta && !ondaFalhou"
            class="absolute inset-0 z-10 flex items-center justify-center text-sm text-ink/55"
          >
            Gerando linha do tempo…
          </p>
          <p
            v-else-if="ondaFalhou"
            class="absolute inset-0 z-10 flex items-center justify-center rounded-xl border border-dashed border-line bg-paper px-4 text-center text-sm text-ink/60"
          >
            Linha do tempo indisponível — use os campos de tempo abaixo.
          </p>
          <div ref="areaOnda" class="w-full" :class="{ invisible: ondaFalhou }" />
        </div>
        <p class="mt-4 text-xs text-ink/55">
          Tempo: digite só números (máx. 6). O campo mostra <strong>:</strong> automaticamente — ex. digite
          <strong>130</strong> e aparece <strong>1:30</strong>.
        </p>
      </div>

      <!-- Modos -->
      <div class="grid grid-cols-1 gap-3 sm:gap-4 md:grid-cols-2 md:gap-6">
        <button
          type="button"
          class="btn-modo"
          :class="
            modo === 'aparar'
              ? 'border-accent bg-accent/5 shadow-soft ring-2 ring-accent/20'
              : 'border-line bg-paper hover:border-accent/40'
          "
          @click="modo = 'aparar'"
        >
          <p class="text-xs uppercase tracking-wide text-ink/50">Modo 1</p>
          <p class="mt-2 text-base font-semibold sm:text-lg">Aparar início ou fim</p>
          <p class="mt-2 text-sm leading-relaxed text-ink/70">
            Escolha onde o áudio começa ou termina.
          </p>
        </button>

        <button
          type="button"
          class="btn-modo"
          :class="
            modo === 'remover-meio'
              ? 'border-accent bg-accent/5 shadow-soft ring-2 ring-accent/20'
              : 'border-line bg-paper hover:border-accent/40'
          "
          @click="modo = 'remover-meio'"
        >
          <p class="text-xs uppercase tracking-wide text-ink/50">Modo 2</p>
          <p class="mt-2 text-base font-semibold sm:text-lg">Remover o meio</p>
          <p class="mt-2 text-sm leading-relaxed text-ink/70">
            Marque o trecho do meio que será retirado.
          </p>
        </button>
      </div>

      <!-- Opções dentro do modo Aparar -->
      <div v-if="modo === 'aparar'" class="space-y-4 rounded-2xl border border-line bg-paper p-4 sm:px-6 sm:py-6">
        <p class="text-sm font-medium text-ink">O que deseja ajustar?</p>
        <div class="grid gap-3 sm:grid-cols-2">
          <button
            type="button"
            class="rounded-2xl border px-4 py-4 text-left text-sm transition"
            :class="tipoAparo === 'terminar-aqui' ? 'border-accent bg-white shadow-soft' : 'border-line bg-white/60'"
            @click="tipoAparo = 'terminar-aqui'"
          >
            <span class="block text-xs uppercase tracking-wide text-ink/45">Guardar desde o começo</span>
            <span class="mt-2 block font-semibold">Encerrar a faixa aqui</span>
            <span class="mt-1 block text-ink/65">Remove tudo que vem depois do ponto marcado.</span>
          </button>

          <button
            type="button"
            class="rounded-2xl border px-4 py-4 text-left text-sm transition"
            :class="tipoAparo === 'comecar-aqui' ? 'border-accent bg-white shadow-soft' : 'border-line bg-white/60'"
            @click="tipoAparo = 'comecar-aqui'"
          >
            <span class="block text-xs uppercase tracking-wide text-ink/45">Começar mais adiante</span>
            <span class="mt-2 block font-semibold">Onde o áudio começa</span>
            <span class="mt-1 block text-ink/65">Remove o começo e mantém o restante.</span>
          </button>
        </div>

        <div class="grid gap-4 sm:grid-cols-2">
          <div v-if="tipoAparo === 'terminar-aqui'" class="rounded-2xl border border-line bg-white px-4 py-4">
            <label class="text-xs uppercase tracking-wide text-ink/50" for="tempo-aparo-fim">Encerrar em</label>
            <TempoInput
              id="tempo-aparo-fim"
              :model-value="aparoFim"
              placeholder="0:00"
              @update:model-value="aplicarTempoSegundos('aparoFim', $event)"
              @invalido="avisoTempoInvalido"
            />
            <p class="mt-2 text-xs text-ink/60">Duração total: {{ formatarTempo(duracao) }}</p>
          </div>
          <div v-else class="rounded-2xl border border-line bg-white px-4 py-4">
            <label class="text-xs uppercase tracking-wide text-ink/50" for="tempo-aparo-inicio">Começar em</label>
            <TempoInput
              id="tempo-aparo-inicio"
              :model-value="aparoInicio"
              placeholder="0:00"
              @update:model-value="aplicarTempoSegundos('aparoInicio', $event)"
              @invalido="avisoTempoInvalido"
            />
            <p class="mt-2 text-xs text-ink/60">Duração total: {{ formatarTempo(duracao) }}</p>
          </div>
        </div>
      </div>

      <!-- Resumo modo remover meio -->
      <div v-else class="rounded-2xl border border-line bg-paper p-4 sm:px-6 sm:py-6">
        <p class="text-sm font-medium text-ink">Trecho a ser removido</p>
        <div class="mt-4 grid gap-4 sm:grid-cols-2">
          <div class="rounded-2xl border border-line bg-white px-4 py-4">
            <label class="text-xs uppercase tracking-wide text-ink/50" for="tempo-rem-inicio">Começa em</label>
            <TempoInput
              id="tempo-rem-inicio"
              :model-value="remInicio"
              placeholder="0:00"
              @update:model-value="aplicarTempoSegundos('remInicio', $event)"
              @invalido="avisoTempoInvalido"
            />
          </div>
          <div class="rounded-2xl border border-line bg-white px-4 py-4">
            <label class="text-xs uppercase tracking-wide text-ink/50" for="tempo-rem-fim">Termina em</label>
            <TempoInput
              id="tempo-rem-fim"
              :model-value="remFim"
              placeholder="0:00"
              @update:model-value="aplicarTempoSegundos('remFim', $event)"
              @invalido="avisoTempoInvalido"
            />
          </div>
        </div>
        <p class="mt-4 text-xs text-ink/60">
          O trecho entre esses dois tempos será removido; o restante é unido automaticamente.
        </p>
      </div>

      <div class="barra-salvar flex flex-col gap-3">
        <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
          <button
            type="button"
            class="btn-primario"
            :disabled="processando"
            @click="salvarArquivoEditado()"
          >
            {{ processando ? textoProcessando : rotuloSalvar }}
          </button>
          <p
            v-if="mensagem"
            class="rounded-xl bg-paper px-3 py-2 text-center text-sm leading-relaxed text-ink/75 sm:text-left"
          >
            {{ mensagem }}
          </p>
        </div>

        <div
          v-if="arquivoExportado && ehWeb"
          class="flex flex-col gap-2 rounded-2xl border border-accent/30 bg-accent/5 p-4"
        >
          <p class="text-center text-sm font-medium text-ink">Arquivo cortado pronto</p>
          <a
            :href="arquivoExportado.url"
            :download="arquivoExportado.nome"
            class="btn-primario text-center no-underline"
          >
            Baixar {{ arquivoExportado.nome }}
          </a>
          <button
            v-if="podeUsarCompartilhar"
            type="button"
            class="btn-secundario"
            :disabled="compartilhando"
            @click="void aoCompartilharExportado()"
          >
            {{ compartilhando ? 'Abrindo…' : 'Compartilhar / Salvar em Arquivos' }}
          </button>
          <p v-else-if="ehMobile" class="text-center text-xs text-ink/60">
            Se o botão Baixar não funcionar, use Compartilhar ou abra no Chrome.
          </p>
        </div>
      </div>
    </div>
  </section>
</template>
