'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function ResetPasswordPage() {
  const router = useRouter();
  
  useEffect(() => {
    // 비밀번호 재설정 페이지로 리다이렉션
    router.replace('/auth/reset-password');
  }, [router]);
  
  // 리다이렉션 중 표시할 UI
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full p-8 bg-white rounded-lg shadow text-center">
        <p className="text-gray-600">비밀번호 재설정 페이지로 이동 중...</p>
      </div>
    </div>
  );
} 