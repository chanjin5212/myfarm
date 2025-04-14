'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';

interface SignupModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function SignupModal({ isOpen, onClose }: SignupModalProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordMatch, setPasswordMatch] = useState<boolean | null>(null);
  const [nickname, setNickname] = useState('');
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [showOtpInput, setShowOtpInput] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [passwordValidation, setPasswordValidation] = useState({
    length: false,
    upperLower: false,
    number: false,
    special: false,
    allValid: false
  });
  const router = useRouter();

  // 비밀번호 일치 여부 즉시 확인
  useEffect(() => {
    if (confirmPassword || password) {
      setPasswordMatch(password === confirmPassword);
    } else {
      setPasswordMatch(null);
    }
  }, [password, confirmPassword]);

  // 비밀번호 정책 검사
  useEffect(() => {
    if (password) {
      // 비밀번호 정책 검사
      const length = password.length >= 8 && password.length <= 16;
      const hasUppercase = /[A-Z]/.test(password);
      const hasLowercase = /[a-z]/.test(password);
      const upperLower = hasUppercase && hasLowercase;
      const number = /[0-9]/.test(password);
      const special = /[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(password);
      const allValid = length && upperLower && number && special;

      setPasswordValidation({
        length,
        upperLower,
        number,
        special,
        allValid
      });
    } else {
      setPasswordValidation({
        length: false,
        upperLower: false,
        number: false,
        special: false,
        allValid: false
      });
    }
  }, [password]);

  if (!isOpen) return null;

  const handleSendOtp = async () => {
    try {
      const { error } = await supabase.auth.signInWithOtp({
        phone,
      });
      if (error) throw error;
      setShowOtpInput(true);
      alert('인증 코드가 전송되었습니다.');
    } catch (error) {
      setError('인증 코드 전송에 실패했습니다.');
      console.error('Error sending OTP:', error);
    }
  };

  const handleVerifyOtp = async () => {
    try {
      const { error } = await supabase.auth.verifyOtp({
        phone,
        token: otp,
        type: 'sms',
      });
      if (error) throw error;
      setShowOtpInput(false);
      alert('휴대폰 인증이 완료되었습니다.');
    } catch (error) {
      setError('인증 코드가 올바르지 않습니다.');
      console.error('Error verifying OTP:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!passwordValidation.allValid) {
      setError('비밀번호는 8~16자의 대소문자, 숫자, 특수문자를 모두 포함해야 합니다.');
      return;
    }

    if (password !== confirmPassword) {
      setError('비밀번호가 일치하지 않습니다.');
      return;
    }

    if (!showOtpInput) {
      setError('휴대폰 인증이 필요합니다.');
      return;
    }

    try {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        phone,
        options: {
          data: {
            nickname
          }
        }
      });

      if (error) throw error;

      onClose();
      alert('회원가입이 완료되었습니다. 이메일을 확인해주세요.');
      router.refresh();
    } catch (error) {
      setError('회원가입에 실패했습니다. 다시 시도해주세요.');
      console.error('Error signing up:', error);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white p-8 rounded-lg w-96 max-h-[90vh] overflow-y-auto">
        <h2 className="text-2xl font-bold mb-6">회원가입</h2>
        {error && (
          <div className="mb-4 p-2 bg-red-100 text-red-700 rounded-md">
            {error}
          </div>
        )}
        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="nickname">
              닉네임
            </label>
            <input
              id="nickname"
              type="text"
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
              className="w-full px-3 py-2 border rounded-md"
              required
            />
          </div>
          
          <div className="mb-4">
            <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="phone">
              휴대폰 번호
            </label>
            <div className="flex space-x-2">
              <input
                id="phone"
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="flex-1 px-3 py-2 border rounded-md"
                placeholder="01012345678"
                required
              />
              <button
                type="button"
                onClick={handleSendOtp}
                className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600"
              >
                인증번호 전송
              </button>
            </div>
          </div>
          {showOtpInput && (
            <div className="mb-4">
              <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="otp">
                인증번호
              </label>
              <div className="flex space-x-2">
                <input
                  id="otp"
                  type="text"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value)}
                  className="flex-1 px-3 py-2 border rounded-md"
                  placeholder="인증번호 6자리"
                  required
                />
                <button
                  type="button"
                  onClick={handleVerifyOtp}
                  className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600"
                >
                  인증번호 확인
                </button>
              </div>
            </div>
          )}
          <div className="mb-4">
            <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="password">
              비밀번호
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="appearance-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm mt-1"
              required
            />
            
            {/* 비밀번호 강도 표시 */}
            {password && (
              <div className="mt-2 space-y-1">
                <div className="flex items-center">
                  <div className={`w-4 h-4 mr-2 rounded-full border flex items-center justify-center ${passwordValidation.length ? 'bg-green-500 border-green-500' : 'bg-white border-gray-300'}`}>
                    {passwordValidation.length && (
                      <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
                      </svg>
                    )}
                  </div>
                  <span className="text-xs text-gray-700">8~16자 길이</span>
                </div>
                <div className="flex items-center">
                  <div className={`w-4 h-4 mr-2 rounded-full border flex items-center justify-center ${passwordValidation.upperLower ? 'bg-green-500 border-green-500' : 'bg-white border-gray-300'}`}>
                    {passwordValidation.upperLower && (
                      <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
                      </svg>
                    )}
                  </div>
                  <span className="text-xs text-gray-700">대문자와 소문자 포함</span>
                </div>
                <div className="flex items-center">
                  <div className={`w-4 h-4 mr-2 rounded-full border flex items-center justify-center ${passwordValidation.number ? 'bg-green-500 border-green-500' : 'bg-white border-gray-300'}`}>
                    {passwordValidation.number && (
                      <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
                      </svg>
                    )}
                  </div>
                  <span className="text-xs text-gray-700">숫자 포함</span>
                </div>
                <div className="flex items-center">
                  <div className={`w-4 h-4 mr-2 rounded-full border flex items-center justify-center ${passwordValidation.special ? 'bg-green-500 border-green-500' : 'bg-white border-gray-300'}`}>
                    {passwordValidation.special && (
                      <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
                      </svg>
                    )}
                  </div>
                  <span className="text-xs text-gray-700">특수문자 포함</span>
                </div>
              </div>
            )}
          </div>
          <div className="mb-4">
            <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="confirmPassword">
              비밀번호 확인
            </label>
            <input
              id="confirmPassword"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className={`appearance-none relative block w-full px-3 py-2 border placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm mt-1 ${
                passwordMatch === null ? 'border-gray-300' : passwordMatch ? 'border-green-500' : 'border-red-500'
              }`}
              required
            />
            {passwordMatch === false && (
              <p className="mt-1 text-xs text-red-600">비밀번호가 일치하지 않습니다</p>
            )}
            {passwordMatch === true && (
              <p className="mt-1 text-xs text-green-600">비밀번호가 일치합니다</p>
            )}
          </div>
          
          <div className="mb-6">
            <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="email">
              이메일
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3 py-2 border rounded-md"
              required
            />
          </div>
          
          <div className="flex justify-between">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-600 hover:text-gray-800"
            >
              취소
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600"
            >
              회원가입
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}