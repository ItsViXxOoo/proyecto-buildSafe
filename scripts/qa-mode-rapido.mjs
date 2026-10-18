// QA visual del Modo Rápido (pasos + Finalizar) con Puppeteer + Chromium local.
// Uso: node scripts/qa-mode-rapido.mjs
import puppeteer from 'puppeteer'
import { mkdirSync } from 'node:fs'

const BASE = process.env.BASE_URL ?? 'http://localhost:5173'
const OUT = 'scripts/qa-shots'
mkdirSync(OUT, { recursive: true })

async function clickText(page, selector, text) {
  const handles = await page.$$(selector)
  for (const h of handles) {
    const t = (await h.evaluate((el) => el.textContent)).trim()
    if (t.toLowerCase().includes(text.toLowerCase())) {
      await h.click()
      return true
    }
  }
  return false
}

const browser = await puppeteer.launch({ headless: 'new' })
const page = await browser.newPage()
await page.setViewport({ width: 1280, height: 900 })
page.on('pageerror', (e) => console.error('[pageerror]', e.message))
page.on('console', (m) => {
  if (m.type() === 'error') console.error('[console]', m.text())
})

// 1) Presupuesto
await page.goto(`${BASE}/builder-rapido/presupuesto`, { waitUntil: 'networkidle2' })
await page.screenshot({ path: `${OUT}/1-presupuesto.png` })
await clickText(page, '.quick-pick-card', 'Equilibrado')
await page.click('.wizard-nav .btn-primary')

// 2) Uso
await page.waitForSelector('.uso-card')
await clickText(page, '.uso-card', 'Gaming')
await page.screenshot({ path: `${OUT}/2-uso.png` })
await page.click('.wizard-nav .btn-primary')

// 3) Resolución
await page.waitForSelector('.resolucion-card')
await clickText(page, '.resolucion-card', '1080p')
await page.screenshot({ path: `${OUT}/3-resolucion.png` })
await page.click('.wizard-nav .btn-primary')

// 4) Detalles
await page.waitForSelector('.prioridad-card')
await page.screenshot({ path: `${OUT}/4-detalles.png` })
await page.click('.wizard-nav .btn-primary')

// 5) Finalizar (espera recomendaciones)
await page.waitForSelector('.componente-recomendado-card', { timeout: 30000 })
await new Promise((r) => setTimeout(r, 2500))
await page.screenshot({ path: `${OUT}/5-finalizar.png`, fullPage: true })

// Diagnóstico de la card: fotos, iconos y botón cambiar
const diag = await page.evaluate(() => {
  const cards = [...document.querySelectorAll('.componente-recomendado-card')]
  return {
    nCards: cards.length,
    cards: cards.map((c) => {
      const img = c.querySelector('.componente-recomendado-imagen')
      const btn = c.querySelector('.componente-recomendado-editar')
      const btnIcon = btn?.querySelector('.material-symbols-outlined')
      const iconCS = btnIcon ? getComputedStyle(btnIcon) : null
      const headCS = btn ? getComputedStyle(btn) : null
      return {
        tipo: c.querySelector('.componente-recomendado-tipo')?.textContent,
        imgSrc: img?.getAttribute('src') ?? null,
        imgNatural: img ? `${img.naturalWidth}x${img.naturalHeight}` : 'SIN<img>',
        imgComplete: img?.complete ?? null,
        btnVisible: btn ? !!(btn.offsetWidth || btn.offsetHeight) : false,
        btnPaddingY: headCS?.paddingTop,
        btnWidth: btn?.offsetWidth,
        btnHeight: btn?.offsetHeight,
        iconFontSize: iconCS?.fontSize,
        iconFontFamily: iconCS?.fontFamily?.slice(0, 40),
        iconVisibleOverlap: iconCS ? `${iconCS.display}/${iconCS.visibility}` : null,
      }
    }),
  }
})
console.log(JSON.stringify(diag, null, 2))

// 6) Detalle de componente: clic en la primera card (flujo modo rápido)
await page.click('.componente-recomendado-card')
await page.waitForSelector('.detalle-componente', { timeout: 15000 })
await new Promise((r) => setTimeout(r, 1200))
await page.screenshot({ path: `${OUT}/6-detalle.png`, fullPage: true })

// 7) Añadir a mi build -> vuelve a Finalizar con el badge 'manual'
await page.click('.detalle-btn-principal')
await page.waitForSelector('.componente-recomendado-card', { timeout: 20000 })
await new Promise((r) => setTimeout(r, 1500))
const badges = await page.evaluate(() => document.querySelectorAll('.componente-recomendado-editado').length)
console.log('badges manual tras añadir:', badges)
await page.screenshot({ path: `${OUT}/7-finalizar-tras-anadir.png`, fullPage: true })

await browser.close()
console.log('QA listo: screenshots en', OUT)
