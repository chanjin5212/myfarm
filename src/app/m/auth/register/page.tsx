'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { toast, Toaster } from 'react-hot-toast';
import { Spinner } from '@/components/ui/CommonStyles';
import Script from 'next/script';

interface RegisterFormData {
  login_id: string;
  email: string;
  emailId: string;
  emailDomain: string;
  emailVerificationCode: string;
  emailVerified: boolean;
  password: string;
  password_confirm: string;
  name: string;
  nickname: string;
  phoneNumberPrefix: string;
  phoneNumberMiddle: string;
  phoneNumberSuffix: string;
  postcode: string;
  address: string;
  detailAddress: string;
  terms_agreed: boolean;
  marketing_agreed: boolean;
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

export default function MobileRegisterPage() {
  const router = useRouter();
  const [formData, setFormData] = useState<RegisterFormData>({
    login_id: '',
    email: '',
    emailId: '',
    emailDomain: '',
    emailVerificationCode: '',
    emailVerified: false,
    password: '',
    password_confirm: '',
    name: '',
    nickname: '',
    phoneNumberPrefix: '010',
    phoneNumberMiddle: '',
    phoneNumberSuffix: '',
    postcode: '',
    address: '',
    detailAddress: '',
    terms_agreed: false,
    marketing_agreed: false
  });

  const [formErrors, setFormErrors] = useState<Partial<Record<keyof RegisterFormData, string>>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [idChecked, setIdChecked] = useState(false);
  const [sendingVerification, setSendingVerification] = useState(false);
  const [verifyingEmail, setVerifyingEmail] = useState(false);
  const [verificationSent, setVerificationSent] = useState(false);
  const [isCustomDomain, setIsCustomDomain] = useState(false);

  // 비밀번호 유효성 검증 상태
  const [passwordValidation, setPasswordValidation] = useState({
    length: false,
    upperLower: false,
    number: false,
    special: false,
    allValid: false
  });

  // 도메인 직접 입력 모드 확인
  useEffect(() => {
    if (formData.emailDomain === 'custom' || 
        (formData.emailDomain && 
         !['naver.com', 'gmail.com', 'daum.net', 'hanmail.net', 'nate.com'].includes(formData.emailDomain))) {
      setIsCustomDomain(true);
    } else {
      setIsCustomDomain(false);
    }
  }, [formData.emailDomain]);

  // 입력값 변경 처리
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
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
    if (name === 'login_id') {
      setFormData(prev => ({
        ...prev,
        [name]: value,
        loginIdChecked: false
      }));
      setIdChecked(false);
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
      let domain = formData.emailDomain;
      
      // 도메인 선택 처리
      if (name === 'emailDomain') {
        // 직접 입력 선택 시
        if (value === 'custom') {
          domain = '';
          setIsCustomDomain(true);
        } 
        // 도메인 선택 시
        else if (value !== '') {
          domain = value;
          setIsCustomDomain(false);
        }
        // 선택 안함
        else {
          domain = '';
          setIsCustomDomain(false);
        }
      }
      
      // 이메일 값 조합
      const fullEmail = id && domain ? `${id}@${domain}` : '';
      
      setFormData(prev => ({
        ...prev,
        emailId: id,
        emailDomain: domain,
        email: fullEmail,
        emailVerified: false
      }));
      setVerificationSent(false);
      return;
    }
    
    // 이메일이 변경되면 인증 상태 초기화
    if (name === 'email') {
      setVerificationSent(false);
      setFormData(prev => ({ 
        ...prev, 
        [name]: value,
        emailVerified: false 
      }));
      return;
    }
    
    // 일반 필드 처리
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    
    // 오류 메시지 초기화
    if (formErrors[name as keyof RegisterFormData]) {
      setFormErrors(prev => ({
        ...prev,
        [name]: undefined
      }));
    }
  };

  // 비밀번호 변경 처리 및 유효성 검사
  useEffect(() => {
    const password = formData.password;
    
    // 8~16자 길이 검사
    const lengthValid = password.length >= 8 && password.length <= 16;
    
    // 대문자, 소문자 포함 검사
    const upperLowerValid = /[a-z]/.test(password) && /[A-Z]/.test(password);
    
    // 숫자 포함 검사
    const numberValid = /[0-9]/.test(password);
    
    // 특수문자 포함 검사
    const specialValid = /[!@#$%^&*(),.?":{}|<>]/.test(password);
    
    // 모든 조건 충족 여부
    const allValid = lengthValid && upperLowerValid && numberValid && specialValid;
    
    setPasswordValidation({
      length: lengthValid,
      upperLower: upperLowerValid,
      number: numberValid,
      special: specialValid,
      allValid
    });
    
  }, [formData.password]);

  // 전체 전화번호 조합
  const getFullPhoneNumber = () => {
    const { phoneNumberPrefix, phoneNumberMiddle, phoneNumberSuffix } = formData;
    if (phoneNumberPrefix && phoneNumberMiddle && phoneNumberSuffix) {
      return `${phoneNumberPrefix}-${phoneNumberMiddle}-${phoneNumberSuffix}`;
    }
    return '';
  };

  // 아이디 중복 확인
  const checkDuplicateId = async () => {
    if (!formData.login_id) {
      setFormErrors(prev => ({
        ...prev,
        login_id: '아이디를 입력해주세요.'
      }));
      return;
    }

    // 아이디 유효성 검사 (영문, 숫자 조합 4~12자)
    if (!/^[a-zA-Z0-9]{4,12}$/.test(formData.login_id)) {
      setFormErrors(prev => ({
        ...prev,
        login_id: '아이디는 영문, 숫자 조합 4~12자로 입력해주세요.'
      }));
      return;
    }

    setIsLoading(true);
    
    try {
      const response = await fetch(`/api/users/check-duplicate?login_id=${formData.login_id}`);
      const data = await response.json();
      
      if (data.exists) {
        setFormErrors(prev => ({
          ...prev,
          login_id: '이미 사용 중인 아이디입니다.'
        }));
      } else {
        setIdChecked(true);
        toast.success('사용 가능한 아이디입니다.');
      }
    } catch (error) {
      console.error('아이디 중복 확인 오류:', error);
      toast.error('아이디 중복 확인 중 오류가 발생했습니다.');
    } finally {
      setIsLoading(false);
    }
  };

  // 이메일 인증코드 발송
  const handleSendVerification = async () => {
    if (!formData.emailId) {
      setFormErrors(prev => ({
        ...prev,
        email: '이메일 아이디를 입력해주세요.'
      }));
      return;
    }

    if (!formData.emailDomain) {
      setFormErrors(prev => ({
        ...prev,
        email: '이메일 도메인을 입력해주세요.'
      }));
      return;
    }

    // 이메일 유효성 검사
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      setFormErrors(prev => ({
        ...prev,
        email: '유효한 이메일 주소를 입력해주세요.'
      }));
      return;
    }

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
      
      // 응답 처리 로직
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
            toast.error(errorMsg);
          } else {
            toast.success(`인증 코드가 이메일로 발송되었습니다. (개발 환경: ${data.code})`);
          }
        } else {
          toast.success('인증 코드가 이메일로 발송되었습니다. 이메일을 확인해주세요.');
        }
      } else {
        // API 오류 발생
        const errorMessage = data.error || '인증 코드 발송 중 오류가 발생했습니다';
        
        setFormErrors(prev => ({
          ...prev,
          email: errorMessage
        }));
        toast.error(`이메일 발송 실패: ${errorMessage}`);
      }
    } catch (error: any) {
      console.error('이메일 발송 오류:', error);
      const errorMessage = error.message || '서버 연결 중 오류가 발생했습니다';
      setFormErrors(prev => ({
        ...prev,
        email: errorMessage
      }));
      toast.error(`이메일 발송 오류: ${errorMessage}`);
    } finally {
      setSendingVerification(false);
    }
  };

  // 이메일 인증코드 확인
  const handleVerifyEmail = async () => {
    // 인증 코드 유효성 검사
    if (!formData.emailVerificationCode) {
      setFormErrors(prev => ({
        ...prev,
        emailVerificationCode: '인증 코드를 입력해주세요'
      }));
      return;
    }
    
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
      
      if (response.ok && data.verified) {
        // 인증 성공
        setFormData(prev => ({
          ...prev,
          emailVerified: true
        }));
        toast.success('이메일 인증이 완료되었습니다.');
      } else {
        // 인증 실패
        const errorMessage = data.error || '유효하지 않은 인증 코드입니다';
        setFormErrors(prev => ({
          ...prev,
          emailVerificationCode: errorMessage
        }));
        toast.error(`인증 실패: ${errorMessage}`);
      }
    } catch (error: any) {
      console.error('이메일 인증 중 오류:', error);
      const errorMessage = error.message || '서버 연결 중 오류가 발생했습니다';
      setFormErrors(prev => ({
        ...prev,
        emailVerificationCode: errorMessage
      }));
      toast.error(`인증 오류: ${errorMessage}`);
    } finally {
      setVerifyingEmail(false);
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
      toast.error('주소 검색 서비스를 불러오는 중입니다. 잠시 후 다시 시도해주세요.');
    }
  };

  // 폼 유효성 검사
  const validateForm = (): boolean => {
    const errors: Partial<Record<keyof RegisterFormData, string>> = {};
    
    // 아이디 중복 확인 여부
    if (!idChecked) {
      errors.login_id = '아이디 중복 확인이 필요합니다.';
    }
    
    // 이메일 인증 여부
    if (!formData.emailVerified) {
      errors.email = '이메일 인증이 필요합니다.';
    }
    
    // 비밀번호 유효성
    if (!passwordValidation.allValid) {
      errors.password = '비밀번호가 모든 요구 조건을 충족해야 합니다.';
    }
    
    // 비밀번호 확인
    if (formData.password !== formData.password_confirm) {
      errors.password_confirm = '비밀번호가 일치하지 않습니다.';
    }
    
    // 이름 검사
    if (!formData.name) {
      errors.name = '이름을 입력해주세요.';
    }
    
    // 닉네임 검사
    if (!formData.nickname) {
      errors.nickname = '닉네임을 입력해주세요.';
    }
    
    // 전화번호 유효성 검사
    if (!formData.phoneNumberMiddle) {
      errors.phoneNumberMiddle = '번호 중간 자리를 입력해주세요.';
    } else if (formData.phoneNumberMiddle.length !== 4) {
      errors.phoneNumberMiddle = '번호 중간 자리는 4자리여야 합니다.';
    }
    
    if (!formData.phoneNumberSuffix) {
      errors.phoneNumberSuffix = '번호 끝 자리를 입력해주세요.';
    } else if (formData.phoneNumberSuffix.length !== 4) {
      errors.phoneNumberSuffix = '번호 끝 자리는 4자리여야 합니다.';
    }
    
    // 주소 검증
    if (!formData.postcode || !formData.address) {
      errors.address = '주소를 검색해주세요.';
    }
    
    // 이용약관 동의
    if (!formData.terms_agreed) {
      errors.terms_agreed = '서비스 이용약관에 동의해주세요.';
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // 폼 제출
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // 유효성 검사
    if (!validateForm()) {
      toast.error('입력 정보를 다시 확인해주세요.');
      return;
    }
    
    setIsLoading(true);
    
    // 전체 전화번호 생성
    const fullPhoneNumber = getFullPhoneNumber();
    
    try {
      const response = await fetch('/api/users', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          login_id: formData.login_id,
          email: formData.email,
          password: formData.password,
          name: formData.name,
          nickname: formData.nickname,
          phone_number: fullPhoneNumber,
          terms_agreed: formData.terms_agreed,
          marketing_agreed: formData.marketing_agreed,
          postcode: formData.postcode,
          address: formData.address,
          detail_address: formData.detailAddress,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }),
      });
      
      const data = await response.json();
      
      if (data.success) {
        toast.success('회원가입이 완료되었습니다.');
        router.push('/m/auth');
      } else {
        toast.error(data.error || '회원가입 중 오류가 발생했습니다.');
      }
    } catch (error: any) {
      console.error('회원가입 오류:', error);
      toast.error(error.message || '회원가입 중 오류가 발생했습니다.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoBack = () => {
    router.push('/m/auth');
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
              onClick={handleGoBack}
              className="p-1 mr-2"
              aria-label="뒤로 가기"
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
                <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
              </svg>
            </button>
            <h1 className="text-xl font-bold">회원가입</h1>
          </div>
        </div>
        
        {/* 폼 */}
        <div className="pt-16 px-4">
          <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow p-5">
            <div className="space-y-5">
              {/* 아이디 */}
              <div>
                <label htmlFor="login_id" className="block text-sm font-medium text-gray-700 mb-1">
                  아이디 *
                </label>
                <div className="flex">
                  <input
                    type="text"
                    id="login_id"
                    name="login_id"
                    value={formData.login_id}
                    onChange={handleChange}
                    className={`flex-1 rounded-l-md p-2.5 border ${formErrors.login_id ? 'border-red-500' : 'border-gray-300'} focus:ring-green-500 focus:border-green-500`}
                    placeholder="영문, 숫자 조합 4~12자"
                    disabled={idChecked || isLoading}
                  />
                  <button
                    type="button"
                    onClick={checkDuplicateId}
                    disabled={isLoading || idChecked}
                    className={`rounded-r-md px-4 py-2.5 font-medium text-sm ${
                      idChecked
                        ? 'bg-green-100 text-green-800'
                        : 'bg-gray-600 text-white hover:bg-gray-700'
                    }`}
                  >
                    {idChecked ? '확인완료' : '중복확인'}
                  </button>
                </div>
                {formErrors.login_id && (
                  <p className="mt-1 text-sm text-red-600">{formErrors.login_id}</p>
                )}
              </div>
              
              {/* 이메일 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  <span className="text-red-500">*</span> 이메일
                </label>
                <div className="flex items-center space-x-1">
                  <input
                    type="text"
                    name="emailId"
                    value={formData.emailId}
                    onChange={handleChange}
                    className="px-3 py-2 border rounded-md border-gray-300 focus:ring-green-500 focus:border-green-500 w-[47%]"
                    placeholder="이메일 아이디"
                    disabled={formData.emailVerified}
                  />
                  <span className="text-gray-500 shrink-0 mx-1">@</span>
                  <select
                    name="emailDomain"
                    value={formData.emailDomain || (isCustomDomain ? 'custom' : '')}
                    onChange={handleChange}
                    className="px-3 py-2 border rounded-md border-gray-300 focus:ring-green-500 focus:border-green-500 w-[47%]"
                    disabled={formData.emailVerified}
                  >
                    <option value="">선택</option>
                    <option value="custom">직접입력</option>
                    <option value="naver.com">naver.com</option>
                    <option value="gmail.com">gmail.com</option>
                    <option value="daum.net">daum.net</option>
                    <option value="hanmail.net">hanmail.net</option>
                    <option value="nate.com">nate.com</option>
                  </select>
                </div>
                {isCustomDomain && (
                  <input
                    type="text"
                    name="emailDomain"
                    value={formData.emailDomain}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border rounded-md mt-2 border-gray-300 focus:ring-green-500 focus:border-green-500"
                    placeholder="도메인 입력 (예: gmail.com)"
                    disabled={formData.emailVerified}
                  />
                )}
                {formErrors.email && (
                  <p className="mt-1 text-sm text-red-600">{formErrors.email}</p>
                )}
              </div>
              
              {/* 이메일 인증 코드 */}
              <div>
                <div className="flex items-end space-x-2">
                  <div className="flex-1">
                    <label htmlFor="emailVerificationCode" className="block text-sm font-medium text-gray-700 mb-1">
                      이메일 인증 코드 *
                    </label>
                    <input
                      type="text"
                      id="emailVerificationCode"
                      name="emailVerificationCode"
                      value={formData.emailVerificationCode}
                      onChange={handleChange}
                      className={`w-full rounded-md p-2.5 border ${formErrors.emailVerificationCode ? 'border-red-500' : 'border-gray-300'} focus:ring-green-500 focus:border-green-500`}
                      placeholder="인증 코드 입력"
                      disabled={!verificationSent || formData.emailVerified}
                    />
                  </div>
                  {!verificationSent ? (
                    <button
                      type="button"
                      onClick={handleSendVerification}
                      disabled={sendingVerification || !formData.email || formData.emailVerified}
                      className="rounded-md px-4 py-2.5 font-medium text-sm bg-gray-600 text-white hover:bg-gray-700 disabled:bg-gray-300"
                    >
                      {sendingVerification ? '전송 중...' : '인증코드 전송'}
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={handleVerifyEmail}
                      disabled={verifyingEmail || !formData.emailVerificationCode || formData.emailVerified}
                      className={`rounded-md px-4 py-2.5 font-medium text-sm ${
                        formData.emailVerified
                          ? 'bg-green-100 text-green-800'
                          : 'bg-gray-600 text-white hover:bg-gray-700'
                      }`}
                    >
                      {verifyingEmail ? '확인 중...' : formData.emailVerified ? '인증 완료' : '인증 확인'}
                    </button>
                  )}
                </div>
                {formErrors.emailVerificationCode && (
                  <p className="mt-1 text-sm text-red-600">{formErrors.emailVerificationCode}</p>
                )}
              </div>
              
              {/* 비밀번호 */}
              <div>
                <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
                  비밀번호 *
                </label>
                <input
                  type="password"
                  id="password"
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  className={`w-full rounded-md p-2.5 border ${formErrors.password ? 'border-red-500' : 'border-gray-300'} focus:ring-green-500 focus:border-green-500`}
                  placeholder="비밀번호를 입력하세요"
                />
                
                {/* 비밀번호 요구사항 표시 */}
                <div className="mt-2 space-y-1">
                  <p className={`text-xs ${passwordValidation.length ? 'text-green-600' : 'text-gray-500'}`}>
                    ✓ 8~16자 길이
                  </p>
                  <p className={`text-xs ${passwordValidation.upperLower ? 'text-green-600' : 'text-gray-500'}`}>
                    ✓ 대문자, 소문자 포함
                  </p>
                  <p className={`text-xs ${passwordValidation.number ? 'text-green-600' : 'text-gray-500'}`}>
                    ✓ 숫자 포함
                  </p>
                  <p className={`text-xs ${passwordValidation.special ? 'text-green-600' : 'text-gray-500'}`}>
                    ✓ 특수문자 포함
                  </p>
                </div>
                
                {formErrors.password && (
                  <p className="mt-1 text-sm text-red-600">{formErrors.password}</p>
                )}
              </div>
              
              {/* 비밀번호 확인 */}
              <div>
                <label htmlFor="password_confirm" className="block text-sm font-medium text-gray-700 mb-1">
                  비밀번호 확인 *
                </label>
                <input
                  type="password"
                  id="password_confirm"
                  name="password_confirm"
                  value={formData.password_confirm}
                  onChange={handleChange}
                  className={`w-full rounded-md p-2.5 border ${formErrors.password_confirm ? 'border-red-500' : 'border-gray-300'} focus:ring-green-500 focus:border-green-500`}
                  placeholder="비밀번호를 다시 입력하세요"
                />
                {formData.password_confirm && formData.password !== formData.password_confirm && (
                  <p className="mt-1 text-sm text-red-600">비밀번호가 일치하지 않습니다.</p>
                )}
              </div>
              
              {/* 이름 */}
              <div>
                <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
                  이름 *
                </label>
                <input
                  type="text"
                  id="name"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  className={`w-full rounded-md p-2.5 border ${formErrors.name ? 'border-red-500' : 'border-gray-300'} focus:ring-green-500 focus:border-green-500`}
                  placeholder="실명을 입력하세요"
                />
                {formErrors.name && (
                  <p className="mt-1 text-sm text-red-600">{formErrors.name}</p>
                )}
              </div>
              
              {/* 닉네임 */}
              <div>
                <label htmlFor="nickname" className="block text-sm font-medium text-gray-700 mb-1">
                  닉네임 *
                </label>
                <input
                  type="text"
                  id="nickname"
                  name="nickname"
                  value={formData.nickname}
                  onChange={handleChange}
                  className={`w-full rounded-md p-2.5 border ${formErrors.nickname ? 'border-red-500' : 'border-gray-300'} focus:ring-green-500 focus:border-green-500`}
                  placeholder="커뮤니티에서 사용할 닉네임"
                />
                {formErrors.nickname && (
                  <p className="mt-1 text-sm text-red-600">{formErrors.nickname}</p>
                )}
              </div>
              
              {/* 전화번호 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  휴대폰 번호 *
                </label>
                <div className="flex space-x-2">
                  <select
                    id="phoneNumberPrefix"
                    name="phoneNumberPrefix"
                    value={formData.phoneNumberPrefix}
                    onChange={handleChange}
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
                    value={formData.phoneNumberMiddle}
                    onChange={handleChange}
                    className="w-1/3 rounded-md p-2.5 border border-gray-300 focus:ring-green-500 focus:border-green-500"
                  />
                  <input
                    id="phoneNumberSuffix"
                    name="phoneNumberSuffix"
                    type="text"
                    inputMode="numeric"
                    maxLength={4}
                    placeholder="0000"
                    value={formData.phoneNumberSuffix}
                    onChange={handleChange}
                    className="w-1/3 rounded-md p-2.5 border border-gray-300 focus:ring-green-500 focus:border-green-500"
                  />
                </div>
                {(formErrors.phoneNumberPrefix || formErrors.phoneNumberMiddle || formErrors.phoneNumberSuffix) && (
                  <p className="mt-1 text-sm text-red-600">
                    {formErrors.phoneNumberPrefix || formErrors.phoneNumberMiddle || formErrors.phoneNumberSuffix}
                  </p>
                )}
              </div>
              
              {/* 주소 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  주소 *
                </label>
                <div className="flex space-x-2 mb-2">
                  <input
                    id="postcode"
                    name="postcode"
                    type="text"
                    className="w-2/5 rounded-l-md p-2.5 border border-gray-300 focus:ring-green-500 focus:border-green-500"
                    placeholder="우편번호"
                    value={formData.postcode}
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
                  className="w-full rounded-md p-2.5 border border-gray-300 focus:ring-green-500 focus:border-green-500 mb-2"
                  placeholder="기본주소"
                  value={formData.address}
                  readOnly
                />
                <input
                  id="detailAddress"
                  name="detailAddress"
                  type="text"
                  className="w-full rounded-md p-2.5 border border-gray-300 focus:ring-green-500 focus:border-green-500"
                  placeholder="상세주소"
                  value={formData.detailAddress}
                  onChange={handleChange}
                />
                {formErrors.address && (
                  <p className="mt-1 text-sm text-red-600">{formErrors.address}</p>
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
                      checked={formData.terms_agreed}
                      onChange={handleChange}
                      className="h-4 w-4 text-green-600 border-gray-300 rounded focus:ring-green-500"
                    />
                  </div>
                  <div className="ml-3 text-sm">
                    <label htmlFor="terms_agreed" className="font-medium text-gray-700">
                      서비스 이용약관 동의 (필수) *
                    </label>
                    <p className="text-gray-500">회원가입을 위해 서비스 이용약관에 동의해야 합니다.</p>
                  </div>
                </div>
                {formErrors.terms_agreed && (
                  <p className="text-sm text-red-600">{formErrors.terms_agreed}</p>
                )}
                
                <div className="flex items-start">
                  <div className="flex items-center h-5">
                    <input
                      id="marketing_agreed"
                      name="marketing_agreed"
                      type="checkbox"
                      checked={formData.marketing_agreed}
                      onChange={handleChange}
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
            </div>
            
            <div className="mt-8">
              <button
                type="submit"
                disabled={isLoading}
                className="w-full bg-green-600 hover:bg-green-700 text-white py-3 px-4 rounded-md font-medium focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 flex justify-center items-center"
              >
                {isLoading ? <Spinner size="sm" /> : '회원가입'}
              </button>
            </div>
          </form>
          
          <div className="mt-4 text-center">
            <button
              type="button"
              onClick={() => router.push('/m/auth')}
              className="text-sm text-green-600 hover:text-green-500"
            >
              이미 계정이 있으신가요? 로그인하기
            </button>
          </div>
        </div>
      </div>
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