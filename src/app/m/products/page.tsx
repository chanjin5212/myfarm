'use client';

import { useState, useEffect, useCallback, Suspense, memo, useMemo } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { Spinner } from '@/components/ui/CommonStyles';

interface Product {
  id: string;
  name: string;
  price: number;
  thumbnail_url?: string;
  is_organic?: boolean;
}

// URL 파라미터를 처리하는 컴포넌트
const ProductParamsHandler = memo(({ 
  setInitialFilters 
}: { 
  setInitialFilters: (params: { 
    sortOption: string,
    pageParam: string | null
  }) => void 
}) => {
  const searchParams = useSearchParams();
  
  useEffect(() => {
    // URL 쿼리 파라미터
    const sortOption = searchParams?.get('sort') ?? 'newest';
    const pageParam = searchParams?.get('page') ?? null;
    
    setInitialFilters({
      sortOption,
      pageParam
    });
  }, [searchParams, setInitialFilters]);
  
  return null;
});

ProductParamsHandler.displayName = 'ProductParamsHandler';

// 상품 카드 컴포넌트 메모이제이션
const ProductCard = memo(({ product }: { product: Product }) => {
  return (
    <Link href={`/m/products/${product.id}`} className="block w-full">
      <div className="flex flex-col">
        <div className="aspect-square rounded-lg overflow-hidden relative">
          <Image
            src={product.thumbnail_url || '/images/default-product.jpg'}
            alt={product.name}
            fill
            sizes="(max-width: 768px) 33vw"
            className="object-cover"
            loading="lazy"
            placeholder="blur"
            blurDataURL="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII="
          />
          {product.is_organic && (
            <div className="absolute top-1 left-1 bg-green-100 text-green-800 text-xs font-semibold px-1.5 py-0.5 rounded-full">
              유기농
            </div>
          )}
        </div>
        <div className="mt-1.5">
          <h3 className="text-xs line-clamp-2">{product.name}</h3>
          <div className="mt-0.5">
            <div className="font-bold text-sm">{product.price.toLocaleString()}원</div>
          </div>
        </div>
      </div>
    </Link>
  );
});

ProductCard.displayName = 'ProductCard';

function MobileProductsPage() {
  const router = useRouter();
  
  // 초기 필터 값 저장용 상태
  const [initialFilters, setInitialFilters] = useState({
    sortOption: 'newest',
    pageParam: null as string | null
  });
  
  // 상태 관리
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [totalCount, setTotalCount] = useState(0);
  const [initialLoadDone, setInitialLoadDone] = useState(false);
  
  // 필터 상태
  const [selectedSort, setSelectedSort] = useState<string>('newest');
  
  // initialFilters가 설정되면 실제 상태에 적용
  useEffect(() => {
    // 페이지 로드 시 초기 필터 적용
    setSelectedSort(initialFilters.sortOption);
    setPage(initialFilters.pageParam ? parseInt(initialFilters.pageParam) : 1);
    
    // 초기 필터 설정 완료 플래그
    setInitialLoadDone(true);
  }, [initialFilters]);
  
  // URL 쿼리 업데이트 함수
  const updateQueryParams = useCallback((newSort: string, newPage: number) => {
    const params = new URLSearchParams();
    
    if (newSort) params.set('sort', newSort);
    if (newPage > 1) params.set('page', newPage.toString());
    
    router.push(`/m/products?${params.toString()}`);
  }, [router]);
  
  // 정렬 변경 핸들러
  const handleSortChange = useCallback((newSort: string) => {
    setSelectedSort(newSort);
    setPage(1);
    updateQueryParams(newSort, 1);
  }, [updateQueryParams]);
  
  // 상품 목록 가져오기
  useEffect(() => {
    if (!initialLoadDone) return;
    
    let isMounted = true;
    const controller = new AbortController();
    
    const fetchProducts = async () => {
      setLoading(true);
      setError(null);
      
      try {
        const params = new URLSearchParams();
        if (selectedSort) params.append('sort', selectedSort);
        params.append('page', page.toString());
        params.append('limit', '12');
        
        const response = await fetch(`/api/products?${params.toString()}`, {
          signal: controller.signal
        });
        
        if (!response.ok) {
          throw new Error(`상품 정보를 불러오는데 실패했습니다. (상태 코드: ${response.status})`);
        }
        
        const data = await response.json();
        
        if (isMounted) {
          if (page === 1) {
            setProducts(data.products || []);
          } else {
            setProducts(prev => [...prev, ...(data.products || [])]);
          }
          
          setTotalCount(data.total || 0);
          setHasMore(data.hasMore || false);
        }
      } catch (error) {
        if (error instanceof Error && error.name !== 'AbortError' && isMounted) {
          console.error('상품 로딩 오류:', error);
          setError(error instanceof Error ? error.message : '상품을 불러오는 중 오류가 발생했습니다.');
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };
    
    fetchProducts();
    
    return () => {
      isMounted = false;
      controller.abort();
    };
  }, [selectedSort, page, initialLoadDone]);
  
  // 더보기 버튼 클릭 핸들러
  const handleLoadMore = useCallback(() => {
    if (!loading && hasMore) {
      setPage(prev => prev + 1);
    }
  }, [loading, hasMore]);
  
  // 정렬 옵션 메모이제이션
  const sortOptions = useMemo(() => [
    { value: 'newest', label: '최신순' },
    { value: 'price_low', label: '가격 낮은순' },
    { value: 'price_high', label: '가격 높은순' },
    { value: 'popular', label: '인기순' }
  ], []);
  
  return (
    <div className="pb-6">
      {/* ProductParamsHandler 추가 */}
      <ProductParamsHandler setInitialFilters={setInitialFilters} />
      
      {/* 헤더 */}
      <div className="sticky top-16 z-10 bg-white shadow-sm">
        <div className="flex items-center p-2 border-b">
          {/* 정렬 드롭다운 */}
          <select 
            value={selectedSort}
            onChange={(e) => handleSortChange(e.target.value)}
            className="bg-transparent text-sm border-none text-gray-700 px-2 py-1 focus:outline-none"
          >
            {sortOptions.map(option => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
      </div>
      
      {/* 상품 목록 섹션 */}
      <div className="px-2 pt-3">
        {/* 상품 수 표시 */}
        <p className="text-sm text-gray-500 mb-3 px-1">
          총 {totalCount}개 상품
        </p>
        
        {/* 에러 표시 */}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4">
            <p className="text-sm">{error}</p>
          </div>
        )}
        
        {/* 상품 목록 */}
        <div className="grid grid-cols-3 gap-2">
          {products.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
        
        {/* 로딩 상태 */}
        {loading && (
          <div className="flex flex-col items-center justify-center py-8">
            <Spinner size="md" className="mb-2" />
            <p className="text-sm text-gray-500">상품 정보를 불러오고 있습니다</p>
          </div>
        )}
        
        {/* 더보기 버튼 */}
        {!loading && hasMore && products.length > 0 && (
          <div className="text-center py-6">
            <button
              onClick={handleLoadMore}
              className="bg-white border border-gray-300 rounded-md px-4 py-2 text-sm hover:bg-gray-50"
            >
              더 보기
            </button>
          </div>
        )}
        
        {/* 상품 없음 메시지 */}
        {!loading && products.length === 0 && !error && (
          <div className="flex flex-col items-center justify-center py-12">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-12 h-12 text-gray-300 mb-3">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
            </svg>
            <p className="text-gray-500">상품이 없습니다</p>
          </div>
        )}
      </div>
    </div>
  );
}

export default memo(function Products() {
  return (
    <Suspense fallback={
      <div className="flex flex-col items-center justify-center min-h-screen">
        <Spinner size="lg" className="mb-4" />
        <p className="text-gray-500">상품 정보를 불러오고 있습니다</p>
      </div>
    }>
      <MobileProductsPage />
    </Suspense>
  );
}); 