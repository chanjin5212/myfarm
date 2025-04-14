'use client';

import { useState, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button, Input } from '@/components/ui/CommonStyles';

export default function ResetPasswordPage() {
  const router = useRouter();
  const [loginId, setLoginId] = useState('');
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    setMessage(null);
    setIsLoading(true);

    if (!loginId || !email) {
      setError('로그인 아이디와 이메일은 필수입니다.');
      setIsLoading(false);
      return;
    }

    try {
      const response = await fetch('/api/users/reset-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          login_id: loginId,
          email: email,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setMessage('이메일로 비밀번호 재설정 링크가 발송되었습니다. 이메일을 확인해 주세요.');
        // 선택적으로 일정 시간 후 로그인 페이지로 리디렉션
        setTimeout(() => {
          router.push('/auth');
        }, 5000);
      } else {
        setError(data.error || '비밀번호 재설정 이메일을 보내는 중 오류가 발생했습니다.');
      }
    } catch (error) {
      console.error('비밀번호 재설정 요청 오류:', error);
      setError('서버와 통신 중 오류가 발생했습니다. 나중에 다시 시도해 주세요.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8 bg-white p-8 rounded-lg shadow">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            비밀번호 찾기
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            가입 시 등록한 로그인 아이디와 이메일을 입력하세요
          </p>
        </div>
        {error && (
          <div className="rounded-md bg-red-50 p-4">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-red-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-red-800">{error}</h3>
              </div>
            </div>
          </div>
        )}
        {message && (
          <div className="rounded-md bg-green-50 p-4">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-green-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-green-800">{message}</h3>
              </div>
            </div>
          </div>
        )}
        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          <div className="space-y-4">
            <Input
              label="로그인 아이디"
              id="loginId"
              name="loginId"
              type="text"
              required
              value={loginId}
              onChange={(e) => setLoginId(e.target.value)}
              disabled={isLoading}
              placeholder="아이디를 입력하세요"
              fullWidth
            />
            
            <Input
              label="이메일"
              id="email"
              name="email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={isLoading}
              placeholder="가입 시 등록한 이메일을 입력하세요"
              fullWidth
            />
          </div>

          <div>
            <Button
              type="submit"
              variant="primary"
              fullWidth
              size="lg"
              disabled={isLoading}
            >
              {isLoading ? '처리 중...' : '비밀번호 재설정 링크 받기'}
            </Button>
          </div>
          
          <div className="flex items-center justify-between">
            <Link href="/auth" className="text-sm text-green-600 hover:text-green-500">
              로그인으로 돌아가기
            </Link>
            <Link href="/auth/find-id" className="text-sm text-green-600 hover:text-green-500">
              아이디 찾기
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
} 