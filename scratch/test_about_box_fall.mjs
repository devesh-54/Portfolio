import { spawn } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'

const ARTIFACTS_DIR = 'C:\\Users\\deves\\.gemini\\antigravity\\brain\\2de691e0-6755-4ad6-9db3-7953879536fc'
const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'
const CDP_PORT = 9300
const USER_DATA_DIR = path.join(ARTIFACTS_DIR, 'scratch', 'chrome_test_box_fall')

function sleep(ms) { return new Promise((r) => setTimeout(r, ms)) }

const htmlContent = `
<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body {
    background: #03050a;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    color: #fff;
    overflow: hidden;
    height: 100vh;
    width: 100vw;
  }

  .stage-viewport {
    position: relative;
    width: 100vw;
    height: 100vh;
    overflow: hidden;
    perspective: 1400px;
    perspective-origin: 50% 60%;
  }

  /* Skills screen sits BEHIND About (z-index: 1) */
  .skills-screen {
    position: absolute;
    inset: 0;
    z-index: 1;
    background: #ffffff;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    color: #090d18;
  }

  .skills-heading-wrap {
    text-align: center;
    transform: translateY(-20px);
    transition: transform 0.1s linear, opacity 0.1s linear;
  }

  .skills-kicker {
    font-size: 13px;
    font-weight: 800;
    letter-spacing: 0.18em;
    color: rgba(9, 13, 24, 0.65);
    margin-bottom: 8px;
    text-transform: uppercase;
  }

  .skills-title {
    font-size: 72px;
    font-weight: 900;
    letter-spacing: -0.03em;
    color: #090d18;
    text-transform: uppercase;
  }

  .skills-cards-layer {
    position: absolute;
    inset: 0;
    pointer-events: none;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .mock-card {
    width: 440px;
    height: 280px;
    background: #ffffff;
    border-radius: 16px;
    border: 1px solid rgba(0,0,0,0.1);
    box-shadow: 0 20px 45px rgba(0,0,0,0.14);
    padding: 24px;
    display: flex;
    flex-direction: column;
    justify-content: space-between;
  }

  /* About screen sits IN FRONT (z-index: 2) */
  .about-screen {
    position: absolute;
    inset: 0;
    z-index: 2;
    display: flex;
    align-items: center;
    justify-content: center;
    pointer-events: none;
    background: transparent;
  }

  /* The 3D About Box as requested */
  .about-3d-box {
    position: relative;
    width: min(1320px, calc(100vw - 80px));
    height: min(780px, calc(100vh - 100px));
    margin-top: 40px;
    background: #03050a;
    border-radius: 24px;
    border: 1px solid rgba(255, 255, 255, 0.16);
    /* White shadows to make the box appear separated */
    box-shadow:
      0 0 60px rgba(255, 255, 255, 0.12),
      0 25px 80px rgba(255, 255, 255, 0.08),
      inset 0 0 0 1px rgba(255, 255, 255, 0.06);
    display: grid;
    grid-template-columns: 1.1fr 0.9fr;
    align-items: center;
    padding: 40px 60px;
    overflow: hidden;
    transform-origin: 50% 100%;
    transform-style: preserve-3d;
    backface-visibility: hidden;
    will-change: transform, opacity, box-shadow;
  }

  .about-left {
    display: flex;
    flex-direction: column;
    gap: 12px;
  }
  .about-greeting { font-size: 20px; color: rgba(207, 227, 255, 0.78); }
  .about-name { font-size: 64px; font-weight: 800; color: #f4f8ff; line-height: 1; }
  .about-role { font-size: 24px; color: rgba(232, 241, 255, 0.92); margin-bottom: 12px; }
  .about-bio { font-size: 15px; color: rgba(207, 227, 255, 0.7); max-width: 480px; line-height: 1.5; }
  .about-btn {
    display: inline-block;
    width: fit-content;
    margin-top: 16px;
    padding: 10px 24px;
    border-radius: 999px;
    border: 1px solid rgba(255,255,255,0.2);
    color: #fff;
    font-size: 14px;
    text-decoration: none;
  }

  .about-right {
    height: 100%;
    display: flex;
    align-items: flex-end;
    justify-content: center;
  }
  .about-portrait-placeholder {
    width: 320px;
    height: 480px;
    background: linear-gradient(180deg, #1e293b 0%, #0f172a 100%);
    border-radius: 16px 16px 0 0;
    display: flex;
    align-items: center;
    justify-content: center;
    color: #64748b;
    font-size: 14px;
  }
</style>
</head>
<body>
  <div class="stage-viewport">
    <!-- Skills Screen Behind -->
    <div class="skills-screen">
      <div class="skills-heading-wrap" id="skillsHeading">
        <div class="skills-kicker">TECHNICAL ARSENAL</div>
        <h2 class="skills-title">SKILLS</h2>
      </div>
      <div class="skills-cards-layer" id="skillsCardsLayer">
        <div class="mock-card" id="mockCard">
          <div style="font-weight: 800; font-size: 12px; color: #2563eb;">01 // ARTIFICIAL INTELLIGENCE</div>
          <div style="font-size: 22px; font-weight: 800; color: #090d18;">Deep Learning & LLM Systems</div>
          <div style="font-size: 13px; color: #64748b;">PyTorch · TensorFlow · Transformers</div>
        </div>
      </div>
    </div>

    <!-- About Screen In Front with 3D Box -->
    <div class="about-screen">
      <div class="about-3d-box" id="aboutBox">
        <div class="about-left">
          <p class="about-greeting">Hello, I'm</p>
          <h1 class="about-name">Devesh</h1>
          <p class="about-role">AI & Full-Stack Developer</p>
          <p class="about-bio">Undergraduate AI & Data Science student at Rajalakshmi Institute of Technology with a strong focus on deep learning and modern web technologies.</p>
          <div class="about-btn">Download Resume</div>
        </div>
        <div class="about-right">
          <div class="about-portrait-placeholder">Portrait Visual</div>
        </div>
      </div>
    </div>
  </div>

  <script>
    window.setFallProgress = function(p) {
      const box = document.getElementById('aboutBox');
      const heading = document.getElementById('skillsHeading');
      const card = document.getElementById('mockCard');

      // Forward fall physics (rotateX negative = tipping forward down onto the ground in front)
      // p: 0.0 -> 1.0
      const fallT = Math.pow(p, 1.8);
      const rx = -fallT * 90; // 0 to -90 deg
      const ty = fallT * 80;
      const tz = fallT * 120;
      const sc = 1 - fallT * 0.08;

      const op = p < 0.72 ? 1 : 1 - (p - 0.72) / 0.28;

      // White floor shadow compresses and spreads
      const shadowSpread = 60 + fallT * 60;
      const shadowAlpha = (0.14 + fallT * 0.12) * op;

      box.style.transform = \`translate3d(0, \${ty}px, \${tz}px) rotateX(\${rx}deg) scale(\${sc})\`;
      box.style.opacity = Math.max(0, op);
      box.style.boxShadow = \`0 0 \${shadowSpread}px rgba(255, 255, 255, \${shadowAlpha}), 0 \${25 - fallT * 20}px 80px rgba(255, 255, 255, \${shadowAlpha * 0.7})\`;

      // Skills heading reveals as the box falls
      const headingP = Math.max(0, Math.min(1, (p - 0.35) / 0.45));
      heading.style.opacity = headingP;
      heading.style.transform = \`translate3d(0, \${(1 - headingP) * 30}px, 0) scale(\${0.88 + headingP * 0.12})\`;

      // Skills card flies in as scroll continues (p: 0.7 -> 1.0+)
      const cardP = Math.max(0, Math.min(1, (p - 0.65) / 0.35));
      const cardScale = 0.5 + cardP * 0.5;
      const cardZ = -300 + cardP * 300;
      const cardY = 120 - cardP * 120;
      card.style.opacity = cardP;
      card.style.transform = \`translate3d(0, \${cardY}px, \${cardZ}px) scale(\${cardScale})\`;
    };
  </script>
</body>
</html>
`

const htmlPath = path.join(ARTIFACTS_DIR, 'scratch', 'test_box_fall.html')
fs.writeFileSync(htmlPath, htmlContent)

async function run() {
  const chromeProc = spawn(CHROME_PATH, [
    `--remote-debugging-port=${CDP_PORT}`,
    `--user-data-dir=${USER_DATA_DIR}`,
    '--no-first-run',
    '--no-default-browser-check',
    '--headless=new',
    '--window-size=1920,1080',
    'about:blank',
  ])

  try {
    await sleep(1500)
    const res = await fetch(`http://127.0.0.1:${CDP_PORT}/json`)
    const list = await res.json()
    const page = list.find((t) => t.type === 'page')
    const ws = new WebSocket(page.webSocketDebuggerUrl)
    await new Promise((resolve, reject) => { ws.onopen = resolve; ws.onerror = reject })

    let id = 1
    function send(method, params = {}) {
      return new Promise((resolve) => {
        const msgId = id++
        const handler = (event) => {
          const d = JSON.parse(event.data)
          if (d.id === msgId) {
            ws.removeEventListener('message', handler)
            resolve(d.result)
          }
        }
        ws.addEventListener('message', handler)
        ws.send(JSON.stringify({ id: msgId, method, params }))
      })
    }

    await send('Page.enable')
    await send('Runtime.enable')
    await send('Page.navigate', { url: `file://${htmlPath.replace(/\\/g, '/')}` })
    await sleep(1200)

    // Capture 4 steps: 0.0 (standing box), 0.35 (tipping forward), 0.75 (almost flat + skills heading), 1.0 (flat/hidden + cards in)
    const steps = [
      { name: 'step0_standing', p: 0.0 },
      { name: 'step1_tipping', p: 0.4 },
      { name: 'step2_falling_heading', p: 0.75 },
      { name: 'step3_cards_fly', p: 1.0 },
    ]

    for (const step of steps) {
      await send('Runtime.evaluate', { expression: `window.setFallProgress(${step.p})` })
      await sleep(300)
      const shot = await send('Page.captureScreenshot', { format: 'png' })
      const outShot = path.join(ARTIFACTS_DIR, `qa_box_fall_${step.name}.png`)
      fs.writeFileSync(outShot, Buffer.from(shot.data, 'base64'))
      console.log(`Saved ${outShot}`)
    }

    ws.close()
  } catch (err) {
    console.error('Error:', err)
  } finally {
    chromeProc.kill('SIGKILL')
  }
}

run()

