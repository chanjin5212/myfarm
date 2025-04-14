'use client';

import { useState, ChangeEvent, FormEvent, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Script from 'next/script';
import { Button, Input, Checkbox, Select } from '@/components/ui/CommonStyles';

// 다음 주소검색 API를 위한 타입 정의
declare global {
  interface Window {
    daum: {
      Postcode: new (config: {
        oncomplete: (data: DaumPostcodeResult) => void;
      }) => { open: () => void };
    };
  }
}

// 다음 주소검색 결과 타입
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

interface FormData {
  loginId: string;
  email: string;
  emailId: string;
  emailDomain: string;
  password: string;
  confirmPassword: string;
  name: string;
  nickname: string;
  phoneNumberPrefix: string;
  phoneNumberMiddle: string;
  phoneNumberSuffix: string;
  phoneVerificationCode: string;
  phoneVerified: boolean;
  termsAgreed: boolean;
  marketingAgreed: boolean;
  loginIdChecked: boolean;
  emailVerificationCode: string;
  emailVerified: boolean;
  postcode: string;
  address: string;
  detailAddress: string;
}

interface FormErrors {
  loginId?: string;
  email?: string;
  password?: string;
  confirmPassword?: string;
  name?: string;
  nickname?: string;
  phoneNumberPrefix?: string;
  phoneNumberMiddle?: string;
  phoneNumberSuffix?: string;
  phoneVerificationCode?: string;
  termsAgreed?: string;
  emailVerificationCode?: string;
  postcode?: string;
  address?: string;
  detailAddress?: string;
}

interface PasswordValidation {
  length: boolean;
  upperLower: boolean;
  number: boolean;
  special: boolean;
  allValid: boolean;
}

export default function RegisterPage() {
  const router = useRouter();
  const [formData, setFormData] = useState<FormData>({
    loginId: '',
    email: '',
    emailId: '',
    emailDomain: '',
    password: '',
    confirmPassword: '',
    name: '',
    nickname: '',
    phoneNumberPrefix: '010',
    phoneNumberMiddle: '',
    phoneNumberSuffix: '',
    phoneVerificationCode: '',
    phoneVerified: false,
    termsAgreed: false,
    marketingAgreed: false,
    loginIdChecked: false,
    emailVerificationCode: '',
    emailVerified: false,
    postcode: '',
    address: '',
    detailAddress: ''
  });
  const [errors, setErrors] = useState<FormErrors>({});
  const [isLoading, setIsLoading] = useState(false);
  const [sendingVerification, setSendingVerification] = useState(false);
  const [verifyingEmail, setVerifyingEmail] = useState(false);
  const [verificationSent, setVerificationSent] = useState(false);
  const [checkingId, setCheckingId] = useState(false);
  const [passwordValidation, setPasswordValidation] = useState<PasswordValidation>({
    length: false,
    upperLower: false,
    number: false,
    special: false,
    allValid: false
  });
  const [passwordMatch, setPasswordMatch] = useState<boolean | null>(null);
  const [isCustomDomain, setIsCustomDomain] = useState(false);

  useEffect(() => {
    if (formData.confirmPassword || formData.password) {
      setPasswordMatch(formData.password === formData.confirmPassword);
    } else {
      setPasswordMatch(null);
    }
  }, [formData.password, formData.confirmPassword]);

  const handleChange = (e: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    
    // 체크박스 처리
    if (type === 'checkbox') {
      const checked = (e.target as HTMLInputElement).checked;
      setFormData(prev => ({
        ...prev,
        [name]: checked
      }));
      return;
    }
    
    // 로그인 아이디가 변경되면 중복 확인 상태 초기화
    if (name === 'loginId') {
      setFormData(prev => ({
        ...prev,
        [name]: value,
        loginIdChecked: false
      }));
      return;
    }
    
    // 전화번호 중간 자리와 끝자리는 숫자 4자리만 허용
    if (name === 'phoneNumberMiddle' || name === 'phoneNumberSuffix') {
      const numericValue = value.replace(/\D/g, '').slice(0, 4);
      setFormData(prev => ({
        ...prev,
        [name]: numericValue
      }));
      return;
    }
    
    // 이메일 관련 처리
    if (name === 'emailId' || name === 'emailDomain') {
      const id = name === 'emailId' ? value : formData.emailId;
      const domain = name === 'emailDomain' ? value : formData.emailDomain;
      
      // 직접 입력 선택 시 처리
      if (name === 'emailDomain' && value === 'custom') {
        setIsCustomDomain(true);
        setFormData(prev => ({
          ...prev,
          [name]: '',
          email: id ? `${id}@` : ''
        }));
        return;
      } else if (name === 'emailDomain' && value !== 'custom') {
        setIsCustomDomain(false);
      }
      
      // 이메일 값 조합
      const fullEmail = id && domain ? `${id}@${domain}` : '';
      
      setFormData(prev => ({
        ...prev,
        [name]: value,
        email: fullEmail
      }));
      return;
    }
    
    // 일반 필드 처리
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    
    // 비밀번호 입력 시 실시간 유효성 검사
    if (name === 'password') {
      const length = value.length >= 8 && value.length <= 16;
      const upperLower = /(?=.*[a-z])(?=.*[A-Z])/.test(value);
      const number = /(?=.*\d)/.test(value);
      const special = /(?=.*[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?])/.test(value);
      const allValid = length && upperLower && number && special;
      
      setPasswordValidation({
        length,
        upperLower,
        number,
        special,
        allValid
      });
    }
  };

  // 전체 전화번호 조합
  const getFullPhoneNumber = () => {
    const { phoneNumberPrefix, phoneNumberMiddle, phoneNumberSuffix } = formData;
    if (phoneNumberPrefix && phoneNumberMiddle && phoneNumberSuffix) {
      return `${phoneNumberPrefix}${phoneNumberMiddle}${phoneNumberSuffix}`;
    }
    return '';
  };

  const handleSendVerification = async () => {
    // 이메일 유효성 검사
    if (!formData.emailId) {
      setErrors(prev => ({
        ...prev,
        email: '이메일 아이디를 입력해주세요'
      }));
      return;
    }
    
    if (!formData.emailDomain) {
      setErrors(prev => ({
        ...prev,
        email: '이메일 도메인을 입력해주세요'
      }));
      return;
    }
    
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email)) {
      setErrors(prev => ({
        ...prev,
        email: '유효한 이메일 형식이 아닙니다'
      }));
      return;
    }
    
    // 에러 초기화
    setErrors(prev => ({ ...prev, email: undefined }));
    setSendingVerification(true);
    
    try {
      // 인증 코드 발송 API 호출
      const response = await fetch('/api/email/send-verification', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: formData.email,
        }),
      });
      
      const data = await response.json();
      
      // 응답 처리 로직 수정: 성공 또는 개발 환경에서 코드가 있는 경우
      if ((response.ok && data.success) || (data.code && process.env.NODE_ENV === 'development')) {
        // 인증 코드가 있으면 인증 과정 시작
        setVerificationSent(true);
        
        // 개발 환경에서 API에서 직접 코드를 반환한 경우, 자동으로 입력
        if (data.code) {
          setFormData(prev => ({
            ...prev,
            emailVerificationCode: data.code
          }));
          
          // 이메일 발송 상태에 따라 다른 메시지 표시
          if (data.success === false) {
            let errorMsg = `이메일 발송에 실패했습니다. 개발 환경에서 테스트를 위한 인증 코드: ${data.code}`;
            if (data.errorDetail) {
              errorMsg += `\n\n오류 상세: ${data.errorDetail}`;
            }
            alert(errorMsg);
          } else {
            alert(`인증 코드가 이메일로 발송되었습니다. (개발 환경: ${data.code})`);
          }
        } else {
          alert('인증 코드가 이메일로 발송되었습니다. 이메일을 확인해주세요.');
        }
      } else {
        // API 오류 발생
        const errorMessage = data.error || '인증 코드 발송 중 오류가 발생했습니다';
        
        setErrors(prev => ({
          ...prev,
          email: errorMessage
        }));
        alert(`이메일 발송 실패: ${errorMessage}`);
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '서버 연결 중 오류가 발생했습니다';
      setErrors(prev => ({
        ...prev,
        email: errorMessage
      }));
      alert(`이메일 발송 오류: ${errorMessage}`);
    } finally {
      setSendingVerification(false);
    }
  };

  const handleVerifyEmail = async () => {
    // 인증 코드 유효성 검사
    if (!formData.emailVerificationCode) {
      setErrors(prev => ({
        ...prev,
        emailVerificationCode: '인증 코드를 입력해주세요'
      }));
      return;
    }
    
    // 에러 초기화
    setErrors(prev => ({ ...prev, emailVerificationCode: undefined }));
    setVerifyingEmail(true);
    
    try {
      // 인증 코드 확인 API 호출
      const response = await fetch('/api/email/verify-code', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: formData.email,
          code: formData.emailVerificationCode,
        }),
      });
      
      const data = await response.json();
      console.log('이메일 인증 코드 확인 응답:', data);
      
      if (response.ok && data.verified) {
        // 인증 성공
        setFormData(prev => ({
          ...prev,
          emailVerified: true
        }));
        alert('이메일 인증이 완료되었습니다.');
      } else {
        // 인증 실패
        const errorMessage = data.error || '유효하지 않은 인증 코드입니다';
        console.error('이메일 인증 실패:', errorMessage);
        setErrors(prev => ({
          ...prev,
          emailVerificationCode: errorMessage
        }));
        alert(`인증 실패: ${errorMessage}`);
      }
    } catch (error) {
      console.error('이메일 인증 중 오류:', error);
      const errorMessage = error instanceof Error ? error.message : '서버 연결 중 오류가 발생했습니다';
      setErrors(prev => ({
        ...prev,
        emailVerificationCode: errorMessage
      }));
      alert(`인증 오류: ${errorMessage}`);
    } finally {
      setVerifyingEmail(false);
    }
  };

  // 아이디 중복 확인 함수
  const handleCheckLoginId = async () => {
    // 아이디 유효성 검사
    if (!formData.loginId) {
      setErrors(prev => ({
        ...prev,
        loginId: '로그인 아이디를 입력해주세요'
      }));
      return;
    }
    
    if (formData.loginId.length < 4) {
      setErrors(prev => ({
        ...prev,
        loginId: '아이디는 4자 이상이어야 합니다'
      }));
      return;
    }
    
    // 에러 초기화
    setErrors(prev => ({ ...prev, loginId: undefined }));
    setCheckingId(true);
    
    try {
      // 중복 확인 API 호출
      const response = await fetch('/api/users/check-id', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          login_id: formData.loginId,
        }),
      });
      
      const data = await response.json();
      
      if (response.ok) {
        if (data.exists) {
          // 이미 사용 중인 아이디인 경우
          setErrors(prev => ({
            ...prev,
            loginId: '이미 사용 중인 아이디입니다'
          }));
          setFormData(prev => ({
            ...prev,
            loginIdChecked: false
          }));
        } else {
          // 사용 가능한 아이디인 경우
          alert('사용 가능한 아이디입니다.');
          setFormData(prev => ({
            ...prev,
            loginIdChecked: true
          }));
        }
      } else {
        // API 오류 발생
        setErrors(prev => ({
          ...prev,
          loginId: data.error || '아이디 중복 확인 중 오류가 발생했습니다'
        }));
      }
    } catch (error) {
      console.error('아이디 중복 확인 중 오류:', error);
      setErrors(prev => ({
        ...prev,
        loginId: '서버 연결 중 오류가 발생했습니다'
      }));
    } finally {
      setCheckingId(false);
    }
  };

  // 다음 주소검색 API 호출 함수
  const handleSearchAddress = () => {
    if (window.daum && window.daum.Postcode) {
      new window.daum.Postcode({
        oncomplete: function(data: DaumPostcodeResult) {
          // 검색 결과 데이터 처리
          setFormData(prev => ({
            ...prev,
            postcode: data.zonecode,
            address: data.address
          }));
          
          // 상세주소 입력란에 포커스
          document.getElementById('detailAddress')?.focus();
        }
      }).open();
    } else {
      alert('주소 검색 서비스를 불러오는 중입니다. 잠시 후 다시 시도해주세요.');
    }
  };

  const validateForm = () => {
    const newErrors: FormErrors = {};
    
    // 로그인 아이디 검증
    if (!formData.loginId) newErrors.loginId = '로그인 아이디를 입력해주세요';
    else if (formData.loginId.length < 4) newErrors.loginId = '아이디는 4자 이상이어야 합니다';
    else if (!formData.loginIdChecked) newErrors.loginId = '아이디 중복 확인을 해주세요';
    
    // 이메일 검증
    if (!formData.emailId) newErrors.email = '이메일 아이디를 입력해주세요';
    else if (!formData.emailDomain) newErrors.email = '이메일 도메인을 입력해주세요';
    else {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(formData.email)) newErrors.email = '유효한 이메일 형식이 아닙니다';
    }
    
    // 이메일 인증 검증
    if (!formData.emailVerified) newErrors.emailVerificationCode = '이메일 인증이 필요합니다';
    
    // 비밀번호 정책 검증
    if (!formData.password) {
      newErrors.password = '비밀번호를 입력해주세요';
    } else {
      // 8~16자 검증
      if (formData.password.length < 8 || formData.password.length > 16) {
        newErrors.password = '비밀번호는 8~16자여야 합니다';
      }
      // 대/소문자 포함 검증
      else if (!/(?=.*[a-z])(?=.*[A-Z])/.test(formData.password)) {
        newErrors.password = '비밀번호는 대문자와 소문자를 모두 포함해야 합니다';
      }
      // 숫자 포함 검증
      else if (!/(?=.*\d)/.test(formData.password)) {
        newErrors.password = '비밀번호는 숫자를 포함해야 합니다';
      }
      // 특수문자 포함 검증
      else if (!/(?=.*[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?])/.test(formData.password)) {
        newErrors.password = '비밀번호는 특수문자를 포함해야 합니다';
      }
    }
    
    if (formData.password !== formData.confirmPassword) newErrors.confirmPassword = '비밀번호가 일치하지 않습니다';
    
    if (!formData.name) newErrors.name = '이름을 입력해주세요';
    if (!formData.nickname) newErrors.nickname = '닉네임을 입력해주세요';
    
    // 전화번호 유효성 검사
    if (!formData.phoneNumberMiddle) {
      newErrors.phoneNumberMiddle = '번호 중간 자리를 입력해주세요';
    } else if (formData.phoneNumberMiddle.length !== 4) {
      newErrors.phoneNumberMiddle = '번호 중간 자리는 4자리여야 합니다';
    }
    
    if (!formData.phoneNumberSuffix) {
      newErrors.phoneNumberSuffix = '번호 끝 자리를 입력해주세요';
    } else if (formData.phoneNumberSuffix.length !== 4) {
      newErrors.phoneNumberSuffix = '번호 끝 자리는 4자리여야 합니다';
    }
    
    if (!formData.termsAgreed) newErrors.termsAgreed = '이용약관에 동의해주세요';
    
    // 주소 검증
    if (!formData.postcode || !formData.address) {
      newErrors.address = '주소를 검색해주세요';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    
    if (!validateForm()) return;
    
    setIsLoading(true);
    
    // 전체 전화번호 생성
    const fullPhoneNumber = getFullPhoneNumber();
    
    try {
      // API 호출 로직 구현 예정
      const response = await fetch('/api/users', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          login_id: formData.loginId,
          email: formData.email,
          password: formData.password, // 실제 서비스에서는 비밀번호 해싱 필요
          name: formData.name,
          nickname: formData.nickname,
          phone_number: fullPhoneNumber, // 변경: 전체 전화번호 저장
          phone_verified: formData.phoneVerified,
          terms_agreed: formData.termsAgreed,
          marketing_agreed: formData.marketingAgreed,
          postcode: formData.postcode,
          address: formData.address,
          detail_address: formData.detailAddress,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }),
      });

      const data = await response.json();

      if (data.success) {
        alert('회원가입이 완료되었습니다.');
        router.push('/auth');
      } else {
        alert(data.error || '회원가입 중 오류가 발생했습니다.');
      }
    } catch (error) {
      console.error('회원가입 중 오류 발생:', error);
      alert('회원가입 중 오류가 발생했습니다.');
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
      <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full space-y-8 bg-white p-8 rounded-lg shadow">
          <div>
            <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
              회원가입
            </h2>
            <p className="mt-2 text-center text-sm text-gray-600">
              이미 계정이 있으신가요?{' '}
              <Link href="/auth" className="font-medium text-green-600 hover:text-green-500">
                로그인
              </Link>
            </p>
          </div>
          <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
            <div className="rounded-md shadow-sm space-y-4">
              <div>
                <div className="flex items-end space-x-2 mb-4">
                  <Input
                    label="아이디"
                    id="loginId"
                    name="loginId"
                    type="text"
                    autoComplete="username"
                    required
                    placeholder="로그인 아이디"
                    value={formData.loginId}
                    onChange={handleChange}
                    error={errors.loginId}
                    fullWidth
                  />
                  <Button
                    type="button"
                    onClick={handleCheckLoginId}
                    disabled={checkingId || !formData.loginId || formData.loginIdChecked}
                    className="mb-1 shrink-0"
                    variant={formData.loginIdChecked ? "outline" : "secondary"}
                  >
                    {checkingId ? '확인중...' : formData.loginIdChecked ? '확인완료' : '중복확인'}
                  </Button>
                </div>
              </div>
              
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">이메일</label>
                <div className="flex items-center space-x-2">
                  <input
                    type="text"
                    name="emailId"
                    value={formData.emailId}
                    onChange={handleChange}
                    className="px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 border-gray-300 flex-1"
                    placeholder="이메일 아이디"
                    required
                  />
                  <span className="text-gray-500">@</span>
                  <Select
                    name="emailDomain"
                    value={formData.emailDomain || 'custom'}
                    onChange={handleChange}
                    options={[
                      { value: 'custom', label: '직접입력' },
                      { value: 'naver.com', label: 'naver.com' },
                      { value: 'gmail.com', label: 'gmail.com' },
                      { value: 'daum.net', label: 'daum.net' },
                      { value: 'hanmail.net', label: 'hanmail.net' },
                      { value: 'nate.com', label: 'nate.com' }
                    ]}
                    className="flex-1"
                  />
                </div>
                {isCustomDomain && (
                  <input
                    type="text"
                    name="emailDomain"
                    value={formData.emailDomain}
                    onChange={handleChange}
                    className="mt-2 px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 border-gray-300 w-full"
                    placeholder="도메인 입력 (예: gmail.com)"
                  />
                )}
                {errors.email && <p className="mt-1 text-sm text-red-600">{errors.email}</p>}
              </div>
              
              <div className="flex items-end space-x-2 mb-4">
                <div className="flex-1">
                  <Input
                    label="이메일 인증 코드"
                    id="emailVerificationCode"
                    name="emailVerificationCode"
                    type="text"
                    placeholder="인증 코드 입력"
                    value={formData.emailVerificationCode}
                    onChange={handleChange}
                    disabled={!verificationSent || formData.emailVerified}
                    error={errors.emailVerificationCode}
                  />
                </div>
                {!verificationSent ? (
                  <Button
                    type="button"
                    onClick={handleSendVerification}
                    disabled={sendingVerification || !formData.email}
                    variant="secondary"
                    className="mb-1 shrink-0"
                  >
                    {sendingVerification ? '전송 중...' : '인증코드 전송'}
                  </Button>
                ) : (
                  <Button
                    type="button"
                    onClick={handleVerifyEmail}
                    disabled={verifyingEmail || !formData.emailVerificationCode || formData.emailVerified}
                    variant={formData.emailVerified ? "outline" : "secondary"}
                    className="mb-1 shrink-0"
                  >
                    {verifyingEmail ? '확인 중...' : formData.emailVerified ? '인증 완료' : '인증 확인'}
                  </Button>
                )}
              </div>
              
              <div className="mb-4">
                <Input
                  label="비밀번호"
                  id="password"
                  name="password"
                  type="password"
                  autoComplete="new-password"
                  required
                  placeholder="비밀번호"
                  value={formData.password}
                  onChange={handleChange}
                  error={errors.password}
                />
                
                <div className="mt-2 text-xs text-gray-600 space-y-1">
                  <p className={passwordValidation.length ? 'text-green-600' : 'text-gray-400'}>
                    * 8~16자의 길이
                  </p>
                  <p className={passwordValidation.upperLower ? 'text-green-600' : 'text-gray-400'}>
                    * 대문자와 소문자 포함
                  </p>
                  <p className={passwordValidation.number ? 'text-green-600' : 'text-gray-400'}>
                    * 숫자 포함
                  </p>
                  <p className={passwordValidation.special ? 'text-green-600' : 'text-gray-400'}>
                    * 특수문자 포함
                  </p>
                </div>
              </div>
              
              <div className="mb-4">
                <Input
                  label="비밀번호 확인"
                  id="confirmPassword"
                  name="confirmPassword"
                  type="password"
                  autoComplete="new-password"
                  required
                  placeholder="비밀번호 확인"
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  error={errors.confirmPassword}
                />
                {formData.confirmPassword && passwordMatch === false && !errors.confirmPassword && (
                  <p className="mt-1 text-sm text-red-600">비밀번호가 일치하지 않습니다</p>
                )}
                {formData.confirmPassword && passwordMatch === true && (
                  <p className="mt-1 text-sm text-green-600">비밀번호가 일치합니다</p>
                )}
              </div>
              
              <div className="mb-4">
                <Input
                  label="이름"
                  id="name"
                  name="name"
                  type="text"
                  autoComplete="name"
                  required
                  placeholder="이름"
                  value={formData.name}
                  onChange={handleChange}
                  error={errors.name}
                />
              </div>
              
              <div className="mb-4">
                <Input
                  label="닉네임"
                  id="nickname"
                  name="nickname"
                  type="text"
                  autoComplete="nickname"
                  required
                  placeholder="닉네임"
                  value={formData.nickname}
                  onChange={handleChange}
                  error={errors.nickname}
                />
              </div>

              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  주소
                </label>
                <div className="flex space-x-2 mb-2">
                  <input
                    id="postcode"
                    name="postcode"
                    type="text"
                    className="px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 border-gray-300 w-1/3"
                    placeholder="우편번호"
                    value={formData.postcode}
                    readOnly
                  />
                  <Button
                    type="button"
                    onClick={handleSearchAddress}
                    variant="secondary"
                  >
                    주소 검색
                  </Button>
                </div>
                <Input
                  id="address"
                  name="address"
                  type="text"
                  placeholder="기본주소"
                  value={formData.address}
                  readOnly
                  className="mb-2"
                />
                <Input
                  id="detailAddress"
                  name="detailAddress"
                  type="text"
                  placeholder="상세주소"
                  value={formData.detailAddress}
                  onChange={handleChange}
                  error={errors.address}
                />
              </div>

              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  휴대폰 번호
                </label>
                <div className="flex space-x-2">
                  <div className="w-1/4">
                    <Select
                      name="phoneNumberPrefix"
                      value={formData.phoneNumberPrefix}
                      onChange={handleChange}
                      options={[
                        { value: '010', label: '010' },
                        { value: '011', label: '011' },
                        { value: '016', label: '016' },
                        { value: '017', label: '017' },
                        { value: '018', label: '018' },
                        { value: '019', label: '019' }
                      ]}
                    />
                  </div>
                  <div className="w-1/3">
                    <input
                      id="phoneNumberMiddle"
                      name="phoneNumberMiddle"
                      type="text"
                      inputMode="numeric"
                      maxLength={4}
                      placeholder="0000"
                      value={formData.phoneNumberMiddle}
                      onChange={handleChange}
                      className="px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 border-gray-300 w-full"
                    />
                  </div>
                  <div className="w-1/3">
                    <input
                      id="phoneNumberSuffix"
                      name="phoneNumberSuffix"
                      type="text"
                      inputMode="numeric"
                      maxLength={4}
                      placeholder="0000"
                      value={formData.phoneNumberSuffix}
                      onChange={handleChange}
                      className="px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 border-gray-300 w-full"
                    />
                  </div>
                </div>
                {(errors.phoneNumberPrefix || errors.phoneNumberMiddle || errors.phoneNumberSuffix) && (
                  <p className="mt-1 text-sm text-red-600">
                    {errors.phoneNumberPrefix || errors.phoneNumberMiddle || errors.phoneNumberSuffix}
                  </p>
                )}
              </div>
              
              <div className="mb-4">
                <Checkbox
                  label="이용약관에 동의합니다"
                  id="termsAgreed"
                  name="termsAgreed"
                  checked={formData.termsAgreed}
                  onChange={handleChange}
                />
                {errors.termsAgreed && <p className="mt-1 text-sm text-red-600">{errors.termsAgreed}</p>}
              </div>
              
              <div className="mb-4">
                <Checkbox
                  label="마케팅 정보 수신에 동의합니다 (선택)"
                  id="marketingAgreed"
                  name="marketingAgreed"
                  checked={formData.marketingAgreed}
                  onChange={handleChange}
                />
              </div>
            </div>

            <div>
              <Button
                type="submit"
                disabled={isLoading}
                variant="primary"
                size="lg"
                fullWidth
              >
                {isLoading ? '처리 중...' : '회원가입'}
              </Button>
            </div>
          </form>
        </div>
      </div>
    </>
  );
} 