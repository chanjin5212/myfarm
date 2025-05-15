import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { code, redirectUri } = await request.json();

    // Validate the code
    if (!code) {
      return NextResponse.json({ error: '인증 코드가 필요합니다' }, { status: 400 });
    }

    // Exchange code for token
    const tokenResponse = await fetch('https://kauth.kakao.com/oauth/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded;charset=utf-8',
      },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        client_id: process.env.NEXT_PUBLIC_KAKAO_CLIENT_ID || '',
        client_secret: process.env.KAKAO_CLIENT_SECRET || '',
        code,
        redirect_uri: redirectUri,
      }).toString(),
    });

    const tokenData = await tokenResponse.json();

    if (!tokenResponse.ok || tokenData.error) {
      console.error('Error exchanging code for token:', tokenData);
      return NextResponse.json(tokenData, { status: tokenResponse.status });
    }

    // Get user info using the access token
    const userInfoResponse = await fetch('https://kapi.kakao.com/v2/user/me', {
      headers: {
        Authorization: `Bearer ${tokenData.access_token}`,
      },
    });

    const userData = await userInfoResponse.json();

    if (!userInfoResponse.ok) {
      console.error('Error fetching user info:', userData);
      return NextResponse.json({ 
        error: '사용자 정보를 가져오는데 실패했습니다'
      }, { status: userInfoResponse.status });
    }

    const userAccount = userData.kakao_account || {};

    // Format the user data
    const formattedUserData = {
      id: userData.id.toString(),
      email: userAccount.email,
      name: userAccount.profile?.nickname || '카카오 사용자',
      picture: userAccount.profile?.profile_image_url,
      nickname: userAccount.profile?.nickname,
      provider: 'kakao',
      phone_number: userAccount.phone_number || null,
    };

    return NextResponse.json({
      userData: formattedUserData,
      token: tokenData.access_token,
    });
  } catch (error) {
    console.error('Unexpected error during Kakao authentication:', error);
    return NextResponse.json({ 
      error: '인증 과정에서 예상치 못한 오류가 발생했습니다' 
    }, { status: 500 });
  }
} 