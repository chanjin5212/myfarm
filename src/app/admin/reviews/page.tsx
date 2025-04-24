'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { Button, Spinner } from '@/components/ui/CommonStyles';
import toast from 'react-hot-toast';

// 가격 포맷팅 함수
const formatPrice = (price: number) => {
  return price.toLocaleString('ko-KR') + '원';
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
          className={`w-4 h-4 ${
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
      <span className="ml-1 text-sm font-medium text-gray-600">{rating.toFixed(1)}</span>
    </div>
  );
};

// 상품 타입 정의
interface Product {
  id: string;
  name: string;
  price: number;
  thumbnail_url: string;
  average_rating: number;
  review_count: number;
}

export default function AdminReviewsPage() {
  const router = useRouter();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [sortBy, setSortBy] = useState('review_count');
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
      fetchProducts();
    }
  }, [router]);

  // 정렬 조건이나 페이지 변경 시 상품 목록 다시 로드
  useEffect(() => {
    if (adminToken) {
      fetchProducts();
    }
  }, [currentPage, sortBy, sortOrder, adminToken]);

  // 상품별 리뷰 통계 가져오기
  const fetchProducts = async () => {
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
      queryParams.append('limit', '12'); // 페이지당 12개 상품
      queryParams.append('sort', sortBy);
      queryParams.append('order', sortOrder);
      
      if (searchTerm) {
        queryParams.append('search', searchTerm);
      }
      
      const response = await fetch(`/api/admin/reviews?${queryParams.toString()}`, {
        headers: {
          'Authorization': `Bearer ${adminToken}`
        }
      });
      
      if (!response.ok) {
        throw new Error('상품별 리뷰 통계를 가져오는데 실패했습니다');
      }
      
      const data = await response.json();
      setProducts(data.products || []);
      setTotalPages(data.totalPages || 1);
    } catch (error) {
      console.error('상품별 리뷰 통계 로딩 오류:', error);
      toast.error('리뷰 통계를 불러오는데 실패했습니다');
    } finally {
      setLoading(false);
    }
  };

  // 검색 핸들러
  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setCurrentPage(1);
    fetchProducts();
  };

  // 정렬 변경 핸들러
  const handleSortChange = (value: string) => {
    const [field, order] = value.split('-');
    
    // 현재 스크롤 위치 저장
    const scrollPosition = window.scrollY;
    
    if (field === 'rating' || field === 'review_count' || field === 'created_at') {
      setSortBy(field);
      setSortOrder(order);
      setCurrentPage(1);
      
      // 데이터 로딩이 완료된 후 원래 스크롤 위치로 복원
      setTimeout(() => {
        window.scrollTo(0, scrollPosition);
      }, 100);
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

  return (
    <div className="container mx-auto py-6 px-2 sm:px-4 pt-20">
      <div className="mb-6">
        <h1 className="text-2xl font-bold mb-4">리뷰 관리</h1>
        
        {/* 검색 및 정렬 */}
        <div className="flex flex-col md:flex-row justify-between mb-4 gap-4">
          <form onSubmit={handleSearch} className="flex gap-2">
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="상품명 검색"
              className="border border-gray-300 rounded px-3 py-2 flex-grow"
            />
            <Button type="submit">검색</Button>
          </form>
          
          <div className="flex items-center">
            <label htmlFor="sort" className="mr-2 text-sm font-medium text-gray-700">정렬:</label>
            <select
              id="sort"
              value={`${sortBy}-${sortOrder}`}
              onChange={(e) => handleSortChange(e.target.value)}
              className="border border-gray-300 rounded px-3 py-2"
            >
              <option value="review_count-desc">리뷰 많은순</option>
              <option value="review_count-asc">리뷰 적은순</option>
              <option value="rating-desc">평점 높은순</option>
              <option value="rating-asc">평점 낮은순</option>
              <option value="created_at-desc">최신순</option>
              <option value="created_at-asc">오래된순</option>
            </select>
          </div>
        </div>
      </div>
      
      {/* 상품별 리뷰 통계 */}
      {loading ? (
        <div className="flex justify-center items-center h-64">
          <Spinner size="lg" />
        </div>
      ) : products.length === 0 ? (
        <div className="bg-white rounded-lg shadow p-6 text-center">
          <p className="text-gray-500">리뷰가 있는 상품이 없습니다</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {products.map((product) => (
            <Link 
              key={product.id} 
              href={`/admin/reviews/${product.id}`} 
              className="block"
            >
              <div className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow p-4">
                <h3 className="font-medium text-gray-900 mb-2 truncate">{product.name}</h3>
                <p className="text-gray-600 text-sm mb-2">{formatPrice(product.price)}</p>
                
                <div className="flex items-center justify-between">
                  <StarRating rating={product.average_rating} />
                  <span className="text-sm text-gray-600">리뷰 {product.review_count}개</span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
      
      {/* 페이지네이션 */}
      {!loading && products.length > 0 && renderPagination()}
    </div>
  );
} 