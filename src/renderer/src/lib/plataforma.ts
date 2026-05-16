/** App desktop (Electron) com diálogos nativos e ffmpeg. */
export const ehElectron =
  typeof window !== 'undefined' &&
  typeof window.electronAPI !== 'undefined' &&
  window.electronAPI !== null

/** Versão no navegador (GitHub Pages, dev web, PWA). */
export const ehWeb = !ehElectron
