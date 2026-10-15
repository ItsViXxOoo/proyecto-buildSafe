import type { CategoryConfig } from './types.js'

export const CATEGORIES: CategoryConfig[] = [
  { slug: 'cpu', url: 'https://www.solotodo.cl/procesadores', parser: 'cpu' },
  { slug: 'gpu', url: 'https://www.solotodo.cl/tarjetas_de_video', parser: 'gpu' },
  { slug: 'ram', url: 'https://www.solotodo.cl/rams', parser: 'ram' },
  { slug: 'motherboard', url: 'https://www.solotodo.cl/placas_madre', parser: 'motherboard' },
  { slug: 'storage', url: 'https://www.solotodo.cl/discos_duros', parser: 'storage' },
  { slug: 'psu', url: 'https://www.solotodo.cl/fuentes_de_poder', parser: 'psu' },
  { slug: 'case', url: 'https://www.solotodo.cl/gabinetes', parser: 'case' },
  { slug: 'cooler', url: 'https://www.solotodo.cl/cpu_coolers', parser: 'cooler' },
]

export const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'

export const REQUEST_DELAY_MS = 1500
export const MAX_RETRIES = 3
export const MAX_CONCURRENT = 3
