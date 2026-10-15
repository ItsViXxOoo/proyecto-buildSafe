export interface ScrapedComponent {
  name: string
  brand: string
  typeSlug: string
  imageUrl: string | null
  priceCLP: number | null
  priceUSD: number | null
  specs: Record<string, unknown>
  socket?: string
  formFactor?: string
  ramType?: string
  chipset?: string
  capacityGb?: number
  speedMts?: number
  gpuLenMm?: number
  supportedFormFactors?: string[]
  maxGpuLenMm?: number
  maxCoolerHeightMm?: number
  coolerHeightMm?: number
  psuWatts?: number
  tdpW?: number
  interface?: string
}

export interface CategoryConfig {
  slug: string
  url: string
  parser: string
}

export interface ScrapeResult {
  components: ScrapedComponent[]
  errors: string[]
  totalPages: number
  totalProducts: number
}
