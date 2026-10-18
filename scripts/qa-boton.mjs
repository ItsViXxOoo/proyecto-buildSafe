// Diag específico del botón Cambiar en el paso final
import puppeteer from 'puppeteer'

const BASE = process.env.BASE_URL ?? 'http://localhost:5173'

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
await page.goto(`${BASE}/builder-rapido/presupuesto`, { waitUntil: 'networkidle2' })
await clickText(page, '.quick-pick-card', 'Equilibrado')
await page.click('.wizard-nav .btn-primary')
await page.waitForSelector('.uso-card')
await clickText(page, '.uso-card', 'Gaming')
await page.click('.wizard-nav .btn-primary')
await page.waitForSelector('.resolucion-card')
await clickText(page, '.resolucion-card', '1080p')
await page.click('.wizard-nav .btn-primary')
await page.waitForSelector('.prioridad-card')
await page.click('.wizard-nav .btn-primary')
await page.waitForSelector('.componente-recomendado-card', { timeout: 30000 })
await page.waitForNetworkIdle({ idleTime: 1200 })

const info = await page.evaluate(() => {
  const btn = document.querySelector('.componente-recomendado-editar')
  const cs = getComputedStyle(btn)
  const r = btn.getBoundingClientRect()
  const header = btn.closest('.componente-recomendado-header').getBoundingClientRect()
  return {
    testo: btn.textContent,
    innerHTML: btn.innerHTML,
    rect: `${Math.round(r.x)},${Math.round(r.y)} ${Math.round(r.width)}x${Math.round(r.height)}`,
    headerRect: `${Math.round(header.width)}`,
    styles: {
      padding: cs.padding,
      height: cs.height,
      width: cs.width,
      boxSizing: cs.boxSizing,
      background: cs.backgroundColor,
      borderRadius: cs.borderRadius,
      whiteSpace: cs.whiteSpace,
      flexShrink: cs.flexShrink,
      alignSelf: cs.alignSelf,
    },
    btnCount: document.querySelectorAll('.componente-recomendado-editar').length,
    derechaRect: (() => {
      const d = btn.closest('.componente-recomendado-header-derecha').getBoundingClientRect()
      return `${Math.round(d.width)}x${Math.round(d.height)} overflow=${getComputedStyle(btn.closest('.componente-recomendado-header-derecha')).overflow}`
    })(),
  }
})
console.log(JSON.stringify(info, null, 2))
await browser.close()
