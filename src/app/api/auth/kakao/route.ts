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
        redirect_uri: redirectUri || `${process.env.NEXT_PUBLIC_SITE_URL}/auth/kakao/callback`,
      }),
    });

    const tokenData = await tokenResponse.json();

    if (!tokenResponse.ok || tokenData.error) {
      console.error('Error exchanging code for token:', tokenData);
      return NextResponse.json({ 
        error: '인증 코드로 토큰을 교환하는데 실패했습니다',
        details: tokenData.error_description || tokenData.error
      }, { status: 400 });
    }

    // Get user info using the access token
    const userInfoResponse = await fetch('https://kapi.kakao.com/v2/user/me', {
      headers: {
        Authorization: `Bearer ${tokenData.access_token}`,
        'Content-Type': 'application/x-www-form-urlencoded;charset=utf-8',
      },
    });

    const userData = await userInfoResponse.json();

    if (!userInfoResponse.ok || userData.error) {
      console.error('Error fetching user info:', userData);
      return NextResponse.json({ 
        error: '사용자 정보를 가져오는데 실패했습니다', 
        details: userData.error_description || userData.error
      }, { status: 400 });
    }

    const userProfile = userData.properties || {};
    const userAccount = userData.kakao_account || {};

    // Format the user data
    const email = userAccount.email;
    const formattedUserData = {
      id: userData.id.toString(),
      email: email,
      name: userAccount.profile?.nickname || '카카오 사용자',
      picture: userAccount.profile?.profile_image_url,
      nickname: userAccount.profile?.nickname,
      provider: 'kakao',
    };

    // Check if we have email permission
    if (!email) {
      return NextResponse.json({ 
        error: '이메일이 제공되지 않았습니다. 카카오 계정에서 이메일 권한을 허용해주세요.', 
        userData: formattedUserData
      }, { status: 403 });
    }

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