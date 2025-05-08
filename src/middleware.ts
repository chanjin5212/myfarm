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
  const userAgent = request.headers.get('user-agent') || '';
  const isMobile = isMobileDevice(userAgent);
  
  // 이미지나 정적 파일, 검색엔진 관련 파일 경로는 제외
  if (
    pathname.startsWith('/images/') ||
    pathname.startsWith('/public/') ||
    pathname === '/robots.txt' ||
    pathname === '/sitemap.xml' ||
    pathname === '/favicon.ico'
  ) {
    return NextResponse.next();
  }
  
  // /m으로 시작하지 않고, /admin으로 시작하지 않는 모든 경로를 /m으로 리다이렉트
  if (!pathname.startsWith('/m') && !pathname.startsWith('/admin')) {
    const url = request.nextUrl.clone();
    url.pathname = `/m${pathname}`;
    return NextResponse.redirect(url);
  }
  
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
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico|public).*)'],
}; 