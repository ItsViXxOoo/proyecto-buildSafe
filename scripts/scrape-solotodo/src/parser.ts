import * as cheerio from 'cheerio'
import type { ScrapedComponent } from './types.js'

function extractPrice($: cheerio.CheerioAPI): number | null {
  let minPrice: number | null = null
  $('div, span, p').each((_, el) => {
    const text = $(el).text()
    const match = text.match(/\$\s?(\d{1,3}(?:\.\d{3})*)/)
    if (match) {
      const price = parseInt(match[1].replace(/\./g, ''), 10)
      if (!minPrice || price < minPrice) {
        minPrice = price
      }
    }
  })
  return minPrice
}

function extractImageUrl($: cheerio.CheerioAPI): string | null {
  const img = $('img[src*="api.solotodo.com"], img[src*="/products/"], img[src*="/picture/"]').first()
  const src = img.attr('src')
  if (src && src.includes('width=')) {
    return src.replace(/width=\d+/, 'width=400').replace(/height=\d+/, 'height=400')
  }
  return src ?? img.attr('data-src') ?? null
}

function extractSpecs($: cheerio.CheerioAPI): Record<string, unknown> {
  const specs: Record<string, unknown> = {}
  $('.specs table tr, .specifications table tr, .characteristics table tr').each(
    (_, el) => {
      const key = $(el).find('th, td:first-child').text().trim()
      const value = $(el).find('td:last-child').text().trim()
      if (key && value) {
        specs[key] = value
      }
    },
  )
  return specs
}

function parseNumber(text: string): number | undefined {
  const match = text.replace(/[^\d.]/g, '').match(/[\d.]+/)
  return match ? parseFloat(match[0]) : undefined
}

export function parseCpu($: cheerio.CheerioAPI, name: string, price: number | null): ScrapedComponent {
  const specs = extractSpecs($)
  const brand = name.includes('Intel') ? 'Intel' : name.includes('AMD') ? 'AMD' : 'Unknown'

  return {
    name,
    brand,
    typeSlug: 'cpu',
    imageUrl: extractImageUrl($),
    priceCLP: price,
    priceUSD: null,
    specs,
    socket: specs['Socket'] as string | undefined,
    tdpW: parseNumber(specs['TDP'] as string ?? ''),
  }
}

export function parseGpu($: cheerio.CheerioAPI, name: string, price: number | null): ScrapedComponent {
  const specs = extractSpecs($)
  const brand = name.includes('NVIDIA') ? 'NVIDIA' : name.includes('AMD') ? 'AMD' : name.includes('Intel') ? 'Intel' : 'Unknown'

  return {
    name,
    brand,
    typeSlug: 'gpu',
    imageUrl: extractImageUrl($),
    priceCLP: price,
    priceUSD: null,
    specs,
    gpuLenMm: parseNumber(specs['Longitud'] as string ?? ''),
    tdpW: parseNumber(specs['TDP'] as string ?? ''),
  }
}

export function parseRam($: cheerio.CheerioAPI, name: string, price: number | null): ScrapedComponent {
  const specs = extractSpecs($)
  const capacityMatch = name.match(/(\d+)\s*GB/i)
  const speedMatch = name.match(/(\d{4,5})\s*MT/i)

  return {
    name,
    brand: 'Unknown',
    typeSlug: 'ram',
    imageUrl: extractImageUrl($),
    priceCLP: price,
    priceUSD: null,
    specs,
    capacityGb: capacityMatch ? parseInt(capacityMatch[1]) : undefined,
    speedMts: speedMatch ? parseInt(speedMatch[1]) : undefined,
    ramType: specs['Tipo'] as string | undefined,
  }
}

export function parseMotherboard($: cheerio.CheerioAPI, name: string, price: number | null): ScrapedComponent {
  const specs = extractSpecs($)
  const brandMatch = name.match(/^(ASUS|MSI|Gigabyte|ASRock|Biostar|EVGA)/i)

  return {
    name,
    brand: brandMatch ? brandMatch[1] : 'Unknown',
    typeSlug: 'motherboard',
    imageUrl: extractImageUrl($),
    priceCLP: price,
    priceUSD: null,
    specs,
    socket: specs['Socket'] as string | undefined,
    chipset: specs['Chipset'] as string | undefined,
    formFactor: specs['Formato'] as string | undefined,
    ramType: specs['Slots memorias'] as string | undefined,
  }
}

export function parseStorage($: cheerio.CheerioAPI, name: string, price: number | null): ScrapedComponent {
  const specs = extractSpecs($)
  const capacityMatch = name.match(/(\d+)\s*(GB|TB)/i)

  return {
    name,
    brand: 'Unknown',
    typeSlug: 'storage',
    imageUrl: extractImageUrl($),
    priceCLP: price,
    priceUSD: null,
    specs,
    capacityGb: capacityMatch ? (capacityMatch[2].toUpperCase() === 'TB' ? parseInt(capacityMatch[1]) * 1024 : parseInt(capacityMatch[1])) : undefined,
    interface: specs['Interfaz'] as string | undefined,
  }
}

export function parsePsu($: cheerio.CheerioAPI, name: string, price: number | null): ScrapedComponent {
  const specs = extractSpecs($)
  const wattMatch = name.match(/(\d+)\s*W/i)

  return {
    name,
    brand: 'Unknown',
    typeSlug: 'psu',
    imageUrl: extractImageUrl($),
    priceCLP: price,
    priceUSD: null,
    specs,
    psuWatts: wattMatch ? parseInt(wattMatch[1]) : parseNumber(specs['Potencia'] as string ?? ''),
  }
}

export function parseCase($: cheerio.CheerioAPI, name: string, price: number | null): ScrapedComponent {
  const specs = extractSpecs($)

  return {
    name,
    brand: 'Unknown',
    typeSlug: 'case',
    imageUrl: extractImageUrl($),
    priceCLP: price,
    priceUSD: null,
    specs,
    supportedFormFactors: (specs['Factores de forma soportados'] as string)?.split(',').map((s) => s.trim()),
    maxGpuLenMm: parseNumber(specs['Longitud máxima de GPU'] as string ?? ''),
    maxCoolerHeightMm: parseNumber(specs['Altura máxima de cooler'] as string ?? ''),
  }
}

export function parseCooler($: cheerio.CheerioAPI, name: string, price: number | null): ScrapedComponent {
  const specs = extractSpecs($)

  return {
    name,
    brand: 'Unknown',
    typeSlug: 'cooler',
    imageUrl: extractImageUrl($),
    priceCLP: price,
    priceUSD: null,
    specs,
    coolerHeightMm: parseNumber((specs['Altura'] as string) ?? ''),
  }
}

export const PARSERS: Record<string, ($: cheerio.CheerioAPI, name: string, price: number | null) => ScrapedComponent> = {
  cpu: parseCpu,
  gpu: parseGpu,
  ram: parseRam,
  motherboard: parseMotherboard,
  storage: parseStorage,
  psu: parsePsu,
  case: parseCase,
  cooler: parseCooler,
}
