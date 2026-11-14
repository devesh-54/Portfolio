import { spawn } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'

const ARTIFACTS_DIR = 'C:\\Users\\deves\\.gemini\\antigravity\\brain\\2de691e0-6755-4ad6-9db3-7953879536fc'
const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'
const CDP_PORT = 9294
const USER_DATA_DIR = path.join(ARTIFACTS_DIR, 'scratch', 'chrome_card_test')

function sleep(ms) { return new Promise((r) => setTimeout(r, ms)) }

async function run() {
  const chromeProc = spawn(CHROME_PATH, [
    `--remote-debugging-port=${CDP_PORT}`,
    `--user-data-dir=${USER_DATA_DIR}`,
    '--no-first-run',
    '--no-default-browser-check',
    '--headless=new',
    'about:blank',
  ])

  try {
    await sleep(2000)
    const res = await fetch(`http://127.0.0.1:${CDP_PORT}/json`)
    const list = await res.json()
    const page = list.find((t) => t.type === 'page')
    const ws = new WebSocket(page.webSocketDebuggerUrl)
    await new Promise((res, rej) => { ws.onopen = res; ws.onerror = rej })
    let id = 1
    const send = (m, p = {}) => new Promise((resolve, reject) => {
      const cur = id++
      const handler = (evt) => {
        const msg = JSON.parse(evt.data)
        if (msg.id === cur) { ws.removeEventListener('message', handler); resolve(msg.result) }
      }
      ws.addEventListener('message', handler)
      ws.send(JSON.stringify({ id: cur, method: m, params: p }))
    })

    await send('Page.enable')
    await send('Runtime.enable')

    const hireImgBuf = fs.readFileSync('C:/Users/deves/OneDrive/project_main/Portfolio/devesh-portfolio/src/assets/projects/hireconnect.webp').toString('base64')

    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          * { box-sizing: border-box; margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; }
          body {
            background: #030612;
            color: #ffffff;
            display: flex;
            align-items: center;
            justify-content: center;
            min-height: 100vh;
            padding: 40px;
          }

          .pe-card-outer {
            position: relative;
            width: 580px;
            filter: drop-shadow(0 0 16px rgba(39, 0, 255, 0.35)) drop-shadow(0 0 4px rgba(47, 208, 255, 0.4));
          }

          .pe-card {
            position: relative;
            width: 100%;
            background: linear-gradient(135deg, rgba(8, 18, 42, 0.95) 0%, rgba(4, 10, 26, 0.98) 100%);
            border: 1px solid rgba(47, 208, 255, 0.55);
            border-radius: 14px;
            padding: 10px 14px 10px 10px;
            display: flex;
            align-items: center;
            gap: 14px;
            clip-path: polygon(
              0 0,
              100% 0,
              100% calc(100% - 18px),
              calc(100% - 18px) 100%,
              0 100%
            );
            box-shadow: inset 0 0 14px rgba(47, 208, 255, 0.08);
          }

          /* Bottom right angled notch accent border */
          .pe-card::after {
            content: '';
            position: absolute;
            bottom: 0;
            right: 0;
            width: 26px;
            height: 26px;
            border-bottom: 2px solid #2fd0ff;
            border-right: 2px solid #2fd0ff;
            clip-path: polygon(100% 0, 100% 100%, 0 100%);
            pointer-events: none;
            filter: drop-shadow(0 0 6px #2fd0ff);
          }

          /* Image Media with diagonal cut & ribbon */
          .pe-card-media-wrap {
            position: relative;
            width: 130px;
            height: 94px;
            flex-shrink: 0;
            border-radius: 10px 0 0 10px;
            overflow: hidden;
          }

          .pe-card-media {
            width: 100%;
            height: 100%;
            clip-path: polygon(0 0, 100% 0, 78% 100%, 0 100%);
            overflow: hidden;
            background: #0d1a38;
          }

          .pe-card-img {
            width: 100%;
            height: 100%;
            object-fit: cover;
            display: block;
          }

          /* Blue ribbon badge with "01" */
          .pe-ribbon-badge {
            position: absolute;
            top: 0;
            left: 0;
            background: linear-gradient(135deg, #2b7fff 0%, #1757e8 100%);
            color: #ffffff;
            font-size: 11px;
            font-weight: 800;
            letter-spacing: 0.05em;
            padding: 3px 14px 3px 8px;
            clip-path: polygon(0 0, 100% 0, 75% 100%, 0 100%);
            z-index: 3;
            box-shadow: 0 2px 8px rgba(23, 87, 232, 0.5);
          }

          /* Middle Content */
          .pe-card-content {
            flex: 1 1 auto;
            min-width: 0;
            display: flex;
            flex-direction: column;
            gap: 5px;
          }

          .pe-title-wrap {
            display: flex;
            align-items: center;
            gap: 6px;
          }

          .pe-title {
            font-size: 1.12rem;
            font-weight: 700;
            color: #ffffff;
            letter-spacing: -0.01em;
          }

          .pe-ext-icon {
            width: 13px;
            height: 13px;
            color: rgba(47, 208, 255, 0.9);
            stroke-width: 2.2;
          }

          .pe-desc {
            font-size: 0.82rem;
            line-height: 1.35;
            color: #8fa3c7;
            display: -webkit-box;
            -webkit-line-clamp: 2;
            -webkit-box-orient: vertical;
            overflow: hidden;
          }

          .pe-stack {
            display: flex;
            flex-wrap: wrap;
            gap: 6px;
            margin-top: 2px;
          }

          .pe-chip {
            font-size: 0.72rem;
            font-weight: 500;
            color: #b5d5ff;
            background: rgba(30, 80, 160, 0.35);
            border: 1px solid rgba(47, 208, 255, 0.3);
            border-radius: 999px;
            padding: 2px 9px;
          }

          /* Right Actions Column */
          .pe-card-actions {
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            gap: 8px;
            padding-left: 12px;
            border-left: 1px solid rgba(47, 208, 255, 0.18);
            flex-shrink: 0;
          }

          .pe-action-btn {
            width: 32px;
            height: 32px;
            border-radius: 50%;
            background: rgba(10, 24, 56, 0.85);
            border: 1px solid rgba(47, 208, 255, 0.4);
            color: #e2eeff;
            display: flex;
            align-items: center;
            justify-content: center;
            text-decoration: none;
            transition: all 0.18s ease;
            box-shadow: 0 2px 8px rgba(0, 0, 0, 0.4);
          }

          .pe-action-btn:hover {
            border-color: #2fd0ff;
            background: rgba(47, 208, 255, 0.25);
            box-shadow: 0 0 10px rgba(47, 208, 255, 0.5);
            color: #ffffff;
            transform: scale(1.08);
          }

          .pe-action-btn svg {
            width: 16px;
            height: 16px;
          }
        </style>
      </head>
      <body>
        <div class="pe-card-outer">
          <div class="pe-card">
            <!-- Left Media with ribbon & diagonal cut -->
            <div class="pe-card-media-wrap">
              <span class="pe-ribbon-badge">01</span>
              <div class="pe-card-media">
                <img src="data:image/webp;base64,${hireImgBuf}" class="pe-card-img" />
              </div>
            </div>

            <!-- Middle Content -->
            <div class="pe-card-content">
              <div class="pe-title-wrap">
                <h3 class="pe-title">HireConnect</h3>
                <svg class="pe-ext-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                  <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path>
                  <polyline points="15 3 21 3 21 9"></polyline>
                  <line x1="10" y1="14" x2="21" y2="3"></line>
                </svg>
              </div>

              <p class="pe-desc">Accessible job board with screen-reader & sign-language support filters.</p>

              <div class="pe-stack">
                <span class="pe-chip">React</span>
                <span class="pe-chip">TypeScript</span>
                <span class="pe-chip">Vite</span>
              </div>
            </div>

            <!-- Right Actions Column: GitHub + Live Demo -->
            <div class="pe-card-actions">
              <!-- GitHub Button -->
              <a href="#" class="pe-action-btn" title="GitHub Repository">
                <svg viewBox="0 0 24 24" fill="currentColor">
                  <path fill-rule="evenodd" clip-rule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"></path>
                </svg>
              </a>

              <!-- Live Demo Button -->
              <a href="#" class="pe-action-btn" title="Live Demo">
                <svg viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 14.5v-9l6 4.5-6 4.5z"></path>
                </svg>
              </a>
            </div>
          </div>
        </div>
      </body>
      </html>
    `

    await send('Page.navigate', { url: `data:text/html;base64,${Buffer.from(htmlContent).toString('base64')}` })
    await sleep(1000)

    const shot = await send('Page.captureScreenshot', { format: 'png' })
    fs.writeFileSync(path.join(ARTIFACTS_DIR, 'test_card_design_preview.png'), Buffer.from(shot.data, 'base64'))
    console.log('Saved test_card_design_preview.png successfully')

    ws.close()
  } finally {
    chromeProc.kill()
  }
}

run().catch(console.error)

