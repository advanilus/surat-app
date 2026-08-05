import { NextResponse } from 'next/server';
import db from '@/lib/db';
import { writeFile, mkdir } from 'fs/promises';
import path from 'path';

// 1. GET: Ambil seluruh data surat
export async function GET() {
  try {
    const letters = db
      .prepare('SELECT * FROM letters ORDER BY letter_date DESC, created_at DESC')
      .all();

    return NextResponse.json({ success: true, data: letters });
  } catch (error) {
    console.error('Database Error:', error);
    return NextResponse.json({ success: false, error: 'Gagal mengambil data' }, { status: 500 });
  }
}

// 2. POST: Simpan Surat Baru + File Lampiran
export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const type = formData.get('type') as string;
    const letter_number = formData.get('letter_number') as string;
    const subject = formData.get('subject') as string;
    const sender = formData.get('sender') as string;
    const recipient = formData.get('recipient') as string;
    const letter_date = formData.get('letter_date') as string;
    const file = formData.get('file') as File | null;

    if (!type || !['MASUK', 'KELUAR'].includes(type)) {
      return NextResponse.json({ success: false, error: 'Jenis surat tidak valid' }, { status: 400 });
    }

    let filePath: string | null = null;

    // Simpan File jika ada lampiran
    if (file && file.size > 0) {
      const bytes = await file.arrayBuffer();
      const buffer = Buffer.from(bytes);
      
      const fileName = `${Date.now()}-${file.name.replace(/\s+/g, '_')}`;
      const uploadDir = path.join(process.cwd(), 'public', 'uploads');
      
      await mkdir(uploadDir, { recursive: true });
      await writeFile(path.join(uploadDir, fileName), buffer);
      filePath = `/uploads/${fileName}`;
    }

    const formattedDate = letter_date || new Date().toISOString().split('T')[0];

    const stmt = db.prepare(`
      INSERT INTO letters (type, letter_number, subject, sender, recipient, letter_date, file_path)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);

    const result = stmt.run(
      type,
      letter_number || null,
      subject || null,
      sender || null,
      recipient || null,
      formattedDate,
      filePath
    );

    return NextResponse.json({ success: true, message: 'Surat berhasil dicatat!', data: { id: result.lastInsertRowid } }, { status: 201 });
  } catch (error) {
    console.error('Insert Error:', error);
    return NextResponse.json({ success: false, error: 'Gagal menyimpan surat' }, { status: 500 });
  }
}