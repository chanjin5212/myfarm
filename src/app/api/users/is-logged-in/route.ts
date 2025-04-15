import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// 환경 변수 가져오기
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

// Supabase 클라이언트 생성
const supabase = createClient(
  supabaseUrl || '',
  supabaseServiceKey || supabaseAnonKey || ''
);

// 로그인 상태 확인 API
export async function GET(request: Request) {
  try {
    // 클라이언트에서 헤더로 토큰 전송 가능한 경우
    const authHeader = request.headers.get('Authorization');
    console.log('Authorization 헤더:', authHeader);
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      console.log('잘못된 Authorization 헤더 형식');
      return NextResponse.json({ 
        isLoggedIn: false,
        error: '인증이 필요합니다.'
      }, { status: 401 });
    }

    const token = authHeader.substring(7);
    console.log('토큰:', token);
    
    try {
      // 토큰 디코딩
      const decodedToken = JSON.parse(Buffer.from(token, 'base64').toString('utf-8'));
      console.log('디코딩된 토큰:', decodedToken);
      
      if (!decodedToken || !decodedToken.user) {
        console.log('토큰에 사용자 정보가 없습니다.');
        return NextResponse.json({ 
          isLoggedIn: false,
          error: '유효하지 않은 토큰입니다.'
        }, { status: 401 });
      }

      // 토큰 만료 확인
      if (decodedToken.expiresAt && decodedToken.expiresAt < Date.now()) {
        console.log('토큰이 만료되었습니다.');
        return NextResponse.json({ 
          isLoggedIn: false,
          error: '토큰이 만료되었습니다.'
        }, { status: 401 });
      }

      return NextResponse.json({ 
        isLoggedIn: true,
        user: decodedToken.user,
        message: '로그인 상태가 유효합니다.'
      });
    } catch (tokenError) {
      console.error('토큰 처리 오류:', tokenError);
      return NextResponse.json({ 
        isLoggedIn: false,
        error: '토큰 처리 중 오류가 발생했습니다.'
      }, { status: 401 });
    }
  } catch (error) {
    console.error('로그인 상태 확인 오류:', error);
    return NextResponse.json({ 
      isLoggedIn: false,
      error: '로그인 상태를 확인할 수 없습니다.'
    }, { status: 401 });
  }
} 