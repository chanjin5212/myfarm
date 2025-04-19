import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

/**
 * 모바일 기기 여부를 확인하는 함수
 */
function isMobileDevice(userAgent: string): boolean {
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(userAgent);
}

/**
 * Next.js 미들웨어 함수
 */
export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  
  // Admin 경로 처리
  if (pathname === '/admin' || pathname === '/admin/') {
    const url = request.nextUrl.clone();
    url.pathname = '/admin/login';
    return NextResponse.redirect(url);
  }
  
  // 그 외 모든 요청은 그대로 통과
  return NextResponse.next();
}

/**
 * 미들웨어를 적용할 경로 설정
 * API 경로와 정적 파일은 제외
 */
export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
}; 