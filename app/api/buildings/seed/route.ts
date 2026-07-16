import { NextRequest, NextResponse } from 'next/server';
import { getAllBuildings, createBuilding } from '@/lib/db';

interface SeedBuilding {
  id: string;
  name: string;
  data: Record<string, unknown>;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { buildings, namedSeed } = body as { buildings?: SeedBuilding[]; namedSeed?: string };

    let seedBuildings: SeedBuilding[] = [];

    if (namedSeed) {
      if (namedSeed === 'luxor') {
        const { createLuxorBuilding } = await import('@/lib/seedLuxor');
        const b = createLuxorBuilding();
        seedBuildings = [{ id: b.id, name: b.nome, data: { blocos: b.blocos } }];
      } else if (namedSeed === 'acquaplay') {
        const { createAcquaplayBuilding } = await import('@/lib/seedAcquaplay');
        const b = createAcquaplayBuilding();
        seedBuildings = [{ id: b.id, name: b.nome, data: { blocos: b.blocos } }];
      } else {
        return NextResponse.json({ error: 'Unknown namedSeed. Use "luxor" or "acquaplay".' }, { status: 400 });
      }
    } else if (Array.isArray(buildings) && buildings.length > 0) {
      seedBuildings = buildings;
    } else {
      return NextResponse.json({ error: 'Provide "namedSeed" or "buildings" array' }, { status: 400 });
    }

    const existing = await getAllBuildings();
    const existingIds = new Set(existing.map(b => b.id));

    let created = 0;
    let skipped = 0;

    for (const b of seedBuildings) {
      if (existingIds.has(b.id)) {
        skipped++;
        continue;
      }
      await createBuilding(b.id, b.name, b.data);
      created++;
    }

    return NextResponse.json({ ok: true, created, skipped });
  } catch (err) {
    console.error('POST /api/buildings/seed error:', err);
    return NextResponse.json({ error: 'Failed to seed buildings' }, { status: 500 });
  }
}
