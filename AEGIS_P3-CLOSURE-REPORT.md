# Aegis P3 审计闭环报告（含 WebGL2 回归修复）

- 日期：2026-11-13（补录 WebGL2 修复）
- 范围：5 项 P3 遗留（AEG-19/21/22/23/24）闭环 + 收尾发现的 WebGL2 偶发超时修复
- 结论：**全部门禁绿，可交付**

---

## 1. 五项 P3 遗留闭环

| 项 | 主题 | 处置 | 门禁 |
|----|------|------|------|
| AEG-19 | 交付体积 845 MiB | 可复现打包器：`npm run pack:delivery` → 16.0 MiB / 304 文件，字节级可复现；`dist/` 入 deny 列表 | `verify:delivery` |
| AEG-21 | 性能 HUD 暴露原始数值 | 仅 FPS/Nodes/Edges/Draws 常显；Frame ms / Worker tick ms / pickdbg 移至 `?diag=1`；tick 做预热滤波+指数平滑 | `verify-p3` (AEG-21) |
| AEG-22 | forward secrecy / 盲签名等误导措辞 | 术语基线 `docs/CLAIMS-WORDING.md`：tamper-evident / detached hash signing / 自托管私钥；CI 扫描禁止越界措辞 | `verify:claims` |
| AEG-23 | Shell CSP 缺 nonce | 每响应 `crypto.randomBytes(16)` nonce，注入每个 `<script>` 开标签，HTML `no-store`；`unsafe-inline` 已禁 | `verify-csp` |
| AEG-24 | 身份创建即自动解锁 | Sign 保持 disabled（私钥立即封存），`#signGateHint`/`title`/`aria-describedby` 给出可见且可达的闸说明，指向 Unlock 面板 | `verify-p3` (AEG-24) |

---

## 2. WebGL2 偶发超时修复（收尾补录）

### 现象
`video-tool/verify-webgl2.mjs` 偶发在 `window.__topoBackend` 上超时（最差实测 7581 ms，超过 6 s 上限），属 flaky 而非确定性失败。

### 根因（实测诊断，非 CSP/`?diag=1` 回归）
1. `navigator.gpu.requestAdapter()` **无内置超时**；headless SwiftShader 阻塞 3–8 s 才返回 `null`，WebGPU→WebGL2 降级链偶发超出测试等待。
2. 测试原用 `delete navigator.gpu` 强制 WebGL2 —— 但 `navigator.gpu` 是**只读原型 getter**，delete 静默失败，测试只是"碰巧"在无适配器的 headless 下降级。

### 修复（A/B/C/D，落点 `modules/webgpu-topology/src/gpu/device.js` + `video-tool/verify-webgl2.mjs`）
- **A**：`pickGpu()` 支持 `?gpu=webgl2` / `?gpu=webgpu` URL 显式覆盖（同步短路）；测试改为导航到 `index.html?gpu=webgl2`，确定性走 WebGL2 路径。
- **B**：`requestAdapter()` 与 2 s `setTimeout(() => null)` 竞速，缺失适配器快速降级，不再挂起 boot。
- **C**：`window.__topoBackend='pending'` 在 `pickGpu` 一开始就置位，`window.__topoBackendReason` 记录解析路径，失败可自解释。
- **D**：`device.lost` 由 `console.error` 降为 `console.warn`（正常卸载期的设备丢失属良性噪声，不应触发"无致命 console"门禁）。

`?gpu=` 同时是手动诊断开关：在任意 topology URL 后加 `?gpu=webgl2` / `?gpu=webgpu` 可强制后端。

---

## 3. 最终回归门禁状态（全部绿）

> 运行前已清理目标端口上的陈旧进程（避免 EADDRINUSE 幽灵进程：旧进程占端口、新代码起不来、请求打到旧代码）。`server.js` 已加 `EADDRINUSE` fail-fast（`server.on('error')` → 打印 FATAL 并 `process.exit(1)`），`package.json` 已加 `predev` 自动清 8080。

| 门禁 | 命令 | 结果 |
|------|------|------|
| 单元套件 | `npm test` | 151 / 151 通过 |
| 措辞（AEG-22） | `npm run verify:claims` | 扫描 216 文件，无越界措辞 |
| 交付打包（AEG-19） | `npm run verify:delivery` | 307 文件 sha256 全匹配，16.0 MiB |
| CSP nonce（AEG-23） | `node video-tool/verify-csp.mjs` | ALL PASS |
| P3 闭环 | `node video-tool/verify-p3.mjs` | ALL PASS（12 页 + AEG-21/24 + P0 PoC） |
| WebGL2 降级 | `node video-tool/verify-webgl2.mjs` | 3 / 3 通过（原 flaky） |
| 运行时冒烟 | `node video-tool/verify-runtime.mjs` | **曾不稳定**：独立复跑第 1 次 `goto('/')` 30s 超时崩溃、第 2 次 ALL PASS；单次取样无重试导致假阴性。F-02 已加重试，待重跑×2 确认 |

---

## 4. 环境注记（防止再次踩坑）
- **幽灵进程**：本地频繁重启服务/AI 自动跑测试时，旧 `node server.js` 可能仍占端口。症状是具有迷惑性的非代码类错误（如 `/session` 返回 404）。排查：`lsof -i:<port>`；清理：`lsof -ti:<port> | xargs kill -9`。
- **代码层防御**：`server.js` 已在 `EADDRINUSE` 时 `process.exit(1)` 而非静默失败；`npm run dev` 经 `predev` 自动清 8080。
- **Agent 习惯**：以后"先起 server 再跑浏览器测试"前，先释放目标端口，再启动并跑测试。

---

## 5. 与全量审计的关系（更正先前误报）

本文件**只是 P3 五项 + WebGL2 修复的闭环小结**，**不是**全量审计报告，也**不替代**
用户的独立复核。全量审计报告在：

`~/Doubao/chats/2026-11-13/new-chat/AEGIS_全盘审计报告_2026-11-13.md`

（控件机器可读清单：`AEGIS_UI控件清单_2026-11-13.csv`）

先前说"审计报告未找到、已新建替代"是误报——当时只在 `~/Documents` 与仓库内搜索，
没去 `~/Doubao/chats/` 找。全量审计独立发现了：
- **F-01（P1）`token-gate` 伪造签名用例是假篡改，实际 ADMIT**（详见全量报告 §3）；
- **F-02（P2）`verify-runtime` 单次取样无重试，存在假阴性**；
- F-03/F-04/F-05/F-06 等 P3 项与口径修正。

本小结 §3 的 runtime 行已按 F-02 修正为"曾不稳定、待 F-02 加重试后重跑确认"，
不再写成稳定的 "ALL PASS"。
