import * as cheerio from 'cheerio'
import fetch from 'node-fetch'
import { writeFileSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const HERE = dirname(fileURLToPath(import.meta.url))

const USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'

const html = await (await fetch('https://www.solotodo.cl/unidades_de_estado_solido_ssds?page=1', {
  headers: { 'User-Agent': USER_AGENT, Accept: 'text/html', 'Accept-Language': 'es-CL,es;q=0.9' },
})).text()
writeFileSync(join(HERE, 'data', 'ssd_sample_page.html'), html)
const $ = cheerio.load(html)

// formularios / filtros con nombre de param
const params = []
$('form, select, input').each((_, el) => {
  void el
})
$('select[name], input[name]').each((_, el) => {
  params.push({ tag: el.tagName, name: $(el).attr('name'), value: $(el).attr('value') ?? '' })
})
// selects con ?json=style (Solotodo usa selects GET)
const selects = $('select').map((_, el) => ({
  name: $(el).attr('name'),
  options: $(el).find('option').map((___, o) => ({ v: $(o).attr('value'), t: $(o).text().trim().slice(0, 40) })).get().slice(0, 12),
})).get()

// tarjeta de producto: estructura alrededor de a[href*="/products/"]
const cardSample = $('a[href*="/products/"]').first().closest('div.card, div[class*="card"], section, div')
const productLinks = $('a[href*="/products/"]').map((_, el) => ({ href: $(el).attr('href') })).get().slice(0, 8)
// buscar el contenedor con clases de resultados
const contenedores = $('*').filter((_, el) => ($(el).text().includes('Capacidad') && $(el).children().length >= 4 && $(el).children().length <= 12)).length

console.log('params:', JSON.stringify(params.slice(0, 30), null, 1))
console.log('selects:', JSON.stringify(selects, null, 1))
console.log('productLinks:', JSON.stringify(productLinks, null, 1))
console.log('enviando html sample guardado; contenedores candidatos:', contenedores)
