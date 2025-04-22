'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button, Spinner } from '@/components/ui/CommonStyles';
import toast from 'react-hot-toast';
import { MagnifyingGlassIcon, ChevronRightIcon, ArrowPathIcon } from '@heroicons/react/24/outline';

// 날짜 포맷팅 함수
const formatDate = (dateString: string | null) => {
  if (!dateString) return '-';
  const date = new Date(dateString);
  return date.toLocaleString('ko-KR', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
};

export default function AdminUsersPage() {
  const router = useRouter();
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [sortBy, setSortBy] = useState<string>('recent'); // 'recent', 'name', 'purchase'
  const [sortOrder, setSortOrder] = useState('desc');

  useEffect(() => {
    fetchUsers();
  }, []);

  useEffect(() => {
    if (searchTerm.trim() === '') {
      setSearchResults(users);
    } else {
      const filtered = users.filter(user => {
        const searchLower = searchTerm.toLowerCase();
        return (
          (user.name && user.name.toLowerCase().includes(searchLower)) ||
          (user.nickname && user.nickname.toLowerCase().includes(searchLower)) ||
          (user.email && user.email.toLowerCase().includes(searchLower))
        );
      });
      setSearchResults(filtered);
    }
  }, [searchTerm, users]);

  useEffect(() => {
    const sortedUsers = [...searchResults];
    
    switch (sortBy) {
      case 'recent':
        sortedUsers.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
        break;
      case 'name':
        sortedUsers.sort((a, b) => {
          const nameA = (a.nickname || a.name || a.email || '').toLowerCase();
          const nameB = (b.nickname || b.name || b.email || '').toLowerCase();
          return nameA.localeCompare(nameB);
        });
        break;
      case 'purchase':
        sortedUsers.sort((a, b) => (b.total_purchase_amount || 0) - (a.total_purchase_amount || 0));
        break;
    }
    
    setSearchResults(sortedUsers);
  }, [sortBy, searchResults.length]);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const adminToken = localStorage.getItem('adminToken');
      
      if (!adminToken) {
        toast.error('관리자 권한이 없습니다');
        router.push('/admin/login');
        return;
      }

      const response = await fetch('/api/admin/users', {
        headers: {
          'Authorization': `Bearer ${adminToken}`
        }
      });

      if (!response.ok) {
        throw new Error('회원 목록을 가져오는데 실패했습니다');
      }

      const data = await response.json();
      setUsers(data.users || []);
      setSearchResults(data.users || []);
      setTotalPages(data.totalPages || 1);
    } catch (error) {
      console.error('회원 목록 로딩 에러:', error);
      setError('회원 목록을 불러오는데 실패했습니다');
      toast.error('회원 목록을 불러오는데 실패했습니다');
    } finally {
      setLoading(false);
    }
  };

  // 가격 포맷팅 함수
  const formatPrice = (price: number) => {
    return price ? price.toLocaleString('ko-KR') + '원' : '0원';
  };

  // 검색 핸들러
  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
  };

  // 정렬 핸들러
  const handleSort = (sortType: string) => {
    setSortBy(sortType);
  };

  // 페이지네이션 렌더링
  const renderPagination = () => {
    const pages = [];
    const maxDisplayPages = 5;
    
    let startPage = Math.max(1, currentPage - Math.floor(maxDisplayPages / 2));
    const endPage = Math.min(totalPages, startPage + maxDisplayPages - 1);
    
    if (endPage - startPage + 1 < maxDisplayPages) {
      startPage = Math.max(1, endPage - maxDisplayPages + 1);
    }

    for (let i = startPage; i <= endPage; i++) {
      pages.push(
        <button
          key={i}
          onClick={() => setCurrentPage(i)}
          className={`px-3 py-1 mx-1 rounded ${
            currentPage === i
              ? 'bg-green-600 text-white'
              : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-100'
          }`}
        >
          {i}
        </button>
      );
    }

    return (
      <div className="flex justify-center mt-6 flex-wrap">
        <button
          onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
          disabled={currentPage === 1}
          className="px-3 py-1 border border-gray-300 rounded-l bg-white text-gray-700 disabled:opacity-50"
        >
          이전
        </button>
        {pages}
        <button
          onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
          disabled={currentPage === totalPages}
          className="px-3 py-1 border border-gray-300 rounded-r bg-white text-gray-700 disabled:opacity-50"
        >
          다음
        </button>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="container mx-auto py-6 px-4 pt-20">
        <div className="min-h-[60vh] flex items-center justify-center">
          <Spinner size="lg" />
          <p className="ml-2 text-gray-500">회원 목록을 불러오는 중...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto py-6 px-4 pt-20">
        <div className="min-h-[60vh] flex flex-col items-center justify-center">
          <p className="text-red-500 mb-4">{error}</p>
          <Button onClick={fetchUsers}>
            다시 시도
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6 px-4 pt-20">
      <div className="flex flex-col sm:flex-row items-center justify-between mb-6">
        <h1 className="text-2xl font-bold mb-4 sm:mb-0">회원 관리</h1>
        <Button onClick={fetchUsers} className="flex items-center">
          <ArrowPathIcon className="h-4 w-4 mr-2" />
          새로고침
        </Button>
      </div>

      <div className="bg-white rounded-lg shadow-sm overflow-hidden mb-6">
        <div className="p-4">
          {/* 검색 필드 */}
          <div className="mb-4 relative">
            <div className="flex w-full">
              <div className="relative flex-grow">
                <MagnifyingGlassIcon className="h-5 w-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  placeholder="이름, 닉네임 또는 이메일로 검색"
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={searchTerm}
                  onChange={handleSearch}
                />
              </div>
            </div>
          </div>

          {/* 정렬 옵션 */}
          <div className="flex space-x-2 mb-4 overflow-x-auto pb-2 flex-nowrap">
            <button
              onClick={() => handleSort('recent')}
              className={`px-3 py-1 rounded-full text-sm whitespace-nowrap ${
                sortBy === 'recent'
                  ? 'bg-blue-100 text-blue-800 font-medium'
                  : 'bg-gray-100 text-gray-800 hover:bg-gray-200'
              }`}
            >
              최근 가입순
            </button>
            <button
              onClick={() => handleSort('name')}
              className={`px-3 py-1 rounded-full text-sm whitespace-nowrap ${
                sortBy === 'name'
                  ? 'bg-blue-100 text-blue-800 font-medium'
                  : 'bg-gray-100 text-gray-800 hover:bg-gray-200'
              }`}
            >
              이름순
            </button>
            <button
              onClick={() => handleSort('purchase')}
              className={`px-3 py-1 rounded-full text-sm whitespace-nowrap ${
                sortBy === 'purchase'
                  ? 'bg-blue-100 text-blue-800 font-medium'
                  : 'bg-gray-100 text-gray-800 hover:bg-gray-200'
              }`}
            >
              구매액순
            </button>
          </div>

          {/* 회원 카운트 */}
          <p className="text-sm text-gray-500 mb-2">
            전체 {users.length}명 중 {searchResults.length}명 표시
          </p>
        </div>

        {/* 회원 목록 */}
        <div className="divide-y">
          {searchResults.length === 0 ? (
            <div className="py-8 text-center text-gray-500">
              회원 정보가 없거나 검색 결과가 없습니다
            </div>
          ) : (
            searchResults.map(user => (
              <Link href={`/admin/users/${user.id}`} key={user.id}>
                <div className="p-4 hover:bg-gray-50 transition-colors">
                  <div className="flex items-center justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-col">
                        <div className="font-medium text-gray-900 truncate">
                          {user.nickname || user.name || '이름 없음'}
                        </div>
                        <div className="text-sm text-gray-500 truncate">
                          {user.email}
                        </div>
                      </div>
                      
                      <div className="mt-2 grid grid-cols-2 gap-2">
                        <div className="flex flex-col">
                          <span className="text-xs text-gray-500">총 구매액</span>
                          <span className="font-medium text-emerald-600">
                            {formatPrice(user.total_purchase_amount || 0)}
                          </span>
                        </div>
                        <div className="flex flex-col">
                          <span className="text-xs text-gray-500">주문 횟수</span>
                          <span className="font-medium">
                            {user.order_count || 0}회
                          </span>
                        </div>
                      </div>
                      
                      <div className="mt-1 flex items-center">
                        <span className="text-xs text-gray-500 mr-2">가입:</span>
                        <span className="text-xs">{formatDate(user.created_at)}</span>
                        
                        {user.provider && (
                          <span className="ml-2 px-2 py-0.5 text-xs rounded-full bg-gray-100 text-gray-800">
                            {user.provider === 'google' ? '구글'
                              : user.provider === 'kakao' ? '카카오'
                              : user.provider === 'naver' ? '네이버'
                              : user.provider}
                          </span>
                        )}
                      </div>
                    </div>
                    
                    <ChevronRightIcon className="h-5 w-5 text-gray-400" />
                  </div>
                </div>
              </Link>
            ))
          )}
        </div>
      </div>

      {/* 페이지네이션 */}
      {users.length > 0 && (
        <div className="mt-4">
          {renderPagination()}
        </div>
      )}
    </div>
  );
} 