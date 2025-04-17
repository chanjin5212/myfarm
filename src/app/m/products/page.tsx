'use client';

import { useState, useEffect, useCallback } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';

interface Product {
  id: string;
  name: string;
  price: number;
  discount_price?: number;
  thumbnail_url?: string;
  is_organic?: boolean;
  category_name?: string;
}

interface Category {
  id: string;
  name: string;
}

function MobileProductsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  
  // URL 쿼리 파라미터
  const categoryId = searchParams.get('category');
  const searchQuery = searchParams.get('query');
  const sortOption = searchParams.get('sort') || 'newest';
  const minPrice = searchParams.get('min_price');
  const maxPrice = searchParams.get('max_price');
  const isOrganic = searchParams.get('organic');
  const pageParam = searchParams.get('page');
  
  // 상태 관리
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(pageParam ? parseInt(pageParam) : 1);
  const [hasMore, setHasMore] = useState(true);
  const [showFilters, setShowFilters] = useState(false);
  const [totalCount, setTotalCount] = useState(0);
  
  // 필터 상태
  const [selectedCategory, setSelectedCategory] = useState<string | null>(categoryId);
  const [selectedSort, setSelectedSort] = useState<string>(sortOption);
  const [priceRange, setPriceRange] = useState<{min?: number, max?: number}>({
    min: minPrice ? parseInt(minPrice) : undefined,
    max: maxPrice ? parseInt(maxPrice) : undefined
  });
  const [organicOnly, setOrganicOnly] = useState<boolean>(isOrganic === 'true');
  
  // URL 쿼리 업데이트 함수
  const updateQueryParams = useCallback(() => {
    const params = new URLSearchParams();
    
    if (selectedCategory) params.set('category', selectedCategory);
    if (searchQuery) params.set('query', searchQuery);
    if (selectedSort) params.set('sort', selectedSort);
    if (priceRange.min) params.set('min_price', priceRange.min.toString());
    if (priceRange.max) params.set('max_price', priceRange.max.toString());
    if (organicOnly) params.set('organic', 'true');
    if (page > 1) params.set('page', page.toString());
    
    router.push(`/m/products?${params.toString()}`);
  }, [selectedCategory, searchQuery, selectedSort, priceRange, organicOnly, page, router]);
  
  // 필터 적용 핸들러
  const applyFilters = () => {
    setPage(1);
    setShowFilters(false);
    updateQueryParams();
  };
  
  // 필터 초기화 핸들러
  const resetFilters = () => {
    setSelectedCategory(null);
    setSelectedSort('newest');
    setPriceRange({ min: undefined, max: undefined });
    setOrganicOnly(false);
    setPage(1);
    
    router.push('/m/products');
  };
  
  // 상품 목록 가져오기
  useEffect(() => {
    const fetchProducts = async () => {
      setLoading(true);
      
      try {
        const params = new URLSearchParams();
        if (selectedCategory) params.append('category', selectedCategory);
        if (searchQuery) params.append('search', searchQuery);
        if (selectedSort) params.append('sort', selectedSort);
        if (priceRange.min) params.append('min_price', priceRange.min.toString());
        if (priceRange.max) params.append('max_price', priceRange.max.toString());
        if (organicOnly) params.append('organic', 'true');
        params.append('page', page.toString());
        params.append('limit', '10');
        
        const response = await fetch(`/api/products?${params.toString()}`);
        const data = await response.json();
        
        // 첫 페이지이면 목록 초기화, 아니면 기존 목록에 추가
        if (page === 1) {
          setProducts(data.products || []);
        } else {
          setProducts(prev => [...prev, ...(data.products || [])]);
        }
        
        setTotalCount(data.total || 0);
        setHasMore(data.hasMore || false);
      } catch (error) {
        console.error('상품 로딩 오류:', error);
      } finally {
        setLoading(false);
      }
    };
    
    fetchProducts();
  }, [selectedCategory, searchQuery, selectedSort, priceRange, organicOnly, page]);
  
  // 카테고리 가져오기
  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const response = await fetch('/api/categories');
        const data = await response.json();
        setCategories(data.categories || []);
      } catch (error) {
        console.error('카테고리 로딩 오류:', error);
      }
    };
    
    fetchCategories();
  }, []);
  
  // 상품 카드 컴포넌트
  const ProductCard = ({ product }: { product: Product }) => {
    const discount = product.discount_price 
      ? Math.round(((product.price - product.discount_price) / product.price) * 100) 
      : 0;
    
    return (
      <Link href={`/m/products/${product.id}`} className="block">
        <div className="flex border-b pb-3">
          <div className="w-24 h-24 rounded-md overflow-hidden flex-shrink-0 relative">
            <Image
              src={product.thumbnail_url || '/images/default-product.jpg'}
              alt={product.name}
              fill
              sizes="96px"
              className="object-cover"
            />
            {product.is_organic && (
              <div className="absolute top-1 left-1 bg-green-100 text-green-800 text-xs font-semibold px-1.5 py-0.5 rounded-full">
                유기농
              </div>
            )}
          </div>
          <div className="ml-3 flex-grow">
            {product.category_name && (
              <span className="text-xs text-gray-500">{product.category_name}</span>
            )}
            <h3 className="font-medium text-sm line-clamp-2">{product.name}</h3>
            <div className="mt-1">
              {product.discount_price ? (
                <div className="flex items-baseline space-x-1">
                  <span className="line-through text-gray-400 text-xs">{product.price.toLocaleString()}원</span>
                  <span className="text-red-500 font-semibold text-xs">{discount}%</span>
                  <span className="font-bold">{product.discount_price.toLocaleString()}원</span>
                </div>
              ) : (
                <span className="font-bold">{product.price.toLocaleString()}원</span>
              )}
            </div>
          </div>
        </div>
      </Link>
    );
  };
  
  return (
    <div className="pb-6">
      {/* 검색 및 필터 헤더 */}
      <div className="sticky top-12 z-10 bg-white shadow-sm">
        <div className="flex items-center p-2 border-b">
          {/* 검색창 */}
          <div className="flex-grow mx-1">
            <div className="relative">
              <Link href="/m/search" className="block">
                <div className="bg-gray-100 rounded-full px-4 py-2 flex items-center">
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5 text-gray-500 mr-2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
                  </svg>
                  <span className="text-gray-500 text-sm">상품 검색</span>
                </div>
              </Link>
            </div>
          </div>
          
          {/* 필터 버튼 */}
          <button
            onClick={() => setShowFilters(true)}
            className="flex items-center text-gray-700 px-2 py-1 text-sm"
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5 mr-1">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 3c2.755 0 5.455.232 8.083.678.533.09.917.556.917 1.096v1.044a2.25 2.25 0 01-.659 1.591l-5.432 5.432a2.25 2.25 0 00-.659 1.591v2.927a2.25 2.25 0 01-1.244 2.013L9.75 21v-6.568a2.25 2.25 0 00-.659-1.591L3.659 7.409A2.25 2.25 0 013 5.818V4.774c0-.54.384-1.006.917-1.096A48.32 48.32 0 0112 3z" />
            </svg>
            필터
          </button>
          
          {/* 정렬 드롭다운 */}
          <select 
            value={selectedSort}
            onChange={(e) => {
              setSelectedSort(e.target.value);
              setPage(1);
              setTimeout(updateQueryParams, 0);
            }}
            className="bg-transparent text-sm border-none text-gray-700 px-2 py-1 focus:outline-none"
          >
            <option value="newest">최신순</option>
            <option value="price_low">가격 낮은순</option>
            <option value="price_high">가격 높은순</option>
            <option value="popular">인기순</option>
          </select>
        </div>
        
        {/* 선택된 필터 표시 */}
        {(selectedCategory || priceRange.min || priceRange.max || organicOnly) && (
          <div className="bg-gray-50 px-3 py-2 flex items-center overflow-x-auto whitespace-nowrap">
            {selectedCategory && (
              <div className="bg-green-100 text-green-800 rounded-full px-2 py-1 text-xs flex items-center mr-2">
                {categories.find(c => c.id === selectedCategory)?.name || '카테고리'}
                <button 
                  onClick={() => {
                    setSelectedCategory(null);
                    setTimeout(updateQueryParams, 0);
                  }}
                  className="ml-1"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-3 h-3">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            )}
            
            {(priceRange.min || priceRange.max) && (
              <div className="bg-green-100 text-green-800 rounded-full px-2 py-1 text-xs flex items-center mr-2">
                {priceRange.min && priceRange.max 
                  ? `${priceRange.min.toLocaleString()}원-${priceRange.max.toLocaleString()}원`
                  : priceRange.min
                  ? `${priceRange.min.toLocaleString()}원 이상`
                  : `${priceRange.max?.toLocaleString()}원 이하`
                }
                <button 
                  onClick={() => {
                    setPriceRange({ min: undefined, max: undefined });
                    setTimeout(updateQueryParams, 0);
                  }}
                  className="ml-1"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-3 h-3">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            )}
            
            {organicOnly && (
              <div className="bg-green-100 text-green-800 rounded-full px-2 py-1 text-xs flex items-center mr-2">
                유기농
                <button 
                  onClick={() => {
                    setOrganicOnly(false);
                    setTimeout(updateQueryParams, 0);
                  }}
                  className="ml-1"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-3 h-3">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            )}
            
            <button 
              onClick={resetFilters}
              className="text-gray-500 text-xs"
            >
              필터 초기화
            </button>
          </div>
        )}
      </div>
      
      {/* 상품 목록 섹션 */}
      <div className="px-4 pt-3">
        {/* 상품 수 표시 */}
        <p className="text-sm text-gray-500 mb-3">
          총 {totalCount}개 상품
        </p>
        
        {/* 상품 목록 */}
        <div className="space-y-3">
          {products.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
        
        {/* 로딩 상태 */}
        {loading && (
          <div className="flex justify-center py-6">
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-green-500"></div>
          </div>
        )}
        
        {/* 더보기 버튼 */}
        {!loading && hasMore && (
          <div className="text-center py-6">
            <button
              onClick={() => setPage(prev => prev + 1)}
              className="bg-white border border-gray-300 rounded-md px-4 py-2 text-sm hover:bg-gray-50"
            >
              더 보기
            </button>
          </div>
        )}
        
        {/* 상품 없음 메시지 */}
        {!loading && products.length === 0 && (
          <div className="flex flex-col items-center justify-center py-12">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-12 h-12 text-gray-300 mb-3">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
            </svg>
            <p className="text-gray-500">검색 결과가 없습니다</p>
          </div>
        )}
      </div>
      
      {/* 필터 팝업 오버레이 */}
      {showFilters && (
        <div className="fixed inset-0 bg-black/50 z-50 flex">
          <div className="bg-white w-4/5 max-w-xs h-full ml-auto flex flex-col">
            <div className="p-4 border-b flex justify-between items-center">
              <h2 className="font-bold text-lg">필터</h2>
              <button onClick={() => setShowFilters(false)} className="text-gray-500">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            <div className="flex-grow overflow-y-auto p-4">
              {/* 카테고리 섹션 */}
              <div className="mb-6">
                <h3 className="font-medium mb-2">카테고리</h3>
                <div className="space-y-2">
                  {categories.map((category) => (
                    <div key={category.id} className="flex items-center">
                      <input
                        type="radio"
                        id={`category-${category.id}`}
                        name="category"
                        value={category.id}
                        checked={selectedCategory === category.id}
                        onChange={() => setSelectedCategory(category.id)}
                        className="mr-2"
                      />
                      <label htmlFor={`category-${category.id}`} className="text-sm">
                        {category.name}
                      </label>
                    </div>
                  ))}
                </div>
              </div>
              
              {/* 가격 범위 섹션 */}
              <div className="mb-6">
                <h3 className="font-medium mb-2">가격 범위</h3>
                <div className="flex items-center space-x-2">
                  <input
                    type="number"
                    placeholder="최소"
                    value={priceRange.min || ''}
                    onChange={(e) => setPriceRange({...priceRange, min: e.target.value ? parseInt(e.target.value) : undefined})}
                    className="w-1/2 border p-2 rounded-md text-sm"
                  />
                  <span>~</span>
                  <input
                    type="number"
                    placeholder="최대"
                    value={priceRange.max || ''}
                    onChange={(e) => setPriceRange({...priceRange, max: e.target.value ? parseInt(e.target.value) : undefined})}
                    className="w-1/2 border p-2 rounded-md text-sm"
                  />
                </div>
              </div>
              
              {/* 유기농 필터 */}
              <div className="mb-6">
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="organic-filter"
                    checked={organicOnly}
                    onChange={(e) => setOrganicOnly(e.target.checked)}
                    className="mr-2"
                  />
                  <label htmlFor="organic-filter" className="text-sm">
                    유기농 상품만 보기
                  </label>
                </div>
              </div>
            </div>
            
            <div className="p-4 border-t">
              <div className="flex space-x-2">
                <button
                  onClick={resetFilters}
                  className="flex-1 border border-gray-300 rounded-md py-2 text-sm"
                >
                  초기화
                </button>
                <button
                  onClick={applyFilters}
                  className="flex-1 bg-green-600 text-white rounded-md py-2 text-sm"
                >
                  적용하기
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function Products() {
  return <MobileProductsPage />;
} 