import { neon } from '@neondatabase/serverless';

let _sql: ReturnType<typeof neon> | null = null;

function getSql() {
  if (!_sql) {
    _sql = neon(process.env.DATABASE_URL!);
  }
  return _sql;
}

export interface DbBuilding {
  id: string;
  name: string;
  data: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface DbSetting {
  key: string;
  value: unknown;
  updated_at: string;
}

export async function getAllBuildings(): Promise<DbBuilding[]> {
  const rows = await getSql()`SELECT id, name, data, created_at, updated_at FROM buildings ORDER BY created_at DESC` as unknown[];
  return rows as DbBuilding[];
}

export async function getBuilding(id: string): Promise<DbBuilding | null> {
  const rows = await getSql()`SELECT id, name, data, created_at, updated_at FROM buildings WHERE id = ${id}` as unknown[];
  return (rows[0] as DbBuilding) || null;
}

export async function createBuilding(id: string, name: string, data: Record<string, unknown>): Promise<DbBuilding> {
  const rows = await getSql()`INSERT INTO buildings (id, name, data) VALUES (${id}, ${name}, ${JSON.stringify(data)}::jsonb) RETURNING id, name, data, created_at, updated_at` as unknown[];
  return rows[0] as DbBuilding;
}

export async function updateBuilding(id: string, name: string, data: Record<string, unknown>): Promise<DbBuilding | null> {
  const rows = await getSql()`UPDATE buildings SET name = ${name}, data = ${JSON.stringify(data)}::jsonb, updated_at = NOW() WHERE id = ${id} RETURNING id, name, data, created_at, updated_at` as unknown[];
  return (rows[0] as DbBuilding) || null;
}

export async function deleteBuilding(id: string): Promise<boolean> {
  const before = await getSql()`SELECT 1 FROM buildings WHERE id = ${id}` as unknown[];
  if (before.length === 0) return false;
  await getSql()`DELETE FROM buildings WHERE id = ${id}`;
  return true;
}

export async function getSetting(key: string): Promise<unknown> {
  const rows = await getSql()`SELECT value FROM app_settings WHERE key = ${key}` as Record<string, unknown>[];
  return rows[0]?.value ?? null;
}

export async function setSetting(key: string, value: unknown): Promise<void> {
  await getSql()`INSERT INTO app_settings (key, value, updated_at) VALUES (${key}, ${JSON.stringify(value)}::jsonb, NOW()) ON CONFLICT (key) DO UPDATE SET value = ${JSON.stringify(value)}::jsonb, updated_at = NOW()`;
}
