import { NextResponse } from 'next/server';
import db from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    let result: any = null;

    // Deteksi otomatis tipe database (Supabase / SQL Query / Prisma)
    if (typeof (db as any)?.from === 'function') {
      // Jika menggunakan Supabase Client
      const { data, error } = await (db as any).from('config').select('*').limit(1);
      if (error) throw error;
      result = data;
    } else if (typeof (db as any)?.execute === 'function') {
      // Jika menggunakan SQLite / Turso / LibSQL
      result = await (db as any).execute('SELECT 1 as keep_alive');
    } else if (typeof (db as any)?.query === 'function') {
      // Jika menggunakan PostgreSQL Pool / MySQL
      result = await (db as any).query('SELECT 1');
    } else if (typeof (db as any)?.config?.findFirst === 'function') {
      // Jika menggunakan Prisma ORM
      result = await (db as any).config.findFirst();
    }

    return NextResponse.json({
      success: true,
      message: 'Database berhasil di-ping dan tetap aktif!',
      timestamp: new Date().toISOString(),
      data: result
    });
  } catch (error: any) {
    console.error('Keep-alive ping error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}