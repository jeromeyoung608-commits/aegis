// Aegis - Copyright (c) 2026 Jerome Young (Yang Jie)
// Watermark: AEGIS / ENGINE BY JEROME YOUNG - original implementation, Apache-2.0
// SPDX-License-Identifier: Apache-2.0
/**
 * ========================================================================
 * Aegis — Zero-Knowledge Identity & Local Key Vault
 *
 * Licensed under the Apache License, Version 2.0 (SPDX: Apache-2.0). You may
 * not use this file except in compliance with the License. A copy ships as
 * LICENSE at the repository root; see http://www.apache.org/licenses/LICENSE-2.0
 * ========================================================================
 */
// Aegis/zero-knowledge-identity/src/keystore.js
// Storage adapters. Two implementations, one promise-shaped interface:
//   • openIndexedDbVault() — the real browser vault
//   • MemoryVault          — the same contract over a Map, for headless tests
//
// Both expose: get(id), put(record), list(), remove(id), close().
// Nothing above this layer knows which one it has.

export const DB_NAME = 'aegis-identity';
export const DB_VERSION = 1;
export const STORE = 'identities';

function requestToPromise(request) {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error || new Error('IndexedDB request failed'));
  });
}

export async function openIndexedDbVault({ dbName = DB_NAME, storeName = STORE } = {}) {
  if (!globalThis.indexedDB) {
    throw new Error('IndexedDB is unavailable in this browser context.');
  }
  const db = await new Promise((resolve, reject) => {
    const open = globalThis.indexedDB.open(dbName, DB_VERSION);
    open.onupgradeneeded = () => {
      const database = open.result;
      if (!database.objectStoreNames.contains(storeName)) {
        database.createObjectStore(storeName, { keyPath: 'id' });
      }
    };
    open.onsuccess = () => resolve(open.result);
    open.onerror = () => reject(open.error || new Error('Could not open IndexedDB'));
    open.onblocked = () => reject(new Error('IndexedDB upgrade blocked by another tab.'));
  });

  const tx = (mode) => db.transaction(storeName, mode).objectStore(storeName);

  return {
    kind: 'indexeddb',
    dbName,
    async get(id) {
      return requestToPromise(tx('readonly').get(id));
    },
    async put(record) {
      await requestToPromise(tx('readwrite').put(record));
      return record;
    },
    async list() {
      return requestToPromise(tx('readonly').getAll());
    },
    async remove(id) {
      await requestToPromise(tx('readwrite').delete(id));
    },
    async close() {
      db.close();
    },
  };
}

// Same contract, no persistence. Used by `node --test` and by the "dry run"
// path when IndexedDB is blocked (e.g. third-party iframe with storage denied).
export class MemoryVault {
  constructor(seed = []) {
    this.kind = 'memory';
    this.map = new Map(seed.map((record) => [record.id, structuredClone(record)]));
  }

  async get(id) {
    const record = this.map.get(id);
    return record ? structuredClone(record) : undefined;
  }

  async put(record) {
    this.map.set(record.id, structuredClone(record));
    return record;
  }

  async list() {
    return [...this.map.values()].map((record) => structuredClone(record));
  }

  async remove(id) {
    this.map.delete(id);
  }

  async close() {}
}
