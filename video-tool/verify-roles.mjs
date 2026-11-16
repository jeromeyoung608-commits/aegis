// Aegis - Copyright (c) 2026 Jerome Young (Yang Jie)
// Watermark: AEGIS / ENGINE BY JEROME YOUNG - original implementation, Apache-2.0
// SPDX-License-Identifier: Apache-2.0
import { chromium } from 'playwright';

const EXE = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const BASE = 'http://localhost:8099';
const b = await chromium.launch({
  executablePath: EXE,
  args: ['--no-sandbox', '--use-gl=swiftshader', '--enable-unsafe-webgpu'],
});

async function probe(role) {
  const p = await b.newPage({ viewport: { width: 1440, height: 900 } });
  const url = role ? `${BASE}/?role=${role}` : BASE + '/';
  await p.goto(url, { waitUntil: 'domcontentloaded' });
  await p.waitForTimeout(500);
  const d = await p.evaluate(() => {
    const g = (sel) => {
      const el = document.querySelector(sel);
      if (!el) return 'MISSING';
      return getComputedStyle(el).display === 'none' ? 'hidden' : 'shown';
    };
    return {
      bodyRole: document.body.dataset.role,
      readOnly: document.body.classList.contains('read-only'),
      stageTopo: g('#stage-topo'),
      redactWrap: g('.redact-wrap'),
      redactHead: g('#redactHead'),
      transferCard: g('#transferCard'),
      btnArchive: g('#btnArchive'),
      btnLoadDoc: g('#btnLoadDoc'),
      adminPanel: g('#adminPanel'),
    };
  });
  await p.close();
  return d;
}

const operator = await probe('');
const recipient = await probe('recipient');
const auditor = await probe('auditor');
const admin = await probe('admin');
const external = await probe('external');

const show = (label, r) => console.log(label.padEnd(10),
  'role=' + (r.bodyRole || '-'), 'RO=' + r.readOnly,
  'topo=' + r.stageTopo, 'redact=' + r.redactWrap, 'redactHead=' + r.redactHead, 'transfer=' + r.transferCard,
  'archive=' + r.btnArchive, 'loadDoc=' + r.btnLoadDoc, 'admin=' + r.adminPanel);

show('operator', operator);
show('recipient', recipient);
show('auditor', auditor);
show('admin', admin);
show('external', external);

// Assertions
const checks = {
  op_topo: operator.stageTopo === 'shown',
  op_redact: operator.redactWrap === 'shown',
  op_transfer: operator.transferCard === 'shown',
  op_ro: operator.readOnly === false,
  op_admin: operator.adminPanel === 'hidden',
  rec_topo: recipient.stageTopo === 'hidden',
  rec_redact: recipient.redactWrap === 'hidden',
  rec_head: recipient.redactHead === 'hidden',
  aud_topo: auditor.stageTopo === 'hidden',
  aud_head: auditor.redactHead === 'hidden',
  aud_archive: auditor.btnArchive === 'hidden',
  aud_ro: auditor.readOnly === true,
  adm_panel: admin.adminPanel === 'shown',
  ext_archive: external.btnArchive === 'hidden',
  ext_ro: external.readOnly === true,
};
const failed = Object.entries(checks).filter(([, v]) => !v).map(([k]) => k);
const ok = failed.length === 0;
if (!ok) console.log('FAILED:', failed.join(', '));

console.log(ok ? '\n[ROLE] ALL PASS' : '\n[ROLE] FAIL');
await b.close();
process.exit(ok ? 0 : 1);
