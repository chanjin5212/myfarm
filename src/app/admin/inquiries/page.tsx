'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button, Spinner } from '@/components/ui/CommonStyles';
import { toast } from 'react-hot-toast';

interface Inquiry {
  id: string;
  product_id: string;
  user_id: string;
  title: string;
  content: string;
  is_private: boolean;
  status: string;
  created_at: string;
  user_name: string;
  product_name: string;
  reply_count: number;
}

interface InquiryDetail extends Inquiry {
  replies: Reply[];
}

interface Reply {
  id: string;
  inquiry_id: string;
  user_id: string;
  content: string;
  created_at: string;
  user_name: string;
  is_admin: boolean;
}

type StatusFilter = 'all' | 'pending' | 'answered';

export default function AdminInquiriesPage() {
  const router = useRouter();
  const [inquiries, setInquiries] = useState<Inquiry[]>([]);
  const [selectedInquiry, setSelectedInquiry] = useState<InquiryDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [replyContent, setReplyContent] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [adminToken, setAdminToken] = useState<string | null>(null);

  useEffect(() => {
    // 브라우저 환경에서만 localStorage에 접근
    if (typeof window !== 'undefined') {
      const token = localStorage.getItem('adminToken');
      setAdminToken(token);
      
      if (!token) {
        console.log('인증 토큰이 없습니다. 로그인 페이지로 이동합니다.');
        toast.error('로그인이 필요합니다.');
        router.push('/admin/login');
      }
    }
  }, [router]);

  useEffect(() => {
    if (adminToken) {
      fetchInquiries();
    }
  }, [searchTerm, page, statusFilter, adminToken]);

  const getAuthHeaders = () => {
    return {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${adminToken}`
    };
  };

  const handleAuthError = (status: number) => {
    if (status === 401 || status === 403) {
      console.log('인증이 만료되었거나 권한이 없습니다. 로그인 페이지로 이동합니다.');
      localStorage.removeItem('adminToken');
      setAdminToken(null);
      toast.error('인증이 만료되었습니다. 다시 로그인해주세요.');
      router.push('/admin/login');
    }
  };

  const fetchInquiries = async () => {
    try {
      if (!adminToken) {
        console.error('관리자 토큰이 없습니다.');
        toast.error('인증 정보가 없습니다. 다시 로그인해주세요.');
        router.push('/admin/login');
        return;
      }

      setLoading(true);
      const statusQuery = statusFilter !== 'all' ? `&status=${statusFilter}` : '';
      
      const response = await fetch(`/api/admin/inquiries?search=${searchTerm}&page=${page}&limit=10${statusQuery}`, {
        headers: getAuthHeaders()
      });
      
      if (!response.ok) {
        handleAuthError(response.status);
        const errorData = await response.json();
        console.error('API 오류 데이터:', errorData);
        throw new Error(errorData.error || '문의 목록을 불러오는데 실패했습니다.');
      }
      
      const data = await response.json();
      setInquiries(data.inquiries || []);
    } catch (error) {
      console.error('문의 목록 로딩 오류:', error);
      toast.error(error instanceof Error ? error.message : '문의 목록을 불러오는데 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const fetchInquiryDetail = async (inquiryId: string) => {
    try {
      if (!adminToken) {
        toast.error('인증 정보가 없습니다. 다시 로그인해주세요.');
        router.push('/admin/login');
        return;
      }

      const response = await fetch(`/api/admin/inquiries/${inquiryId}`, {
        headers: getAuthHeaders()
      });
      
      if (!response.ok) {
        handleAuthError(response.status);
        const errorData = await response.json();
        throw new Error(errorData.error || '문의 상세 정보를 불러오는데 실패했습니다.');
      }
      
      const data = await response.json();
      setSelectedInquiry(data);
      setIsModalOpen(true);
    } catch (error) {
      console.error('문의 상세 정보 로딩 오류:', error);
      toast.error(error instanceof Error ? error.message : '문의 상세 정보를 불러오는데 실패했습니다.');
    }
  };

  const submitReply = async () => {
    if (!selectedInquiry || !replyContent.trim() || !adminToken) {
      if (!adminToken) {
        toast.error('인증 정보가 없습니다. 다시 로그인해주세요.');
        router.push('/admin/login');
      }
      return;
    }
    
    try {
      setSubmitting(true);
      const response = await fetch(`/api/admin/inquiries/${selectedInquiry.id}/reply`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ content: replyContent }),
      });

      if (!response.ok) {
        handleAuthError(response.status);
        const errorData = await response.json();
        throw new Error(errorData.error || '답변 등록에 실패했습니다.');
      }

      toast.success('답변이 등록되었습니다.');
      setReplyContent('');
      
      // 답변 등록 후 문의 상세 정보 다시 불러오기
      await fetchInquiryDetail(selectedInquiry.id);
      await fetchInquiries(); // 목록 업데이트 (상태 변경 반영을 위해)
    } catch (error) {
      console.error('답변 등록 오류:', error);
      toast.error(error instanceof Error ? error.message : '답변 등록에 실패했습니다.');
    } finally {
      setSubmitting(false);
    }
  };

  // 문의 상태에 따른 UI 텍스트와 색상 반환
  const getStatusDisplay = (status: string) => {
    switch (status) {
      case 'pending':
        return {
          text: '답변대기',
          colorClass: 'bg-yellow-100 text-yellow-800'
        };
      case 'answered':
        return {
          text: '답변완료',
          colorClass: 'bg-green-100 text-green-800'
        };
      default:
        return {
          text: '상태 미정',
          colorClass: 'bg-gray-100 text-gray-800'
        };
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setSelectedInquiry(null);
    setReplyContent('');
  };

  return (
    <div className="container mx-auto py-6 px-2 sm:px-4 pt-20">
      <div className="mb-6">
        <h1 className="text-2xl font-bold mb-4">문의 관리</h1>
        
        {/* 검색 및 필터 */}
        <div className="flex flex-col mb-4 gap-4">
          <div className="flex flex-wrap gap-2">
            <Button
              variant={statusFilter === 'all' ? 'primary' : 'outline'}
              onClick={() => setStatusFilter('all')}
              className="text-xs sm:text-sm px-2 py-1"
            >
              전체
            </Button>
            <Button
              variant={statusFilter === 'pending' ? 'primary' : 'outline'}
              onClick={() => setStatusFilter('pending')}
              className="text-xs sm:text-sm px-2 py-1"
            >
              답변대기
            </Button>
            <Button
              variant={statusFilter === 'answered' ? 'primary' : 'outline'}
              onClick={() => setStatusFilter('answered')}
              className="text-xs sm:text-sm px-2 py-1"
            >
              답변완료
            </Button>
          </div>
          
          <form onSubmit={(e) => { e.preventDefault(); fetchInquiries(); }} className="flex gap-2 w-full">
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="제목, 내용 검색"
              className="border border-gray-300 rounded px-3 py-2 flex-grow"
            />
            <Button type="submit">검색</Button>
          </form>
        </div>
      </div>
      
      {/* 문의 목록 */}
      {loading ? (
        <div className="flex justify-center items-center h-64">
          <Spinner size="lg" />
        </div>
      ) : inquiries.length === 0 ? (
        <div className="bg-white rounded-lg shadow p-6 text-center">
          <p className="text-gray-500">문의 내역이 없습니다</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {/* PC 화면용 테이블 (md 이상 크기에서만 표시) */}
          <div className="hidden md:block overflow-x-auto">
            <table className="min-w-full bg-white rounded-lg overflow-hidden shadow-md">
              <thead className="bg-gray-100">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">
                    상품
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">
                    제목
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">
                    작성자
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">
                    작성일
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">
                    상태
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">
                    관리
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {inquiries.map((inquiry) => {
                  const statusDisplay = getStatusDisplay(inquiry.status);
                  return (
                    <tr key={inquiry.id} className="hover:bg-gray-50">
                      <td className="px-4 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">{inquiry.product_name}</div>
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex items-center">
                          {inquiry.is_private && (
                            <span className="mr-1 text-xs bg-gray-100 text-gray-600 px-1 rounded">비공개</span>
                          )}
                          <span className="text-sm text-gray-900">{inquiry.title}</span>
                          {inquiry.reply_count > 0 && (
                            <span className="ml-1 text-xs text-blue-600">[{inquiry.reply_count}]</span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">{inquiry.user_name}</div>
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-500">{formatDate(inquiry.created_at)}</div>
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap">
                        <span className={`px-2 py-1 text-xs rounded-full ${statusDisplay.colorClass}`}>
                          {statusDisplay.text}
                        </span>
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm font-medium">
                        <Button
                          variant="primary"
                          size="sm"
                          onClick={() => fetchInquiryDetail(inquiry.id)}
                        >
                          {inquiry.status === 'pending' ? '답변하기' : '상세보기'}
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* 모바일 화면용 카드 UI (md 미만 크기에서 표시) */}
          <div className="md:hidden space-y-4">
            {inquiries.map((inquiry) => {
              const statusDisplay = getStatusDisplay(inquiry.status);
              return (
                <div key={inquiry.id} className="bg-white rounded-lg shadow-md p-4">
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <div className="text-sm font-medium">{inquiry.product_name}</div>
                      <div className="text-xs text-gray-500">{formatDate(inquiry.created_at)}</div>
                    </div>
                    <span className={`px-2 py-1 text-xs rounded-full ${statusDisplay.colorClass}`}>
                      {statusDisplay.text}
                    </span>
                  </div>
                  
                  <div className="mb-3">
                    <div className="flex items-center">
                      {inquiry.is_private && (
                        <span className="mr-1 text-xs bg-gray-100 text-gray-600 px-1 rounded">비공개</span>
                      )}
                      <span className="text-sm font-medium">{inquiry.title}</span>
                      {inquiry.reply_count > 0 && (
                        <span className="ml-1 text-xs text-blue-600">[{inquiry.reply_count}]</span>
                      )}
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-2 text-xs mb-3">
                    <div>
                      <div className="font-medium text-gray-500">작성자</div>
                      <div>{inquiry.user_name}</div>
                    </div>
                    <div>
                      <div className="font-medium text-gray-500">상태</div>
                      <div>{statusDisplay.text}</div>
                    </div>
                  </div>
                  
                  <div className="text-right">
                    <Button
                      variant="primary"
                      size="sm"
                      className="w-full"
                      onClick={() => fetchInquiryDetail(inquiry.id)}
                    >
                      {inquiry.status === 'pending' ? '답변하기' : '상세보기'}
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
      
      {/* 페이지네이션 */}
      {!loading && inquiries.length > 0 && (
        <div className="flex justify-center mt-6">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage(prev => Math.max(prev - 1, 1))}
            disabled={page === 1}
          >
            이전
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage(prev => prev + 1)}
            disabled={inquiries.length < 10}
            className="ml-2"
          >
            다음
          </Button>
        </div>
      )}

      {/* 문의 상세보기 및 답변 모달 */}
      {isModalOpen && selectedInquiry && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-lg w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
            <div className="p-4 border-b border-gray-200 flex justify-between items-center">
              <h3 className="font-medium text-lg">문의 상세보기</h3>
              <button onClick={closeModal} className="text-gray-500 hover:text-gray-700">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            <div className="p-4 overflow-y-auto flex-1">
              <div className="mb-4">
                <div className="flex flex-col sm:flex-row sm:justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-gray-500">
                      {selectedInquiry.user_name} | {formatDate(selectedInquiry.created_at)}
                    </span>
                    <span className={`px-2 text-xs leading-5 font-semibold rounded-full ${getStatusDisplay(selectedInquiry.status).colorClass}`}>
                      {getStatusDisplay(selectedInquiry.status).text}
                    </span>
                  </div>
                </div>
                <div className="mb-1 font-semibold">
                  {selectedInquiry.is_private && (
                    <span className="mr-1 text-xs bg-gray-100 text-gray-600 px-1 rounded">비공개</span>
                  )}
                  {selectedInquiry.title}
                </div>
                <div className="p-3 bg-gray-50 rounded-lg whitespace-pre-wrap">
                  {selectedInquiry.content}
                </div>
              </div>
              
              {/* 답변 목록 */}
              {selectedInquiry.replies && selectedInquiry.replies.length > 0 && (
                <div className="mb-4">
                  <h4 className="font-medium text-sm mb-2">답변 내역</h4>
                  <div className="space-y-3">
                    {selectedInquiry.replies.map((reply) => (
                      <div key={reply.id} className={`p-3 rounded-lg ${reply.is_admin ? 'bg-green-50 border border-green-100' : 'bg-gray-50'}`}>
                        <div className="flex flex-col sm:flex-row sm:justify-between mb-1">
                          <span className="text-sm font-medium">
                            {reply.is_admin ? '관리자' : reply.user_name}
                          </span>
                          <span className="text-xs text-gray-500">
                            {formatDate(reply.created_at)}
                          </span>
                        </div>
                        <div className="text-sm whitespace-pre-wrap">
                          {reply.content}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              
              {/* 답변 입력 양식 */}
              <div>
                <h4 className="font-medium text-sm mb-2">답변 작성</h4>
                <textarea
                  className="w-full border border-gray-300 rounded-lg p-3 min-h-[100px] resize-none focus:ring-2 focus:ring-indigo-400 focus:border-transparent"
                  placeholder="문의에 대한 답변을 입력하세요"
                  value={replyContent}
                  onChange={(e) => setReplyContent(e.target.value)}
                  disabled={submitting}
                ></textarea>
              </div>
            </div>
            
            <div className="p-4 border-t border-gray-200 flex justify-end space-x-2">
              <Button variant="outline" onClick={closeModal} disabled={submitting}>
                취소
              </Button>
              <Button 
                variant="primary" 
                onClick={submitReply} 
                disabled={!replyContent.trim() || submitting}
              >
                {submitting ? <Spinner size="sm" /> : '답변 등록'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 