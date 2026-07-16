import { neon } from '@neondatabase/serverless';

const sql = neon(process.env.DATABASE_URL!);

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
  const rows = await sql`SELECT id, name, data, created_at, updated_at FROM buildings ORDER BY created_at DESC`;
  return rows as DbBuilding[];
}

export async function getBuilding(id: string): Promise<DbBuilding | null> {
  const rows = await sql`SELECT id, name, data, created_at, updated_at FROM buildings WHERE id = ${id}`;
  return (rows[0] as DbBuilding) || null;
}

export async function createBuilding(id: string, name: string, data: Record<string, unknown>): Promise<DbBuilding> {
  const rows = await sql`INSERT INTO buildings (id, name, data) VALUES (${id}, ${name}, ${JSON.stringify(data)}::jsonb) RETURNING id, name, data, created_at, updated_at`;
  return rows[0] as DbBuilding;
}

export async function updateBuilding(id: string, name: string, data: Record<string, unknown>): Promise<DbBuilding | null> {
  const rows = await sql`UPDATE buildings SET name = ${name}, data = ${JSON.stringify(data)}::jsonb, updated_at = NOW() WHERE id = ${id} RETURNING id, name, data, created_at, updated_at`;
  return (rows[0] as DbBuilding) || null;
}

export async function deleteBuilding(id: string): Promise<boolean> {
  const before = await sql`SELECT 1 FROM buildings WHERE id = ${id}`;
  if (before.length === 0) return false;
  await sql`DELETE FROM buildings WHERE id = ${id}`;
  return true;
}

export async function getSetting(key: string): Promise<unknown> {
  const rows = await sql`SELECT value FROM app_settings WHERE key = ${key}`;
  return rows[0]?.value ?? null;
}

export async function setSetting(key: string, value: unknown): Promise<void> {
  await sql`INSERT INTO app_settings (key, value, updated_at) VALUES (${key}, ${JSON.stringify(value)}::jsonb, NOW()) ON CONFLICT (key) DO UPDATE SET value = ${JSON.stringify(value)}::jsonb, updated_at = NOW()`;
}
