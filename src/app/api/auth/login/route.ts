import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const { password } = await request.json();
    const correctPassword = process.env.APP_PASSWORD || 'surat123';

    if (password === correctPassword) {
      const response = NextResponse.json({ success: true, message: 'Login berhasil' });
      
      // Simpan cookie otentikasi selama 7 hari
      response.cookies.set('auth_token', 'authenticated_user_session', {
        httpOnly: true,
        secure: process.env.NODE_NODE === 'production',
        sameSite: 'strict',
        maxAge: 60 * 60 * 24 * 7, // 7 hari
        path: '/',
      });

      return response;
    }

    return NextResponse.json({ success: false, error: 'Password salah!' }, { status: 401 });
  } catch (error) {
    return NextResponse.json({ success: false, error: 'Terjadi kesalahan server' }, { status: 500 });
  }
}