import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { uploadToCloudinary } from '@/lib/cloudinary';

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

export async function POST(request: Request) {
  try {
    const contentType = request.headers.get('content-type') || '';

    let nomor_surat = '';
    let perihal = '';
    let kategori = 'MASUK';
    let pengirim = '';
    let penerima = '';
    let tanggal_surat = '';
    let file: File | null = null;

    if (contentType.includes('multipart/form-data') || contentType.includes('application/x-www-form-urlencoded')) {
      const formData = await request.formData();

      nomor_surat = (
        formData.get('nomor_surat') ||
        formData.get('nomorSurat') ||
        formData.get('no_surat') ||
        formData.get('noSurat') ||
        formData.get('letter_number') ||
        ''
      ) as string;

      perihal = (
        formData.get('perihal') ||
        formData.get('subject') ||
        formData.get('title') ||
        ''
      ) as string;

      kategori = (
        formData.get('kategori') ||
        formData.get('type') ||
        'MASUK'
      ).toString();

      pengirim = (
        formData.get('pengirim') ||
        formData.get('sender') ||
        ''
      ) as string;

      penerima = (
        formData.get('penerima') ||
        formData.get('recipient') ||
        formData.get('receiver') ||
        ''
      ) as string;

      tanggal_surat = (
        formData.get('tanggal_surat') ||
        formData.get('letter_date') ||
        formData.get('tanggal') ||
        ''
      ) as string;

      file = formData.get('file') as File | null;
    } else {
      const body = await request.json();

      nomor_surat = body.nomor_surat || body.nomorSurat || body.no_surat || body.letter_number || '';
      perihal = body.perihal || body.subject || body.title || '';
      kategori = (body.kategori || body.type || 'MASUK').toString();
      pengirim = body.pengirim || body.sender || '';
      penerima = body.penerima || body.recipient || body.receiver || '';
      tanggal_surat = body.tanggal_surat || body.letter_date || body.tanggal || '';
    }

    // Normalisasi Kategori ke 'MASUK' atau 'KELUAR'
    kategori = kategori.toUpperCase();
    if (kategori !== 'KELUAR') {
      kategori = 'MASUK';
    }

    if (!nomor_surat || nomor_surat.trim() === '') {
      return NextResponse.json({ success: false, error: 'Nomor surat wajib diisi.' }, { status: 400 });
    }

    let file_url = '';
    let file_public_id = '';

    if (file && file.size > 0) {
      const bytes = await file.arrayBuffer();
      const buffer = Buffer.from(bytes);
      const uploadResult = await uploadToCloudinary(buffer, 'surat-app-files');
      file_url = uploadResult.url;
      file_public_id = uploadResult.public_id;
    }

    // Buat objek insert yang fleksibel
    const payload: Record<string, any> = {
      nomor_surat,
      perihal,
      kategori,
      pengirim,
      penerima,
      file_url,
      file_public_id,
    };

    if (tanggal_surat) {
      payload.tanggal_surat = tanggal_surat;
    }

    const { data, error } = await supabase
      .from('surat')
      .insert([payload])
      .select();

    if (error) throw error;

    return NextResponse.json({ success: true, data: data[0] });
  } catch (error: any) {
    console.error('API Error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}