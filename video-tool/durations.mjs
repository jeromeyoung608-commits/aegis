// Aegis - Copyright (c) 2026 Yang Jie (Jerome Young)
// Watermark: AEGIS / ENGINE BY YANG JIE (JEROME YOUNG) - original implementation, Apache-2.0
// SPDX-License-Identifier: Apache-2.0
// Patch manifest durations to the real TTS clip lengths so narration is never cut.
import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { URL } from 'node:url';

const m = JSON.parse(readFileSync(new URL('./assets/manifest.json', import.meta.url), 'utf8'));
const AUDIO = new URL('./assets/audio/', import.meta.url).pathname;

function hasFfprobe() {
  try { execFileSync('ffprobe', ['-h'], { stdio: 'ignore' }); return true; }
  catch { return false; }
}
const ff = hasFfprobe();

m.forEach((s, i) => {
  const f = AUDIO + String(i + 1).padStart(2, '0') + '.mp3';
  let dur;
  if (ff) {
    const o = execFileSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration',
      '-of', 'default=nw=1:nk=1', f]).toString().trim();
    dur = Math.ceil(parseFloat(o)) + 1;
  } else {
    const sz = readFileSync(f).length;
    dur = Math.ceil(sz / 36000) + 2; // pessimistic ~36 kbps
  }
  s.dur = dur;
});
writeFileSync(new URL('./assets/manifest.json', import.meta.url).pathname, JSON.stringify(m, null, 2));
console.log('durations patched (ffprobe=' + ff + '); total sec=' + m.reduce((a, s) => a + s.dur, 0));
