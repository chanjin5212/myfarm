import { NextRequest, NextResponse } from 'next/server';
import * as jwt from 'jsonwebtoken';

// JWT Secret - 실제 환경에서는 환경 변수로 관리
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

export async function GET(request: NextRequest) {
  try {
    // 헤더에서 토큰 추출
    const authHeader = request.headers.get('Authorization');
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { message: '유효한 인증 토큰이 필요합니다.' }, 
        { status: 401 }
      );
    }

    // Bearer 접두사 제거
    const token = authHeader.replace('Bearer ', '');
    
    try {
      // 토큰 검증
      const decoded = jwt.verify(token, JWT_SECRET) as { 
        id: string; 
        email: string;
        role: string;
        exp: number;
      };
      
      // 관리자 권한 확인
      if (decoded.role !== 'admin') {
        return NextResponse.json(
          { message: '관리자 권한이 없습니다.' }, 
          { status: 403 }
        );
      }
      
      // 만료 시간 확인
      const currentTime = Math.floor(Date.now() / 1000);
      if (decoded.exp < currentTime) {
        return NextResponse.json(
          { message: '인증 토큰이 만료되었습니다.' }, 
          { status: 401 }
        );
      }

      // 유효한 토큰
      return NextResponse.json({
        isValid: true,
        user: {
          id: decoded.id,
          email: decoded.email,
          role: decoded.role
        }
      });
    } catch (error) {
      // 토큰 검증 실패
      return NextResponse.json(
        { message: '유효하지 않은 토큰입니다.' }, 
        { status: 401 }
      );
    }
  } catch (error) {
    console.error('토큰 검증 중 오류:', error);
    return NextResponse.json(
      { message: '서버 오류가 발생했습니다.' }, 
      { status: 500 }
    );
  }
} 