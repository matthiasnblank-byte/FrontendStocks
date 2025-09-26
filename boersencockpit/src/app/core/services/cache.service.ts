import { Injectable } from '@angular/core';

export interface CacheEntry<T> {
  readonly asOf: number;
  readonly ttl: number;
  readonly value: T;
}

interface InternalEntry<T> extends CacheEntry<T> {
  readonly expiresAt: number;
}

const STORAGE_PREFIX = 'cache:v1:';

@Injectable({ providedIn: 'root' })
export class CacheService {
  private readonly memory = new Map<string, InternalEntry<unknown>>();

  private readonly persistentNamespaces = new Set<string>();

  private readonly storage: Storage | null;

  constructor() {
    this.storage = typeof window !== 'undefined' && window?.localStorage ? window.localStorage : null;
  }

  usePersistentNamespace(namespace: string, enabled: boolean): void {
    if (!namespace) {
      return;
    }
    if (enabled) {
      this.persistentNamespaces.add(namespace);
      return;
    }
    this.persistentNamespaces.delete(namespace);
    if (!this.storage) {
      return;
    }
    const keys: string[] = [];
    for (let i = 0; i < this.storage.length; i += 1) {
      const key = this.storage.key(i);
      if (key && key.startsWith(STORAGE_PREFIX + namespace)) {
        keys.push(key);
      }
    }
    for (const key of keys) {
      this.storage.removeItem(key);
    }
  }

  get<T>(key: string): T | null {
    const entry = this.resolveEntry<T>(key);
    if (!entry) {
      return null;
    }
    return entry.value;
  }

  set<T>(key: string, value: T, ttlMs: number): void {
    const now = Date.now();
    const entry: InternalEntry<T> = {
      value,
      ttl: ttlMs,
      asOf: now,
      expiresAt: now + ttlMs
    };
    this.memory.set(key, entry);
    if (this.shouldPersist(key) && this.storage) {
      const payload: CacheEntry<T> = { value, ttl: ttlMs, asOf: now };
      this.storage.setItem(this.storageKey(key), JSON.stringify(payload));
    }
  }

  hasFresh(key: string): boolean {
    return this.resolveEntry(key) !== null;
  }

  clear(prefix?: string): void {
    const predicate = prefix ? (key: string) => key.startsWith(prefix) : () => true;
    for (const key of Array.from(this.memory.keys())) {
      if (predicate(key)) {
        this.memory.delete(key);
      }
    }
    if (!this.storage) {
      return;
    }
    const toDelete: string[] = [];
    for (let i = 0; i < this.storage.length; i += 1) {
      const key = this.storage.key(i);
      if (key && key.startsWith(STORAGE_PREFIX) && (!prefix || key.startsWith(STORAGE_PREFIX + prefix))) {
        toDelete.push(key);
      }
    }
    toDelete.forEach((key) => this.storage?.removeItem(key));
  }

  private resolveEntry<T>(key: string): InternalEntry<T> | null {
    const fromMemory = this.memory.get(key) as InternalEntry<T> | undefined;
    if (fromMemory) {
      if (fromMemory.expiresAt > Date.now()) {
        return fromMemory;
      }
      this.memory.delete(key);
    }
    if (!this.shouldPersist(key) || !this.storage) {
      return null;
    }
    const raw = this.storage.getItem(this.storageKey(key));
    if (!raw) {
      return null;
    }
    try {
      const parsed = JSON.parse(raw) as CacheEntry<T>;
      const expiresAt = parsed.asOf + parsed.ttl;
      if (Number.isNaN(expiresAt) || expiresAt <= Date.now()) {
        this.storage.removeItem(this.storageKey(key));
        return null;
      }
      const entry: InternalEntry<T> = { ...parsed, expiresAt };
      this.memory.set(key, entry);
      return entry;
    } catch {
      this.storage.removeItem(this.storageKey(key));
      return null;
    }
  }

  private shouldPersist(key: string): boolean {
    for (const namespace of this.persistentNamespaces) {
      if (key.startsWith(namespace)) {
        return true;
      }
    }
    return false;
  }

  private storageKey(key: string): string {
    return `${STORAGE_PREFIX}${key}`;
  }
}
