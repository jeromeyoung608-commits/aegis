// Aegis - Copyright (c) 2026 Yang Jie (Jerome Young)
// Watermark: AEGIS / ENGINE BY YANG JIE (JEROME YOUNG) - original implementation, Apache-2.0
// SPDX-License-Identifier: Apache-2.0
/**
 * MDS-1 tests for the Aegis shell seven-step state machine.
 * The commercial promise is "one node click walks seven stages without going
 * backwards" — that is exactly what these assertions lock.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  FLOW_STAGES, AegisContext, selectNode, setDocument, setSigning,
  markSent, markReceived, markVerified, markSealed, resetFlow,
} from "../src/context.js";

test("the loop has exactly seven stages, strictly increasing (invariant)", () => {
  const values = Object.values(FLOW_STAGES);
  assert.equal(values.length, 7);
  assert.deepEqual(values, [1, 2, 3, 4, 5, 6, 7]);
});

test("a full run advances 1 -> 7 in order", () => {
  resetFlow();
  selectNode({ index: 0, x: 0.2, y: 0.3 });
  assert.equal(AegisContext.flowStage, FLOW_STAGES.TOPOLOGY);

  setDocument("contract.pdf", "synthetic");
  assert.equal(AegisContext.flowStage, FLOW_STAGES.REDACT);

  setSigning({ hash: "ab".repeat(32), signature: "sig", publicKey: "pub", artifact: new Uint8Array([1]) });
  assert.equal(AegisContext.flowStage, FLOW_STAGES.SIGN);

  markSent();
  assert.equal(AegisContext.flowStage, FLOW_STAGES.P2P_SEND);

  markReceived("contract.pdf");
  assert.equal(AegisContext.flowStage, FLOW_STAGES.VERIFY);

  markVerified(true, "signature ok");
  assert.equal(AegisContext.flowStage, FLOW_STAGES.ARCHIVE);
  assert.equal(AegisContext.verified, true);

  markSealed("rec-001");
  assert.equal(AegisContext.flowStage, FLOW_STAGES.AUDIT);
  assert.equal(AegisContext.sealed, "rec-001");
});

test("FAILURE PATH: a rejected signature must NOT unlock the archive stage", () => {
  resetFlow();
  selectNode({ index: 1 });
  setDocument("d.pdf", "uploaded");
  setSigning({ hash: "cd".repeat(32), signature: "s", publicKey: "p", artifact: new Uint8Array([2]) });
  markSent();
  markReceived("d.pdf");
  markVerified(false, "digest mismatch");
  assert.equal(AegisContext.verified, false);
  assert.equal(AegisContext.flowStage, FLOW_STAGES.VERIFY, "a failed verify must not advance to archive");
});

test("stages never move backwards when events arrive out of order (invariant)", () => {
  resetFlow();
  markSealed("rec-x");                     // out-of-order late event
  assert.equal(AegisContext.flowStage, FLOW_STAGES.AUDIT);
  selectNode({ index: 5 });                // stale replay of stage 1
  assert.equal(AegisContext.flowStage, FLOW_STAGES.AUDIT, "a late stage-1 event must not rewind the loop");
});

test("resetFlow clears every per-run field", () => {
  resetFlow();
  selectNode({ index: 3 });
  setDocument("a.pdf", "uploaded");
  setSigning({ hash: "ef".repeat(32), signature: "s", publicKey: "p", artifact: new Uint8Array([3]) });
  markSealed("rec-9");
  resetFlow();
  assert.equal(AegisContext.flowStage, 0);
  assert.equal(AegisContext.selectedNode, null);
  assert.equal(AegisContext.sealed, null);
  assert.deepEqual(AegisContext.transfer, { sent: false, received: false });
});
