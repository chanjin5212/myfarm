'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button, Spinner } from '@/components/ui/CommonStyles';
import toast from 'react-hot-toast';
import { MagnifyingGlassIcon, ChevronRightIcon, ArrowPathIcon } from '@heroicons/react/24/outline';
import { Dialog, Transition } from '@headlessui/react';
import { Fragment } from 'react';

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

// 가격 포맷팅 함수
const formatPrice = (price: number) => {
  return price ? price.toLocaleString('ko-KR') + '원' : '0원';
};

export default function AdminUsersPage() {
  const router = useRouter();
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [sortBy, setSortBy] = useState('created_at');
  const [sortOrder, setSortOrder] = useState('desc');
  const [statusFilter, setStatusFilter] = useState('active'); // 기본값을 'active'로 변경
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [smsMessage, setSmsMessage] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [smsSendResult, setSmsSendResult] = useState<{success: boolean, message: string} | null>(null);

  useEffect(() => {
    fetchUsers();
  }, [currentPage, sortBy, sortOrder, statusFilter]);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const adminToken = localStorage.getItem('adminToken');
      
      if (!adminToken) {
        toast.error('관리자 권한이 없습니다');
        router.push('/admin/login');
        return;
      }

      const queryParams = new URLSearchParams();
      queryParams.append('page', currentPage.toString());
      queryParams.append('limit', '10');
      queryParams.append('sort', sortBy);
      queryParams.append('order', sortOrder);
      
      if (searchTerm) {
        queryParams.append('search', searchTerm);
      }

      queryParams.append('status', statusFilter);

      const response = await fetch(`/api/admin/users?${queryParams.toString()}`, {
        headers: {
          'Authorization': `Bearer ${adminToken}`
        }
      });

      if (!response.ok) {
        throw new Error('회원 목록을 가져오는데 실패했습니다');
      }

      const data = await response.json();
      setUsers(data.users || []);
      setTotalPages(data.totalPages || 1);
    } catch (error) {
      console.error('회원 목록 로딩 에러:', error);
      toast.error('회원 목록을 불러오는데 실패했습니다');
    } finally {
      setLoading(false);
    }
  };

  // 검색 핸들러
  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setCurrentPage(1);
    fetchUsers();
  };

  // 정렬 변경 핸들러
  const handleSortChange = (field: string) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortOrder('desc');
    }
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

  // SMS 발송 함수
  const handleSendSMS = async () => {
    if (!smsMessage.trim()) {
      toast.error('메시지 내용을 입력해주세요.');
      return;
    }

    setIsSending(true);
    setSmsSendResult(null);

    try {
      const adminToken = localStorage.getItem('adminToken');
      
      if (!adminToken) {
        toast.error('관리자 권한이 없습니다');
        router.push('/admin/login');
        return;
      }

      const response = await fetch('/api/admin/send-sms', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${adminToken}`
        },
        body: JSON.stringify({
          message: smsMessage
        }),
      });

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || '문자 발송에 실패했습니다');
      }

      setSmsSendResult({
        success: true,
        message: `${data.sentCount}명의 회원에게 문자 메시지가 발송되었습니다.`
      });
      toast.success(`${data.sentCount}명의 회원에게 문자 메시지가 발송되었습니다.`);
      
      // 성공 후 3초 뒤에 모달 닫기
      setTimeout(() => {
        setIsModalOpen(false);
        setSmsMessage('');
        setSmsSendResult(null);
      }, 3000);
      
    } catch (error: any) {
      console.error('SMS 발송 오류:', error);
      setSmsSendResult({
        success: false,
        message: error.message || '문자 발송에 실패했습니다'
      });
      toast.error(error.message || '문자 발송에 실패했습니다');
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="container mx-auto py-6 px-2 sm:px-4 pt-20">
      <div className="mb-6">
        <h1 className="text-2xl font-bold mb-4">회원 관리</h1>
        
        {/* 검색 및 필터 */}
        <div className="flex flex-col mb-4 gap-4">
          <div className="flex flex-wrap gap-2 justify-between items-center">
            <div className="flex flex-wrap gap-2">
              <Button
                variant={statusFilter === 'all' ? 'primary' : 'outline'}
                onClick={() => setStatusFilter('all')}
                className="text-xs sm:text-sm px-2 py-1"
              >
                전체
              </Button>
              <Button
                variant={statusFilter === 'active' ? 'primary' : 'outline'}
                onClick={() => setStatusFilter('active')}
                className="text-xs sm:text-sm px-2 py-1"
              >
                활성
              </Button>
              <Button
                variant={statusFilter === 'deleted' ? 'primary' : 'outline'}
                onClick={() => setStatusFilter('deleted')}
                className="text-xs sm:text-sm px-2 py-1"
              >
                탈퇴
              </Button>
            </div>
            
            {/* 문자 발송 버튼 */}
            <Button 
              variant="secondary"
              onClick={() => setIsModalOpen(true)}
              className="text-sm px-3 py-1"
            >
              마케팅 문자 발송
            </Button>
          </div>
          
          <form onSubmit={handleSearch} className="flex gap-2 w-full">
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="이름, 닉네임, 이메일로 검색"
              className="border border-gray-300 rounded px-3 py-2 flex-grow"
            />
            <Button type="submit">검색</Button>
          </form>
        </div>
      </div>
      
      {/* 문자 발송 모달 */}
      <Transition appear show={isModalOpen} as={Fragment}>
        <Dialog as="div" className="relative z-50" onClose={() => !isSending && setIsModalOpen(false)}>
          <Transition.Child
            as={Fragment}
            enter="ease-out duration-300"
            enterFrom="opacity-0"
            enterTo="opacity-100"
            leave="ease-in duration-200"
            leaveFrom="opacity-100"
            leaveTo="opacity-0"
          >
            <div className="fixed inset-0 bg-black/25" />
          </Transition.Child>

          <div className="fixed inset-0 overflow-y-auto">
            <div className="flex min-h-full items-center justify-center p-4 text-center">
              <Transition.Child
                as={Fragment}
                enter="ease-out duration-300"
                enterFrom="opacity-0 scale-95"
                enterTo="opacity-100 scale-100"
                leave="ease-in duration-200"
                leaveFrom="opacity-100 scale-100"
                leaveTo="opacity-0 scale-95"
              >
                <Dialog.Panel className="w-full max-w-md transform overflow-hidden rounded-2xl bg-white p-6 text-left align-middle shadow-xl transition-all">
                  <Dialog.Title 
                    as="h3" 
                    className="text-lg font-medium leading-6 text-gray-900 mb-4"
                  >
                    마케팅 문자 발송
                  </Dialog.Title>
                  
                  <div className="mt-2">
                    <p className="text-sm text-gray-500 mb-4">
                      마케팅 수신에 동의한 회원들에게 일괄 문자 메시지를 발송합니다.
                    </p>
                    
                    <textarea
                      value={smsMessage}
                      onChange={(e) => setSmsMessage(e.target.value)}
                      placeholder="발송할 문자 내용을 입력하세요 (최대 90자)"
                      className="w-full h-40 p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                      maxLength={90}
                      disabled={isSending}
                    />
                    
                    <div className="text-right text-xs text-gray-500 mt-1">
                      {smsMessage.length}/90자
                    </div>
                    
                    {smsSendResult && (
                      <div className={`mt-3 p-3 rounded-md ${smsSendResult.success ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
                        {smsSendResult.message}
                      </div>
                    )}
                  </div>

                  <div className="mt-4 flex justify-end space-x-3">
                    <button
                      type="button"
                      className="inline-flex justify-center rounded-md border border-transparent bg-gray-100 px-4 py-2 text-sm font-medium text-gray-900 hover:bg-gray-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-gray-500 focus-visible:ring-offset-2"
                      onClick={() => setIsModalOpen(false)}
                      disabled={isSending}
                    >
                      취소
                    </button>
                    <button
                      type="button"
                      className="inline-flex justify-center rounded-md border border-transparent bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-green-500 focus-visible:ring-offset-2 disabled:opacity-50"
                      onClick={handleSendSMS}
                      disabled={isSending || !smsMessage.trim()}
                    >
                      {isSending ? (
                        <>
                          <Spinner size="sm" className="mr-2" />
                          발송 중...
                        </>
                      ) : '문자 발송'}
                    </button>
                  </div>
                </Dialog.Panel>
              </Transition.Child>
            </div>
          </div>
        </Dialog>
      </Transition>
      
      {/* 회원 목록 */}
      {loading ? (
        <div className="flex justify-center items-center h-64">
          <Spinner size="lg" />
        </div>
      ) : users.length === 0 ? (
        <div className="bg-white rounded-lg shadow p-6 text-center">
          <p className="text-gray-500">회원 정보가 없습니다</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {/* PC 화면용 테이블 (md 이상 크기에서만 표시) */}
          <div className="hidden md:block overflow-x-auto">
            <table className="min-w-full bg-white rounded-lg overflow-hidden shadow-md">
              <thead className="bg-gray-100">
                <tr>
                  <th
                    className="px-4 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider cursor-pointer"
                    onClick={() => handleSortChange('name')}
                  >
                    이름
                    {sortBy === 'name' && (
                      <span className="ml-1">
                        {sortOrder === 'asc' ? '↑' : '↓'}
                      </span>
                    )}
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">
                    이메일
                  </th>
                  <th
                    className="px-4 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider cursor-pointer"
                    onClick={() => handleSortChange('total_purchase_amount')}
                  >
                    총 구매액
                    {sortBy === 'total_purchase_amount' && (
                      <span className="ml-1">
                        {sortOrder === 'asc' ? '↑' : '↓'}
                      </span>
                    )}
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">
                    주문 횟수
                  </th>
                  <th
                    className="px-4 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider cursor-pointer"
                    onClick={() => handleSortChange('created_at')}
                  >
                    가입일
                    {sortBy === 'created_at' && (
                      <span className="ml-1">
                        {sortOrder === 'asc' ? '↑' : '↓'}
                      </span>
                    )}
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">
                    로그인 방식
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">
                    관리
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {users.map((user) => (
                  <tr key={user.id} className="hover:bg-gray-50">
                    <td className="px-4 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">
                        {user.nickname || user.name || '이름 없음'}
                      </div>
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{user.email}</div>
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-emerald-600">
                        {formatPrice(user.total_purchase_amount || 0)}
                      </div>
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{user.order_count || 0}회</div>
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">
                      {formatDate(user.created_at)}
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap">
                      {user.provider && (
                        <span className="px-2 py-1 text-xs rounded-full bg-gray-100 text-gray-800">
                          {user.provider === 'google' ? '구글'
                            : user.provider === 'kakao' ? '카카오'
                            : user.provider === 'naver' ? '네이버'
                            : user.provider}
                        </span>
                      )}
                      {user.deleted_at && (
                        <span className="ml-2 px-2 py-1 text-xs rounded-full bg-red-100 text-red-800">
                          탈퇴
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm font-medium">
                      <Link 
                        href={`/admin/users/${user.id}`}
                        className="text-green-600 hover:text-green-900"
                      >
                        상세
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* 모바일 화면용 카드 UI (md 미만 크기에서 표시) */}
          <div className="md:hidden space-y-4">
            {users.map((user) => (
              <div key={user.id} className="bg-white rounded-lg shadow-md p-4">
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <div className="text-sm font-medium">{user.nickname || user.name || '이름 없음'}</div>
                    <div className="text-xs text-gray-500">{formatDate(user.created_at)}</div>
                  </div>
                  <div className="flex gap-2">
                    {user.provider && (
                      <span className="px-2 py-1 text-xs rounded-full bg-gray-100 text-gray-800">
                        {user.provider === 'google' ? '구글'
                          : user.provider === 'kakao' ? '카카오'
                          : user.provider === 'naver' ? '네이버'
                          : user.provider}
                      </span>
                    )}
                    {user.deleted_at && (
                      <span className="px-2 py-1 text-xs rounded-full bg-red-100 text-red-800">
                        탈퇴
                      </span>
                    )}
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-2 text-xs mb-3">
                  <div>
                    <div className="font-medium text-gray-500">이메일</div>
                    <div>{user.email}</div>
                  </div>
                  <div>
                    <div className="font-medium text-gray-500">총 구매액</div>
                    <div className="font-medium text-emerald-600">{formatPrice(user.total_purchase_amount || 0)}</div>
                  </div>
                </div>
                
                <div className="text-right">
                  <Link 
                    href={`/admin/users/${user.id}`}
                    className="inline-block px-3 py-1 bg-green-50 text-green-600 rounded text-sm font-medium"
                  >
                    상세보기
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
      
      {/* 페이지네이션 */}
      {!loading && users.length > 0 && renderPagination()}
    </div>
  );
} 