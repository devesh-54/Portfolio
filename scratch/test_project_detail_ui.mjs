import puppeteer from 'puppeteer'
import fs from 'fs'

async function run() {
  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  })

  try {
    const page = await browser.newPage()
    await page.setViewport({ width: 1440, height: 900 })

    await page.goto('http://localhost:5174', { waitUntil: 'networkidle2' })
    await new Promise((r) => setTimeout(r, 1500))

    // 1. Open SafeChit (mobile app)
    console.log('Testing SafeChit mobile detail...')
    await page.evaluate(() => {
      if (typeof window.openProject === 'function') {
        window.openProject('safechit')
      }
    })
    await new Promise((r) => setTimeout(r, 1600))
    await page.screenshot({ path: 'scratch/qa_detail_safechit.png' })
    console.log('Saved scratch/qa_detail_safechit.png')

    // Close SafeChit
    await page.keyboard.press('Escape')
    await new Promise((r) => setTimeout(r, 1200))

    // 2. Open DR Detection (web app)
    console.log('Testing DR Detection web detail...')
    await page.evaluate(() => {
      if (typeof window.openProject === 'function') {
        window.openProject('dr-detection')
      }
    })
    await new Promise((r) => setTimeout(r, 1600))
    await page.screenshot({ path: 'scratch/qa_detail_dr_detection.png' })
    console.log('Saved scratch/qa_detail_dr_detection.png')

    // Test carousel next slide in DR Detection
    await page.evaluate(() => {
      const nextBtn = document.querySelector('.detail-carousel-btn--next')
      if (nextBtn) nextBtn.click()
    })
    await new Promise((r) => setTimeout(r, 1000))
    await page.screenshot({ path: 'scratch/qa_detail_dr_detection_slide2.png' })
    console.log('Saved scratch/qa_detail_dr_detection_slide2.png')

    // Close DR Detection
    await page.keyboard.press('Escape')
    await new Promise((r) => setTimeout(r, 1200))

    // 3. Open HireConnect (web app)
    console.log('Testing HireConnect web detail...')
    await page.evaluate(() => {
      if (typeof window.openProject === 'function') {
        window.openProject('hireconnect')
      }
    })
    await new Promise((r) => setTimeout(r, 1600))
    await page.screenshot({ path: 'scratch/qa_detail_hireconnect.png' })
    console.log('Saved scratch/qa_detail_hireconnect.png')

    console.log('All tests completed successfully!')
  } finally {
    await browser.close()
  }
}

run().catch((e) => {
  console.error('Error during testing:', e)
  process.exit(1)
})

