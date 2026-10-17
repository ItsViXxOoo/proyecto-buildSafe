import * as cheerio from 'cheerio'
import fetch from 'node-fetch'
import { CATEGORIES, USER_AGENT, REQUEST_DELAY_MS, MAX_RETRIES } from './categories.js'
import { PARSERS } from './parser.js'
import type { ScrapedComponent, ScrapeResult } from './types.js'
import { writeFileSync, readFileSync, existsSync } from 'fs'

const BASE_URL = 'https://www.solotodo.cl'
const OUTPUT_FILE = 'data/output.json'
const PROGRESS_FILE = 'data/progress.json'

async function fetchWithRetry(url: string, retries = MAX_RETRIES): Promise<string> {
  for (let i = 0; i < retries; i++) {
    try {
      const res = await fetch(url, {
        headers: {
          'User-Agent': USER_AGENT,
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'Accept-Language': 'es-CL,es;q=0.9,en;q=0.8',
        },
      })
      if (res.ok) return await res.text()
      console.log(`  Retry ${i + 1}/${retries} for ${url} (${res.status})`)
    } catch (e) {
      console.log(`  Retry ${i + 1}/${retries} for ${url} (${e})`)
    }
    await new Promise((r) => setTimeout(r, REQUEST_DELAY_MS * 2))
  }
  throw new Error(`Failed after ${retries} retries: ${url}`)
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function extractProductUrls($: cheerio.CheerioAPI): string[] {
  const urls: string[] = []
  $('a[href*="/products/"]').each((_, el) => {
    const href = $(el).attr('href')
    if (href && href.includes('/products/')) {
      const fullUrl = href.startsWith('http') ? href : `${BASE_URL}${href}`
      if (!urls.includes(fullUrl)) urls.push(fullUrl)
    }
  })
  return urls
}

async function scrapeCategory(
  slug: string,
  url: string,
  parserName: string,
  errors: string[],
  maxPages = 5,
): Promise<{ components: ScrapedComponent[]; pages: number }> {
  const components: ScrapedComponent[] = []
  let page = 1
  let hasMore = true

  while (hasMore && page <= maxPages) {
    const pageUrl = page === 1 ? url : `${url}?page=${page}`
    console.log(`  Page ${page}/${maxPages}...`)

    try {
      const html = await fetchWithRetry(pageUrl)
      const $ = cheerio.load(html)
      const productUrls = extractProductUrls($)

      if (productUrls.length === 0) {
        hasMore = false
        break
      }

      for (const productUrl of productUrls) {
        try {
          const productHtml = await fetchWithRetry(productUrl)
          const $p = cheerio.load(productHtml)
          const name = $p('h1').first().text().trim() || $p('title').first().text().trim()
          const price = extractPrice($p)
          const parser = PARSERS[parserName]

          if (parser) {
            components.push(parser($p, name, price))
            console.log(`    ${name}`)
          }
        } catch (e) {
          errors.push(`${productUrl}: ${e}`)
          console.log(`    Error: ${productUrl}`)
        }
        await sleep(REQUEST_DELAY_MS)
      }

      page++
    } catch (e) {
      errors.push(`${pageUrl}: ${e}`)
      hasMore = false
    }
  }

  return { components, pages: page - 1 }
}

function extractPrice($: cheerio.CheerioAPI): number | null {
  let minPrice: number | null = null
  // Buscar precios en elementos con clases comunes de SoloTodo
  const priceSelectors = [
    '.product-price',
    '.price',
    '[class*="price"]',
    '[class*="Price"]',
    '.offer-price',
    '.product-offer',
    '[class*="offer"]',
    '.price-tag'
  ]
  
  for (const selector of priceSelectors) {
    $(selector).each((_, el) => {
      const text = $(el).text()
      const match = text.match(/\$\s?(\d{1,3}(?:\.\d{3})*)/)
      if (match) {
        const price = parseInt(match[1].replace(/\./g, ''), 10)
        if (!minPrice || price < minPrice) {
          minPrice = price
        }
      }
    })
  }
  
  // Fallback: buscar en cualquier elemento que contenga patrón de precio CLP
  if (minPrice === null) {
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
  }
  
  return minPrice
}

function loadProgress(): { completedCategories: string[]; allComponents: ScrapedComponent[]; errors: string[] } {
  if (existsSync(PROGRESS_FILE)) {
    try {
      return JSON.parse(readFileSync(PROGRESS_FILE, 'utf-8'))
    } catch {
      return { completedCategories: [], allComponents: [], errors: [] }
    }
  }
  return { completedCategories: [], allComponents: [], errors: [] }
}

function saveProgress(progress: { completedCategories: string[]; allComponents: ScrapedComponent[]; errors: string[] }) {
  writeFileSync(PROGRESS_FILE, JSON.stringify(progress, null, 2))
}

async function main() {
  console.log('=== SoloTodo Scraper ===\n')

  const progress = loadProgress()
  const allComponents = progress.allComponents
  const errors = progress.errors

  for (const category of CATEGORIES) {
    if (progress.completedCategories.includes(category.slug)) {
      console.log(`\n[${category.slug}] Ya completado, saltando...`)
      continue
    }

    console.log(`\n[${category.slug}] ${category.url}`)

    const { components, pages } = await scrapeCategory(
      category.slug,
      category.url,
      category.parser,
      errors,
      5,
    )

    allComponents.push(...components)
    progress.completedCategories.push(category.slug)
    progress.allComponents = allComponents
    progress.errors = errors
    saveProgress(progress)

    console.log(`  ${components.length} productos en ${pages} páginas`)
    console.log(`  Progreso guardado en ${PROGRESS_FILE}`)
  }

  const result: ScrapeResult = {
    components: allComponents,
    errors,
    totalPages: 0,
    totalProducts: allComponents.length,
  }

  writeFileSync(OUTPUT_FILE, JSON.stringify(result, null, 2))
  console.log(`\n=== Resumen ===`)
  console.log(`Total componentes: ${allComponents.length}`)
  console.log(`Errores: ${errors.length}`)
  console.log(`\nOutput guardado en ${OUTPUT_FILE}`)
}

main().catch(console.error)
