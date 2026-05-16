import { spawn } from 'node:child_process'
import { existsSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { app } from 'electron'
import ffmpegStatic from 'ffmpeg-static'

function caminhoFfmpeg(): string {
  const candidatos: string[] = []

  if (typeof ffmpegStatic === 'string' && ffmpegStatic.length > 0) {
    candidatos.push(ffmpegStatic)
  }

  if (app.isPackaged) {
    const nome = process.platform === 'win32' ? 'ffmpeg.exe' : 'ffmpeg'
    candidatos.push(
      join(process.resourcesPath, 'app.asar.unpacked', 'node_modules', 'ffmpeg-static', nome)
    )
  }

  for (const bin of candidatos) {
    if (existsSync(bin)) {
      return bin
    }
  }

  return 'ffmpeg'
}

function argumentosPorExtensao(ext: string, entrada: string, saida: string): string[] {
  const base = ['-y', '-hide_banner', '-loglevel', 'error', '-i', entrada]

  switch (ext) {
    case 'ogg':
    case 'oga':
      return [...base, '-c:a', 'libvorbis', '-q:a', '5', saida]
    case 'flac':
      return [...base, '-c:a', 'flac', saida]
    case 'm4a':
    case 'mp4':
      return [...base, '-c:a', 'aac', '-b:a', '192k', saida]
    case 'aac':
      return [...base, '-c:a', 'aac', '-b:a', '192k', saida]
    case 'opus':
      return [...base, '-c:a', 'libopus', '-b:a', '128k', saida]
    case 'wma':
      return [...base, '-c:a', 'wmav2', saida]
    case 'webm':
    case 'weba':
    case 'mkv':
      return [...base, '-c:a', 'libopus', '-b:a', '128k', saida]
    case 'mp3':
    case 'mpeg':
    case 'mpg':
    case 'mpga':
      return [...base, '-c:a', 'libmp3lame', '-b:a', '192k', saida]
    case 'mp2':
      return [...base, '-c:a', 'mp2', '-b:a', '192k', saida]
    default:
      return [...base, saida]
  }
}

export function transcodificarWavPara(
  wavBytes: Uint8Array | Buffer,
  extensaoDestino: string,
  caminhoSaida: string
): Promise<void> {
  const ext = extensaoDestino.toLowerCase()
  const dir = mkdtempSync(join(tmpdir(), 'mp3-cut-'))
  const entrada = join(dir, 'entrada.wav')

  try {
    const buffer = Buffer.isBuffer(wavBytes) ? wavBytes : Buffer.from(wavBytes)
    writeFileSync(entrada, buffer)

    const args = argumentosPorExtensao(ext, entrada, caminhoSaida)

    return new Promise((resolve, reject) => {
      const proc = spawn(caminhoFfmpeg(), args, { stdio: ['ignore', 'pipe', 'pipe'] })
      let stderr = ''

      proc.stderr?.on('data', (chunk: Buffer) => {
        stderr += chunk.toString()
      })

      proc.on('error', (err) => {
        reject(
          new Error(
            `ffmpeg não encontrado (${err.message}). Instale ffmpeg no sistema ou reinstale as dependências do app.`
          )
        )
      })

      proc.on('close', (code) => {
        if (code === 0) {
          resolve()
          return
        }
        reject(new Error(stderr.trim() || `ffmpeg encerrou com código ${code ?? '?'}`))
      })
    })
  } finally {
    try {
      rmSync(dir, { recursive: true, force: true })
    } catch {
      /* diretório temporário opcional */
    }
  }
}
