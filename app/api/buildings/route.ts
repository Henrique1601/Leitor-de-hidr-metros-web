import { NextRequest, NextResponse } from 'next/server';
import { getAllBuildings, createBuilding } from '@/lib/db';

export async function GET() {
  try {
    const buildings = await getAllBuildings();
    return NextResponse.json(buildings);
  } catch (err) {
    console.error('GET /api/buildings error:', err);
    return NextResponse.json({ error: 'Failed to fetch buildings' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { id, name, data } = body;
    if (!id || !name) {
      return NextResponse.json({ error: 'id and name are required' }, { status: 400 });
    }
    const building = await createBuilding(id, name, data || {});
    return NextResponse.json(building, { status: 201 });
  } catch (err) {
    console.error('POST /api/buildings error:', err);
    return NextResponse.json({ error: 'Failed to create building' }, { status: 500 });
  }
}
