import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { uploadToCloudinary } from '@/lib/cloudinary';

// GET: Ambil Semua Daftar Surat
export async function GET() {
  try {
    const { data, error } = await supabase
      .from('surat')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;
    return NextResponse.json({ success: true, data });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// POST: Tambah Surat Baru & Upload File ke Cloudinary
export async function POST(request: Request) {
  try {
    const formData = await request.formData();

    const nomor_surat = formData.get('nomor_surat') as string;
    const perihal = formData.get('perihal') as string;
    const kategori = (formData.get('kategori') as string) || 'MASUK';
    const pengirim = (formData.get('pengirim') as string) || '';
    const penerima = (formData.get('penerima') as string) || '';
    const file = formData.get('file') as File | null;

    let file_url = '';
    let file_public_id = '';

    // Upload File ke Cloudinary jika ada file yang diunggah
    if (file && file.size > 0) {
      const bytes = await file.arrayBuffer();
      const buffer = Buffer.from(bytes);
      const uploadResult = await uploadToCloudinary(buffer, 'surat-app-files');
      file_url = uploadResult.url;
      file_public_id = uploadResult.public_id;
    }

    // Simpan Baris Baru ke Supabase
    const { data, error } = await supabase
      .from('surat')
      .insert([
        {
          nomor_surat,
          perihal,
          kategori,
          pengirim,
          penerima,
          file_url,
          file_public_id,
        },
      ])
      .select();

    if (error) throw error;

    return NextResponse.json({ success: true, data: data[0] });
  } catch (error: any) {
    console.error('API Error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}