// Aegis - Copyright (c) 2026 Jerome Young (Yang Jie)
// Watermark: AEGIS / ENGINE BY JEROME YOUNG - original implementation, Apache-2.0
// SPDX-License-Identifier: Apache-2.0
// Aegis flow capture — drives the REAL app in headless Chrome (WebGPU via SwiftShader)
// and screenshots the deliverable output of every stage of the 7-step loop.
import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';
import { writeFileSync } from 'node:fs';

const EXE = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const APP_URL = 'http://localhost:8080/';
const OUT = new URL('./assets/steps/', import.meta.url).pathname;
mkdirSync(OUT, { recursive: true });

const FPS = 30;
const ARGS = [
  '--no-sandbox', '--disable-gpu-sandbox', '--ignore-gpu-blocklist',
  '--enable-unsafe-webgpu',
  '--enable-features=Vulkan,UseSkiaRenderer',
  '--use-vulkan=swiftshader', '--disable-vulkan-surface',
];

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const stage = (page) => page.evaluate(() => Number(document.body.dataset.stage || 0));
async function waitFor(fn, timeout = 20000, every = 300) {
  const t0 = Date.now();
  while (Date.now() - t0 < timeout) {
    if (await fn()) return true;
    await sleep(every);
  }
  return false;
}
const shot = async (page, name) => {
  const file = OUT + name + '.png';
  await page.screenshot({ path: file });
  console.log('SHOT ' + name);
  return name + '.png';
};

const run = async () => {
  const browser = await chromium.launch({
    executablePath: EXE, headless: true, args: ARGS,
    defaultViewport: { width: 1600, height: 900 },
  });
  const page = await browser.newPage();
  page.on('console', (m) => { if (m.type() === 'error') console.log('PAGE-ERR', m.text().slice(0, 140)); });

  await page.goto(APP_URL, { waitUntil: 'domcontentloaded' });
  // Wait for topology iframe + canvas to exist.
  await page.waitForSelector('#f-topo', { timeout: 15000 });
  const topo = page.frames().find((f) => f.url().includes('webgpu-topology'));
  if (!topo) throw new Error('topology frame not found');
  await topo.waitForSelector('#gpu', { timeout: 15000 });

  // Use a lighter node count so SwiftShader renders fast AND a center click reliably hits a node.
  await topo.evaluate(() => {
    const el = document.getElementById('nodeCount');
    if (el) { el.value = '12000'; el.dispatchEvent(new Event('input', { bubbles: true })); el.dispatchEvent(new Event('change', { bubbles: true })); }
  });
  await sleep(6000); // physics settle + render

  // ---- Step 1: topology / source node (initial state) ----
  await shot(page, '01-topology');

  // Click a node: try center + offsets until the shell reaches stage >= 2.
  const box = await page.locator('#f-topo').boundingBox();
  const cx = box.x + box.width / 2, cy = box.y + box.height / 2;
  const offsets = [[0, 0], [50, 0], [-50, 0], [0, 50], [0, -50], [90, 30], [-90, -30], [30, 90], [-30, -90], [120, 0]];
  let selected = false;
  for (const [dx, dy] of offsets) {
    await page.mouse.click(cx + dx, cy + dy);
    await sleep(700);
    if ((await stage(page)) >= 2) { selected = true; break; }
  }
  if (!selected) throw new Error('could not select a node (stage never reached 2)');
  await sleep(1500); // let redactor load + start scanning
  await shot(page, '02-redact');

  // Wait until Sign & Send is enabled (scan settled).
  const signReady = await waitFor(() => page.$eval('#btnSignSend', (el) => !el.disabled).catch(() => false), 25000);
  console.log('signReady=' + signReady);
  await sleep(800);
  await shot(page, '03-sign-ready');

  // ---- Step 3: sign & send ----
  await page.click('#btnSignSend');
  await sleep(1500);
  await shot(page, '04-sign-send'); // peer A: connected·sent, stepper 4

  // ---- Step 4/5: receive + verify ----
  const received = await waitFor(() => page.$eval('#recvDecision', (el) => !el.hidden).catch(() => false), 20000);
  console.log('received=' + received);
  // reveal hidden transfer screens for the demo
  await page.click('#btnRevealP2P');
  await sleep(900);
  await shot(page, '05-receive-peek'); // recvDecision + revealed Peer A/B transfer
  await page.click('#btnRevealP2P'); // hide again

  const verified = await waitFor(() => page.$eval('#btnArchive', (el) => !el.disabled).catch(() => false), 20000);
  console.log('verified=' + verified);
  await sleep(800);
  await shot(page, '06-verify'); // signed:verified, archive unlocked

  // ---- Step 6: archive dialog ----
  await page.click('#btnArchive');
  await page.waitForSelector('#archiveDialog[open]', { timeout: 8000 }).catch(() => {});
  await sleep(700);
  await shot(page, '07-archive-dialog');

  // Fill passphrase and seal.
  await page.fill('#archivePass', 'AegisDemo2026');
  await page.click('#btnArchiveGo');
  const sealed = await waitFor(() =>
    page.$eval('#vaultState', (el) => /sealed|OPFS|KB|encrypted/i.test(el.textContent || '')).catch(() => false), 20000);
  console.log('sealed=' + sealed);
  await sleep(1200);
  await shot(page, '08-audit'); // all green + audit timeline filled

  await browser.close();

  const manifest = [
    { file: '01-topology.png', title: '1 - Topology tracing', caption: 'Click any node (#id) in the digital-twin network as the starting point of the whole loop. Output: the selected source node.', dur: 6 },
    { file: '02-redact.png', title: '2 - Local redaction', caption: 'The contract is OCR-ed locally in the browser; ID numbers, bank accounts and similar fields are covered by black re-rasterised boxes, and the exported PDF has no text layer. Output: the redacted PDF.', dur: 7 },
    { file: '03-sign-ready.png', title: '3 - Ready to sign', caption: 'Scanning is done; Sign & Send unlock.', dur: 4 },
    { file: '04-sign-send.png', title: '4 - Sign and send peer-to-peer', caption: 'The SHA-256 digest is signed with ECDSA and transferred directly over WebRTC+AES-GCM; the signalling server sees only SDP/ICE. Output: sent (Peer A sent).', dur: 6 },
    { file: '05-receive-peek.png', title: '5 - Receiving, transfer view hidden', caption: 'The receiver gets the encrypted byte stream; this shows the real WebRTC encrypted transfer between both ends. Output: the recvDecision card.', dur: 7 },
    { file: '06-verify.png', title: '6 - Verify the signature', caption: 'The hash is recomputed and every signer is checked; only a valid signature unlocks the next step. Output: the Verified state.', dur: 6 },
    { file: '07-archive-dialog.png', title: '7 - Archive, enter the passphrase', caption: 'Enter a passphrase (>= 8 characters); it is used once and never written to disk.', dur: 5 },
    { file: '08-audit.png', title: '8 - Audit chain', caption: 'The file and its signatures are written into the browser-local OPFS vault; every step is appended to a SHA-256 hash chain that cannot be altered. Output: the loop is complete and the Stepper is all green.', dur: 7 },
  ];
  writeFileSync(new URL('./assets/manifest.json', import.meta.url).pathname, JSON.stringify(manifest, null, 2));
  console.log('DONE; screenshots in ' + OUT);
};

run().catch((e) => { console.error('CAPTURE_FAIL', e); process.exit(1); });
