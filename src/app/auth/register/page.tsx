'use client';

import { useState, ChangeEvent, FormEvent, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

interface FormData {
  loginId: string;
  email: string;
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
    loginIdChecked: false
  });
  const [errors, setErrors] = useState<FormErrors>({});
  const [isLoading, setIsLoading] = useState(false);
  const [sendingCode, setSendingCode] = useState(false);
  const [verifyingCode, setVerifyingCode] = useState(false);
  const [codeSent, setCodeSent] = useState(false);
  const [checkingId, setCheckingId] = useState(false);
  const [passwordValidation, setPasswordValidation] = useState<PasswordValidation>({
    length: false,
    upperLower: false,
    number: false,
    special: false,
    allValid: false
  });
  const [passwordMatch, setPasswordMatch] = useState<boolean | null>(null);

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

  const handleSendVerificationCode = async () => {
    // 전화번호 유효성 검사
    const { phoneNumberMiddle, phoneNumberSuffix } = formData;
    
    if (!phoneNumberMiddle || phoneNumberMiddle.length !== 4) {
      setErrors(prev => ({
        ...prev,
        phoneNumberMiddle: '4자리 숫자를 입력해주세요'
      }));
      return;
    }
    
    if (!phoneNumberSuffix || phoneNumberSuffix.length !== 4) {
      setErrors(prev => ({
        ...prev,
        phoneNumberSuffix: '4자리 숫자를 입력해주세요'
      }));
      return;
    }

    // 에러 초기화
    setErrors(prev => ({ 
      ...prev, 
      phoneNumberPrefix: undefined,
      phoneNumberMiddle: undefined,
      phoneNumberSuffix: undefined
    }));
    
    // UI 상태 업데이트만 수행
    setSendingCode(true);
    setTimeout(() => {
      setSendingCode(false);
      setCodeSent(true);
      alert('인증 기능이 일시적으로 비활성화되었습니다.');
    }, 1000);
  };

  const handleVerifyCode = async () => {
    if (!formData.phoneVerificationCode) {
      setErrors(prev => ({
        ...prev,
        phoneVerificationCode: '인증번호를 입력해주세요'
      }));
      return;
    }

    setErrors(prev => ({ ...prev, phoneVerificationCode: undefined }));
    
    // UI 상태 업데이트만 수행
    setVerifyingCode(true);
    setTimeout(() => {
      setVerifyingCode(false);
      alert('인증 기능이 일시적으로 비활성화되었습니다.');
    }, 1000);
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

  const validateForm = () => {
    const newErrors: FormErrors = {};
    
    // 로그인 아이디 검증
    if (!formData.loginId) newErrors.loginId = '로그인 아이디를 입력해주세요';
    else if (formData.loginId.length < 4) newErrors.loginId = '아이디는 4자 이상이어야 합니다';
    else if (!formData.loginIdChecked) newErrors.loginId = '아이디 중복 확인을 해주세요';
    
    // 이메일 검증
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!formData.email) newErrors.email = '이메일을 입력해주세요';
    else if (!emailRegex.test(formData.email)) newErrors.email = '유효한 이메일 형식이 아닙니다';
    
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
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8 bg-white p-8 rounded-lg shadow">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            회원가입
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            이미 계정이 있으신가요?{' '}
            <Link href="/auth" className="font-medium text-blue-600 hover:text-blue-500">
              로그인하기
            </Link>
          </p>
        </div>
        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          <div className="rounded-md shadow-sm -space-y-px">
            <div className="mb-4">
              <label htmlFor="loginId" className="block text-sm font-medium text-gray-700 mb-1">
                로그인 아이디
              </label>
              <div className="flex space-x-2">
                <input
                  id="loginId"
                  name="loginId"
                  type="text"
                  autoComplete="username"
                  required
                  className={`appearance-none relative block w-full px-3 py-2 border ${
                    errors.loginId ? 'border-red-300' : 
                    formData.loginIdChecked ? 'border-green-500' : 'border-gray-300'
                  } placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm`}
                  placeholder="로그인 아이디 (4자 이상)"
                  value={formData.loginId}
                  onChange={handleChange}
                />
                <button
                  type="button"
                  onClick={handleCheckLoginId}
                  disabled={checkingId || formData.loginId.length < 4}
                  className={`whitespace-nowrap px-3 py-2 border border-transparent text-sm font-medium rounded-md text-white ${
                    formData.loginIdChecked ? 'bg-green-600 hover:bg-green-700' : 'bg-blue-600 hover:bg-blue-700'
                  } focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50`}
                >
                  {checkingId ? '확인 중...' : formData.loginIdChecked ? '확인 완료' : '중복 확인'}
                </button>
              </div>
              {errors.loginId && <p className="mt-1 text-sm text-red-600">{errors.loginId}</p>}
              {formData.loginIdChecked && !errors.loginId && (
                <p className="mt-1 text-sm text-green-600">사용 가능한 아이디입니다</p>
              )}
            </div>
            
            <div className="mb-4">
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
                비밀번호
              </label>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="new-password"
                required
                className={`appearance-none relative block w-full px-3 py-2 border ${
                  errors.password ? 'border-red-300' : 
                  formData.password && formData.confirmPassword && passwordMatch === true ? 'border-green-500' : 
                  formData.password && formData.confirmPassword && passwordMatch === false ? 'border-red-500' : 
                  'border-gray-300'
                } placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm`}
                placeholder="비밀번호 (8~16자, 대/소문자, 숫자, 특수문자 포함)"
                value={formData.password}
                onChange={handleChange}
              />
              {errors.password && <p className="mt-1 text-sm text-red-600">{errors.password}</p>}
              
              {formData.password.length > 0 && (
                <div className="mt-2 text-xs space-y-1">
                  <p className={`flex items-center ${passwordValidation.length ? 'text-green-600' : 'text-red-600'}`}>
                    <span className="mr-1">{passwordValidation.length ? '✓' : '✗'}</span>
                    8~16자 길이
                  </p>
                  <p className={`flex items-center ${passwordValidation.upperLower ? 'text-green-600' : 'text-red-600'}`}>
                    <span className="mr-1">{passwordValidation.upperLower ? '✓' : '✗'}</span>
                    대문자와 소문자 포함
                  </p>
                  <p className={`flex items-center ${passwordValidation.number ? 'text-green-600' : 'text-red-600'}`}>
                    <span className="mr-1">{passwordValidation.number ? '✓' : '✗'}</span>
                    숫자 포함
                  </p>
                  <p className={`flex items-center ${passwordValidation.special ? 'text-green-600' : 'text-red-600'}`}>
                    <span className="mr-1">{passwordValidation.special ? '✓' : '✗'}</span>
                    특수문자 포함
                  </p>
                </div>
              )}
            </div>
            
            <div className="mb-4">
              <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-1">
                비밀번호 확인
              </label>
              <input
                id="confirmPassword"
                name="confirmPassword"
                type="password"
                autoComplete="new-password"
                required
                className={`appearance-none relative block w-full px-3 py-2 border ${
                  errors.confirmPassword ? 'border-red-300' : 
                  formData.confirmPassword && passwordMatch === true ? 'border-green-500' : 
                  formData.confirmPassword && passwordMatch === false ? 'border-red-500' : 
                  'border-gray-300'
                } placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm`}
                placeholder="비밀번호 확인"
                value={formData.confirmPassword}
                onChange={handleChange}
              />
              {errors.confirmPassword && <p className="mt-1 text-sm text-red-600">{errors.confirmPassword}</p>}
              {formData.confirmPassword && passwordMatch === false && !errors.confirmPassword && (
                <p className="mt-1 text-sm text-red-600">비밀번호가 일치하지 않습니다</p>
              )}
              {formData.confirmPassword && passwordMatch === true && (
                <p className="mt-1 text-sm text-green-600">비밀번호가 일치합니다</p>
              )}
            </div>
            
            <div className="mb-4">
              <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
                이름
              </label>
              <input
                id="name"
                name="name"
                type="text"
                autoComplete="name"
                required
                className={`appearance-none relative block w-full px-3 py-2 border ${
                  errors.name ? 'border-red-300' : 'border-gray-300'
                } placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm`}
                placeholder="이름"
                value={formData.name}
                onChange={handleChange}
              />
              {errors.name && <p className="mt-1 text-sm text-red-600">{errors.name}</p>}
            </div>
            
            <div className="mb-4">
              <label htmlFor="nickname" className="block text-sm font-medium text-gray-700 mb-1">
                닉네임
              </label>
              <input
                id="nickname"
                name="nickname"
                type="text"
                autoComplete="nickname"
                required
                className={`appearance-none relative block w-full px-3 py-2 border ${
                  errors.nickname ? 'border-red-300' : 'border-gray-300'
                } placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm`}
                placeholder="닉네임"
                value={formData.nickname}
                onChange={handleChange}
              />
              {errors.nickname && <p className="mt-1 text-sm text-red-600">{errors.nickname}</p>}
            </div>

            <div className="mb-4">
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                이메일
              </label>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                className={`appearance-none relative block w-full px-3 py-2 border ${
                  errors.email ? 'border-red-300' : 'border-gray-300'
                } placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm`}
                placeholder="이메일 주소"
                value={formData.email}
                onChange={handleChange}
              />
              {errors.email && <p className="mt-1 text-sm text-red-600">{errors.email}</p>}
            </div>
            
            <div>
              <label htmlFor="phoneNumber" className="block text-sm font-medium text-gray-700 mb-1">
                휴대폰 번호
              </label>
              <div className="flex space-x-2">
                <div className="w-1/4">
                  <select
                    name="phoneNumberPrefix"
                    value={formData.phoneNumberPrefix}
                    onChange={handleChange}
                    className="appearance-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  >
                    <option value="010">010</option>
                    <option value="011">011</option>
                    <option value="016">016</option>
                    <option value="017">017</option>
                    <option value="018">018</option>
                    <option value="019">019</option>
                  </select>
                  {errors.phoneNumberPrefix && (
                    <p className="mt-1 text-xs text-red-600">{errors.phoneNumberPrefix}</p>
                  )}
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
                    className="appearance-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  />
                  {errors.phoneNumberMiddle && (
                    <p className="mt-1 text-xs text-red-600">{errors.phoneNumberMiddle}</p>
                  )}
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
                    className="appearance-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  />
                  {errors.phoneNumberSuffix && (
                    <p className="mt-1 text-xs text-red-600">{errors.phoneNumberSuffix}</p>
                  )}
                </div>
              </div>
              <div className="mt-2 flex space-x-2">
                <button
                  type="button"
                  onClick={handleSendVerificationCode}
                  disabled={sendingCode || codeSent}
                  className={`px-3 py-2 border border-transparent text-sm font-medium rounded-md text-white ${
                    codeSent
                      ? 'bg-green-600 hover:bg-green-700'
                      : 'bg-blue-600 hover:bg-blue-700'
                  } focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50`}
                >
                  {sendingCode
                    ? '전송 중...'
                    : codeSent
                    ? '인증번호 발송됨'
                    : '인증번호 받기'}
                </button>
                {codeSent && (
                  <div className="flex-1">
                    <div className="flex space-x-2">
                      <input
                        id="phoneVerificationCode"
                        name="phoneVerificationCode"
                        type="text"
                        placeholder="인증번호 입력"
                        value={formData.phoneVerificationCode}
                        onChange={handleChange}
                        className="appearance-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                      />
                      <button
                        type="button"
                        onClick={handleVerifyCode}
                        disabled={verifyingCode || formData.phoneVerified}
                        className={`whitespace-nowrap px-3 py-2 border border-transparent text-sm font-medium rounded-md text-white ${
                          formData.phoneVerified
                            ? 'bg-green-600 hover:bg-green-700'
                            : 'bg-blue-600 hover:bg-blue-700'
                        } focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50`}
                      >
                        {verifyingCode
                          ? '확인 중...'
                          : formData.phoneVerified
                          ? '인증됨'
                          : '확인'}
                      </button>
                    </div>
                    {errors.phoneVerificationCode && (
                      <p className="mt-1 text-xs text-red-600">{errors.phoneVerificationCode}</p>
                    )}
                  </div>
                )}
              </div>
            </div>
            
            <div className="mb-4">
              <div className="flex items-center">
                <input
                  id="termsAgreed"
                  name="termsAgreed"
                  type="checkbox"
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  checked={formData.termsAgreed}
                  onChange={handleChange}
                />
                <label htmlFor="termsAgreed" className="ml-2 block text-sm text-gray-900">
                  이용약관에 동의합니다
                </label>
              </div>
              {errors.termsAgreed && <p className="mt-1 text-sm text-red-600">{errors.termsAgreed}</p>}
            </div>
            
            <div className="mb-4">
              <div className="flex items-center">
                <input
                  id="marketingAgreed"
                  name="marketingAgreed"
                  type="checkbox"
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  checked={formData.marketingAgreed}
                  onChange={handleChange}
                />
                <label htmlFor="marketingAgreed" className="ml-2 block text-sm text-gray-900">
                  마케팅 정보 수신에 동의합니다 (선택)
                </label>
              </div>
            </div>
          </div>

          <div>
            <button
              type="submit"
              disabled={isLoading}
              className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
            >
              {isLoading ? '처리 중...' : '회원가입'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
} 