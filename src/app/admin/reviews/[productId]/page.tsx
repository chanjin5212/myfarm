'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { use } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { Button, Spinner } from '@/components/ui/CommonStyles';
import toast from 'react-hot-toast';

// 가격 포맷팅 함수
const formatPrice = (price: number) => {
  return price.toLocaleString('ko-KR') + '원';
};

// 날짜 포맷팅 함수
const formatDate = (dateString: string) => {
  const date = new Date(dateString);
  return date.toLocaleString('ko-KR', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
};

// 별점 표시 컴포넌트
const StarRating = ({ rating }: { rating: number }) => {
  const fullStars = Math.floor(rating);
  const hasHalfStar = rating - fullStars >= 0.5;
  
  return (
    <div className="flex items-center">
      {[...Array(5)].map((_, i) => (
        <svg 
          key={i} 
          className={`w-5 h-5 ${
            i < fullStars 
              ? 'text-yellow-400' 
              : i === fullStars && hasHalfStar 
                ? 'text-yellow-400' 
                : 'text-gray-300'
          }`}
          fill="currentColor" 
          viewBox="0 0 20 20" 
          xmlns="http://www.w3.org/2000/svg"
        >
          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
        </svg>
      ))}
      <span className="ml-2 text-base font-medium text-gray-900 whitespace-nowrap">{rating.toFixed(1)}점</span>
    </div>
  );
};

// 평점 분포 컴포넌트
const RatingDistribution = ({ starCounts, totalReviews }: { starCounts: number[], totalReviews: number }) => {
  return (
    <div className="space-y-2">
      {[5, 4, 3, 2, 1].map((star) => (
        <div key={star} className="flex items-center">
          <div className="flex items-center w-24">
            <span className="text-sm font-medium text-gray-700 mr-2 whitespace-nowrap">{star}점</span>
            <div className="flex">
              {[...Array(star)].map((_, i) => (
                <svg 
                  key={i} 
                  className="w-3 h-3 text-yellow-400"
                  fill="currentColor" 
                  viewBox="0 0 20 20" 
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                </svg>
              ))}
            </div>
          </div>
          <div className="w-full h-2 mx-4 bg-gray-200 rounded">
            <div 
              className="h-2 bg-yellow-400 rounded"
              style={{ width: `${totalReviews > 0 ? (starCounts[star-1] / totalReviews) * 100 : 0}%` }}
            ></div>
          </div>
          <div className="text-sm text-gray-600 min-w-[60px] whitespace-nowrap">
            {starCounts[star-1]} ({totalReviews > 0 ? ((starCounts[star-1] / totalReviews) * 100).toFixed(0) : 0}%)
          </div>
        </div>
      ))}
    </div>
  );
};

// 타입 정의
interface Product {
  id: string;
  name: string;
  price: number;
  thumbnail_url: string;
}

interface Review {
  id: string;
  product_id: string;
  user_id: string;
  rating: number;
  content: string;
  created_at: string;
  likes_count: number;
  user_name: string;
  user_avatar: string | null;
  images?: string[];
}

interface ProductReviews {
  product: Product;
  reviews: Review[];
  total_reviews: number;
  average_rating: number;
  star_counts: number[];
  page: number;
  totalPages: number;
}

export default function AdminProductReviewsPage({
  params
}: {
  params: Promise<{ productId: string }>
}) {
  const router = useRouter();
  const resolvedParams = use(params);
  const { productId } = resolvedParams;
  
  const [productReviews, setProductReviews] = useState<ProductReviews | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [sortBy, setSortBy] = useState('created_at');
  const [sortOrder, setSortOrder] = useState('desc');
  const [adminToken, setAdminToken] = useState<string | null>(null);
  
  // 페이지 로드 시 관리자 토큰 확인
  useEffect(() => {
    const token = localStorage.getItem('adminToken');
    setAdminToken(token);
    
    if (!token) {
      toast.error('로그인이 필요합니다');
      router.push('/admin/login');
    } else {
      fetchProductReviews();
    }
  }, [router, productId]);
  
  // 정렬 변경 핸들러
  const handleSortChange = (value: string) => {
    // value 형식: 'field_order' (예: 'rating_asc')
    const [field, order] = value.split('_');
    setSortBy(field);
    setSortOrder(order);
    setCurrentPage(1);
    fetchProductReviews(); // 정렬 변경 시 리뷰 목록 다시 로드
  };
  
  // 정렬 조건이나 페이지 변경 시 리뷰 목록 다시 로드
  useEffect(() => {
    if (adminToken) {
      fetchProductReviews();
    }
  }, [currentPage, sortBy, sortOrder, adminToken]);
  
  // 상품 리뷰 목록 가져오기
  const fetchProductReviews = async () => {
    try {
      setLoading(true);
      const adminToken = localStorage.getItem('adminToken');
      
      if (!adminToken) {
        toast.error('관리자 권한이 없습니다');
        router.push('/admin/login');
        return;
      }
      
      // 쿼리 파라미터 구성
      const queryParams = new URLSearchParams();
      queryParams.append('page', currentPage.toString());
      queryParams.append('limit', '10');
      queryParams.append('sort', sortBy);
      queryParams.append('order', sortOrder);
      
      const response = await fetch(`/api/admin/reviews/${productId}?${queryParams.toString()}`, {
        headers: {
          'Authorization': `Bearer ${adminToken}`
        }
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || '리뷰 목록을 가져오는데 실패했습니다');
      }
      
      const data = await response.json();
      setProductReviews(data);
    } catch (error) {
      console.error('리뷰 목록 로딩 오류:', error);
      toast.error(error instanceof Error ? error.message : '리뷰 목록을 불러오는데 실패했습니다');
    } finally {
      setLoading(false);
    }
  };
  
  // 페이지네이션 렌더링
  const renderPagination = () => {
    if (!productReviews) return null;
    
    const { totalPages } = productReviews;
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
  
  // 리뷰 삭제 핸들러
  const handleDeleteReview = async (reviewId: string) => {
    try {
      const adminToken = localStorage.getItem('adminToken');
      if (!adminToken) {
        toast.error('관리자 권한이 없습니다');
        router.push('/admin/login');
        return;
      }
      
      if (!confirm('정말로 이 리뷰를 삭제하시겠습니까?')) {
        return;
      }
      
      const response = await fetch(`/api/admin/reviews/delete/${reviewId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${adminToken}`
        }
      });
      
      if (!response.ok) {
        throw new Error('리뷰 삭제에 실패했습니다');
      }
      
      toast.success('리뷰가 삭제되었습니다');
      fetchProductReviews(); // 리뷰 목록 다시 로드
    } catch (error) {
      console.error('리뷰 삭제 오류:', error);
      toast.error('리뷰 삭제에 실패했습니다');
    }
  };
  
  if (loading) {
    return (
      <div className="container mx-auto py-6 px-2 sm:px-4 pt-20">
        <div className="flex justify-center items-center h-64">
          <Spinner size="lg" />
        </div>
      </div>
    );
  }
  
  if (!productReviews) {
    return (
      <div className="container mx-auto py-6 px-2 sm:px-4 pt-20">
        <div className="bg-white rounded-lg shadow p-6 text-center">
          <p className="text-gray-500">상품 정보를 불러올 수 없습니다</p>
          <Button onClick={() => router.push('/admin/reviews')} className="mt-4">
            리뷰 목록으로 돌아가기
          </Button>
        </div>
      </div>
    );
  }
  
  const { product, reviews, total_reviews, average_rating, star_counts } = productReviews;
  
  return (
    <div className="container mx-auto py-6 px-2 sm:px-4 pt-20">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">리뷰 관리</h1>
          <p className="text-gray-600">{product.name}</p>
        </div>
        <Button onClick={() => router.push('/admin/reviews')}>리뷰 목록으로</Button>
      </div>

      {/* 리뷰 통계 */}
      <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
        <h2 className="text-lg font-semibold mb-4">리뷰 통계</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <div className="flex items-center mb-2">
              <StarRating rating={average_rating} />
              <span className="ml-3 text-base text-gray-500 whitespace-nowrap">
                (총 {total_reviews}개 리뷰)
              </span>
            </div>
            <RatingDistribution starCounts={star_counts} totalReviews={total_reviews} />
          </div>
          <div>
            <h3 className="font-medium mb-2">상품 정보</h3>
            <div className="text-gray-600">
              <p className="mb-1">상품명: {product.name}</p>
              <p>가격: {formatPrice(product.price)}</p>
            </div>
          </div>
        </div>
      </div>

      {/* 정렬 옵션 */}
      <div className="bg-white rounded-lg shadow-sm p-4 mb-6">
        <div className="flex items-center">
          <label htmlFor="sortReviews" className="mr-2 text-sm font-medium text-gray-700">정렬:</label>
          <select
            id="sortReviews"
            value={`${sortBy}_${sortOrder}`}
            onChange={(e) => handleSortChange(e.target.value)}
            className="border border-gray-300 rounded px-3 py-2 flex-grow"
          >
            <option value="created_at_desc">최신순</option>
            <option value="created_at_asc">오래된순</option>
            <option value="rating_desc">평점 높은순</option>
            <option value="rating_asc">평점 낮은순</option>
          </select>
        </div>
      </div>

      {/* 리뷰 목록 */}
      {reviews.length === 0 ? (
        <div className="bg-white rounded-lg shadow p-6 text-center">
          <p className="text-gray-500">리뷰가 없습니다</p>
        </div>
      ) : (
        <div className="space-y-4">
          {reviews.map((review) => (
            <div key={review.id} className="bg-white rounded-lg shadow-md p-4">
              <div className="flex justify-between items-start mb-3">
                <div className="flex items-center">
                  <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center text-gray-600 mr-3">
                    {review.user_avatar ? (
                      <Image 
                        src={review.user_avatar} 
                        alt={review.user_name} 
                        width={40} 
                        height={40} 
                        className="rounded-full" 
                      />
                    ) : (
                      review.user_name.charAt(0).toUpperCase()
                    )}
                  </div>
                  <div>
                    <p className="font-medium">{review.user_name}</p>
                    <div className="flex items-center">
                      <div className="flex">
                        {[...Array(5)].map((_, i) => (
                          <svg 
                            key={i} 
                            className={`w-4 h-4 ${i < review.rating ? 'text-yellow-400' : 'text-gray-300'}`}
                            fill="currentColor" 
                            viewBox="0 0 20 20" 
                            xmlns="http://www.w3.org/2000/svg"
                          >
                            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                          </svg>
                        ))}
                      </div>
                      <span className="ml-2 text-sm text-gray-500 whitespace-nowrap">
                        {formatDate(review.created_at)}
                      </span>
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => handleDeleteReview(review.id)}
                  className="text-red-600 hover:text-red-800 text-sm"
                >
                  삭제
                </button>
              </div>
              
              <div className="mb-3">
                <p className="text-gray-700 whitespace-pre-line">{review.content}</p>
              </div>
              
              {/* 리뷰 이미지가 있는 경우 */}
              {review.images && review.images.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-2">
                  {review.images.map((image, index) => (
                    <div key={index} className="relative w-20 h-20 bg-gray-200 rounded">
                      <Image
                        src={image}
                        alt={`리뷰 이미지 ${index + 1}`}
                        className="object-cover rounded"
                        fill
                      />
                    </div>
                  ))}
                </div>
              )}
              
              <div className="mt-2 text-sm text-gray-600">
                <span className="flex items-center">
                  <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                  </svg>
                  좋아요 {review.likes_count}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
      
      {/* 페이지네이션 */}
      {reviews.length > 0 && renderPagination()}
    </div>
  );
} 