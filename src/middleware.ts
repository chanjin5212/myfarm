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
 * 사용자의 기기에 따라 적절한 URL로 리디렉션
 */
export function middleware(request: NextRequest) {
  // 사용자 에이전트 가져오기
  const userAgent = request.headers.get('user-agent') || '';
  const isMobile = isMobileDevice(userAgent);
  
  // 현재 URL 복제
  const url = request.nextUrl.clone();
  const { pathname } = url;
  
  // API 요청, 정적 파일, Next.js 내부 경로는 리디렉션하지 않음
  if (
    pathname.startsWith('/api') || 
    pathname.startsWith('/_next') ||
    pathname.startsWith('/favicon.ico') ||
    pathname.includes('.') // 파일 확장자가 있는 요청(이미지, JS 등)
  ) {
    return NextResponse.next();
  }
  
  // 모바일 경로 여부 확인
  const isMobilePath = pathname.startsWith('/m/');
  
  // 모바일 기기에서 접속하고 모바일 경로가 아닌 경우
  if (isMobile && !isMobilePath && pathname !== '/m') {
    // 홈페이지 루트 경로는 /m으로, 다른 경로는 /m을 앞에 추가
    const newPath = pathname === '/' ? '/m' : `/m${pathname}`;
    url.pathname = newPath;
    return NextResponse.redirect(url);
  }
  
  // PC에서 접속하고 모바일 경로인 경우
  if (!isMobile && isMobilePath) {
    // /m 또는 /m/ 경로는 루트로, 다른 경로는 /m을 제거
    const newPath = (pathname === '/m' || pathname === '/m/') 
      ? '/' 
      : pathname.replace(/^\/m/, '');
    url.pathname = newPath;
    return NextResponse.redirect(url);
  }
  
  return NextResponse.next();
}

/**
 * 미들웨어를 적용할 경로 설정
 * API 경로와 정적 파일은 제외
 */
export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
}; 