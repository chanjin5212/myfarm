/**
 * 세션 체크를 주기적으로 수행하는 클래스
 * 클라이언트 측에서 세션 유효성을 검사하고 필요시 세션을 갱신
 */
export class SessionChecker {
  private interval: NodeJS.Timeout | null = null;
  private intervalTime: number = 5 * 60 * 1000; // 기본 5분
  private userId: string | null = null;
  private isRunning: boolean = false;
  private onSessionInvalid: () => void;
  private lastCheckTime: number = 0;

  /**
   * SessionChecker 생성자
   * @param userId 사용자 ID
   * @param onSessionInvalid 세션이 유효하지 않을 때 호출될 콜백 함수
   * @param checkInterval 체크 간격 (밀리초, 기본값 5분)
   */
  constructor(
    userId: string | null, 
    onSessionInvalid: () => void,
    checkInterval?: number
  ) {
    this.userId = userId;
    this.onSessionInvalid = onSessionInvalid;
    
    if (checkInterval && checkInterval > 0) {
      this.intervalTime = checkInterval;
    }
  }

  /**
   * 세션 체크 시작
   * @returns 세션 체크 상태
   */
  public start(): boolean {
    // 이미 실행 중이거나 userId가 없으면 시작하지 않음
    if (this.isRunning || !this.userId) {
      console.log('[SessionChecker] 이미 실행 중이거나 사용자 ID가 없습니다.');
      return false;
    }

    this.isRunning = true;
    this.lastCheckTime = Date.now();

    // 첫 번째 체크는 즉시 실행
    this.checkSession();

    // 이후 주기적으로 체크
    this.interval = setInterval(() => {
      this.checkSession();
    }, this.intervalTime);

    console.log(`[SessionChecker] 세션 체크 시작됨 (주기: ${this.intervalTime / 1000}초)`);
    return true;
  }

  /**
   * 세션 체크 중지
   */
  public stop(): void {
    if (this.interval) {
      clearInterval(this.interval);
      this.interval = null;
    }
    this.isRunning = false;
    console.log('[SessionChecker] 세션 체크 중지됨');
  }

  /**
   * 세션 체크 상태 반환
   * @returns 세션 체크 실행 중 여부
   */
  public isActive(): boolean {
    return this.isRunning;
  }

  /**
   * 사용자 ID 업데이트 (로그인/로그아웃 시 호출)
   * @param userId 새 사용자 ID 또는 null(로그아웃)
   */
  public updateUserId(userId: string | null): void {
    const wasRunning = this.isRunning;
    
    // 기존 체크 중지
    if (wasRunning) {
      this.stop();
    }
    
    this.userId = userId;
    
    // 새 사용자 ID로 다시 시작 (이전에 실행 중이었던 경우에만)
    if (wasRunning && userId) {
      this.start();
    }
  }
  
  /**
   * 마지막 세션 체크 시간 반환
   * @returns 마지막 체크 시간 (밀리초 타임스탬프)
   */
  public getLastCheckTime(): number {
    return this.lastCheckTime;
  }

  /**
   * 세션 유효성 즉시 확인
   * @returns 세션 체크 프로미스
   */
  public async checkSessionNow(): Promise<boolean> {
    return await this.checkSession();
  }

  /**
   * 세션 체크 간격 변경
   * @param newInterval 새 체크 간격 (밀리초)
   */
  public setCheckInterval(newInterval: number): void {
    if (newInterval <= 0) {
      console.error('[SessionChecker] 유효하지 않은 체크 간격:', newInterval);
      return;
    }

    this.intervalTime = newInterval;
    
    // 실행 중이면 재시작
    if (this.isRunning) {
      this.stop();
      this.start();
    }
    
    console.log(`[SessionChecker] 체크 간격 변경됨: ${newInterval / 1000}초`);
  }

  /**
   * 세션 유효성 체크 실행
   * @returns 세션 유효 여부
   */
  private async checkSession(): Promise<boolean> {
    if (!this.userId) {
      console.log('[SessionChecker] 사용자 ID가 없어 세션 체크를 건너뜁니다.');
      return false;
    }

    try {
      this.lastCheckTime = Date.now();
      
      const response = await fetch('/api/auth/check-session', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${this.userId}`,
          'Content-Type': 'application/json'
        }
      });

      const data = await response.json();
      
      if (!response.ok || !data.valid) {
        console.warn('[SessionChecker] 세션이 유효하지 않음:', data.message || '세션 만료');
        
        // 세션 체크 중지 및 콜백 호출
        this.stop();
        this.onSessionInvalid();
        return false;
      }
      
      // 새 토큰이 제공된 경우 업데이트 (선택적)
      if (data.renewedToken) {
        console.log('[SessionChecker] 새 토큰으로 갱신됨');
        this.updateUserId(data.renewedToken);
      }
      
      return true;
    } catch (error) {
      console.error('[SessionChecker] 세션 체크 중 오류 발생:', error);
      
      // 네트워크 오류 등은 세션 무효로 처리하지 않음
      // 필요에 따라 여기서도 this.onSessionInvalid()를 호출할 수 있음
      return false;
    }
  }
}

// 싱글톤 인스턴스 (필요시 사용)
let sessionCheckerInstance: SessionChecker | null = null;

/**
 * SessionChecker 싱글톤 인스턴스 가져오기
 * @param userId 사용자 ID
 * @param onSessionInvalid 세션 무효 콜백
 * @param checkInterval 체크 간격
 * @returns SessionChecker 인스턴스
 */
export function getSessionChecker(
  userId: string | null, 
  onSessionInvalid: () => void,
  checkInterval?: number
): SessionChecker {
  if (!sessionCheckerInstance) {
    sessionCheckerInstance = new SessionChecker(userId, onSessionInvalid, checkInterval);
  } else {
    // 기존 ID와 다른 경우 ID 업데이트
    sessionCheckerInstance.updateUserId(userId);
  }
  
  return sessionCheckerInstance;
} 