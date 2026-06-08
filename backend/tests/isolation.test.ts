/**
 * Multi-tenant isolation contract tests (calls routes).
 *
 * The backend uses the Supabase service_role key, which BYPASSES Row Level
 * Security. Tenant isolation therefore depends entirely on every query
 * applying `.eq('company_id', <caller's company>)`. These tests are the safety
 * net: they fail if a future change removes that filter.
 *
 * Supabase is fully mocked — no real database is touched. We assert on the
 * filters the route handlers apply, not on returned rows.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import request from 'supertest';
import express, { type Express } from 'express';

// Shared mock state. vi.hoisted runs before imports so the mock is wired up
// before calls.ts (and its supabase import) is evaluated.
const h = vi.hoisted(() => {
  const recordedEq: Array<{ table: string; column: string; value: unknown }> = [];
  let listData: unknown[] = [];
  let singleData: unknown = null;

  function makeChain(table: string) {
    const chain: Record<string, unknown> = { _single: false };
    const passthrough = [
      'select', 'insert', 'update', 'delete', 'upsert', 'order', 'range',
      'limit', 'gte', 'lte', 'lt', 'gt', 'neq', 'in', 'ilike', 'like',
      'or', 'not', 'match', 'contains', 'head', 'returns',
    ];
    for (const m of passthrough) chain[m] = () => chain;
    chain.eq = (column: string, value: unknown) => {
      recordedEq.push({ table, column, value });
      return chain;
    };
    chain.single = () => { chain._single = true; return chain; };
    chain.maybeSingle = () => { chain._single = true; return chain; };
    chain.then = (resolve: (v: unknown) => unknown, reject?: (e: unknown) => unknown) =>
      Promise.resolve(
        chain._single
          ? { data: singleData, error: null }
          : { data: listData, error: null, count: (listData as unknown[]).length },
      ).then(resolve, reject);
    return chain;
  }

  return {
    recordedEq,
    reset() { recordedEq.length = 0; listData = []; singleData = null; },
    supabase: { from: (table: string) => makeChain(table) },
  };
});

vi.mock('../src/db/supabase', () => ({
  supabase: h.supabase,
  handleSupabaseError: (e: unknown): never => { throw e; },
}));

// Imported AFTER the mock is registered (vi.mock is hoisted by vitest).
import callsRoutes from '../src/routes/calls';

type TestUser = { userId: number; companyId: number | null; role: string };

const adminA: TestUser = { userId: 1, companyId: 10, role: 'admin_manager' };
const agentA: TestUser = { userId: 2, companyId: 10, role: 'agent' };
const developer: TestUser = { userId: 99, companyId: null, role: 'developer' };

function appFor(user: TestUser): Express {
  const app = express();
  app.use(express.json());
  app.use((req, _res, next) => { (req as unknown as { user: TestUser }).user = user; next(); });
  app.use('/api/calls', callsRoutes);
  return app;
}

const callsFilters = () => h.recordedEq.filter((e) => e.table === 'calls');

beforeEach(() => h.reset());

describe('multi-tenant isolation — GET /api/calls (list)', () => {
  it('scopes an admin to their own company', async () => {
    await request(appFor(adminA)).get('/api/calls').expect(200);
    expect(callsFilters()).toContainEqual({ table: 'calls', column: 'company_id', value: 10 });
  });

  it('restricts an agent to their own company AND their own calls', async () => {
    await request(appFor(agentA)).get('/api/calls').expect(200);
    expect(h.recordedEq).toContainEqual({ table: 'calls', column: 'company_id', value: 10 });
    expect(h.recordedEq).toContainEqual({ table: 'calls', column: 'agent_id', value: 2 });
  });

  it('does NOT force a company filter for a developer (super-admin)', async () => {
    await request(appFor(developer)).get('/api/calls').expect(200);
    const companyFilters = callsFilters().filter((e) => e.column === 'company_id');
    expect(companyFilters).toHaveLength(0);
  });
});

describe('multi-tenant isolation — GET /api/calls/:id (IDOR protection)', () => {
  it('applies the company filter so an admin cannot read another company call by id', async () => {
    // Mock returns no row → handler responds 404 (the correct cross-tenant outcome).
    await request(appFor(adminA)).get('/api/calls/555').expect(404);
    expect(h.recordedEq).toContainEqual({ table: 'calls', column: 'id', value: 555 });
    expect(h.recordedEq).toContainEqual({ table: 'calls', column: 'company_id', value: 10 });
  });

  it('further restricts an agent to their own calls by id', async () => {
    await request(appFor(agentA)).get('/api/calls/555').expect(404);
    expect(h.recordedEq).toContainEqual({ table: 'calls', column: 'company_id', value: 10 });
    expect(h.recordedEq).toContainEqual({ table: 'calls', column: 'agent_id', value: 2 });
  });
});
