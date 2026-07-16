import { NextRequest, NextResponse } from 'next/server';
import { getSetting, setSetting } from '@/lib/db';

export async function GET(req: NextRequest) {
  try {
    const key = req.nextUrl.searchParams.get('key');
    if (!key) {
      return NextResponse.json({ error: 'key query param required' }, { status: 400 });
    }
    const value = await getSetting(key);
    return NextResponse.json({ key, value });
  } catch (err) {
    console.error('GET /api/settings error:', err);
    return NextResponse.json({ error: 'Failed to fetch setting' }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const body = await req.json();
    const { key, value } = body;
    if (!key) {
      return NextResponse.json({ error: 'key is required' }, { status: 400 });
    }
    await setSetting(key, value);
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('PUT /api/settings error:', err);
    return NextResponse.json({ error: 'Failed to save setting' }, { status: 500 });
  }
}
