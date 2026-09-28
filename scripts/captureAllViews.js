/**
 * Automated Chrome DevTools Protocol Screenshot & Console Error Auditor
 */

const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const http = require('http');

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const SCREENSHOTS_DIR = path.join(__dirname, '..', 'docs', 'screenshots');

if (!fs.existsSync(SCREENSHOTS_DIR)) {
  fs.mkdirSync(SCREENSHOTS_DIR, { recursive: true });
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function getWsUrl(port = 9222) {
  for (let i = 0; i < 20; i++) {
    try {
      const res = await fetch(`http://127.0.0.1:${port}/json`);
      if (res.ok) {
        const tabs = await res.json();
        const pageTab = tabs.find((t) => t.type === 'page');
        if (pageTab && pageTab.webSocketDebuggerUrl) {
          return pageTab.webSocketDebuggerUrl;
        }
      }
    } catch (e) {}
    await sleep(400);
  }
  throw new Error('Could not connect to Chrome DevTools port');
}

class CdpSession {
  constructor(wsUrl) {
    this.ws = new WebSocket(wsUrl);
    this.msgId = 1;
    this.callbacks = new Map();
    this.consoleErrors = [];

    this.ws.onmessage = (event) => {
      const msg = JSON.parse(event.data);
      if (msg.id && this.callbacks.has(msg.id)) {
        const { resolve, reject } = this.callbacks.get(msg.id);
        this.callbacks.delete(msg.id);
        if (msg.error) reject(msg.error);
        else resolve(msg.result);
      }
      if (msg.method === 'Runtime.consoleAPICalled' && msg.params.type === 'error') {
        const text = msg.params.args.map((a) => a.value || a.description).join(' ');
        this.consoleErrors.push(text);
      }
    };
  }

  async ready() {
    if (this.ws.readyState === WebSocket.OPEN) return;
    return new Promise((resolve) => {
      this.ws.onopen = resolve;
    });
  }

  send(method, params = {}) {
    return new Promise((resolve, reject) => {
      const id = this.msgId++;
      this.callbacks.set(id, { resolve, reject });
      this.ws.send(JSON.stringify({ id, method, params }));
    });
  }

  close() {
    this.ws.close();
  }
}

async function runCapture() {
  console.log('🚀 Launching headless Chrome with DevTools Protocol on port 9222...');

  const tempProfile = path.join(process.env.TEMP || 'C:\\Windows\\Temp', 'chrome_cdp_profile_' + Date.now());
  const chromeProc = spawn(
    CHROME_PATH,
    [
      '--headless=new',
      '--no-sandbox',
      `--user-data-dir=${tempProfile}`,
      '--remote-debugging-port=9222',
      'about:blank',
    ],
    { stdio: 'ignore' }
  );

  try {
    const wsUrl = await getWsUrl(9222);
    console.log('🔗 Connected to Chrome DevTools at:', wsUrl);

    const cdp = new CdpSession(wsUrl);
    await cdp.ready();

    await cdp.send('Page.enable');
    await cdp.send('Runtime.enable');

    async function setViewport(width, height) {
      await cdp.send('Emulation.setDeviceMetricsOverride', {
        width,
        height,
        deviceScaleFactor: 1,
        mobile: width < 600,
      });
    }

    async function capture(fileName) {
      const { data } = await cdp.send('Page.captureScreenshot', { format: 'png' });
      const filePath = path.join(SCREENSHOTS_DIR, fileName);
      fs.writeFileSync(filePath, Buffer.from(data, 'base64'));
      console.log(`📸 Saved screenshot: ${fileName}`);
    }

    // --- 1. Desktop Flow (1280px) ---
    console.log('\n--- Testing Desktop (1280px) ---');
    await setViewport(1280, 850);
    await cdp.send('Page.navigate', { url: 'http://localhost:3000/' });
    await sleep(1500);
    await capture('desktop-home.png');

    // Student Login
    console.log('Logging in as Student...');
    await cdp.send('Runtime.evaluate', {
      expression: `
        fillCredentials('student');
        document.getElementById('login-form').requestSubmit();
      `,
    });
    await sleep(2000);
    await capture('desktop-student-dashboard.png');

    // My Submissions
    await cdp.send('Page.navigate', { url: 'http://localhost:3000/student/tickets.html' });
    await sleep(1500);
    await capture('desktop-student-tickets.png');

    // Submit page
    await cdp.send('Page.navigate', { url: 'http://localhost:3000/student/submit.html' });
    await sleep(1000);
    await capture('desktop-student-submit.png');

    // Admin Flow
    console.log('Switching to Admin...');
    await cdp.send('Page.navigate', { url: 'http://localhost:3000/' });
    await sleep(1000);
    await cdp.send('Runtime.evaluate', {
      expression: `
        fillCredentials('admin');
        document.getElementById('login-form').requestSubmit();
      `,
    });
    await sleep(2000);
    await capture('desktop-admin-dashboard.png');

    // Admin Tickets
    await cdp.send('Page.navigate', { url: 'http://localhost:3000/admin/tickets.html' });
    await sleep(1500);
    await capture('desktop-admin-tickets.png');

    // Admin Audit
    await cdp.send('Page.navigate', { url: 'http://localhost:3000/admin/audit.html' });
    await sleep(1000);
    await capture('desktop-admin-audit.png');

    // --- 2. Tablet Flow (768px) ---
    console.log('\n--- Testing Tablet (768px) ---');
    await setViewport(768, 1024);
    await cdp.send('Page.navigate', { url: 'http://localhost:3000/student/dashboard.html' });
    await sleep(1500);
    await capture('tablet-student-dashboard.png');

    await cdp.send('Page.navigate', { url: 'http://localhost:3000/admin/dashboard.html' });
    await sleep(1500);
    await capture('tablet-admin-dashboard.png');

    // --- 3. Mobile Flow (375px) ---
    console.log('\n--- Testing Mobile (375px) ---');
    await setViewport(375, 812);
    await cdp.send('Page.navigate', { url: 'http://localhost:3000/' });
    await sleep(1200);
    await capture('mobile-home.png');

    await cdp.send('Page.navigate', { url: 'http://localhost:3000/student/dashboard.html' });
    await sleep(1500);
    await capture('mobile-student-dashboard.png');

    await cdp.send('Page.navigate', { url: 'http://localhost:3000/student/tickets.html' });
    await sleep(1500);
    await capture('mobile-student-tickets.png');

    await cdp.send('Page.navigate', { url: 'http://localhost:3000/admin/dashboard.html' });
    await sleep(1500);
    await capture('mobile-admin-dashboard.png');

    // Check Console Errors
    console.log('\n--- Console Error Audit ---');
    if (cdp.consoleErrors.length === 0) {
      console.log('✅ ZERO client-side console errors detected across all tested viewports!');
    } else {
      console.warn('⚠️ Console errors recorded:', cdp.consoleErrors);
    }

    cdp.close();
  } finally {
    chromeProc.kill();
    console.log('Chrome process exited.');
  }
}

runCapture().catch((err) => {
  console.error('Capture runner failed:', err);
  process.exit(1);
});
