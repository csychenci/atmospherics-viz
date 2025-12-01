interface CacheNode<T> {
  key: string;
  value: T;
  older?: CacheNode<T>;
  newer?: CacheNode<T>;
}

export class LRUCache<T> {
  private size: number = 0;
  private limit: number = 0;
  private keymap: Record<string, CacheNode<T>> = {};
  private head?: CacheNode<T>;
  private tail?: CacheNode<T>;

  constructor(limit: number) {
    this.limit = limit;
  }

  put(key: string, value: T): CacheNode<T> | undefined {
    const node: CacheNode<T> = {
      key,
      value,
      older: undefined,
      newer: undefined,
    };

    this.keymap[key] = node;

    if (this.tail) {
      this.tail.newer = node;
      node.older = this.tail;
    } else {
      this.head = node;
    }

    this.tail = node;

    if (this.size === this.limit) {
      return this.shift();
    }

    this.size++;
  }

  private shift(): CacheNode<T> | undefined {
    const node = this.head;
    if (!node || !this.head) return undefined;

    if (this.head.newer) {
      this.head = this.head.newer;
      this.head.older = void 0;
    } else {
      this.head = void 0;
    }

    node.newer = node.older = void 0;
    delete this.keymap[node.key];

    return node;
  }

  get(key: string): T | undefined {
    const node = this.keymap[key];

    if (!node) return undefined;

    if (node === this.tail) return node.value;

    if (node.newer) {
      if (node === this.head) {
        this.head = node.newer;
      }
      node.newer.older = node.older;
    }

    if (node.older) {
      node.older.newer = node.newer;
    }

    node.newer = void 0;
    node.older = this.tail;

    if (this.tail) {
      this.tail.newer = node;
    }

    this.tail = node;

    return node.value;
  }

  remove(key: string): T | undefined {
    const node = this.keymap[key];
    if (!node) return undefined;

    delete this.keymap[key];

    if (node.newer && node.older) {
      node.older.newer = node.newer;
      node.newer.older = node.older;
    } else if (node.newer) {
      node.newer.older = void 0;
      this.head = node.newer;
    } else if (node.older) {
      node.older.newer = void 0;
      this.tail = node.older;
    } else {
      this.head = this.tail = void 0;
    }

    this.size--;
    return node.value;
  }

  removeAll(): void {
    this.head = this.tail = void 0;
    this.size = 0;
    this.keymap = {};
  }

  forEach(callback: (value: T, key: string) => void): void {
    let node = this.head;
    while (node) {
      callback(node.value, node.key);
      node = node.newer;
    }
  }

  toJSON(): Array<{ key: string; value: T }> {
    const result: Array<{ key: string; value: T }> = [];
    let node = this.head;
    while (node) {
      result.push({
        key: node.key,
        value: node.value,
      });
      node = node.newer;
    }
    return result;
  }
}
