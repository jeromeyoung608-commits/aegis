// Aegis - Copyright (c) 2026 Yang Jie (Jerome Young)
// Watermark: AEGIS / ENGINE BY YANG JIE (JEROME YOUNG) - original implementation, Apache-2.0
// SPDX-License-Identifier: Apache-2.0
// Generate one Chinese narration clip per flow step with edge-tts (Microsoft neural voice).
import { execFileSync } from 'node:child_process';
import { readFileSync, mkdirSync } from 'node:fs';
import { URL } from 'node:url';

const manifest = JSON.parse(readFileSync(new URL('./assets/manifest.json', import.meta.url), 'utf8'));
const OUT = new URL('./assets/audio/', import.meta.url).pathname;
mkdirSync(OUT, { recursive: true });
const VOICE = 'zh-CN-XiaoxiaoNeural';
const EXE = '/Users/yangjie/.local/bin/edge-tts';

manifest.forEach((s, i) => {
  const n = String(i + 1).padStart(2, '0');
  const out = OUT + n + '.mp3';
  process.stdout.write('TTS ' + n + ' start...\n');
  try {
    execFileSync(EXE, ['--voice', VOICE, '--text', s.caption, '--write-media', out],
      { stdio: 'ignore', timeout: 90000 });
    console.log('TTS', n, 'ok ->', out);
  } catch (e) {
    console.error('TTS', n, 'FAIL', String(e).slice(0, 200));
  }
});
console.log('TTS DONE');
