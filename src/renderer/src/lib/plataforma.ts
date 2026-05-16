/** App desktop (Electron) com diálogos nativos e ffmpeg. */
export const ehElectron =
  typeof window !== 'undefined' &&
  typeof window.electronAPI !== 'undefined' &&
  window.electronAPI !== null

/** Versão no navegador (GitHub Pages, dev web, PWA). */
export const ehWeb = !ehElectron

/** Celular ou tablet — download automático costuma falhar (principalmente iOS). */
export const ehMobile =
  typeof navigator !== 'undefined' &&
  (/Android|iPhone|iPad|iPod/i.test(navigator.userAgent) ||
    (navigator.maxTouchPoints > 1 && /MacIntel|Macintosh/i.test(navigator.platform)))
