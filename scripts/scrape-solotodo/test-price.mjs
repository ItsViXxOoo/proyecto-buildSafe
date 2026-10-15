import fetch from 'node-fetch'
import * as cheerio from 'cheerio'
import { writeFileSync } from 'fs'

const html = await fetch('https://www.solotodo.cl/products/137994-amd-ryzen-5-5500-100-100000457box').then(r => r.text())
writeFileSync('data/product_sample.html', html)

const $ = cheerio.load(html)

let minPrice = null
$('div, span, p').each((_, el) => {
  const text = $(el).text().trim()
  const match = text.match(/^\$\s?(\d{1,3}(?:\.\d{3})*)$/)
  if (match) {
    const price = parseInt(match[1].replace(/\./g, ''), 10)
    if (!minPrice || price < minPrice) {
      minPrice = price
    }
  }
})

console.log('Min price found:', minPrice)

const allPrices = []
$('div, span, p').each((_, el) => {
  const text = $(el).text().trim()
  const match = text.match(/\$\s?(\d{1,3}(?:\.\d{3})*)/)
  if (match) {
    allPrices.push({ text: text.substring(0, 50), price: match[1] })
  }
})
console.log('All price matches:', allPrices.slice(0, 10))
