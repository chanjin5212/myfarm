import { getAuthHeader } from './auth';

/**
 * 세션 체크 결과 인터페이스
 */
interface SessionCheckResult {
  isValid: boolean;
  message?: string;
  renewedToken?: string;
}

/**
 * 세션 체커 클래스 - 세션 상태를 주기적으로 확인
 */
export class SessionChecker {
  private interval: number; // 체크 간격 (밀리초)
  private timer: NodeJS.Timeout | null = null;
  private isRunning: boolean = false;
  private onSessionInvalid: () => void;
  private onSessionValid: () => void;
  
  /**
   * 생성자
   * @param interval 체크 간격 (밀리초)
   * @param onSessionInvalid 세션이 유효하지 않을 때 호출될 콜백
   * @param onSessionValid 세션이 유효할 때 호출될 콜백
   */
  constructor(
    interval: number = 60000, // 기본 1분
    onSessionInvalid: () => void = () => { window.location.href = '/auth'; },
    onSessionValid: () => void = () => { console.log('세션 유효함'); }
  ) {
    this.interval = interval;
    this.onSessionInvalid = onSessionInvalid;
    this.onSessionValid = onSessionValid;
  }
  
  /**
   * 세션 체크 시작
   */
  start(): void {
    if (this.isRunning) return;
    
    this.isRunning = true;
    this.checkSession(); // 즉시 한 번 체크
    
    this.timer = setInterval(() => {
      this.checkSession();
    }, this.interval);
    
  }
  
  /**
   * 세션 체크 중단
   */
  stop(): void {
    if (!this.isRunning || !this.timer) return;
    
    clearInterval(this.timer);
    this.timer = null;
    this.isRunning = false;
    
  }
  
  /**
   * 세션 상태 확인
   */
  async checkSession(): Promise<void> {
    const result = await this.isSessionValid();
    
    if (result.isValid) {
      // 세션이 유효하면 콜백 실행
      this.onSessionValid();
      
      // 토큰이 갱신되었다면 저장
      if (result.renewedToken) {
        try {
          // 갱신된 토큰 저장 로직
          const tokenData = JSON.parse(localStorage.getItem('token') || '{}');
          tokenData.access_token = result.renewedToken;
          tokenData.updatedAt = Date.now();
          localStorage.setItem('token', JSON.stringify(tokenData));
        } catch (error) {
          console.error('토큰 갱신 저장 오류:', error);
        }
      }
    } else {
      // 세션이 유효하지 않으면 콜백 실행
      console.warn('세션이 유효하지 않음:', result.message);
      this.stop(); // 체크 중단
      this.onSessionInvalid();
    }
  }
  
  /**
   * 세션 유효성 확인 API 호출
   */
  private async isSessionValid(): Promise<SessionCheckResult> {
    try {
      // 토큰 존재 여부 확인
      const tokenData = localStorage.getItem('token');
      if (!tokenData) {
        return { isValid: false, message: '토큰이 없음' };
      }
      
      // 서버에 세션 유효성 확인 요청
      const authHeader = getAuthHeader();
      if (!authHeader.Authorization) {
        return { isValid: false, message: '인증 헤더를 생성할 수 없음' };
      }
      
      // API 호출
      const response = await fetch('/api/auth/check-session', {
        method: 'GET',
        headers: {
          ...authHeader
        }
      });
      
      if (!response.ok) {
        return { isValid: false, message: `서버 오류: ${response.status} ${response.statusText}` };
      }
      
      const data = await response.json();
      
      // 응답 데이터 확인
      if (data.valid) {
        return { 
          isValid: true,
          renewedToken: data.renewedToken || undefined
        };
      } else {
        return { isValid: false, message: data.message || '세션이 만료됨' };
      }
    } catch (error) {
      console.error('세션 체크 중 오류 발생:', error);
      return { isValid: false, message: '세션 체크 실패' };
    }
  }
  
  /**
   * 현재 세션 체커가 실행 중인지 여부
   */
  isActive(): boolean {
    return this.isRunning;
  }
  
  /**
   * 체크 간격 변경
   */
  setInterval(newInterval: number): void {
    this.interval = newInterval;
    
    if (this.isRunning) {
      // 이미 실행 중이면 재시작
      this.stop();
      this.start();
    }
  }
} 