// Aegis - Copyright (c) 2026 Jerome Young (Yang Jie)
// SPDX-License-Identifier: BUSL-1.1
/**
 * ========================================================================
 * Aegis — Local Encrypted Vault (Audit & Archive)
 *
 * Licensed under the MIT License. Any use is permitted, commercial included,
 * with no fee and no permission needed. Attribution is welcome, not required.
 * ========================================================================
 */

// src/vault.js — the product-level API on top of a storage adapter.
//
//   const vault = createVault(await openOpfsStore());
//   const record = await vault.seal({ name, type, bytes, metadata, passphrase });
//   const opened = await vault.open(record.id, passphrase);
//
// The vault is intentionally "zero-cloud": there is no fetch, no sync queue, no
// telemetry. Bytes go browser memory → AES-GCM → OPFS. The only thing an
// observer of the filesystem sees is opaque containers and their sizes.

import { openContainer, sealContainer } from './container.js';
import { RECORD_SUFFIX, recordFileName } from './store.js';

export const MAX_ARCHIVE_BYTES = 64 * 1024 * 1024; // 64 MB per record (in-memory seal)

function newRecordId() {
  if (globalThis.crypto && typeof globalThis.crypto.randomUUID === 'function') {
    return globalThis.crypto.randomUUID();
  }
  const bytes = new Uint8Array(16);
  globalThis.crypto.getRandomValues(bytes);
  return [...bytes].map((b) => b.toString(16).padStart(2, '0')).join('');
}

function humanSize(bytes) {
  if (!bytes) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB'];
  const i = Math.min(units.length - 1, Math.floor(Math.log(bytes) / Math.log(1024)));
  return `${(bytes / 1024 ** i).toFixed(i ? 1 : 0)} ${units[i]}`;
}

/**
 * @param {object} store a store adapter from store.js
 * @param {{maxBytes?: number}} [options]
 */
export function createVault(store, { maxBytes = MAX_ARCHIVE_BYTES } = {}) {
  if (!store || typeof store.put !== 'function') {
    throw new Error('createVault requires a storage adapter.');
  }

  return {
    store,

    /**
     * Encrypt `bytes` + `metadata` and persist them as one opaque record.
     * @param {{name?: string, type?: string, bytes: Uint8Array, metadata?: object, passphrase: string}} o
     * @returns {Promise<{id: string, sealedAt: string, size: number, containerSize: number}>}
     */
    async seal({ name = 'artifact.bin', type = 'application/octet-stream', bytes, metadata = {}, passphrase }) {
      if (!(bytes instanceof Uint8Array) || bytes.length === 0) {
        throw new Error('Nothing to archive: the file is empty.');
      }
      if (bytes.length > maxBytes) {
        throw new Error(`Archive limit is ${humanSize(maxBytes)} per record. Split the file first.`);
      }

      const id = newRecordId();
      const sealedAt = new Date().toISOString();
      const envelope = {
        ...metadata,
        schema: 'aegis.archive.v1',
        name: String(name).slice(0, 200),
        type: String(type).slice(0, 120),
        size: bytes.length,
        sealedAt,
      };

      const container = await sealContainer({ bytes, metadata: envelope, passphrase });
      await store.put(recordFileName(id), container);
      return { id, sealedAt, size: bytes.length, containerSize: container.length };
    },

    /**
     * Decrypt one record. Metadata and file bytes are only available here.
     * @param {string} id
     * @param {string} passphrase
     */
    async open(id, passphrase) {
      const container = await store.get(recordFileName(id));
      if (!container) throw new Error('Vault record not found.');
      const opened = await openContainer(container, passphrase);
      return { id, ...opened };
    },

    /** List opaque records: id + container size only. Names stay encrypted. */
    async list() {
      const entries = await store.list();
      return entries
        .filter((entry) => entry.name.endsWith(RECORD_SUFFIX))
        .map((entry) => ({ id: entry.name.slice(0, -RECORD_SUFFIX.length), containerSize: entry.size }))
        .sort((a, b) => a.id.localeCompare(b.id));
    },

    /** @param {string} id */
    async remove(id) {
      return store.remove(recordFileName(id));
    },

    async stats() {
      const entries = await this.list();
      return {
        count: entries.length,
        containerBytes: entries.reduce((sum, entry) => sum + entry.containerSize, 0),
      };
    },
  };
}
