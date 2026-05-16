import { existsSync, readFileSync } from 'node:fs'
import { basename } from 'node:path'
import { app, BrowserWindow, dialog, ipcMain } from 'electron'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

import { opcoesDialogoAbrir } from './abrirAudio'
import { gravarAudioExportado, opcoesDialogoSalvar } from './salvarAudio'

const __dirname = dirname(fileURLToPath(import.meta.url))

/** Builds geram preload como `.mjs`; mantemos fallback para `.js`. */
const caminhoPreload = existsSync(join(__dirname, '..', 'preload', 'index.mjs'))
  ? join(__dirname, '..', 'preload', 'index.mjs')
  : join(__dirname, '..', 'preload', 'index.js')

/** Mantém uma referência para que o objeto não caia para o GC no macOS. */
let win: BrowserWindow | null = null

function createWindow(): void {
  win = new BrowserWindow({
    width: 1080,
    height: 780,
    minWidth: 360,
    minHeight: 520,
    title: 'MP3 Cortar',
    backgroundColor: '#f7f8fa',
    webPreferences: {
      preload: caminhoPreload,
      contextIsolation: true,
      sandbox: false
    }
  })

  if (process.env['ELECTRON_RENDERER_URL']) {
    void win.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    void win.loadFile(join(__dirname, '../renderer/index.html'))
  }

  win.on('closed', () => {
    win = null
  })
}

type ResultadoSalvar = {
  ok: boolean
  cancelado?: boolean
  erro?: string
  caminho?: string
}

type ResultadoAbrir = {
  ok: boolean
  cancelado?: boolean
  erro?: string
  nome?: string
  dados?: Uint8Array
}

/** Diálogo nativo para abrir áudio — enxerga .mpeg e demais extensões no Linux. */
ipcMain.handle('abrir-arquivo', async (): Promise<ResultadoAbrir> => {
  try {
    const opcoes = opcoesDialogoAbrir()
    const { canceled, filePaths } =
      win !== null
        ? await dialog.showOpenDialog(win, opcoes)
        : await dialog.showOpenDialog(opcoes)

    if (canceled || !filePaths?.[0]) {
      return { ok: false, cancelado: true }
    }

    const caminho = filePaths[0]
    const buffer = readFileSync(caminho)
    return {
      ok: true,
      nome: basename(caminho),
      dados: new Uint8Array(buffer)
    }
  } catch (e) {
    const erro = e instanceof Error ? e.message : String(e)
    return { ok: false, erro }
  }
})

/** Diálogo nativo para salvar o áudio processado (mesmo formato do arquivo original). */
ipcMain.handle(
  'salvar-audio',
  async (
    _,
    payload: {
      nomeSugerido: string
      dados: Uint8Array | Buffer | ArrayBuffer
      extensao: string
      transcodificarDeWav: boolean
    }
  ): Promise<ResultadoSalvar> => {
    try {
      const { nomeSugerido, dados, extensao, transcodificarDeWav } = payload
      const opcoesDialogo = opcoesDialogoSalvar(nomeSugerido, extensao)

      const { canceled, filePath } =
        win !== null
          ? await dialog.showSaveDialog(win, opcoesDialogo)
          : await dialog.showSaveDialog(opcoesDialogo)

      if (canceled || !filePath) {
        return { ok: false, cancelado: true }
      }

      const caminho = await gravarAudioExportado(filePath, dados, extensao, transcodificarDeWav)

      return { ok: true, caminho }
    } catch (e) {
      const erro = e instanceof Error ? e.message : String(e)
      return { ok: false, erro }
    }
  }
)

if (process.platform === 'win32') {
  app.setAppUserModelId('com.mp3cut.app')
}

void app.whenReady().then(() => {
  createWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow()
    }
  })
})

/** No macOS, apps ficam abertos até o usuário usar Cmd+Q. */
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})
