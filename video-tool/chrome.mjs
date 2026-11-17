// Aegis - Copyright (c) 2026 Yang Jie (Jerome Young)
// Watermark: AEGIS / ENGINE BY YANG JIE (JEROME YOUNG) - original implementation, Apache-2.0
// video-tool/chrome.mjs
// SPDX-License-Identifier: Apache-2.0
//
// One resolver for "which browser do these runtime gates launch?".
//
// The gates used to hard-code /Applications/Google Chrome.app — fine on a laptop,
// fatal on the Ubuntu runner, where that path does not exist and the gate died
// with `Failed to launch chromium because executable doesn't exist`. Resolution
// order: CHROME_EXE → CHROME_PATH → the macOS bundle when it is really there →
// the browser Playwright manages (returning undefined lets Playwright find it).

import { existsSync } from 'node:fs';

const MAC_CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';

export function chromePath() {
  for (const candidate of [process.env.CHROME_EXE, process.env.CHROME_PATH]) {
    if (candidate && existsSync(candidate)) return candidate;
  }
  if (existsSync(MAC_CHROME)) return MAC_CHROME;
  return undefined;
}

// Playwright launch options shared by every gate. `extraArgs` are appended after
// the always-safe flags, so a caller can still ask for swiftshader/WebGPU.
export function chromeLaunchOptions(extraArgs = []) {
  const exe = chromePath();
  return {
    ...(exe ? { executablePath: exe } : {}),
    args: ['--no-sandbox', ...extraArgs],
  };
}

export const BASE_URL = process.env.BASE || 'http://localhost:8099';
