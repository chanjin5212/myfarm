import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import { StarIcon } from '@heroicons/react/24/solid';
import { StarIcon as StarIconOutline } from '@heroicons/react/24/outline';

interface ProductTabsProps {
  product: {
    id: string;
    name: string;
    description: string;
    origin?: string;
    harvest_date?: string;
    storage_method?: string;
    is_organic?: boolean;
  };
  activeTab: 'info' | 'review';
  setActiveTab: (tab: 'info' | 'review') => void;
}

interface Review {
  id: number;
  product_id: number;
  user_id: number;
  rating: number;
  title: string;
  content: string;
  created_at: string;
  status: string;
  username: string;
  images?: string[];
}

export default function MobileProductTabs({ product, activeTab, setActiveTab }: ProductTabsProps) {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [reviewsLoading, setReviewsLoading] = useState(false);
  const [reviewsCount, setReviewsCount] = useState(0);
  const [averageRating, setAverageRating] = useState(0);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  
  // 리뷰 데이터 가져오기
  useEffect(() => {
    if (activeTab === 'review') {
      fetchReviews();
    }
  }, [activeTab, product.id, page]);
  
  const fetchReviews = async () => {
    if (!product.id) return;
    
    setReviewsLoading(true);
    
    try {
      const response = await fetch(`/api/products/${product.id}/reviews?page=${page}&limit=5`);
      const data = await response.json();
      
      if (page === 1) {
        setReviews(data.reviews || []);
      } else {
        setReviews(prev => [...prev, ...(data.reviews || [])]);
      }
      
      setReviewsCount(data.total || 0);
      setAverageRating(data.averageRating || 0);
      setHasMore(data.hasMore || false);
    } catch (error) {
      console.error('리뷰 불러오기 오류:', error);
    } finally {
      setReviewsLoading(false);
    }
  };
  
  // 날짜 포맷팅 (n일 전)
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - date.getTime());
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) {
      return '오늘';
    } else if (diffDays < 30) {
      return `${diffDays}일 전`;
    } else if (diffDays < 365) {
      const months = Math.floor(diffDays / 30);
      return `${months}개월 전`;
    } else {
      const years = Math.floor(diffDays / 365);
      return `${years}년 전`;
    }
  };
  
  return (
    <div className="mt-3">
      {/* 탭 헤더 */}
      <div className="flex border-b">
        <button
          className={`flex-1 py-3 text-center font-medium ${
            activeTab === 'info'
              ? 'text-green-600 border-b-2 border-green-600'
              : 'text-gray-500'
          }`}
          onClick={() => setActiveTab('info')}
        >
          상품정보
        </button>
        <button
          className={`flex-1 py-3 text-center font-medium ${
            activeTab === 'review'
              ? 'text-green-600 border-b-2 border-green-600'
              : 'text-gray-500'
          }`}
          onClick={() => setActiveTab('review')}
        >
          리뷰 {reviewsCount > 0 && `(${reviewsCount})`}
        </button>
      </div>
      
      {/* 탭 콘텐츠 */}
      <div className="p-4">
        {/* 상품 정보 탭 */}
        {activeTab === 'info' && (
          <div>
            <h3 className="text-lg font-semibold mb-3">상품 상세정보</h3>
            
            {/* 유기농 인증 정보 */}
            {product.is_organic && (
              <div className="mb-4 p-3 bg-green-50 rounded-md">
                <div className="flex items-center text-green-800">
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5 mr-2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span className="font-semibold">유기농 인증 제품</span>
                </div>
                <p className="mt-1 text-sm text-green-700">
                  본 제품은 친환경 유기농 인증을 받은 농산물입니다. 화학 비료와 농약을 사용하지 않고 재배되었습니다.
                </p>
              </div>
            )}
            
            {/* 상품 설명 */}
            <div className="whitespace-pre-line text-gray-700">
              {product.description || '상품 설명이 없습니다.'}
            </div>
            
            {/* 상품 정보 테이블 */}
            <div className="mt-6 border-t border-gray-200 pt-4">
              <h4 className="font-medium mb-2">상품 정보</h4>
              <table className="w-full text-sm">
                <tbody>
                  <tr className="border-b border-gray-100">
                    <th className="py-2 text-left text-gray-500 pr-4 align-top">원산지</th>
                    <td className="py-2">{product.origin || '국내산'}</td>
                  </tr>
                  {product.harvest_date && (
                    <tr className="border-b border-gray-100">
                      <th className="py-2 text-left text-gray-500 pr-4 align-top">수확일</th>
                      <td className="py-2">{new Date(product.harvest_date).toLocaleDateString()}</td>
                    </tr>
                  )}
                  {product.storage_method && (
                    <tr className="border-b border-gray-100">
                      <th className="py-2 text-left text-gray-500 pr-4 align-top">보관방법</th>
                      <td className="py-2">{product.storage_method}</td>
                    </tr>
                  )}
                  <tr className="border-b border-gray-100">
                    <th className="py-2 text-left text-gray-500 pr-4 align-top">유기농 여부</th>
                    <td className="py-2">{product.is_organic ? '유기농' : '일반'}</td>
                  </tr>
                </tbody>
              </table>
            </div>
            
            {/* 품질 보증 안내 */}
            <div className="mt-6 p-3 bg-gray-50 rounded-md">
              <h4 className="font-medium mb-2">품질 보증 안내</h4>
              <ul className="text-sm text-gray-600 list-disc pl-5 space-y-1">
                <li>당일 수확된 신선한 농산물을 배송합니다.</li>
                <li>상품에 문제가 있을 경우 수령 후 24시간 이내에 사진과 함께 고객센터로 연락 주시면 교환/환불해 드립니다.</li>
                <li>신선식품의 특성상 단순 변심에 의한 교환/환불은 불가합니다.</li>
              </ul>
            </div>
          </div>
        )}
        
        {/* 리뷰 탭 */}
        {activeTab === 'review' && (
          <div>
            {/* 리뷰 요약 */}
            <div className="bg-gray-50 p-4 rounded-lg mb-6">
              <div className="flex items-center space-x-2">
                <div className="flex">
                  {Array.from({ length: 5 }).map((_, i) => (
                    i < Math.round(averageRating) ? (
                      <StarIcon key={i} className="h-5 w-5 text-yellow-400" />
                    ) : (
                      <StarIconOutline key={i} className="h-5 w-5 text-yellow-400" />
                    )
                  ))}
                </div>
                <span className="font-medium text-lg">{averageRating.toFixed(1)}</span>
                <span className="text-gray-500">({reviewsCount}개)</span>
              </div>
            </div>
            
            {/* 리뷰 목록 */}
            {reviewsLoading && page === 1 ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-green-500 mx-auto"></div>
                <p className="mt-2 text-gray-500">리뷰를 불러오는 중입니다...</p>
              </div>
            ) : reviews.length === 0 ? (
              <div className="text-center py-8 bg-gray-50 rounded-lg">
                <p className="text-gray-500">아직 리뷰가 없습니다.</p>
              </div>
            ) : (
              <div className="space-y-6">
                {reviews.map((review) => (
                  <div key={review.id} className="border-b border-gray-200 pb-6">
                    <div className="flex items-center space-x-2 mb-2">
                      <div className="flex">
                        {Array.from({ length: 5 }).map((_, i) => (
                          i < review.rating ? (
                            <StarIcon key={i} className="h-4 w-4 text-yellow-400" />
                          ) : (
                            <StarIconOutline key={i} className="h-4 w-4 text-yellow-400" />
                          )
                        ))}
                      </div>
                      <span className="font-medium text-sm">{review.username}</span>
                      <span className="text-gray-500 text-xs">
                        {formatDate(review.created_at)}
                      </span>
                    </div>
                    
                    <h3 className="font-medium mb-1">{review.title}</h3>
                    <p className="text-gray-700 text-sm mb-3">{review.content}</p>
                    
                    {/* 리뷰 이미지 */}
                    {review.images && review.images.length > 0 && (
                      <div className="flex space-x-2 overflow-x-auto pb-2">
                        {review.images.map((imageUrl, index) => (
                          <div key={index} className="relative w-16 h-16 flex-shrink-0">
                            <Image
                              src={imageUrl}
                              alt={`리뷰 이미지 ${index + 1}`}
                              fill
                              sizes="64px"
                              className="object-cover rounded"
                            />
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
                
                {/* 더보기 버튼 */}
                {hasMore && (
                  <div className="text-center">
                    <button
                      onClick={() => setPage(prev => prev + 1)}
                      className="px-4 py-2 border border-gray-300 rounded-md text-sm text-gray-700 hover:bg-gray-50"
                      disabled={reviewsLoading}
                    >
                      {reviewsLoading ? '불러오는 중...' : '더보기'}
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
} 