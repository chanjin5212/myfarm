import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { code } = await request.json();

    // Validate the code
    if (!code) {
      return NextResponse.json({ error: '인증 코드가 필요합니다' }, { status: 400 });
    }

    // Exchange code for token
    const tokenResponse = await fetch('https://nid.naver.com/oauth2.0/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        client_id: process.env.NEXT_PUBLIC_NAVER_CLIENT_ID || '',
        client_secret: process.env.NAVER_CLIENT_SECRET || '',
        code,
        state: '',
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
    const userInfoResponse = await fetch('https://openapi.naver.com/v1/nid/me', {
      headers: {
        Authorization: `Bearer ${tokenData.access_token}`,
      },
    });

    const userData = await userInfoResponse.json();

    if (!userInfoResponse.ok || userData.error || userData.resultcode !== '00') {
      console.error('Error fetching user info:', userData);
      return NextResponse.json({ 
        error: '사용자 정보를 가져오는데 실패했습니다', 
        details: userData.message || userData.error
      }, { status: 400 });
    }

    const userProfile = userData.response;
    
    // Format the user data, including phone number if available
    const formattedUserData = {
      id: userProfile.id,
      email: userProfile.email,
      name: userProfile.name,
      nickname: userProfile.nickname,
      picture: userProfile.profile_image,
      phone_number: userProfile.mobile, // Include the phone number
      provider: 'naver',
    };

    return NextResponse.json({
      userData: formattedUserData,
      token: tokenData.access_token,
    });
  } catch (error) {
    console.error('Unexpected error during Naver authentication:', error);
    return NextResponse.json({ 
      error: '인증 과정에서 예상치 못한 오류가 발생했습니다' 
    }, { status: 500 });
  }
} 