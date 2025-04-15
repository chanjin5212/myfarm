'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { triggerLoginEvent } from '@/utils/auth';

export default function KakaoCallbackPage() {
  const router = useRouter();

  useEffect(() => {
    const handleCallback = async () => {
      // 기존 로컬 스토리지 데이터 정리
      localStorage.removeItem('google_user_info');
      localStorage.removeItem('google_access_token');
      localStorage.removeItem('naver_user_info');
      localStorage.removeItem('naver_access_token');
      localStorage.removeItem('token');
      
      const urlParams = new URLSearchParams(window.location.search);
      const code = urlParams.get('code');
      const state = urlParams.get('state');
      const savedState = localStorage.getItem('kakaoLoginState');

      // state 검증 - 카카오는 state 파라미터를 사용합니다
      if (!state || state !== savedState) {
        alert('잘못된 요청입니다.');
        router.push('/auth');
        return;
      }

      if (!code) {
        alert('인증 코드가 없습니다.');
        router.push('/auth');
        return;
      }

      try {
        // 서버 API를 통해 토큰 교환
        const response = await fetch('/api/auth/kakao', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            code,
            redirectUri: `${window.location.origin}/auth/kakao/callback`,
          }),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || '인증 처리 중 오류가 발생했습니다.');
        }

        const data = await response.json();
        
        // userData 구조로 변경
        if (!data.userData || !data.userData.id) {
          throw new Error('사용자 정보를 받지 못했습니다.');
        }
        
        // 사용자 정보에 제공자 정보 추가
        const userInfoWithProvider = {
          ...data.userData,
          provider: 'kakao'
        };
        
        // 사용자 정보 저장
        localStorage.setItem('kakao_user_info', JSON.stringify(userInfoWithProvider));
        localStorage.setItem('kakao_access_token', data.token);
        
        // 서버 API를 통해 사용자 존재 여부 확인
        const checkUserResponse = await fetch('/api/users/check', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            kakao_id: data.userData.id,
            provider: 'kakao',
            email: data.userData.email
          }),
        });
        
        if (!checkUserResponse.ok) {
          const errorData = await checkUserResponse.json();
          throw new Error(errorData.error || '사용자 확인 중 오류가 발생했습니다.');
        }
        
        const userData = await checkUserResponse.json();
        
        if (userData.exists) {
          // 기존 사용자인 경우 홈페이지로 이동
          // JWT 토큰 생성 및 저장
          const token = {
            user: userData.user,
            expiresAt: Date.now() + 3600000 // 1시간 후 만료
          };
          
          // 토큰 정보 로깅 추가
          console.log('Kakao 로그인 토큰 정보:', token);
          
          localStorage.setItem('token', JSON.stringify(token));
          
          // 임시 저장된 정보 삭제
          localStorage.removeItem('kakao_user_info');
          localStorage.removeItem('kakao_access_token');
          
          // 로그인 상태 변경 이벤트 발생
          triggerLoginEvent();
          
          router.push('/');
        } else {
          // 새 사용자인 경우 약관 동의 페이지로 이동
          router.push('/auth/terms');
        }
      } catch (error) {
        console.error('로그인 과정 오류:', error);
        alert('카카오 로그인 처리 중 오류가 발생했습니다. 다시 시도해 주세요.');
        router.push('/auth');
      }
    };

    handleCallback();
  }, [router]);

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <h1 className="text-2xl font-bold mb-4">카카오 로그인 처리 중...</h1>
        <p className="text-gray-600">잠시만 기다려주세요.</p>
      </div>
    </div>
  );
} 