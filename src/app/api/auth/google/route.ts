import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { code, redirectUri } = body;

    if (!code) {
      return NextResponse.json({ error: '인증 코드가 없습니다.' }, { status: 400 });
    }

    // 인증 코드로 액세스 토큰 요청
    const response = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        code,
        client_id: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID!,
        client_secret: process.env.GOOGLE_CLIENT_SECRET!,
        redirect_uri: redirectUri,
        grant_type: 'authorization_code',
      }),
    });

    const tokenData = await response.json();

    if (tokenData.error) {
      console.error('Google 토큰 오류:', tokenData);
      return NextResponse.json({ error: tokenData.error_description || tokenData.error }, { status: 400 });
    }

    // 액세스 토큰으로 사용자 정보 요청
    if (tokenData.access_token) {
      const userInfoResponse = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
        headers: {
          'Authorization': `Bearer ${tokenData.access_token}`,
        },
      });

      const userInfo = await userInfoResponse.json();
      
      return NextResponse.json({ 
        access_token: tokenData.access_token,
        userInfo
      });
    }

    return NextResponse.json({ error: '액세스 토큰을 받지 못했습니다.' }, { status: 400 });
  } catch (error) {
    console.error('Google OAuth 처리 오류:', error);
    return NextResponse.json({ error: '인증 처리 중 오류가 발생했습니다.' }, { status: 500 });
  }
} 