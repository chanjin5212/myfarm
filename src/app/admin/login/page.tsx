'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import { Card, Input, Button } from '@/components/ui/CommonStyles';

export default function AdminLoginPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    login_id: '',
    password: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const response = await fetch('/api/admin/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || '로그인 실패');
      }

      const data = await response.json();
      localStorage.setItem('adminToken', data.token);
      toast.success('관리자 로그인 성공');
      router.push('/admin/dashboard');
    } catch (error) {
      console.error('로그인 오류:', error);
      toast.error(error instanceof Error ? error.message : '아이디 또는 비밀번호가 올바르지 않습니다');
    } finally {
      setIsLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 p-4">
      <Card className="w-full max-w-md">
        <div className="p-6">
          <h2 className="text-center text-2xl font-bold text-gray-900 mb-8">
            관리자 로그인
          </h2>
          
          <form onSubmit={handleSubmit} className="space-y-6">
            <Input
              label="관리자 아이디"
              id="login_id"
              name="login_id"
              type="text"
              required
              placeholder="아이디 입력"
              value={formData.login_id}
              onChange={handleChange}
            />

            <Input
              label="비밀번호"
              id="password"
              name="password"
              type="password"
              required
              placeholder="비밀번호 입력"
              value={formData.password}
              onChange={handleChange}
            />
            
            <Button
              type="submit"
              disabled={isLoading}
              fullWidth
            >
              {isLoading ? '로그인 중...' : '로그인'}
            </Button>
          </form>
          
          <div className="mt-6 text-center">
            <p className="text-xs text-gray-500">
              관리자 전용 페이지입니다. 일반 사용자는 접근할 수 없습니다.
            </p>
          </div>
        </div>
      </Card>
    </div>
  );
} 