import fs from 'fs';
import path from 'path';
import { spawn } from 'child_process';

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const ARTIFACT_DIR = 'C:\\Users\\deves\\.gemini\\antigravity\\brain\\2de691e0-6755-4ad6-9db3-7953879536fc';
const VIDEO_PATH = 'C:/Users/deves/.gemini/antigravity/brain/2de691e0-6755-4ad6-9db3-7953879536fc/.user_uploaded/media_1793976116482_56de1d12.mp4';

async function extract() {
  const chrome = spawn(CHROME_PATH, [
    '--headless=new',
    '--remote-debugging-port=9316',
    '--use-gl=angle',
    '--window-size=1280,800',
    '--allow-file-access-from-files',
    '--no-sandbox',
    '--disable-dev-shm-usage',
  ]);
  await new Promise(r => setTimeout(r, 2000));
  try {
    const listRes = await fetch('http://127.0.0.1:9316/json/list');
    const pages = await listRes.json();
    const target = pages.find(p => p.type === 'page');
    const ws = new WebSocket(target.webSocketDebuggerUrl);
    let msgId = 1;
    const callbacks = new Map();
    function send(method, params = {}) {
      return new Promise((resolve) => {
        const id = msgId++;
        callbacks.set(id, resolve);
        ws.send(JSON.stringify({ id, method, params }));
      });
    }
    ws.onmessage = (evt) => {
      const data = JSON.parse(evt.data);
      if (data.id && callbacks.has(data.id)) {
        const cb = callbacks.get(data.id);
        callbacks.delete(data.id);
        cb(data.result);
      }
    };
    await new Promise((res) => (ws.onopen = res));
    await send('Page.enable');
    await send('Runtime.enable');

    // Create an HTML page with video
    const videoData = fs.readFileSync(VIDEO_PATH).toString('base64');
    await send('Page.navigate', {
      url: 'data:text/html,<html><body style="margin:0;background:black;"><video id="v" style="width:100vw;height:100vh;object-fit:contain;" src="data:video/mp4;base64,' + videoData + '"></video></body></html>'
    });
    await new Promise(r => setTimeout(r, 2500));

    const durRes = await send('Runtime.evaluate', {
      expression: `document.getElementById('v').duration`,
      returnByValue: true
    });
    const dur = durRes.result.value || 5;
    console.log('Video duration:', dur);

    const count = 6;
    for (let i = 0; i < count; i++) {
      const t = (i / (count - 1)) * dur;
      await send('Runtime.evaluate', {
        expression: `new Promise(res => {
          const v = document.getElementById('v');
          v.currentTime = ${t};
          v.onseeked = () => res();
        })`,
        awaitPromise: true
      });
      await new Promise(r => setTimeout(r, 400));
      const shot = await send('Page.captureScreenshot', { format: 'png' });
      fs.writeFileSync(path.join(ARTIFACT_DIR, `user_vid_frame_${i}.png`), Buffer.from(shot.data, 'base64'));
      console.log(`Saved user_vid_frame_${i}.png at t=${t.toFixed(2)}s`);
    }

  } catch(e) {
    console.error(e);
  } finally {
    chrome.kill();
  }
}
extract();

