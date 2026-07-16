import { NextRequest, NextResponse } from 'next/server';
import { getBuilding, updateBuilding, deleteBuilding } from '@/lib/db';

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const building = await getBuilding(params.id);
    if (!building) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }
    return NextResponse.json(building);
  } catch (err) {
    console.error('GET /api/buildings/[id] error:', err);
    return NextResponse.json({ error: 'Failed to fetch building' }, { status: 500 });
  }
}

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const body = await req.json();
    const { name, data } = body;
    if (!name) {
      return NextResponse.json({ error: 'name is required' }, { status: 400 });
    }
    const building = await updateBuilding(params.id, name, data || {});
    if (!building) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }
    return NextResponse.json(building);
  } catch (err) {
    console.error('PUT /api/buildings/[id] error:', err);
    return NextResponse.json({ error: 'Failed to update building' }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const ok = await deleteBuilding(params.id);
    if (!ok) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('DELETE /api/buildings/[id] error:', err);
    return NextResponse.json({ error: 'Failed to delete building' }, { status: 500 });
  }
}
