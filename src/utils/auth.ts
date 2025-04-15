// 인증 관련 유틸리티 함수

// 로그인 상태 변경을 알리는 커스텀 이벤트
export const LOGIN_STATUS_CHANGE = 'login-status-change';

// 사용자 정보 인터페이스
export interface User {
  id: string;
  email: string;
  name?: string;
  nickname?: string;
  avatar_url?: string;
  google_id?: string;
  terms_agreed?: boolean;
}

// 토큰에서 사용자 정보 확인
export function checkToken(): { user: User | null, isLoggedIn: boolean } {
  try {
    const tokenData = localStorage.getItem('token');
    if (tokenData) {
      try {
        const parsedToken = JSON.parse(tokenData);
        
        // 토큰이 만료되었는지 확인
        if (parsedToken.expiresAt && parsedToken.expiresAt > Date.now()) {
          return {
            user: parsedToken.user || null,
            isLoggedIn: true
          };
        } else {
          // 만료된 토큰 삭제
          localStorage.removeItem('token');
          return { user: null, isLoggedIn: false };
        }
      } catch (error) {
        console.error('토큰 파싱 오류:', error);
        return { user: null, isLoggedIn: false };
      }
    }
  } catch (error) {
    console.error('로그인 상태 확인 오류:', error);
  }
  
  return { user: null, isLoggedIn: false };
}

// API 호출을 위한 인증 헤더 생성
export function getAuthHeader(): { Authorization?: string } {
  try {
    const tokenData = localStorage.getItem('token');
    if (!tokenData) return {};
    
    const parsedToken = JSON.parse(tokenData);
    
    // 토큰이 만료되었는지 확인
    if (parsedToken.expiresAt && parsedToken.expiresAt > Date.now()) {
      // 사용자 정보가 있으면 해당 ID를 인증 토큰으로 전달
      if (parsedToken.user && parsedToken.user.id) {
        return { Authorization: `Bearer ${parsedToken.user.id}` };
      }
    } else {
      // 만료된 토큰 삭제
      localStorage.removeItem('token');
    }
  } catch (error) {
    console.error('인증 헤더 생성 오류:', error);
    // 오류 발생 시 토큰 삭제
    localStorage.removeItem('token');
  }
  
  return {};
}

// 로그아웃 처리
export function logout() {
  localStorage.removeItem('token');
  window.dispatchEvent(new Event(LOGIN_STATUS_CHANGE));
}

// 로그인 이벤트 트리거
export function triggerLoginEvent() {
  window.dispatchEvent(new Event(LOGIN_STATUS_CHANGE));
} 