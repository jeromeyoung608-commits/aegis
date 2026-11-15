// Aegis - Copyright (c) 2026 Jerome Young (Yang Jie)
// SPDX-License-Identifier: BUSL-1.1
// Aegis/scripts/setup.mjs — foolproof one-click setup.
//
// Zero external dependencies: the only thing it needs is Node.js >= 22 (for the
// built-in node:sqlite). It creates the data directory, initializes the embedded
// database, and writes a config/local.json with an auto-generated issuer secret
// so `node server.js` works immediately afterwards — no manual environment setup.
//
// Idempotent: safe to run again. On an existing config the issuerSecret is
// ROTATED (never silently reused) so a secret baked into a dev tree can never
// become every customer's shared admin password (B-03).
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

const ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const DATA_DIR = path.join(ROOT, 'data');
const CONFIG_DIR = path.join(ROOT, 'config');
const CONFIG_PATH = path.join(CONFIG_DIR, 'local.json');

function fail(msg) {
  console.error('\n  ✖ ' + msg + '\n');
  process.exit(1);
}

console.log('\nAegis 一键安装\n──────────────');

// 1. Node version gate (node:sqlite needs >= 22).
const [major] = process.versions.node.split('.').map(Number);
if (major < 22) {
  fail(`需要 Node.js ≥ 22（当前 ${process.versions.node}）。node:sqlite 在 22+ 内置，低于此版本无法一键安装。\n  请先升级 Node：https://nodejs.org`);
}

// 2. Directories.
fs.mkdirSync(DATA_DIR, { recursive: true });
fs.mkdirSync(CONFIG_DIR, { recursive: true });

// 3. Initialize the embedded database (this also self-checks node:sqlite works).
const { initStore } = await import('../server/store.js');
initStore();
console.log('  • 已初始化嵌入式数据库 data/aegis.db（node:sqlite，零安装）');

// 4. Config with an auto-generated issuer secret (idempotent).
if (!fs.existsSync(CONFIG_PATH)) {
  const cfg = {
    // 自动生成的签发密钥；生产请改用强口令并离线保管（见 README §14）。
    issuerSecret: crypto.randomBytes(32).toString('hex'),
    port: 8080,
    trustedLan: false, // 仅实验室可设 true；生产保持 false
    // 以下字段为后续阶段（身份 IdP / TSA 链校验 / 跨站传输 / 吊销）预留，当前由 server.js 忽略或仅占位。
    tsa: { mode: 'off' },
    auth: { mode: 'local' },
    retentionDays: 365,
    // Phase 4 — 跨站传输：提供真实 STUN/TURN 服务器后，客户端会用它们建立直连；
    // 若无可用的 TURN，Aegis 内置 /relay 作为自托管中继兜底（server-blind）。
    rtc: { iceServers: [] },
    // Phase 4 — 服务端密钥托管策略：enabled 时客户端应把会话密钥封套(加密到
    // operatorPubKey) 存入 /escrow；operatorPubKey 为操作员公钥 SPKI(base64url)。
    escrow: { enabled: false, operatorPubKey: null, requireForAdmit: false },
  };
  fs.writeFileSync(CONFIG_PATH, JSON.stringify(cfg, null, 2) + '\n', { mode: 0o600 });
  fs.chmodSync(CONFIG_PATH, 0o600); // `mode` only applies on create; be explicit.
  console.log('  • 已生成 config/local.json（含自动生成的 AEGIS_ISSUER_SECRET，权限 0600）');
} else {
  // B-01/B-03: never silently reuse an existing (possibly leaked / shipped) secret.
  // Rotate it in place and say so loudly. All other operator-tuned fields survive.
  let existing = {};
  try { existing = JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8')); } catch { existing = {}; }
  const rotated = crypto.randomBytes(32).toString('hex');
  const hadSecret = typeof existing.issuerSecret === 'string' && existing.issuerSecret.length > 0;
  existing.issuerSecret = rotated;
  fs.writeFileSync(CONFIG_PATH, JSON.stringify(existing, null, 2) + '\n', { mode: 0o600 });
  // An EXISTING file keeps its old mode (often 0644) — a rotated secret must not
  // stay world-readable, so chmod explicitly on both create and rotate paths.
  fs.chmodSync(CONFIG_PATH, 0o600);
  console.log(`  • rotating issuerSecret — ${hadSecret ? '检测到既有密钥，已轮换（不复用）' : '补生成新密钥'}；旧会话/旧口令即刻失效`);
  console.log('    若已部署客户端，请用新密钥重新签发；也可用 AEGIS_ISSUER_SECRET 环境变量覆盖。');
}

console.log(`
✔ 安装完成（零依赖，无需外部数据库/服务）。

下一步：
  1. 启动服务：  npm start          （等价 node server.js）
  2. 打开页面：  http://localhost:8080
  3. 跑单元回归：npm test
  4. 跑浏览器门禁：node video-tool/verify-runtime.mjs

说明：
  • 所有数据落在 data/aegis.db（重启不丢失）。
  • /session 签发密钥在 config/local.json 的 issuerSecret；server.js 会自动读取，
    也可设环境变量 AEGIS_ISSUER_SECRET 覆盖。
  • 企业功能（身份 IdP / TSA 采信 / 跨站传输 / 吊销）将在后续阶段启用（见 README §14）。
`);
