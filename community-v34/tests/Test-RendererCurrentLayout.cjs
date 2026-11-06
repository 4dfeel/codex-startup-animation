'use strict';
// Offline synthetic shell regression for the signed Store 26.1029.7803.0
// app.asar exports. Never opens ChatGPT, reads its profile, or uses the network.
// Usage: node Test-RendererCurrentLayout.cjs report.json ambient.mp4 [renderer.js]
const fs = require('fs'), path = require('path'), assert = require('assert/strict'), crypto = require('crypto');
const { chromium } = require('playwright');
const output = process.argv[2], media = process.argv[3];
if (!output || !media) throw new Error('Provide an output JSON path and the packaged ambient MP4');
const source = fs.readFileSync(process.argv[4] || path.resolve(__dirname, '..', 'renderer.js'), 'utf8');
const chrome = process.env.CHROME_BIN || path.join(process.env.ProgramFiles, 'Google/Chrome/Application/chrome.exe');
const report = { passed: false, checks: [], sourceSha256: crypto.createHash('sha256').update(source).digest('hex'), networkBlocked: true, actualChatGPTStarted: false, realPackagedMedia: true };
const check = (name, actual, expected = true) => { assert.deepEqual(actual, expected, name); report.checks.push(name); };
const composer = '<div id="composer" class="ComposerLayoutRoot-XCKS7O" data-composer-surface-variant="default"><textarea aria-label="Synthetic input"></textarea><button id="send">Send</button></div>';
const main = `<div class="MainContentClip-QvkcTI"><main id="main" class="MainContentSurface-EnuIYE" data-app-shell-main-surface="default"><div id="workspace" class="WorkspaceContent-dnr6uY"><div class="MainContentViewport-OinMfT"><div id="contentframe" class="MainContentFrame-sss8BP"><div data-app-shell-main-content-top-fade="visible"><div id="fade" aria-hidden="true" class="MainContentTopFade-T6W4RS"></div><article><p id="text">Synthetic content</p><div data-thread-scroll-footer="true"><div id="footer" aria-hidden="true" class="pointer-events-none absolute inset-x-0 z-0 bottom-0 bg-surface"></div>${composer}</div></article></div></div></div></div></main></div>`;
const shell = route => `<div id="root"><div id="frame" class="Layout-SYw9n4 PageSurfaceLayout-oqnRfB" data-app-shell-frame="true" data-app-shell-page-surface="true"><div id="bar" class="ApplicationMenuTopBar-SLuX8q"></div><div id="row" data-app-shell-workspace-row="true"><div id="decoration" class="PageSurface-g2Llyi" aria-hidden="true"></div>${route === 'main' ? main : `<section id="home">${composer}</section>`}</div></div></div>`;
const native = `:root{--color-surface:#1d1e2c;--color-surface-elevated-secondary:#343646;color:#ececf1}html,body,#root,#frame{width:1000px;height:700px;margin:0}#frame,#bar,main,#decoration,#footer{background-color:var(--color-surface)}#bar{height:20px}#composer{position:relative;margin:50px;width:500px;background-color:var(--composer-layout-surface-background,var(--color-surface-elevated-secondary));backdrop-filter:var(--composer-layout-surface-backdrop-filter,none)}#decoration,#fade,#footer{pointer-events:none}#fade{background-image:linear-gradient(var(--color-surface),transparent)}#text{opacity:1}`;
let browser;
const started = Date.now();
const deadline = setTimeout(() => { report.deadlineHit = true; if (browser) void browser.close().catch(() => {}); }, 27000);
(async () => {
  browser = await chromium.launch({ executablePath: chrome, headless: true, timeout: 5000, args: ['--disable-background-networking', '--disable-component-update', '--no-first-run'] });
  const context = await browser.newContext({ viewport: { width: 1000, height: 700 } });
  await context.route('**/*', request => request.abort());
  const page = await context.newPage(), errors = [];
  page.setDefaultTimeout(2500); page.on('pageerror', error => errors.push(String(error)));
  const status = () => page.evaluate(() => __codexDragonWallpaperV1.status());
  const background = id => page.locator('#' + id).evaluate(node => getComputedStyle(node).backgroundColor);
  async function setup(route = 'home', mutate) {
    await page.setContent(`<html data-codex-window-type="electron"><head><style>${native}</style></head><body>${shell(route)}</body></html>`);
    if (mutate) await page.evaluate(mutate);
    check('Renderer installed ' + report.checks.length, (await page.evaluate(source)).code, 'installed');
    return status();
  }
  for (const route of ['home', 'main']) {
    const state = await setup(route);
    check(route + ' current shell supported', state.layoutSupported);
    check(route + ' surface kind', state.layoutSurfaceKind, route === 'home' ? 'frame' : 'main');
    check(route + ' ready', state.layoutReason, 'ready');
    await page.evaluate(() => document.documentElement.setAttribute('data-codex-dragon-background', 'v1'));
    check(route + ' frame transparent', await background('frame'), 'rgba(0, 0, 0, 0)');
    check(route + ' composer glass retains 60 percent', (await background('composer')).includes('/ 0.6)'));
    if (route === 'home') check('Current inert decoration transparent', await background('decoration'), 'rgba(0, 0, 0, 0)');
    else {
      check('Current footer paint transparent', await background('footer'), 'rgba(0, 0, 0, 0)');
      check('Current header fade cleared', await page.locator('#fade').evaluate(node => getComputedStyle(node).backgroundImage), 'none');
      check('Text opacity retained', await page.locator('#text').evaluate(node => getComputedStyle(node).opacity), '1');
    }
    await page.locator('textarea').fill('Synthetic input');
    check(route + ' typing retained', await page.locator('textarea').inputValue(), 'Synthetic input');
    await page.evaluate(() => document.getElementById('send').onclick = () => { window.clicked = true; });
    await page.locator('#send').click(); check(route + ' clicking retained', await page.evaluate(() => window.clicked));
    await page.emulateMedia({ contrast: 'more' });
    check(route + ' contrast restores native backdrop', await background('frame'), 'rgb(29, 30, 44)');
    await page.emulateMedia({ contrast: 'no-preference' });
    await page.evaluate(() => __codexDragonWallpaperV1.dispose());
    check(route + ' disposal restores paint', await background('frame'), 'rgb(29, 30, 44)');
  }
  const malformed = [
    ['home', 'frame-token', () => document.getElementById('frame').className = 'Layout-unknown PageSurfaceLayout-oqnRfB'],
    ['home', 'frame-token', () => document.getElementById('frame').className += ' Layout-other'],
    ['home', 'frame-token', () => document.getElementById('frame').className += ' _Layout_legacy_2'],
    ['home', 'frame-token', () => document.getElementById('frame').className = 'Layout-SYw9n4 _PageSurfaceLayout_legacy_2'],
    ['home', 'frame-token', () => document.getElementById('frame').removeAttribute('data-app-shell-page-surface')],
    ['home', 'frame-count', () => document.getElementById('root').append(document.getElementById('frame').cloneNode(true))],
    ['home', 'frame-row', () => document.getElementById('row').removeAttribute('data-app-shell-workspace-row')],
    ['home', 'frame-row', () => document.getElementById('frame').append(document.getElementById('row').cloneNode(true))],
    ['home', 'frame-shape', () => document.getElementById('decoration').className = 'PageSurface-unknown'],
    ['home', 'frame-shape', () => document.getElementById('decoration').className += ' PageSurface-other'],
    ['home', 'frame-shape', () => document.getElementById('decoration').className = '_PageSurface_legacy_2'],
    ['home', 'frame-shape', () => document.getElementById('decoration').removeAttribute('aria-hidden')],
    ['home', 'frame-shape', () => document.getElementById('row').append(document.getElementById('decoration').cloneNode(true))],
    ['home', 'shell-shape', () => document.getElementById('bar').className = 'ApplicationMenuTopBar-unknown'],
    ['main', 'main-token', () => document.getElementById('main').className = 'MainContentSurface-unknown'],
    ['main', 'main-token', () => document.getElementById('main').className += ' MainContentSurface-other'],
    ['main', 'workspace-shape', () => document.getElementById('workspace').className = 'WorkspaceContent-unknown'],
    ['main', 'workspace-shape', () => document.getElementById('workspace').className = '_WorkspaceContent_legacy_2'],
    ['main', 'shell-shape', () => document.getElementById('contentframe').className = 'MainContentFrame-unknown'],
    ['main', 'shell-shape', () => document.getElementById('fade').className = 'MainContentTopFade-unknown'],
    ['main', 'composer-ambiguous', () => document.getElementById('composer').className = 'ComposerLayoutRoot-unknown'],
    ['main', 'composer-ambiguous', () => document.getElementById('composer').className += ' ComposerLayoutRoot-other'],
    ['main', 'composer-ambiguous', () => document.getElementById('composer').className = '_ComposerLayoutRoot_legacy_2']
  ];
  for (const [route, reason, mutate] of malformed) {
    const state = await setup(route, mutate);
    check('Unknown or ambiguous shape rejected ' + report.checks.length, state.layoutSupported, false);
    check('Rejection reason ' + report.checks.length, state.layoutReason, reason);
    check('Rejected layout never marked ' + report.checks.length, await page.evaluate(() => document.documentElement.hasAttribute('data-codex-dragon-background')), false);
  }
  await page.setContent('<html><body><div id="root"><main class="MainContentSurface-unknown">Unrelated shell</main></div></body></html>');
  await page.evaluate(source); check('Ordinary page remains unsupported', (await status()).layoutSupported, false);
  await setup(); await page.locator('#codex-dragon-file-v1').setInputFiles(media);
  check('Current shell attaches packaged video', (await page.evaluate(() => __codexDragonWallpaperV1.attach())).ok);
  await page.waitForFunction(() => __codexDragonWallpaperV1.status().stageVisible, {}, { timeout: 10000 });
  check('Original 2K media retained', (await status()).videoWidth, 2560);
  await page.evaluate(() => { window.originalVideo = document.querySelector('#codex-dragon-stage-v1 video'); window.homeMarkup = document.getElementById('home').outerHTML; });
  for (let cycle = 0; cycle < 3; cycle++) {
    await page.evaluate(html => { document.getElementById('home').remove(); document.getElementById('row').insertAdjacentHTML('beforeend', html); }, main);
    check('Current conversation route supported ' + cycle, (await status()).layoutSurfaceKind, 'main');
    await page.waitForFunction(() => __codexDragonWallpaperV1.status().stageVisible);
    check('Current route keeps same decoder ' + cycle, await page.evaluate(() => document.querySelector('#codex-dragon-stage-v1 video') === window.originalVideo));
    await page.evaluate(() => { document.getElementById('main').parentElement.remove(); document.getElementById('row').insertAdjacentHTML('beforeend', window.homeMarkup); });
    check('Current home route recovers ' + cycle, (await status()).layoutSurfaceKind, 'frame');
  }
  await page.evaluate(() => document.getElementById('composer').className += ' ComposerLayoutRoot-unknown');
  const blocked = await status();
  check('Attached unknown composer suspends wallpaper', blocked.layoutSuspended && !blocked.stageVisible);
  check('Suspension restores native paint', await background('frame'), 'rgb(29, 30, 44)');
  await page.evaluate(() => document.getElementById('composer').className = 'ComposerLayoutRoot-XCKS7O');
  check('Valid current composer recovers', (await status()).layoutSupported);
  await page.waitForFunction(() => __codexDragonWallpaperV1.status().stageVisible);
  check('Recovery retains one decoder', await page.locator('#codex-dragon-stage-v1 video').count(), 1);
  await page.evaluate(() => __codexDragonWallpaperV1.dispose());
  check('Disposal removes owned nodes', await page.locator('#codex-dragon-stage-v1,#codex-dragon-file-v1,#codex-dragon-style-v1').count(), 0);
  check('No page errors', errors, []); report.passed = true;
})().catch(error => { report.error = String(error.stack || error); process.exitCode = 1; }).finally(async () => {
  clearTimeout(deadline); if (browser) await browser.close(); report.elapsedMs = Date.now() - started;
  fs.writeFileSync(output, JSON.stringify(report, null, 2));
  console.log(JSON.stringify({ passed: report.passed, checks: report.checks.length, elapsedMs: report.elapsedMs, error: report.error }));
});
