'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { LOGIN_STATUS_CHANGE } from '@/components/Header';

interface GoogleUserInfo {
  id: string;
  email: string;
  name: string;
  picture: string;
  provider?: string; // 소셜 로그인 제공자 정보
  nickname?: string;
  phone_number?: string; // 전화번호 필드 추가
}

interface DatabaseError {
  code: string;
  message: string;
  details?: string;
  hint?: string;
}

export default function TermsPage() {
  const [isAgreed, setIsAgreed] = useState(false);
  const [isMarketingAgreed, setIsMarketingAgreed] = useState(false);
  const [userInfo, setUserInfo] = useState<GoogleUserInfo | null>(null);
  const [nickname, setNickname] = useState('');
  const router = useRouter();

  useEffect(() => {
    // localStorage에서 사용자 정보 가져오기
    const savedGoogleInfo = localStorage.getItem('google_user_info');
    const savedNaverInfo = localStorage.getItem('naver_user_info');
    const savedKakaoInfo = localStorage.getItem('kakao_user_info');
    
    if (savedGoogleInfo) {
      const parsedInfo = JSON.parse(savedGoogleInfo);
      if (!parsedInfo.email) {
        alert('사용자 이메일 정보가 없습니다.');
        router.push('/auth');
        return;
      }
      
      // 제공자 정보가 없는 경우 기본값으로 'google' 설정
      if (!parsedInfo.provider) {
        parsedInfo.provider = 'google';
      }
      
      setUserInfo(parsedInfo);
      
      // 사용자 이름을 닉네임 기본값으로 설정
      if (parsedInfo.name) {
        setNickname(parsedInfo.name);
      } else if (parsedInfo.nickname) {
        setNickname(parsedInfo.nickname);
      }
    } else if (savedNaverInfo) {
      const parsedInfo = JSON.parse(savedNaverInfo);
      if (!parsedInfo.email) {
        alert('사용자 이메일 정보가 없습니다.');
        router.push('/auth');
        return;
      }
      
      // 제공자 정보가 없는 경우 기본값으로 'naver' 설정
      if (!parsedInfo.provider) {
        parsedInfo.provider = 'naver';
      }
      
      setUserInfo(parsedInfo);
      
      // 네이버는 nickname 필드를 제공하므로 이를 먼저 사용
      if (parsedInfo.nickname) {
        setNickname(parsedInfo.nickname);
      } else if (parsedInfo.name) {
        setNickname(parsedInfo.name);
      }
      
      // 네이버 전화번호 정보 로깅 (디버깅용)
      if (parsedInfo.phone_number) {
        console.log('Naver phone number:', parsedInfo.phone_number);
      }
    } else if (savedKakaoInfo) {
      const parsedInfo = JSON.parse(savedKakaoInfo);
      if (!parsedInfo.email) {
        alert('사용자 이메일 정보가 없습니다.');
        router.push('/auth');
        return;
      }
      
      // 제공자 정보가 없는 경우 기본값으로 'kakao' 설정
      if (!parsedInfo.provider) {
        parsedInfo.provider = 'kakao';
      }
      
      setUserInfo(parsedInfo);
      
      // 카카오는 nickname 필드를 제공하므로 이를 먼저 사용
      if (parsedInfo.nickname) {
        setNickname(parsedInfo.nickname);
      } else if (parsedInfo.name) {
        setNickname(parsedInfo.name);
      }
    } else {
      alert('사용자 정보를 찾을 수 없습니다.');
      router.push('/auth');
    }
  }, [router]);

  const handleAgree = async () => {
    if (!isAgreed) {
      alert('이용약관에 동의해주세요.');
      return;
    }

    if (!userInfo || !userInfo.email) {
      alert('사용자 이메일 정보가 없습니다.');
      router.push('/auth');
      return;
    }

    // 닉네임이 비어있으면 이름을 사용
    const userNickname = nickname.trim() || userInfo.name || userInfo.nickname || '사용자';

    try {
      // 소셜 로그인 제공자에 따라 ID 필드 설정
      const socialIdField = userInfo.provider === 'google' 
        ? { google_id: userInfo.id } 
        : userInfo.provider === 'naver' 
          ? { naver_id: userInfo.id }
          : userInfo.provider === 'kakao' 
            ? { kakao_id: userInfo.id }
            : {};
      
      // API 라우트를 통해 사용자 정보 저장
      const response = await fetch('/api/users', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...socialIdField,
          provider: userInfo.provider || 'google', // 소셜 로그인 제공자
          email: userInfo.email,
          name: userInfo.name || '사용자',
          nickname: userNickname, // 닉네임 추가
          avatar_url: userInfo.picture || '',
          terms_agreed: isAgreed,
          marketing_agreed: isMarketingAgreed,
          phone_number: userInfo.phone_number || '', // 전화번호 정보 추가
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }),
      });
      
      const result = await response.json();
      
      if (result.error) {
        throw new Error(result.error);
      }
      
      // JWT 토큰 생성 및 저장
      const token = {
        accessToken: localStorage.getItem(`${userInfo.provider}_access_token`) || '',
        user: result.data?.[0] || { 
          ...userInfo, 
          nickname: userNickname,
          terms_agreed: isAgreed, 
          marketing_agreed: isMarketingAgreed 
        },
        expiresAt: Date.now() + 3600000 // 1시간 후 만료
      };
      localStorage.setItem('token', JSON.stringify(token));
      
      // localStorage에서 사용자 정보 삭제
      localStorage.removeItem('google_user_info');
      localStorage.removeItem('google_access_token');
      localStorage.removeItem('naver_user_info');
      localStorage.removeItem('naver_access_token');
      localStorage.removeItem('kakao_user_info');
      localStorage.removeItem('kakao_access_token');
      
      // 로그인 상태 변경 이벤트 발생
      window.dispatchEvent(new Event(LOGIN_STATUS_CHANGE));

      alert('회원가입이 완료되었습니다!');
      router.push('/');
    } catch (error: unknown) {
      const err = error as DatabaseError;
      alert(`회원가입 중 오류가 발생했습니다: ${err?.message || '알 수 없는 오류'}`);
      router.push('/auth');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full space-y-8 p-8 bg-white rounded-lg shadow">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            이용약관 동의
          </h2>
          {userInfo && userInfo.email && (
            <p className="mt-2 text-center text-sm text-gray-600">
              {userInfo.email} 계정으로 가입합니다.
            </p>
          )}
        </div>
        
        <div className="bg-gray-50 p-4 rounded-md">
          <label htmlFor="nickname" className="block text-sm font-medium text-gray-700 mb-2">
            닉네임
          </label>
          <input
            id="nickname"
            name="nickname"
            type="text"
            value={nickname}
            onChange={(e) => setNickname(e.target.value)}
            placeholder="사용할 닉네임을 입력하세요"
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
          />
          <p className="mt-1 text-xs text-gray-500">
            입력하지 않으면 이름({userInfo?.name})이 닉네임으로 사용됩니다.
          </p>
        </div>
        
        <div className="bg-gray-50 p-4 rounded-md">
          <h3 className="text-lg font-medium mb-2">이용약관</h3>
          <p className="text-sm text-gray-600">
            여기에 이용약관 내용이 들어갑니다. 실제 서비스에서는 더 자세한 내용이 필요합니다.
          </p>
        </div>
        <div className="space-y-4">
          <div className="flex items-center">
            <input
              id="agree"
              name="agree"
              type="checkbox"
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              checked={isAgreed}
              onChange={(e) => setIsAgreed(e.target.checked)}
            />
            <label htmlFor="agree" className="ml-2 block text-sm text-gray-900">
              이용약관에 동의합니다 (필수)
            </label>
          </div>
          <div className="flex items-center">
            <input
              id="marketing"
              name="marketing"
              type="checkbox"
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              checked={isMarketingAgreed}
              onChange={(e) => setIsMarketingAgreed(e.target.checked)}
            />
            <label htmlFor="marketing" className="ml-2 block text-sm text-gray-900">
              마케팅 정보 수신에 동의합니다 (선택)
            </label>
          </div>
        </div>
        <div>
          <button
            onClick={handleAgree}
            className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            동의하고 계속하기
          </button>
        </div>
      </div>
    </div>
  );
} 