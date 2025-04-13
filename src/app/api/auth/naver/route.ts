import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { code, redirectUri } = body;

    if (!code) {
      return NextResponse.json({ error: '인증 코드가 없습니다.' }, { status: 400 });
    }

    // 인증 코드로 액세스 토큰 요청
    const response = await fetch('https://nid.naver.com/oauth2.0/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        client_id: process.env.NEXT_PUBLIC_NAVER_CLIENT_ID!,
        client_secret: process.env.NAVER_CLIENT_SECRET!,
        code,
        state: 'STATE_STRING',
        redirect_uri: redirectUri,
      }),
    });

    const tokenData = await response.json();

    if (tokenData.error) {
      console.error('Naver 토큰 오류:', tokenData);
      return NextResponse.json({ error: tokenData.error_description || tokenData.error }, { status: 400 });
    }

    // 액세스 토큰으로 사용자 정보 요청
    if (tokenData.access_token) {
      const userInfoResponse = await fetch('https://openapi.naver.com/v1/nid/me', {
        headers: {
          'Authorization': `Bearer ${tokenData.access_token}`,
        },
      });

      const userInfoData = await userInfoResponse.json();
      
      if (userInfoData.resultcode !== '00') {
        console.error('Naver 사용자 정보 오류:', userInfoData);
        return NextResponse.json({ error: userInfoData.message || '사용자 정보를 가져오는데 실패했습니다.' }, { status: 400 });
      }
      
      // 네이버는 response.userInfo 구조로 사용자 정보를 반환
      const userInfo = {
        id: userInfoData.response.id,
        email: userInfoData.response.email,
        name: userInfoData.response.name,
        picture: userInfoData.response.profile_image,
        nickname: userInfoData.response.nickname
      };
      
      return NextResponse.json({ 
        access_token: tokenData.access_token,
        userInfo
      });
    }

    return NextResponse.json({ error: '액세스 토큰을 받지 못했습니다.' }, { status: 400 });
  } catch (error) {
    console.error('Naver OAuth 처리 오류:', error);
    return NextResponse.json({ error: '인증 처리 중 오류가 발생했습니다.' }, { status: 500 });
  }
} 