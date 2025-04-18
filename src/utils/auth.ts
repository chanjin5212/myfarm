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
    
    let userId = '';
    
    try {
      const parsedToken = JSON.parse(tokenData);
      
      // 사용자 정보가 객체이고 ID가 있는 경우
      if (parsedToken.user && typeof parsedToken.user === 'object' && parsedToken.user.id) {
        userId = parsedToken.user.id;
        console.log('사용자 ID 추출: 사용자 객체에서', userId);
      } 
      // access_token이 있는 경우 (OAuth 로그인 등)
      else if (parsedToken.access_token) {
        // access_token을 사용하는 경우 ID 서버에서 확인 필요
        // 이 프로젝트에서는 사용자 ID를 직접 사용하는 방식이므로
        // 로컬스토리지에 저장된 userId 사용
        userId = localStorage.getItem('userId') || '';
        console.log('사용자 ID 추출: 로컬스토리지에서', userId);
      }
    } catch (error) {
      // JSON 파싱 실패 시 토큰 그대로 사용
      console.warn('토큰 파싱 실패, 원본 값 사용');
      userId = tokenData;
    }
    
    // 추출된 사용자 ID 확인
    if (!userId) {
      // 로컬스토리지에서 userId를 직접 사용
      userId = localStorage.getItem('userId') || '';
      console.log('사용자 ID 로컬스토리지에서 직접 가져옴:', userId);
    }
    
    if (userId) {
      // URL 인코딩하여 전송 (특수문자나 한글이 있을 수 있음)
      return { Authorization: `Bearer ${encodeURIComponent(userId)}` };
    }
  } catch (error) {
    console.error('인증 헤더 생성 오류:', error);
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