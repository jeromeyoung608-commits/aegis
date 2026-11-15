// Aegis - Copyright (c) 2026 Jerome Young (Yang Jie)
// SPDX-License-Identifier: Apache-2.0
/**
 * ========================================================================
 * sync-canvas — Distributed State & Real-time Collaboration Engine
 *
 * Licensed under the MIT License. Any use is permitted, commercial included,
 * with no fee and no permission needed. Attribution is welcome, not required.
 * ========================================================================
 */

/**
 * Locking policy for signature stamps.
 *
 * A stamp is a one-way action: once a party affixes it (locked: true), it is a
 * signed, audited mark on the drawing. Nobody — not the original signer, not
 * the other engineer, not a late-joining peer — may drag it, delete it, or
 * rewrite its content. The lock travels through the OT engine as an ordinary
 * `set(id, { locked: true })` patch, so it is replicated and last-writer-wins
 * like any other property; the engine never special-cases it.
 *
 * These helpers are the single source of truth that the interaction layer asks
 * before it touches a node. Keeping the rule in one tiny module means the same
 * guard runs in the browser and in the Node tests.
 */

export function isLocked(node) {
  return Boolean(node && node.locked);
}

/** Locked stamps are immovable by anyone. */
export function canMove(node) {
  return !isLocked(node);
}

/** Locked stamps are undeletable by anyone. */
export function canDelete(node) {
  return !isLocked(node);
}

/** Locked stamps cannot have their text/position rewritten. */
export function canEdit(node) {
  return !isLocked(node);
}
