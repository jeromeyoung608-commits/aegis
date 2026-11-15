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

// src/store.js — storage adapters for the vault.
//
// Two implementations behind one interface, exactly like the identity module's
// keystore:
//
//   openOpfsStore()     → the real Origin Private File System (browser)
//   createMemoryStore() → an in-process Map (Node tests, and a safe fallback)
//
// Both expose: put(name, bytes) / get(name) / list() / remove(name) / clear().
// The vault never touches the filesystem directly, so the entire encryption and
// bookkeeping path is unit-testable without a browser.

export const VAULT_DIR = 'aegis-vault';
export const RECORD_SUFFIX = '.aegis';
const ID_PATTERN = /^[a-z0-9][a-z0-9-]{7,63}$/;

/**
 * Reject anything that is not a plain, lowercase, hyphenated id, so a crafted
 * id can never escape the vault directory (`../`, absolute paths, NUL bytes…).
 */
export function recordFileName(id) {
  const value = String(id || '');
  if (!ID_PATTERN.test(value)) {
    throw new Error('Invalid vault record id.');
  }
  return value + RECORD_SUFFIX;
}

export function idFromFileName(name) {
  return String(name).endsWith(RECORD_SUFFIX) ? name.slice(0, -RECORD_SUFFIX.length) : null;
}

export function opfsSupported() {
  return Boolean(
    typeof navigator !== 'undefined'
    && navigator.storage
    && typeof navigator.storage.getDirectory === 'function',
  );
}

export function createMemoryStore() {
  const files = new Map();
  return {
    kind: 'memory',
    async put(name, bytes) { files.set(name, new Uint8Array(bytes)); },
    async get(name) {
      const value = files.get(name);
      return value ? new Uint8Array(value) : null;
    },
    async list() {
      return [...files.entries()].map(([name, bytes]) => ({ name, size: bytes.length }));
    },
    async remove(name) { return files.delete(name); },
    async clear() { files.clear(); },
  };
}

/**
 * Open (and create on first use) the OPFS vault directory.
 * @param {{dirName?: string}} [options]
 */
export async function openOpfsStore({ dirName = VAULT_DIR } = {}) {
  if (!opfsSupported()) {
    throw new Error('OPFS is not available in this browser. Use Chrome/Edge 113+ on localhost or HTTPS.');
  }
  const root = await navigator.storage.getDirectory();
  const dir = await root.getDirectoryHandle(dirName, { create: true });

  return {
    kind: 'opfs',
    async put(name, bytes) {
      const handle = await dir.getFileHandle(name, { create: true });
      const writable = await handle.createWritable();
      try {
        await writable.write(bytes);
      } finally {
        await writable.close();
      }
    },
    async get(name) {
      try {
        const handle = await dir.getFileHandle(name);
        const file = await handle.getFile();
        return new Uint8Array(await file.arrayBuffer());
      } catch (error) {
        if (error && error.name === 'NotFoundError') return null;
        throw error;
      }
    },
    async list() {
      const out = [];
      for await (const [name, handle] of dir.entries()) {
        if (handle.kind !== 'file' || !name.endsWith(RECORD_SUFFIX)) continue;
        const file = await handle.getFile();
        out.push({ name, size: file.size });
      }
      return out;
    },
    async remove(name) {
      try {
        await dir.removeEntry(name);
        return true;
      } catch (error) {
        if (error && error.name === 'NotFoundError') return false;
        throw error;
      }
    },
    async clear() {
      for await (const [name, handle] of dir.entries()) {
        if (handle.kind === 'file' && name.endsWith(RECORD_SUFFIX)) {
          await dir.removeEntry(name);
        }
      }
    },
  };
}
