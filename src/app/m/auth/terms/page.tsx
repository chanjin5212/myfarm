'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { LOGIN_STATUS_CHANGE } from '@/utils/auth';
import Link from 'next/link';
import { toast, Toaster } from 'react-hot-toast';
import { Spinner } from '@/components/ui/CommonStyles';
import Script from 'next/script';
import { TermsModal } from '@/components/modals/TermsModal';

interface GoogleUserInfo {
  id: string;
  email?: string;
  name?: string;
  picture?: string;
  provider?: string; // 소셜 로그인 제공자 정보
  nickname?: string;
  phone_number?: string; // 전화번호 필드 추가
  kakao_account?: {
    email?: string;
    profile?: {
      nickname?: string;
      profile_image_url?: string;
    };
  };
}

interface DatabaseError {
  code: string;
  message: string;
  details?: string;
  hint?: string;
}

interface DaumPostcodeResult {
  zonecode: string; // 우편번호
  address: string; // 기본 주소
  addressType: string;
  userSelectedType: string;
  jibunAddress: string;
  roadAddress: string;
  buildingName?: string;
  apartment?: string;
}

export default function MobileTermsPage() {
  const [isAgreed, setIsAgreed] = useState(false);
  const [isMarketingAgreed, setIsMarketingAgreed] = useState(false);
  const [userInfo, setUserInfo] = useState<GoogleUserInfo | null>(null);
  const [nickname, setNickname] = useState('');
  const [postcode, setPostcode] = useState('');
  const [address, setAddress] = useState('');
  const [detailAddress, setDetailAddress] = useState('');
  const [phoneNumberPrefix, setPhoneNumberPrefix] = useState('010');
  const [phoneNumberMiddle, setPhoneNumberMiddle] = useState('');
  const [phoneNumberSuffix, setPhoneNumberSuffix] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isTermsModalOpen, setIsTermsModalOpen] = useState(false);
  const router = useRouter();
  
  const [formErrors, setFormErrors] = useState<{[key: string]: string}>({});

  useEffect(() => {
    // localStorage에서 사용자 정보 가져오기
    const savedGoogleInfo = localStorage.getItem('google_user_info');
    const savedNaverInfo = localStorage.getItem('naver_user_info');
    const savedKakaoInfo = localStorage.getItem('kakao_user_info');
    
    if (savedGoogleInfo) {
      const parsedInfo = JSON.parse(savedGoogleInfo);
      if (!parsedInfo.email) {
        alert('사용자 이메일 정보가 없습니다.');
        router.push('/m/auth');
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

      // 전화번호가 있다면 분리
      if (parsedInfo.phone_number) {
        const parts = parsedInfo.phone_number.split('-');
        if (parts.length >= 3) {
          // 첫 번째 부분(010)은 무시하고 UI에 설정된 값을 그대로 사용 
          // setPhoneNumberPrefix는 호출하지 않음
          setPhoneNumberMiddle(parts[1]);
          setPhoneNumberSuffix(parts[2]);
        }
      }
    } else if (savedNaverInfo) {
      const parsedInfo = JSON.parse(savedNaverInfo);
      if (!parsedInfo.email) {
        alert('사용자 이메일 정보가 없습니다.');
        router.push('/m/auth');
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
        const parts = parsedInfo.phone_number.split('-');
        if (parts.length >= 3) {
          // 첫 번째 부분(010)은 무시하고 UI에 설정된 값을 그대로 사용 
          // setPhoneNumberPrefix는 호출하지 않음
          setPhoneNumberMiddle(parts[1]);
          setPhoneNumberSuffix(parts[2]);
        }
      }
    } else if (savedKakaoInfo) {
      const parsedInfo = JSON.parse(savedKakaoInfo);
      
      // 카카오의 경우 email 정보는 kakao_account 내에 있을 수 있음
      const kakaoEmail = parsedInfo.kakao_account?.email || parsedInfo.email;
      
      if (!kakaoEmail) {
        alert('사용자 이메일 정보가 없습니다.');
        router.push('/m/auth');
        return;
      }
      
      // email 정보를 상위 레벨에 복사
      parsedInfo.email = kakaoEmail;
      
      // 제공자 정보가 없는 경우 기본값으로 'kakao' 설정
      if (!parsedInfo.provider) {
        parsedInfo.provider = 'kakao';
      }
      
      setUserInfo(parsedInfo);
      
      // 카카오 프로필 정보 처리
      const kakaoNickname = parsedInfo.kakao_account?.profile?.nickname || parsedInfo.nickname;
      const kakaoProfileImage = parsedInfo.kakao_account?.profile?.profile_image_url || parsedInfo.picture;
      
      // 닉네임 설정
      if (kakaoNickname) {
        setNickname(kakaoNickname);
        parsedInfo.nickname = kakaoNickname;
      } else if (parsedInfo.name) {
        setNickname(parsedInfo.name);
      }
      
      // 프로필 이미지 설정
      if (kakaoProfileImage) {
        parsedInfo.picture = kakaoProfileImage;
      }

      // 전화번호가 있다면 분리
      if (parsedInfo.phone_number) {
        const parts = parsedInfo.phone_number.split('-');
        if (parts.length >= 3) {
          // 첫 번째 부분(010)은 무시하고 UI에 설정된 값을 그대로 사용 
          // setPhoneNumberPrefix는 호출하지 않음
          setPhoneNumberMiddle(parts[1]);
          setPhoneNumberSuffix(parts[2]);
        }
      }
    } else {
      alert('사용자 정보를 찾을 수 없습니다.');
      router.push('/m/auth');
    }
  }, [router]);

  // 전화번호 입력 처리
  const handlePhoneNumberChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    
    if (name === 'phoneNumberPrefix') {
      setPhoneNumberPrefix(value);
    } else if (name === 'phoneNumberMiddle') {
      // 숫자만 입력 가능하고 최대 4자리
      const numericValue = value.replace(/\D/g, '').slice(0, 4);
      setPhoneNumberMiddle(numericValue);
    } else if (name === 'phoneNumberSuffix') {
      // 숫자만 입력 가능하고 최대 4자리
      const numericValue = value.replace(/\D/g, '').slice(0, 4);
      setPhoneNumberSuffix(numericValue);
    }
  };

  // 다음 주소검색 API 호출 함수
  const handleSearchAddress = () => {
    if (window.daum && window.daum.Postcode) {
      new window.daum.Postcode({
        oncomplete: function(data: DaumPostcodeResult) {
          // 검색 결과 데이터 처리
          setPostcode(data.zonecode);
          setAddress(data.address);
          
          // 상세주소 입력란에 포커스
          document.getElementById('detailAddress')?.focus();
        }
      }).open();
    } else {
      toast.error('주소 검색 서비스를 불러오는 중입니다. 잠시 후 다시 시도해주세요.');
    }
  };

  // 전체 전화번호 조합
  const getFullPhoneNumber = () => {
    if (phoneNumberPrefix && phoneNumberMiddle && phoneNumberSuffix) {
      return `${phoneNumberPrefix}-${phoneNumberMiddle}-${phoneNumberSuffix}`;
    }
    return '';
  };

  // 유효성 검사
  const validateForm = (): boolean => {
    const errors: {[key: string]: string} = {};
    
    // 닉네임 검사
    if (!nickname.trim()) {
      errors.nickname = '닉네임을 입력해주세요.';
    }
    
    // 전화번호 유효성 검사
    if (!phoneNumberMiddle) {
      errors.phoneNumber = '번호 중간 자리를 입력해주세요.';
    } else if (phoneNumberMiddle.length !== 4) {
      errors.phoneNumber = '번호 중간 자리는 4자리여야 합니다.';
    }
    
    if (!phoneNumberSuffix) {
      errors.phoneNumber = '번호 끝 자리를 입력해주세요.';
    } else if (phoneNumberSuffix.length !== 4) {
      errors.phoneNumber = '번호 끝 자리는 4자리여야 합니다.';
    }
    
    // 주소 검증
    if (!postcode || !address) {
      errors.address = '주소를 검색해주세요.';
    }
    
    // 이용약관 동의
    if (!isAgreed) {
      errors.terms = '서비스 이용약관에 동의해주세요.';
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleAgree = async () => {
    if (!validateForm()) {
      toast.error('입력 정보를 다시 확인해주세요.');
      return;
    }

    if (!userInfo || !userInfo.email) {
      alert('사용자 이메일 정보가 없습니다.');
      router.push('/m/auth');
      return;
    }

    // 닉네임이 비어있으면 이름을 사용
    const userNickname = nickname.trim() || userInfo.name || userInfo.nickname || '사용자';
    // 전체 전화번호 생성
    const fullPhoneNumber = getFullPhoneNumber();

    setIsLoading(true);

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
          phone_number: fullPhoneNumber,
          postcode: postcode,
          address: address,
          detail_address: detailAddress,
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

      toast.success('회원가입이 완료되었습니다!');
      router.push('/m');
    } catch (error: unknown) {
      const err = error as DatabaseError;
      toast.error(`회원가입 중 오류가 발생했습니다: ${err?.message || '알 수 없는 오류'}`);
      router.push('/m/auth');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <Script
        src="//t1.daumcdn.net/mapjsapi/bundle/postcode/prod/postcode.v2.js"
        strategy="lazyOnload"
      />
      <div className="min-h-screen bg-gray-50 pb-20">
        <Toaster position="top-center" />
        
        {/* 헤더 */}
        <div className="bg-white px-4 py-4 shadow-sm fixed top-0 left-0 right-0 z-10">
          <div className="flex items-center">
            <button
              onClick={() => router.back()}
              className="p-1 mr-2"
              aria-label="뒤로 가기"
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
                <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
              </svg>
            </button>
            <h1 className="text-xl font-bold">회원 정보 입력</h1>
          </div>
        </div>

        {/* 메인 콘텐츠 */}
        <div className="pt-16 px-4">
          <div className="bg-white rounded-lg shadow p-5 mb-6">
            {userInfo && userInfo.email && (
              <p className="text-center text-gray-600 mb-6">
                {userInfo.email} 계정으로 가입합니다.
              </p>
            )}
            
            {/* 닉네임 입력 */}
            <div className="mb-5">
              <label htmlFor="nickname" className="block text-sm font-medium text-gray-700 mb-1">
                닉네임 *
              </label>
              <input
                id="nickname"
                name="nickname"
                type="text"
                value={nickname}
                onChange={(e) => setNickname(e.target.value)}
                placeholder="사용할 닉네임을 입력하세요"
                className={`w-full p-3 border ${formErrors.nickname ? 'border-red-500' : 'border-gray-300'} rounded-md focus:ring-2 focus:ring-green-500 focus:border-green-500`}
              />
              {formErrors.nickname && (
                <p className="mt-1 text-xs text-red-600">{formErrors.nickname}</p>
              )}
              <p className="mt-1 text-xs text-gray-500">
                입력하지 않으면 이름({userInfo?.name})이 닉네임으로 사용됩니다.
              </p>
            </div>

            {/* 전화번호 */}
            <div className="mb-5">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                휴대폰 번호 *
              </label>
              <div className="flex space-x-2">
                <select
                  id="phoneNumberPrefix"
                  name="phoneNumberPrefix"
                  value={phoneNumberPrefix}
                  onChange={handlePhoneNumberChange}
                  className="w-1/4 rounded-md p-2.5 border border-gray-300 focus:ring-green-500 focus:border-green-500"
                >
                  <option value="010">010</option>
                  <option value="011">011</option>
                  <option value="016">016</option>
                  <option value="017">017</option>
                  <option value="018">018</option>
                  <option value="019">019</option>
                </select>
                <input
                  id="phoneNumberMiddle"
                  name="phoneNumberMiddle"
                  type="text"
                  inputMode="numeric"
                  maxLength={4}
                  placeholder="0000"
                  value={phoneNumberMiddle}
                  onChange={handlePhoneNumberChange}
                  className={`w-1/3 rounded-md p-2.5 border ${formErrors.phoneNumber ? 'border-red-500' : 'border-gray-300'} focus:ring-green-500 focus:border-green-500`}
                />
                <input
                  id="phoneNumberSuffix"
                  name="phoneNumberSuffix"
                  type="text"
                  inputMode="numeric"
                  maxLength={4}
                  placeholder="0000"
                  value={phoneNumberSuffix}
                  onChange={handlePhoneNumberChange}
                  className={`w-1/3 rounded-md p-2.5 border ${formErrors.phoneNumber ? 'border-red-500' : 'border-gray-300'} focus:ring-green-500 focus:border-green-500`}
                />
              </div>
              {formErrors.phoneNumber && (
                <p className="mt-1 text-xs text-red-600">{formErrors.phoneNumber}</p>
              )}
            </div>
            
            {/* 주소 */}
            <div className="mb-5">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                주소 *
              </label>
              <div className="flex space-x-2 mb-2">
                <input
                  id="postcode"
                  name="postcode"
                  type="text"
                  className={`w-2/5 rounded-l-md p-2.5 border ${formErrors.address ? 'border-red-500' : 'border-gray-300'} focus:ring-green-500 focus:border-green-500`}
                  placeholder="우편번호"
                  value={postcode}
                  readOnly
                />
                <button
                  type="button"
                  onClick={handleSearchAddress}
                  className="shrink-0 rounded-r-md px-4 py-2.5 font-medium text-sm bg-gray-600 text-white hover:bg-gray-700"
                >
                  주소 검색
                </button>
              </div>
              <input
                id="address"
                name="address"
                type="text"
                className={`w-full rounded-md p-2.5 border ${formErrors.address ? 'border-red-500' : 'border-gray-300'} focus:ring-green-500 focus:border-green-500 mb-2`}
                placeholder="기본주소"
                value={address}
                readOnly
              />
              <input
                id="detailAddress"
                name="detailAddress"
                type="text"
                className="w-full rounded-md p-2.5 border border-gray-300 focus:ring-green-500 focus:border-green-500"
                placeholder="상세주소"
                value={detailAddress}
                onChange={(e) => setDetailAddress(e.target.value)}
              />
              {formErrors.address && (
                <p className="mt-1 text-xs text-red-600">{formErrors.address}</p>
              )}
            </div>
            
            {/* 약관 동의 */}
            <div className="pt-4 space-y-3">
              <div className="flex items-start">
                <div className="flex items-center h-5">
                  <input
                    id="terms_agreed"
                    name="terms_agreed"
                    type="checkbox"
                    checked={isAgreed}
                    onChange={(e) => setIsAgreed(e.target.checked)}
                    className="h-4 w-4 text-green-600 border-gray-300 rounded focus:ring-green-500"
                  />
                </div>
                <div className="ml-3 text-sm">
                  <label htmlFor="terms_agreed" className="font-medium text-gray-700">
                    서비스 이용약관 동의 (필수) *
                  </label>
                  <p className="text-gray-500">
                    회원가입을 위해 서비스 이용약관에 동의해야 합니다.
                    <button
                      type="button"
                      onClick={() => setIsTermsModalOpen(true)}
                      className="ml-1 text-green-600 hover:text-green-500 underline"
                    >
                      약관 보기
                    </button>
                  </p>
                </div>
              </div>
              {formErrors.terms && (
                <p className="text-xs text-red-600">{formErrors.terms}</p>
              )}
              
              <div className="flex items-start">
                <div className="flex items-center h-5">
                  <input
                    id="marketing_agreed"
                    name="marketing_agreed"
                    type="checkbox"
                    checked={isMarketingAgreed}
                    onChange={(e) => setIsMarketingAgreed(e.target.checked)}
                    className="h-4 w-4 text-green-600 border-gray-300 rounded focus:ring-green-500"
                  />
                </div>
                <div className="ml-3 text-sm">
                  <label htmlFor="marketing_agreed" className="font-medium text-gray-700">
                    마케팅 정보 수신 동의 (선택)
                  </label>
                  <p className="text-gray-500">프로모션 및 마케팅 정보를 이메일과 SMS로 받아보실 수 있습니다.</p>
                </div>
              </div>
            </div>
            
            {/* 버튼 */}
            <button
              onClick={handleAgree}
              disabled={isLoading}
              className="w-full bg-green-600 hover:bg-green-700 text-white py-3 px-4 rounded-md font-medium focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 flex justify-center items-center mt-6"
            >
              {isLoading ? <Spinner size="sm" /> : '회원가입 완료하기'}
            </button>
          </div>
          
          <div className="text-center mt-4">
            <Link href="/m/auth" className="text-sm text-green-600 hover:underline">
              로그인 화면으로 돌아가기
            </Link>
          </div>
        </div>
      </div>

      <TermsModal 
        isOpen={isTermsModalOpen}
        onClose={() => setIsTermsModalOpen(false)}
      />
    </>
  );
}

declare global {
  interface Window {
    daum: {
      Postcode: new (config: {
        oncomplete: (data: DaumPostcodeResult) => void;
      }) => {
        open: () => void;
      };
    }
  }
} 