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
  const router = useRouter();

  // 비밀번호 일치 여부 즉시 확인
  useEffect(() => {
    if (confirmPassword || password) {
      setPasswordMatch(password === confirmPassword);
    } else {
      setPasswordMatch(null);
    }
  }, [password, confirmPassword]);

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
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center">
      <div className="bg-white p-8 rounded-lg w-96">
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
              className={`w-full px-3 py-2 border rounded-md ${
                password && confirmPassword && passwordMatch === true ? 'border-green-500' : 
                password && confirmPassword && passwordMatch === false ? 'border-red-500' : ''
              }`}
              required
            />
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
              className={`w-full px-3 py-2 border rounded-md ${
                passwordMatch === true ? 'border-green-500' : 
                passwordMatch === false ? 'border-red-500' : ''
              }`}
              required
            />
            {passwordMatch === false && (
              <p className="mt-1 text-sm text-red-600">비밀번호가 일치하지 않습니다</p>
            )}
            {passwordMatch === true && (
              <p className="mt-1 text-sm text-green-600">비밀번호가 일치합니다</p>
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