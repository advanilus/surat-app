import { NextResponse } from 'next/server';
import db from '@/lib/db';
import { writeFile, mkdir, unlink } from 'fs/promises';
import path from 'path';

// PUT: Edit Data Surat
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const formData = await request.formData();
    
    const type = formData.get('type') as string;
    const letter_number = formData.get('letter_number') as string;
    const subject = formData.get('subject') as string;
    const sender = formData.get('sender') as string;
    const recipient = formData.get('recipient') as string;
    const letter_date = formData.get('letter_date') as string;
    const file = formData.get('file') as File | null;

    // Cek surat lama
    const existing = db.prepare('SELECT * FROM letters WHERE id = ?').get(id) as { file_path?: string } | undefined;
    if (!existing) {
      return NextResponse.json({ success: false, error: 'Surat tidak ditemukan' }, { status: 404 });
    }

    let filePath = existing.file_path || null;

    // Jika upload file baru
    if (file && file.size > 0) {
      const bytes = await file.arrayBuffer();
      const buffer = Buffer.from(bytes);
      const fileName = `${Date.now()}-${file.name.replace(/\s+/g, '_')}`;
      const uploadDir = path.join(process.cwd(), 'public', 'uploads');
      
      await mkdir(uploadDir, { recursive: true });
      await writeFile(path.join(uploadDir, fileName), buffer);
      
      // Hapus file lama jika ada
      if (existing.file_path) {
        try {
          await unlink(path.join(process.cwd(), 'public', existing.file_path));
        } catch (e) {
          console.warn('Gagal menghapus berkas lama:', e);
        }
      }

      filePath = `/uploads/${fileName}`;
    }

    const stmt = db.prepare(`
      UPDATE letters 
      SET type = ?, letter_number = ?, subject = ?, sender = ?, recipient = ?, letter_date = ?, file_path = ?
      WHERE id = ?
    `);

    stmt.run(type, letter_number, subject, sender, recipient, letter_date, filePath, id);

    return NextResponse.json({ success: true, message: 'Surat berhasil diperbarui!' });
  } catch (error) {
    console.error('Update Error:', error);
    return NextResponse.json({ success: false, error: 'Gagal memperbarui data' }, { status: 500 });
  }
}

// DELETE: Hapus Data Surat
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const letter = db.prepare('SELECT * FROM letters WHERE id = ?').get(id) as { file_path?: string } | undefined;

    if (!letter) {
      return NextResponse.json({ success: false, error: 'Surat tidak ditemukan' }, { status: 404 });
    }

    // Hapus file fisik lampiran jika ada
    if (letter.file_path) {
      try {
        await unlink(path.join(process.cwd(), 'public', letter.file_path));
      } catch (e) {
        console.warn('Gagal menghapus file lampiran:', e);
      }
    }

    db.prepare('DELETE FROM letters WHERE id = ?').run(id);

    return NextResponse.json({ success: true, message: 'Surat berhasil dihapus' });
  } catch (error) {
    console.error('Delete Error:', error);
    return NextResponse.json({ success: false, error: 'Gagal menghapus data' }, { status: 500 });
  }
}