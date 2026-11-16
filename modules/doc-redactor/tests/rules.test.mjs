// Aegis - Copyright (c) 2026 Yang Jie (Jerome Young)
// Watermark: AEGIS / ENGINE BY YANG JIE (JEROME YOUNG) - original implementation, Apache-2.0
// SPDX-License-Identifier: Apache-2.0
/**
 * MDS-1 unit tests for the REDAKTOR detection catalogue.
 *
 * The contract that matters commercially is simple: every rule must (a) actually
 * fire on its own documented example, and (b) refuse near-misses that only differ
 * in a checksum digit. A rule that fires on everything is as useless as one that
 * never fires.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { RULES, RULE_BY_ID } from "../src/js/detect/rules.de.js";

const regexRules = RULES.filter((r) => r.kind === "regex");

test("catalogue is well formed (invariant)", () => {
  assert.ok(RULES.length >= 10, `expected a real catalogue, got ${RULES.length} rules`);
  const ids = new Set(RULES.map((r) => r.id));
  assert.equal(ids.size, RULES.length, "rule ids must be unique");
  for (const r of RULES) {
    assert.ok(r.label && r.group && r.severity, `rule ${r.id} is incomplete`);
    assert.ok(["regex", "term", "labeled", "heuristic"].includes(r.kind), `rule ${r.id} has unknown kind: ${r.kind}`);
  }
});

test("every regex rule fires on its own documented example (contract)", () => {
  const misses = [];
  for (const rule of regexRules) {
    if (!rule.example) continue;
    rule.pattern.lastIndex = 0;
    const hit = new RegExp(rule.pattern.source, rule.pattern.flags.replace("g", "")).test(rule.example);
    if (!hit) misses.push(rule.id);
  }
  assert.deepEqual(misses, [], `rules that do not match their own example: ${misses.join(",")}`);
});

test("every rule with a validator accepts its documented example", () => {
  const rejected = [];
  for (const rule of regexRules) {
    if (!rule.validate || !rule.example) continue;
    if (!rule.validate(rule.example)) rejected.push(rule.id);
  }
  assert.deepEqual(rejected, [], `validators rejecting their own example: ${rejected.join(",")}`);
});

test("FAILURE PATH: an IBAN with a broken checksum is rejected by the validator", () => {
  const iban = RULE_BY_ID.get("iban");
  assert.ok(iban.validate("DE89 3704 0044 0532 0130 00"), "the documented example must validate");
  // Same length, same country, one checksum digit changed:
  assert.equal(iban.validate("DE88 3704 0044 0532 0130 00"), false, "bad checksum must not validate");
});

test("FAILURE PATH: random prose produces no rule hit (no false positives on clean text)", () => {
  const clean = "This paragraph contains no personal data at all, just ordinary words.";
  const hits = [];
  for (const rule of regexRules) {
    if (rule.kind !== "regex") continue;
    rule.pattern.lastIndex = 0;
    for (const m of clean.matchAll(rule.pattern)) {
      if (!rule.validate || rule.validate(m[0])) hits.push(rule.id);
    }
  }
  assert.deepEqual(hits, [], `clean prose triggered: ${hits.join(",")}`);
});

test("group order is stable and covers every rule group (invariant)", async () => {
  const { GROUP_ORDER, GROUP_LABELS } = await import("../src/js/detect/rules.de.js");
  const used = new Set(RULES.map((r) => r.group));
  for (const g of used) {
    assert.ok(GROUP_ORDER.includes(g), `group ${g} missing from GROUP_ORDER`);
    assert.ok(GROUP_LABELS[g], `group ${g} has no label`);
  }
});
