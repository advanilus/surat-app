import { NextResponse } from 'next/server';

export async function POST() {
  const response = NextResponse.json({ success: true, message: 'Logout berhasil' });

  // Hapus cookie utama dan variasi lain agar tidak tersisa di browser
  response.cookies.delete('auth_token');
  response.cookies.delete('auth');
  response.cookies.delete('token');

  return response;
}