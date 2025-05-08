import React, { useState, useEffect, useCallback, memo, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { checkToken, getAuthHeader, getUserId } from '@/utils/auth';
import { formatDate } from '@/utils/format';
import toast from 'react-hot-toast';
import { Spinner } from '@/components/ui/CommonStyles';
import { useProductContext } from './ProductContext';

interface ProductInquiryProps {
  productId: string;
}

interface Inquiry {
  id: string;
  product_id: string;
  user_id: string;
  title: string;
  content: string;
  is_private: boolean;
  status: string;
  created_at: string;
  updated_at: string;
  username?: string;
  replies?: InquiryReply[];
}

interface InquiryReply {
  id: string;
  inquiry_id: string;
  user_id: string;
  content: string;
  created_at: string;
  updated_at: string;
  username?: string;
  is_admin?: boolean;
}

// 문의 답변 컴포넌트
const InquiryReplyItem = memo(({ reply }: { reply: InquiryReply }) => {
  return (
    <div className="bg-white p-3 rounded-md mt-2">
      <div className="flex justify-between items-center mb-2">
        <div className="flex items-center">
          <span className="font-medium text-sm mr-2">
            {reply.is_admin ? '관리자' : reply.username || '익명'}
          </span>
          <span className="text-xs text-gray-500">
            {formatDate(reply.created_at)}
          </span>
        </div>
      </div>
      <p className="text-gray-700 text-sm whitespace-pre-line">{reply.content}</p>
    </div>
  );
});

InquiryReplyItem.displayName = 'InquiryReplyItem';

// 문의 항목 컴포넌트
const InquiryItem = memo(({ 
  inquiry, 
  expandedInquiry, 
  toggleInquiry, 
  canViewInquiry,
  currentUserId,
  isLoggedIn,
  router
}: { 
  inquiry: Inquiry, 
  expandedInquiry: string | null,
  toggleInquiry: (id: string) => void,
  canViewInquiry: (inquiry: Inquiry) => boolean,
  currentUserId: string | null,
  isLoggedIn: boolean,
  router: ReturnType<typeof useRouter>
}) => {
  return (
    <div className="border-b border-gray-200">
      <div 
        className={`py-4 px-2 cursor-pointer`}
        onClick={() => toggleInquiry(inquiry.id)}
      >
        <div className="flex justify-between items-center">
          <div className="flex items-center space-x-2">
            <span className={`text-xs px-2 py-0.5 rounded-full ${
              inquiry.status === 'answered' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
            }`}>
              {inquiry.status === 'answered' ? '답변완료' : '접수'}
            </span>
            <h3 className="font-medium">
              {inquiry.is_private && (
                <span className="text-gray-500 mr-1">🔒</span>
              )}
              {inquiry.is_private && !canViewInquiry(inquiry) 
                ? '비밀글입니다.'
                : inquiry.title
              }
            </h3>
          </div>
          <div className="flex items-center text-xs text-gray-500">
            <span>{inquiry.username || '익명'}</span>
            <span className="mx-1">|</span>
            <span>{formatDate(inquiry.created_at)}</span>
            <svg 
              xmlns="http://www.w3.org/2000/svg" 
              className={`ml-1 h-4 w-4 transition-transform ${expandedInquiry === inquiry.id ? 'rotate-180' : ''}`} 
              fill="none" 
              viewBox="0 0 24 24" 
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </div>
        </div>
      </div>
      
      {/* 확장된 문의 내용과 답변 */}
      {expandedInquiry === inquiry.id && (
        <div className="px-4 py-3 bg-gray-50">
          {canViewInquiry(inquiry) ? (
            <div>
              <div className="mb-4">
                <p className="text-gray-700 whitespace-pre-line">{inquiry.content}</p>
              </div>
              
              {/* 답변 목록 */}
              {inquiry.replies && inquiry.replies.length > 0 ? (
                <div className="mt-3 pt-3 border-t border-gray-200">
                  {inquiry.replies.map((reply) => (
                    <InquiryReplyItem key={reply.id} reply={reply} />
                  ))}
                </div>
              ) : inquiry.status === 'answered' ? (
                <div className="bg-white p-3 rounded-md mt-3">
                  <p className="text-gray-700 text-sm">답변 준비 중입니다.</p>
                </div>
              ) : null}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-4">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-gray-400 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
              <p className="text-gray-500 text-center">비밀글입니다. 작성자만 확인할 수 있습니다.</p>
              {!isLoggedIn && (
                <button
                  onClick={() => router.push('/m/auth')}
                  className="mt-3 px-4 py-2 bg-gray-100 text-gray-700 rounded-md text-sm hover:bg-gray-200"
                >
                  로그인하기
                </button>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
});

InquiryItem.displayName = 'InquiryItem';

// 문의 폼 컴포넌트
const InquiryForm = memo(({ 
  isLoggedIn, 
  inquiryData, 
  setInquiryData, 
  isSubmitting, 
  handleSubmitInquiry, 
  handleCloseForm,
  router 
}: { 
  isLoggedIn: boolean, 
  inquiryData: {
    title: string,
    content: string,
    is_private: boolean
  },
  setInquiryData: React.Dispatch<React.SetStateAction<{
    title: string,
    content: string,
    is_private: boolean
  }>>,
  isSubmitting: boolean,
  handleSubmitInquiry: (e: React.FormEvent) => Promise<void>,
  handleCloseForm: () => void,
  router: ReturnType<typeof useRouter>
}) => {
  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4 mb-6">
      <h3 className="text-lg font-medium mb-3">상품 문의 작성</h3>
      
      {!isLoggedIn ? (
        <div className="text-center py-4">
          <p className="text-gray-600 mb-3">로그인 후 문의를 작성할 수 있습니다.</p>
          <button
            onClick={() => router.push('/m/auth')}
            className="bg-green-600 text-white px-4 py-2 rounded-md"
          >
            로그인하기
          </button>
        </div>
      ) : (
        <form onSubmit={handleSubmitInquiry}>
          <div className="mb-3">
            <label className="block text-gray-700 text-sm font-medium mb-1">
              제목
            </label>
            <input
              type="text"
              value={inquiryData.title}
              onChange={(e) => setInquiryData({...inquiryData, title: e.target.value})}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
              placeholder="문의 제목을 입력하세요"
              required
            />
          </div>
          
          <div className="mb-3">
            <label className="block text-gray-700 text-sm font-medium mb-1">
              내용
            </label>
            <textarea
              value={inquiryData.content}
              onChange={(e) => setInquiryData({...inquiryData, content: e.target.value})}
              className="w-full px-3 py-2 border border-gray-300 rounded-md h-32"
              placeholder="문의 내용을 입력하세요"
              required
            />
          </div>
          
          <div className="mb-4 flex items-center">
            <input
              type="checkbox"
              id="is_private"
              checked={inquiryData.is_private}
              onChange={(e) => setInquiryData({...inquiryData, is_private: e.target.checked})}
              className="mr-2"
            />
            <label htmlFor="is_private" className="text-sm text-gray-700">
              비밀글로 작성하기
            </label>
          </div>
          
          <div className="flex justify-end space-x-2">
            <button
              type="button"
              onClick={handleCloseForm}
              className="px-4 py-2 border border-gray-300 rounded-md text-gray-700"
            >
              취소
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-4 py-2 bg-green-600 text-white rounded-md flex items-center"
            >
              {isSubmitting && (
                <Spinner size="sm" className="mr-2" />
              )}
              등록하기
            </button>
          </div>
        </form>
      )}
    </div>
  );
});

InquiryForm.displayName = 'InquiryForm';

const ProductInquiry = memo(({ productId }: ProductInquiryProps) => {
  const router = useRouter();
  const { updateInquiriesCount } = useProductContext();
  const [inquiries, setInquiries] = useState<Inquiry[]>([]);
  const [loading, setLoading] = useState(true);
  const [showInquiryForm, setShowInquiryForm] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [inquiryData, setInquiryData] = useState({
    title: '',
    content: '',
    is_private: false
  });
  const [expandedInquiry, setExpandedInquiry] = useState<string | null>(null);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [totalCount, setTotalCount] = useState(0);

  // 로그인 상태 확인
  useEffect(() => {
    const { isLoggedIn: loggedIn } = checkToken();
    setIsLoggedIn(loggedIn);
    
    if (loggedIn) {
      // 현재 사용자 ID 가져오기
      const userId = getUserId();
      setCurrentUserId(userId);
      
      // 관리자 여부 확인 (로컬 스토리지에서 사용자 정보 확인)
      const userInfoStr = localStorage.getItem('userInfo');
      if (userInfoStr) {
        try {
          const userInfo = JSON.parse(userInfoStr);
          setIsAdmin(userInfo.is_admin === true);
        } catch (e) {
          console.error('사용자 정보 파싱 오류:', e);
        }
      }
    }
  }, []);

  // 문의 목록 가져오기
  useEffect(() => {
    if (!productId) return;
    
    const controller = new AbortController();
    fetchInquiries(controller.signal);
    
    return () => {
      controller.abort();
    };
  }, [productId, page]);

  const fetchInquiries = useCallback(async (signal?: AbortSignal) => {
    if (!productId) return;
    
    setLoading(true);
    
    try {
      const response = await fetch(`/api/products/${productId}/inquiries?page=${page}&limit=5`, {
        signal
      });
      const data = await response.json();
      
      if (response.ok) {
        if (page === 1) {
          setInquiries(data.inquiries || []);
        } else {
          setInquiries(prev => [...prev, ...(data.inquiries || [])]);
        }
        
        setTotalCount(data.total || 0);
        setHasMore(data.hasMore || false);
      } else {
        toast.error('문의 목록을 불러오는데 실패했습니다.');
      }
    } catch (error) {
      if (error instanceof Error && error.name !== 'AbortError') {
      console.error('문의 목록 불러오기 오류:', error);
      toast.error('문의 목록을 불러오는데 문제가 발생했습니다.');
      }
    } finally {
      setLoading(false);
    }
  }, [productId, page]);

  // 문의 등록
  const handleSubmitInquiry = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!isLoggedIn) {
      toast.error('로그인이 필요합니다.');
      router.push('/m/auth');
      return;
    }
    
    if (!inquiryData.title.trim() || !inquiryData.content.trim()) {
      toast.error('제목과 내용을 모두 입력해주세요.');
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      const authHeader = getAuthHeader();
      
      const response = await fetch(`/api/products/${productId}/inquiries`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...authHeader
        },
        body: JSON.stringify({
          title: inquiryData.title,
          content: inquiryData.content,
          is_private: inquiryData.is_private
        })
      });
      
      if (response.ok) {
        toast.success('문의가 등록되었습니다.');
        setInquiryData({
          title: '',
          content: '',
          is_private: false
        });
        setShowInquiryForm(false);
        setPage(1);
        fetchInquiries();
        
        // Context를 통해 문의 개수 업데이트
        updateInquiriesCount();
      } else {
        const data = await response.json();
        toast.error(data.message || '문의 등록에 실패했습니다.');
      }
    } catch (error) {
      console.error('문의 등록 오류:', error);
      toast.error('문의 등록 중 오류가 발생했습니다.');
    } finally {
      setIsSubmitting(false);
    }
  }, [isLoggedIn, inquiryData, productId, router, fetchInquiries, updateInquiriesCount]);

  // 문의 토글
  const toggleInquiry = useCallback((inquiryId: string) => {
    setExpandedInquiry(prev => prev === inquiryId ? null : inquiryId);
  }, []);

  // 더보기 버튼 클릭
  const handleLoadMore = useCallback(() => {
    if (hasMore) {
      setPage(prev => prev + 1);
    }
  }, [hasMore]);

  // 비밀글 확인 로직
  const canViewInquiry = useCallback((inquiry: Inquiry) => {
    // 비밀글이 아니면 누구나 볼 수 있음
    if (!inquiry.is_private) return true;
    
    // 비밀글인 경우:
    // 1. 관리자는 볼 수 있음
    if (isAdmin) return true;
    
    // 2. 작성자 본인만 볼 수 있음
    return isLoggedIn && currentUserId === inquiry.user_id;
  }, [isAdmin, isLoggedIn, currentUserId]);
  
  // 문의 폼 닫기 핸들러
  const handleCloseForm = useCallback(() => {
    setShowInquiryForm(false);
  }, []);
  
  // 문의 아이템 메모이제이션
  const inquiryItems = useMemo(() => {
    return inquiries.map(inquiry => (
      <InquiryItem
        key={inquiry.id}
        inquiry={inquiry}
        expandedInquiry={expandedInquiry}
        toggleInquiry={toggleInquiry}
        canViewInquiry={canViewInquiry}
        currentUserId={currentUserId}
        isLoggedIn={isLoggedIn}
        router={router}
      />
    ));
  }, [inquiries, expandedInquiry, toggleInquiry, canViewInquiry, currentUserId, isLoggedIn, router]);

  return (
    <div>
      {/* 문의 요약 정보 */}
      <div className="bg-gray-50 p-4 rounded-lg mb-6 flex justify-between items-center">
        <div>
          <h3 className="text-lg font-medium">상품 문의</h3>
          <p className="text-sm text-gray-500 mt-1">총 {totalCount}개의 문의가 있습니다.</p>
        </div>
        <button
          onClick={() => setShowInquiryForm(!showInquiryForm)}
          className="bg-green-600 text-white px-4 py-2 rounded-md text-sm"
        >
          문의하기
        </button>
      </div>
      
      {/* 문의 작성 폼 */}
      {showInquiryForm && (
        <InquiryForm
          isLoggedIn={isLoggedIn}
          inquiryData={inquiryData}
          setInquiryData={setInquiryData}
          isSubmitting={isSubmitting}
          handleSubmitInquiry={handleSubmitInquiry}
          handleCloseForm={handleCloseForm}
          router={router}
        />
      )}
      
      {/* 문의 목록 */}
      {loading && inquiries.length === 0 ? (
        <div className="text-center py-8">
          <Spinner size="md" className="mx-auto mb-2" />
          <p className="mt-2 text-gray-500">문의 내역을 불러오는 중입니다...</p>
        </div>
      ) : inquiries.length === 0 ? (
        <div className="text-center py-8 bg-gray-50 rounded-lg">
          <p className="text-gray-500">등록된 문의가 없습니다.</p>
        </div>
      ) : (
        <div className="border-t border-gray-200">
          {inquiryItems}
          
          {/* 더보기 버튼 */}
          {hasMore && (
            <div className="text-center py-4">
              <button
                onClick={handleLoadMore}
                className="px-4 py-2 text-sm bg-gray-100 rounded-md hover:bg-gray-200"
              >
                {loading ? <Spinner size="sm" className="mx-auto" /> : '더보기'}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
});

ProductInquiry.displayName = 'ProductInquiry';

export default ProductInquiry; 