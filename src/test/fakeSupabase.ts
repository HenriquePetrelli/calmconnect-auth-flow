/**
 * Minimal in-memory fake of the Supabase JS client, good enough to run the
 * emergency (SOS) call flow end-to-end in tests: chainable filters used by
 * `emergencyCallGuard` and `session-validation`, plus `auth.getUser`.
 */

export type Row = Record<string, any>;

interface Filter {
  apply: (row: Row) => boolean;
}

class QueryBuilder implements PromiseLike<{ data: any; error: any; count?: number | null }> {
  private filters: Filter[] = [];
  private mode: 'select' | 'update' | 'insert' | 'delete' | 'upsert' = 'select';
  private patch: Row | null = null;
  private inserted: Row[] = [];
  private onConflictCols: string[] = [];
  private orderKey: string | null = null;
  private ascending = true;
  private limitN: number | null = null;
  private countRequested = false;
  private headOnly = false;

  constructor(private db: FakeDB, private table: string) {}

  select(_cols?: string, opts?: { count?: 'exact' | 'planned' | 'estimated'; head?: boolean }) {
    if (this.mode === 'select') this.mode = 'select';
    this.countRequested = !!opts?.count;
    this.headOnly = !!opts?.head;
    return this;
  }
  insert(rows: Row | Row[]) {
    this.mode = 'insert';
    this.inserted = Array.isArray(rows) ? rows : [rows];
    return this;
  }
  /** Simplificado: só olha `onConflict` pra decidir merge-vs-insert; sem upsert real de constraint. */
  upsert(rows: Row | Row[], opts?: { onConflict?: string }) {
    this.mode = 'upsert';
    this.inserted = Array.isArray(rows) ? rows : [rows];
    this.onConflictCols = opts?.onConflict ? opts.onConflict.split(',').map((c) => c.trim()) : [];
    return this;
  }
  update(patch: Row) {
    this.mode = 'update';
    this.patch = patch;
    return this;
  }
  delete() {
    this.mode = 'delete';
    return this;
  }
  eq(col: string, value: any) {
    this.filters.push({ apply: (r) => r[col] === value });
    return this;
  }
  in(col: string, values: any[]) {
    this.filters.push({ apply: (r) => values.includes(r[col]) });
    return this;
  }
  is(col: string, value: null) {
    this.filters.push({ apply: (r) => (r[col] ?? null) === value });
    return this;
  }
  gte(col: string, value: any) {
    this.filters.push({ apply: (r) => r[col] >= value });
    return this;
  }
  lte(col: string, value: any) {
    this.filters.push({ apply: (r) => r[col] <= value });
    return this;
  }
  or(expr: string) {
    const clauses = expr.split(',').map((c) => {
      const [col, op, value] = c.split('.');
      return { col, op, value };
    });
    this.filters.push({
      apply: (r) => clauses.some((c) => c.op === 'eq' && String(r[c.col]) === c.value),
    });
    return this;
  }
  order(col: string, opts?: { ascending?: boolean }) {
    this.orderKey = col;
    this.ascending = opts?.ascending ?? true;
    return this;
  }
  limit(n: number) {
    this.limitN = n;
    return this;
  }

  private matching(): Row[] {
    const rows = this.db.rows(this.table).filter((r) => this.filters.every((f) => f.apply(r)));
    if (this.orderKey) {
      const key = this.orderKey;
      rows.sort((a, b) => {
        const av = String(a[key] ?? '');
        const bv = String(b[key] ?? '');
        return this.ascending ? av.localeCompare(bv) : bv.localeCompare(av);
      });
    }
    return this.limitN != null ? rows.slice(0, this.limitN) : rows;
  }

  private run(): { data: any; error: any; count?: number } {
    if (this.db.failNextWith && this.mode !== 'select') {
      const error = this.db.failNextWith;
      this.db.failNextWith = null;
      return { data: null, error };
    }
    if (this.db.failSelectWith && this.mode === 'select') {
      const error = this.db.failSelectWith;
      this.db.failSelectWith = null;
      return { data: null, error };
    }

    switch (this.mode) {
      case 'insert': {
        this.db.rows(this.table).push(...this.inserted);
        return { data: this.inserted, error: null };
      }
      case 'upsert': {
        const table = this.db.rows(this.table);
        const results: Row[] = this.inserted.map((newRow) => {
          const existing =
            this.onConflictCols.length > 0
              ? table.find((r) => this.onConflictCols.every((c) => r[c] === newRow[c]))
              : undefined;
          if (existing) {
            Object.assign(existing, newRow);
            return existing;
          }
          table.push(newRow);
          return newRow;
        });
        return { data: results, error: null };
      }
      case 'update': {
        const rows = this.matching();
        rows.forEach((r) => Object.assign(r, this.patch));
        this.db.writes.push({ table: this.table, patch: { ...this.patch } });
        return { data: rows, error: null };
      }
      case 'delete': {
        const rows = this.matching();
        const all = this.db.rows(this.table);
        rows.forEach((r) => all.splice(all.indexOf(r), 1));
        return { data: rows, error: null };
      }
      default: {
        const matched = this.matching();
        return {
          data: this.headOnly ? null : matched,
          error: null,
          ...(this.countRequested ? { count: matched.length } : {}),
        };
      }
    }
  }

  maybeSingle() {
    const { data, error } = this.run();
    const list = Array.isArray(data) ? data : [];
    return Promise.resolve({ data: list[0] ? { ...list[0] } : null, error });
  }
  single() {
    const { data, error } = this.run();
    const list = Array.isArray(data) ? data : [];
    return Promise.resolve({
      data: list[0] ? { ...list[0] } : null,
      error: error ?? (list[0] ? null : { code: 'PGRST116', message: 'no rows' }),
    });
  }
  then<TResult1 = any, TResult2 = never>(
    onfulfilled?: ((value: { data: any; error: any }) => TResult1 | PromiseLike<TResult1>) | null,
    onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | null
  ): PromiseLike<TResult1 | TResult2> {
    return Promise.resolve(this.run()).then(onfulfilled, onrejected);
  }
}

/** Minimal Supabase Realtime presence channel fake. */
export class FakeChannel {
  private handlers: { event: string; cb: () => void }[] = [];
  private state: Record<string, any[]> = {};

  constructor(public topic: string, private key: string) {}

  on(_type: 'presence', filter: { event: string }, cb: () => void) {
    this.handlers.push({ event: filter.event, cb });
    return this;
  }
  subscribe(cb?: (status: string) => void | Promise<void>) {
    cb?.('SUBSCRIBED');
    return this;
  }
  async track(payload: Record<string, any>) {
    this.state[this.key] = [payload];
    this.emit('join');
    return 'ok';
  }
  presenceState() {
    return this.state;
  }
  /** Test helper: the remote participant joins the room. */
  remoteJoin(userType: string) {
    this.state[userType] = [{ userType, joinedAt: Date.now() }];
    this.emit('join');
  }
  /** Test helper: the remote participant drops (network loss / tab closed). */
  remoteLeave(userType: string) {
    delete this.state[userType];
    this.emit('leave');
  }
  private emit(event: string) {
    this.handlers.filter((h) => h.event === event || h.event === 'sync').forEach((h) => h.cb());
  }
}

export type RpcHandler = (db: FakeDB, params: Record<string, any>) => { data: any; error: any };

/** Simula só o suficiente das RPCs SECURITY DEFINER de verdade pra testar
 * hooks que dependem delas. Qualquer RPC sem handler aqui (ou em
 * `FakeDB.rpcHandlers`, registrável por teste) resolve como no-op. */
const DEFAULT_RPC_HANDLERS: Record<string, RpcHandler> = {
  add_patient_activity: (db, params) => {
    const patientId = params.p_patient_id;
    const rows = db.rows('patient_statistics');
    let row = rows.find((r) => r.patient_id === patientId);
    const activity = { name: params.p_activity_name, date: params.p_activity_date };
    if (!row) {
      row = { patient_id: patientId, recent_activities: [activity] };
      rows.push(row);
    } else {
      const current = (row.recent_activities ?? []) as Row[];
      row.recent_activities = [activity, ...current].slice(0, 5);
    }
    return { data: null, error: null };
  },
};

export class FakeDB {
  tables: Record<string, Row[]> = {};
  currentUserId: string | null = null;
  writes: { table: string; patch: Row }[] = [];
  channels: FakeChannel[] = [];
  failNextWith: any = null;
  failSelectWith: any = null;
  /** Handlers extras/sobrepostos por teste, além dos padrões em DEFAULT_RPC_HANDLERS. */
  rpcHandlers: Record<string, RpcHandler> = {};

  rows(table: string): Row[] {
    if (!this.tables[table]) this.tables[table] = [];
    return this.tables[table];
  }

  seed(table: string, rows: Row[]) {
    this.tables[table] = rows.map((r) => ({ ...r }));
  }

  get client() {
    const db = this;
    return {
      from: (table: string) => new QueryBuilder(db, table),
      rpc: (fnName: string, params?: Record<string, any>) => {
        const handler = db.rpcHandlers[fnName] ?? DEFAULT_RPC_HANDLERS[fnName];
        if (handler) return Promise.resolve(handler(db, params ?? {}));
        return Promise.resolve({ data: null, error: null });
      },
      channel: (topic: string, opts?: { config?: { presence?: { key?: string } } }) => {
        const ch = new FakeChannel(topic, opts?.config?.presence?.key ?? 'anon');
        db.channels.push(ch);
        return ch;
      },
      removeChannel: (ch: FakeChannel) => {
        db.channels = db.channels.filter((c) => c !== ch);
        return Promise.resolve('ok');
      },
      auth: {
        getUser: async () => ({
          data: { user: db.currentUserId ? { id: db.currentUserId } : null },
          error: db.currentUserId ? null : { message: 'not authenticated' },
        }),
      },
    };
  }
}

export const fakeDb = new FakeDB();
export const fakeSupabase = fakeDb.client;
