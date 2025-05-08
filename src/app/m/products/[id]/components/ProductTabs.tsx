import React, { useState, useEffect, useCallback, memo, useMemo, lazy, Suspense } from 'react';
import Image from 'next/image';
import { StarIcon } from '@heroicons/react/24/solid';
import { StarIcon as StarIconOutline } from '@heroicons/react/24/outline';
import { Spinner } from '@/components/ui/CommonStyles';
import { useProductContext } from './ProductContext';

// 코드 스플리팅을 위한 ProductInquiry 컴포넌트 지연 로딩
const ProductInquiry = lazy(() => import('./ProductInquiry'));

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
  activeTab: 'info' | 'review' | 'inquiry';
  setActiveTab: (tab: 'info' | 'review' | 'inquiry') => void;
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
  image_url?: string;
}

// 별점 렌더링 메모이제이션 컴포넌트
const RatingStars = memo(({ rating, size = 'normal' }: { rating: number, size?: 'small' | 'normal' }) => {
  const starSize = size === 'small' ? "h-4 w-4" : "h-5 w-5";
  
  return (
    <div className="flex">
      {Array.from({ length: 5 }).map((_, i) => (
        i < Math.round(rating) ? (
          <StarIcon key={i} className={`${starSize} text-yellow-400`} />
        ) : (
          <StarIconOutline key={i} className={`${starSize} text-yellow-400`} />
        )
      ))}
    </div>
  );
});

RatingStars.displayName = 'RatingStars';

// 리뷰 항목 컴포넌트
const ReviewItem = memo(({ review, formatDate }: { 
  review: Review, 
  formatDate: (date: string) => string 
}) => {
  return (
    <div className="border-b border-gray-200 pb-6">
      <div className="flex items-center space-x-2 mb-2">
        <RatingStars rating={review.rating} size="small" />
        <span className="font-medium text-sm">{review.username}</span>
        <span className="text-gray-500 text-xs">
          {formatDate(review.created_at)}
        </span>
      </div>
      
      <h3 className="font-medium mb-1">{review.title || '리뷰'}</h3>
      <p className="text-gray-700 text-sm mb-3">{review.content}</p>
      
      {/* 리뷰 이미지 표시 */}
      {review.image_url && review.image_url.trim() !== '' && (
        <div className="mt-2 mb-3">
          <div className="relative w-full h-52 bg-gray-100 rounded-md overflow-hidden">
            <Image
              src={review.image_url}
              alt="리뷰 이미지"
              fill
              sizes="(max-width: 768px) 100vw, 400px"
              className="object-contain"
              loading="lazy"
              unoptimized={review.image_url?.includes('blob:')}
            />
          </div>
        </div>
      )}
    </div>
  );
});

ReviewItem.displayName = 'ReviewItem';

// 상품 정보 탭 컴포넌트
const InfoTab = memo(({ product }: { product: ProductTabsProps['product'] }) => {
  const formattedHarvestDate = useMemo(() => {
    if (!product.harvest_date) return null;
    return new Date(product.harvest_date).toLocaleDateString();
  }, [product.harvest_date]);
  
  return (
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
                <td className="py-2">{formattedHarvestDate}</td>
              </tr>
            )}
            {product.storage_method && (
              <tr className="border-b border-gray-100">
                <th className="py-2 text-left text-gray-500 pr-4 align-top">보관방법</th>
                <td className="py-2">{product.storage_method}</td>
              </tr>
            )}
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
  );
});

InfoTab.displayName = 'InfoTab';

// 리뷰 탭 컴포넌트
const ReviewTab = memo(({ 
  productId, 
  reviews, 
  reviewsLoading, 
  reviewsCount, 
  averageRating, 
  hasMore, 
  formatDate,
  loadMoreReviews
}: { 
  productId: string,
  reviews: Review[],
  reviewsLoading: boolean,
  reviewsCount: number,
  averageRating: number,
  hasMore: boolean,
  formatDate: (date: string) => string,
  loadMoreReviews: () => void
}) => {
  return (
    <div>
      {/* 리뷰 요약 */}
      <div className="bg-gray-50 p-4 rounded-lg mb-6">
        <div className="flex items-center space-x-2">
          <RatingStars rating={averageRating} />
          <span className="font-medium text-lg">{averageRating.toFixed(1)}</span>
          <span className="text-gray-500">({reviewsCount}개)</span>
        </div>
      </div>
      
      {/* 리뷰 목록 */}
      {reviewsLoading && reviews.length === 0 ? (
        <div className="text-center py-8">
          <Spinner size="md" className="mx-auto mb-2" />
          <p className="mt-2 text-gray-500">리뷰를 불러오는 중입니다...</p>
        </div>
      ) : reviews.length === 0 ? (
        <div className="text-center py-8 bg-gray-50 rounded-lg">
          <p className="text-gray-500">아직 리뷰가 없습니다.</p>
        </div>
      ) : (
        <div className="space-y-6">
          {reviews.map((review) => (
            <ReviewItem 
              key={review.id} 
              review={review}
              formatDate={formatDate}
            />
          ))}
          
          {/* 더보기 버튼 */}
          {hasMore && (
            <div className="text-center">
              <button
                onClick={loadMoreReviews}
                className="px-4 py-2 border border-gray-300 rounded-md text-sm text-gray-700 hover:bg-gray-50"
                disabled={reviewsLoading}
              >
                {reviewsLoading ? (
                  <Spinner size="sm" className="mx-auto" />
                ) : (
                  '더보기'
                )}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
});

ReviewTab.displayName = 'ReviewTab';

const MobileProductTabs = memo(({ product, activeTab, setActiveTab }: ProductTabsProps) => {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [reviewsLoading, setReviewsLoading] = useState(false);
  const [reviewsCount, setReviewsCount] = useState(0);
  const { inquiriesCount, setInquiriesCount } = useProductContext();
  const [averageRating, setAverageRating] = useState(0);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  
  // 리뷰 데이터 가져오기
  useEffect(() => {
    if (activeTab === 'review') {
      fetchReviews();
    }
  }, [activeTab, product.id, page]);
  
  // 초기 로딩시 리뷰와 문의 개수 가져오기
  useEffect(() => {
    if (product.id) {
      const controller = new AbortController();
      
      // 리뷰 개수 가져오기
      fetch(`/api/products/${product.id}/reviews?page=1&limit=1`, {
        signal: controller.signal
      })
        .then(res => res.json())
        .then(data => {
          setReviewsCount(data.total || 0);
          setAverageRating(data.averageRating || 0);
        })
        .catch(error => {
          if (error.name !== 'AbortError') {
            console.error('리뷰 개수 조회 오류:', error);
          }
        });
      
      // 문의 개수 가져오기
      fetch(`/api/products/${product.id}/inquiries?page=1&limit=1`, {
        signal: controller.signal
      })
        .then(res => res.json())
        .then(data => {
          setInquiriesCount(data.total || 0);
        })
        .catch(error => {
          if (error.name !== 'AbortError') {
            console.error('문의 개수 조회 오류:', error);
          }
        });
        
      return () => {
        controller.abort();
      };
    }
  }, [product.id, setInquiriesCount]);
  
  const fetchReviews = useCallback(async () => {
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
  }, [product.id, page]);
  
  // 더보기 버튼 클릭 핸들러
  const loadMoreReviews = useCallback(() => {
    if (!reviewsLoading && hasMore) {
      setPage(prevPage => prevPage + 1);
    }
  }, [reviewsLoading, hasMore]);
  
  // 날짜 포맷팅 (n일 전)
  const formatDate = useCallback((dateString: string) => {
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
  }, []);
  
  // 탭별 컨텐츠 렌더링
  const renderTabContent = useMemo(() => {
    switch (activeTab) {
      case 'info':
        return <InfoTab product={product} />;
      case 'review':
        return (
          <ReviewTab 
            productId={product.id}
            reviews={reviews}
            reviewsLoading={reviewsLoading}
            reviewsCount={reviewsCount}
            averageRating={averageRating}
            hasMore={hasMore}
            formatDate={formatDate}
            loadMoreReviews={loadMoreReviews}
          />
        );
      case 'inquiry':
        return (
          <Suspense fallback={
            <div className="text-center py-8">
              <Spinner size="md" className="mx-auto mb-2" />
              <p className="mt-2 text-gray-500">문의 내역을 불러오는 중입니다...</p>
            </div>
          }>
            <ProductInquiry productId={product.id} />
          </Suspense>
        );
      default:
        return null;
    }
  }, [activeTab, product, reviews, reviewsLoading, reviewsCount, averageRating, hasMore, formatDate, loadMoreReviews]);
  
  // 탭 전환 핸들러
  const handleTabChange = useCallback((tab: 'info' | 'review' | 'inquiry') => {
    setActiveTab(tab);
  }, [setActiveTab]);
  
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
          onClick={() => handleTabChange('info')}
        >
          상품정보
        </button>
        <button
          className={`flex-1 py-3 text-center font-medium ${
            activeTab === 'review'
              ? 'text-green-600 border-b-2 border-green-600'
              : 'text-gray-500'
          }`}
          onClick={() => handleTabChange('review')}
        >
          리뷰{`(${reviewsCount})`}
        </button>
        <button
          className={`flex-1 py-3 text-center font-medium ${
            activeTab === 'inquiry'
              ? 'text-green-600 border-b-2 border-green-600'
              : 'text-gray-500'
          }`}
          onClick={() => handleTabChange('inquiry')}
        >
          문의{`(${inquiriesCount})`}
        </button>
      </div>
      
      {/* 탭 콘텐츠 */}
      <div className="p-4">
        {renderTabContent}
      </div>
    </div>
  );
});

MobileProductTabs.displayName = 'MobileProductTabs';

export default MobileProductTabs; 