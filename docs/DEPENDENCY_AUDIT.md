# Aegis 依赖与「纯手搓」审计（2026-11-12）

审计对象：`~/Documents/Aegis`（含 `aegis-shell` + 11 个 module）
结论一句话：**内核是手写的，但「100% 零依赖」不成立**——有 3 个第三方库（5 个组件）被 vendor 进仓库，另有 1 个 Node 进程在跑。

---

## 1. 事实清单（可直接对外引用）

| 项 | 事实 | 取证方式 |
|---|---|---|
| 手写代码量 | **19,554 行**（.js/.mjs/.html/.css，排除 vendor、node_modules、tests）；其中纯 JS **15,221 行**，WGSL 着色器 **119 行** | `find … \| xargs wc -l` |
| 结构 | 1 个外壳 + **11 个模块**（webgpu-topology / doc-redactor / zero-knowledge-identity / p2p-crypto-transfer / encrypted-archive / audit-timeline / token-gate / blind-relay / detached-hash-signer / sync-canvas / e2e-signed-delivery） | `ls modules` |
| 根 package.json | **0 运行时依赖**，脚本只有 `npm test` | 文件内容 |
| 外壳 package.json | **0 依赖** | 文件内容 |
| 第三方库（文档脱敏模块） | `pdf.js 3.11.174`(Apache-2.0)、`pdf-lib 1.17.1`(MIT)、`tesseract.js 5.1.1`(Apache-2.0)、`tesseract.js-core 5.1.1`(Apache-2.0)、`tessdata deu+eng`(Apache-2.0) | `modules/doc-redactor/vendor/MANIFEST.json` + `THIRD_PARTY_NOTICES.md` |
| vendor 体积 | `doc-redactor/vendor` **35 MB**；`e2e-signed-delivery/vendor/pdf-lib` 524 KB | `du -sh` |
| 运行时网络请求 | **0**（全部本地加载：`./vendor/pdfjs/pdf.min.js`、`./vendor/tesseract/worker.min.js`、`langPath=./vendor/tessdata`） | `grep -rn "vendor/"` + 成片里 DevTools 实录 `0 'external requests'` |
| 仅测试用（不随运行时发货） | `playwright-core 1.55.0`、`playwright ^1.65.0`、`pdf-lib 1.17.1`（e2e 仓） | 各 module 的 devDependencies |
| 后端 | **1 个 Node 进程** `server.js`：零依赖（`node:http/https/fs/path/url` + 仓库内 token-gate），负责 ① 静态服务 ② 发 COOP/COEP 让页面 cross-origin isolated（SharedArrayBuffer 需要）③ WebRTC 信令中继（只见 SDP/ICE，不见字节与密钥） | `server.js` 头注释 |
| 内核模块依赖 | topology / crypto / identity / p2p / archive / audit / token-gate **全部零 vendor、零 npm**，WebGPU 管线与 WGSL 自写 | `ls modules/*/vendor` 全为空（除 doc-redactor、e2e） |

## 2. 到底哪些是「手搓」

- **手搓**：WebGPU 拓扑渲染（device/pipelines/camera/physics worker + 119 行 WGSL）、事件总线外壳与七步状态机、AES-GCM 分块加密与 PBKDF2 派生、ECDSA 签名与验签、WebRTC DataChannel 传输、OPFS 加密归档、哈希链审计、token-gate 房间令牌。
- **不是手搓（vendor）**：PDF **解析**（pdf.js）、PDF **写回**（pdf-lib）、**OCR 引擎**（Tesseract + 语言模型）。脱敏的**破坏性覆盖逻辑**（`fillRect` 覆盖原像素）是手写的，但「先要把 PDF 渲染成画布」这一步依赖 pdf.js。
- **不是手搓（进程）**：`server.js` 是自写的，但它确实是一个要跑起来的后端进程。

## 3. 视频台词的过期表述

| 现台词 | 问题 | 建议 |
|---|---|---|
| "no framework, no dependencies, nothing pulled from a registry at run time" | 前半句真，`no dependencies` 假 | 改成 "no framework, no npm install"，并明确三家库是 vendor 进仓库的 |
| "No relay, no backend, no queue in the middle" | 字节确实不经中继，但建联要信令服务器 | "no relay for the bytes"，补一句信令只换地址 |
| "zero backend"（结尾板） | 有 `server.js` | 改成 "one signaling relay"，或 "one static server" |
| "0 external requests" | **真**（实拍 DevTools 计数） | 保留 |

## 4. 审计中发现的可疑点（未改代码，仅记录）

- `modules/doc-redactor/vendor/MANIFEST.json` 声明 SHA-256 清单，但仓库里 `tessdata` 是 `.gz`，若部署时解压会与清单哈希不一致——发布前需按 MANIFEST 复核。
- `e2e-signed-delivery` 也 vendor 了一份 `pdf-lib`（测试夹具用），与 doc-redactor 的副本版本相同但独立维护，算重复依赖。
- 根 `package.json` 写 "zero runtime dependencies"，严格说应写 "zero npm dependencies"，否则与 vendor 事实冲突。
- **外壳经由 SDK 间接依赖 pdf-lib**：`aegis-shell/src/app.js:46`、`src/identity.js:40` 都 `import` 自 `/modules/e2e-signed-delivery/src/sdk/pdf.js`，该封装内部用 `window.PDFLib`；而 `aegis-shell/index.html` 只加载 `./src/app.js`，没有引入 `vendor/pdf-lib` 脚本。后果有二：① 外壳并非 "0 vendor"；② 若走到 `buildPdf()` 路径，`window.PDFLib` 在 shell 页面为 `undefined`，存在运行时风险。建议在外壳显式加载 pdf-lib 或把 PDF 构建下放给 doc-redactor 模块。
- `doc-redactor/src/js/core/offline-guard.js` 里的 `fetch('https://example.com/redaktor-probe')` 是**故意**被 `guardedFetch` 跨域拦截的自测探针，不是真实外联，不违反「0 external requests」。

## 5. 对外表述口径（写进宣传物料/视频以这一套为准）

- ✅ 可以说：**no framework、no npm install、no CDN、运行时 0 外网请求、19,554 行手写代码、内核（拓扑/密码学/身份/传输/归档/审计）全部自研**。
- ❌ 不能说：**no dependencies / zero dependencies / zero vendor / zero backend**。
- ✅ 准确说法：**三个库 vendored 进仓库（pdf.js、pdf-lib、tesseract.js，Apache-2.0 / MIT，35 MB，本地加载）；另有 1 个零依赖 Node 服务器负责静态服务、COOP/COEP 与 WebRTC 信令（只交换 SDP/ICE，不见字节与密钥）**。

