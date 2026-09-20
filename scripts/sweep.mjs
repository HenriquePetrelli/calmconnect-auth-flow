import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';

const BASE = 'http://127.0.0.1:8080';
const OUT = 'docs/visual/screenshots/sweep-2026-09-20';
fs.mkdirSync(OUT, { recursive: true });

const accounts = {
  patient: { email: 'paciente01@gmail.com', password: '123456', routes: [
    '/home', '/chat', '/profile', '/appointments', '/notifications', '/statistics',
    '/support-groups', '/journal', '/sounds', '/breathing', '/sos',
    '/account-settings', '/paciente/suporte', '/achievements',
    '/statistics/activity-history', '/subscription-plans',
  ]},
  psychologist: { email: 'psicologo01@gmail.com', password: '123456', routes: [
    '/psychologist-dashboard', '/psychologist-profile', '/psychologist-availability',
    '/psicologo/suporte', '/psychologist-payments', '/psychologist-notifications',
  ]},
  admin: { email: 'admin@admin.com', password: '123456', routes: [
    '/admin-dashboard', '/admin-notifications',
  ]},
};

const log = [];
function record(entry) { log.push(entry); console.log(JSON.stringify(entry)); }

async function sweepAccount(browser, key, { email, password, routes }, theme) {
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    colorScheme: theme,
  });
  const page = await context.newPage();
  const consoleErrors = [];
  page.on('console', (msg) => {
    if (msg.type() === 'error') consoleErrors.push({ url: page.url(), text: msg.text() });
  });
  page.on('pageerror', (err) => {
    consoleErrors.push({ url: page.url(), text: 'pageerror: ' + err.message });
  });

  await page.goto(BASE + '/', { waitUntil: 'networkidle' });
  await page.fill('#email', email);
  await page.fill('#password', password);
  await page.click('button[type="submit"]');
  await page.waitForTimeout(3000);

  const landedUrl = page.url();
  record({ account: key, theme, step: 'login', landedUrl });

  for (const route of routes) {
    try {
      await page.goto(BASE + route, { waitUntil: 'networkidle', timeout: 15000 });
      await page.waitForTimeout(700);
      const fileName = `${key}-${theme}-${route.replace(/\//g, '_') || 'root'}.png`;
      await page.screenshot({ path: path.join(OUT, fileName), fullPage: true });
      record({ account: key, theme, route, status: 'ok', file: fileName, finalUrl: page.url() });
    } catch (e) {
      record({ account: key, theme, route, status: 'error', error: String(e) });
    }
  }

  if (consoleErrors.length) {
    record({ account: key, theme, consoleErrors });
  }

  await context.close();
}

async function main() {
  const browser = await chromium.launch({
    executablePath: '/opt/pw-browsers/chromium',
    proxy: process.env.HTTPS_PROXY ? { server: process.env.HTTPS_PROXY } : undefined,
  });

  // Unauthenticated screens first
  const pubContext = await browser.newContext({ viewport: { width: 390, height: 844 }, colorScheme: 'light' });
  const pubPage = await pubContext.newPage();
  for (const route of ['/', '/signup-type', '/patient-signup', '/psychologist-signup']) {
    await pubPage.goto(BASE + route, { waitUntil: 'networkidle', timeout: 15000 });
    await pubPage.waitForTimeout(500);
    const fileName = `public-light-${route.replace(/\//g, '_') || 'root'}.png`;
    await pubPage.screenshot({ path: path.join(OUT, fileName), fullPage: true });
    record({ account: 'public', theme: 'light', route, status: 'ok', file: fileName });
  }
  await pubContext.close();

  for (const [key, cfg] of Object.entries(accounts)) {
    await sweepAccount(browser, key, cfg, 'light');
    await sweepAccount(browser, key, cfg, 'dark');
  }

  await browser.close();
  fs.writeFileSync(path.join(OUT, 'log.json'), JSON.stringify(log, null, 2));
  console.log('DONE');
}

main().catch((e) => { console.error(e); process.exit(1); });
