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
    const contentType = request.headers.get('content-type') || '';
    
    let nomor_surat = '';
    let perihal = '';
    let kategori = 'MASUK';
    let pengirim = '';
    let penerima = '';
    let file: File | null = null;

    // Pembacaan data fleksibel (FormData atau JSON)
    if (contentType.includes('multipart/form-data') || contentType.includes('application/x-www-form-urlencoded')) {
      const formData = await request.formData();
      nomor_surat = (formData.get('nomor_surat') || formData.get('no_surat') || formData.get('number') || formData.get('nomor')) as string || '';
      perihal = (formData.get('perihal') || formData.get('subject') || formData.get('title')) as string || '';
      kategori = (formData.get('kategori') || formData.get('type') || 'MASUK') as string;
      pengirim = (formData.get('pengirim') || formData.get('sender') || '') as string;
      penerima = (formData.get('penerima') || formData.get('receiver') || '') as string;
      file = formData.get('file') as File | null;
    } else {
      const body = await request.json();
      nomor_surat = body.nomor_surat || body.no_surat || body.number || body.nomor || '';
      perihal = body.perihal || body.subject || body.title || '';
      kategori = body.kategori || body.type || 'MASUK';
      pengirim = body.pengirim || body.sender || '';
      penerima = body.penerima || body.receiver || '';
    }

    // Validasi: Cegah error database jika nomor surat/perihal kosong
    if (!nomor_surat || nomor_surat.trim() === '') {
      return NextResponse.json({ success: false, error: 'Nomor surat wajib diisi.' }, { status: 400 });
    }

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

    // Simpan ke Supabase
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