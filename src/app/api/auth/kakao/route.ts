import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { code, redirectUri } = body;

    if (!code) {
      return NextResponse.json({ error: '인증 코드가 없습니다.' }, { status: 400 });
    }

    // 인증 코드로 액세스 토큰 요청
    const response = await fetch('https://kauth.kakao.com/oauth/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded;charset=utf-8',
      },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        client_id: process.env.NEXT_PUBLIC_KAKAO_CLIENT_ID!,
        client_secret: process.env.KAKAO_CLIENT_SECRET!,
        code,
        redirect_uri: redirectUri,
      }),
    });

    const tokenData = await response.json();

    if (tokenData.error) {
      console.error('Kakao 토큰 오류:', tokenData);
      return NextResponse.json({ error: tokenData.error_description || tokenData.error }, { status: 400 });
    }

    // 액세스 토큰으로 사용자 정보 요청
    if (tokenData.access_token) {
      const userInfoResponse = await fetch('https://kapi.kakao.com/v2/user/me', {
        headers: {
          'Authorization': `Bearer ${tokenData.access_token}`,
          'Content-type': 'application/x-www-form-urlencoded;charset=utf-8',
        },
      });

      const userInfoData = await userInfoResponse.json();
      
      if (userInfoData.id === undefined) {
        console.error('Kakao 사용자 정보 오류:', userInfoData);
        return NextResponse.json({ error: '사용자 정보를 가져오는데 실패했습니다.' }, { status: 400 });
      }
      
      // 카카오는 kakao_account 구조로 사용자 정보를 반환
      const userInfo = {
        id: userInfoData.id.toString(),
        email: userInfoData.kakao_account?.email || '',
        name: userInfoData.kakao_account?.profile?.nickname || userInfoData.properties?.nickname || '',
        picture: userInfoData.kakao_account?.profile?.profile_image_url || userInfoData.properties?.profile_image || '',
        nickname: userInfoData.kakao_account?.profile?.nickname || userInfoData.properties?.nickname || ''
      };
      
      return NextResponse.json({ 
        access_token: tokenData.access_token,
        userInfo
      });
    }

    return NextResponse.json({ error: '액세스 토큰을 받지 못했습니다.' }, { status: 400 });
  } catch (error) {
    console.error('Kakao OAuth 처리 오류:', error);
    return NextResponse.json({ error: '인증 처리 중 오류가 발생했습니다.' }, { status: 500 });
  }
} 