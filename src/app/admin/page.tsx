'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function AdminIndexPage() {
  const router = useRouter();

  useEffect(() => {
    // 관리자 메인 페이지에 접근하면 대시보드로 리디렉션
    router.push('/admin/login');
  }, [router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <div className="text-center">
        <div className="animate-spin h-10 w-10 border-4 border-indigo-600 rounded-full border-t-transparent mx-auto mb-4"></div>
        <p className="text-gray-600">리디렉션 중...</p>
      </div>
    </div>
  );
} 