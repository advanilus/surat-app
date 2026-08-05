import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import cloudinary from '@/lib/cloudinary';

// GET: Ambil Detail 1 Surat Berdasarkan ID
export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    const { data, error } = await supabase
      .from('surat')
      .select('*')
      .eq('id', id)
      .single();

    if (error) throw error;
    return NextResponse.json({ success: true, data });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// DELETE: Hapus Surat Berdasarkan ID (+ Hapus File di Cloudinary)
export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;

    // 1. Cari data surat dulu untuk ambil file_public_id
    const { data: currentData } = await supabase
      .from('surat')
      .select('file_public_id')
      .eq('id', id)
      .single();

    // 2. Jika ada file di Cloudinary, hapus filenya
    if (currentData?.file_public_id) {
      await cloudinary.uploader.destroy(currentData.file_public_id);
    }

    // 3. Hapus baris dari Supabase
    const { error } = await supabase.from('surat').delete().eq('id', id);

    if (error) throw error;

    return NextResponse.json({ success: true, message: 'Surat berhasil dihapus' });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}