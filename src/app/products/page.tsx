'use client';

import { useState, useEffect, Suspense, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { Button, Select, Card, Spinner } from '@/components/ui/CommonStyles';

interface Product {
  id: string;
  name: string;
  price: number;
  discount_price?: number;
  thumbnail_url?: string;
  image_url?: string;
  stock: number;
  description?: string;
}

interface Category {
  id: string;
  name: string;
}

function ProductsContent() {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [sortOption, setSortOption] = useState<string>('newest');
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [totalPages, setTotalPages] = useState<number>(1);
  // 이미지 URL 유효성 캐시
  const [validImageUrls, setValidImageUrls] = useState<Record<string, boolean>>({});

  const router = useRouter();
  const searchParams = useSearchParams();

  // 이미지 URL이 유효한지 확인하는 함수 - useCallback으로 메모이제이션
  const checkImageUrlExists = useCallback(async (url: string, productId: string) => {
    // 이미 확인한 URL은 다시 확인하지 않음
    if (validImageUrls[productId] !== undefined) {
      return validImageUrls[productId];
    }
    
    try {
      const response = await fetch(url, { method: 'HEAD' });
      // 응답이 성공적이면 이미지가 존재함
      setValidImageUrls(prev => ({ ...prev, [productId]: response.ok }));
      return response.ok;
    } catch (error) {
      // 네트워크 오류나 CORS 오류 등이 발생하면 실패로 간주
      setValidImageUrls(prev => ({ ...prev, [productId]: false }));
      return false;
    }
  }, [validImageUrls]);

  // 제품 데이터가 로드된 후 이미지 URL 확인 - 최적화
  useEffect(() => {
    // 새로 추가된 제품만 이미지 URL 확인
    const unverifiedProducts = products.filter(product => 
      validImageUrls[product.id] === undefined && (product.thumbnail_url || product.image_url)
    );
    
    if (unverifiedProducts.length > 0) {
      // 병렬로 모든 이미지 URL 확인
      Promise.all(
        unverifiedProducts.map(product => {
          const imageUrl = product.thumbnail_url || product.image_url;
          if (imageUrl) {
            return checkImageUrlExists(imageUrl, product.id);
          }
          return Promise.resolve(false);
        })
      );
    }
  }, [products, checkImageUrlExists, validImageUrls]);

  // 상품 로드 함수 - useCallback으로 메모이제이션
  const loadProducts = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      // 쿼리 파라미터 구성
      const params = new URLSearchParams();
      if (selectedCategory) {
        params.append('category', selectedCategory);
      }
      if (sortOption) {
        params.append('sort', sortOption);
      }
      params.append('page', String(currentPage));
      
      // API 요청
      const url = `/api/products${params.toString() ? `?${params.toString()}` : ''}`;
      console.log('상품 로드 URL:', url);
      
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error('상품을 불러오는데 실패했습니다.');
      }
      
      const data = await response.json();
      // 모바일과 동일하게 data.products 사용
      setProducts(data.products || []);
      setTotalPages(Math.ceil((data.total || 0) / 12)); // 페이지당 12개 상품 기준
      console.log('로드된 상품 수:', data.products?.length || 0);
    } catch (err) {
      setError('상품을 불러오는 중 오류가 발생했습니다.');
      console.error('상품 로드 오류:', err);
    } finally {
      setLoading(false);
    }
  }, [selectedCategory, sortOption, currentPage]);

  // 카테고리 로드 함수 - useCallback으로 메모이제이션
  const loadCategories = useCallback(async () => {
    try {
      const response = await fetch('/api/categories');
      if (!response.ok) {
        throw new Error('카테고리를 불러오는데 실패했습니다.');
      }
      const data = await response.json();
      // 모바일과 동일하게 data.categories 사용
      setCategories(data.categories || []);
      console.log('로드된 카테고리 수:', data.categories?.length || 0);
    } catch (err) {
      console.error('카테고리 로드 오류:', err);
    }
  }, []);

  useEffect(() => {
    // 상품 로드
    loadProducts();
  }, [loadProducts]); // loadProducts에 의존성을 설정하면 selectedCategory, sortOption, currentPage가 변경될 때 실행됨

  useEffect(() => {
    // 카테고리 로드 - 한 번만 실행됨
    loadCategories();
  }, [loadCategories]);

  const handleCategoryChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const categoryId = e.target.value;
    setSelectedCategory(categoryId);
  };

  const handleSortChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const option = e.target.value;
    setSortOption(option);
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-6">상품 목록</h1>
      
      <div className="flex flex-col sm:flex-row justify-between mb-6">
        {/* 카테고리 필터 */}
        <div className="mb-4 sm:mb-0 w-full sm:w-auto">
          <Select
            label="카테고리"
            value={selectedCategory || ''}
            onChange={handleCategoryChange}
            options={[
              { value: '', label: '전체 카테고리' },
              ...(categories.map(cat => ({
                value: cat.id,
                label: cat.name
              })))
            ]}
          />
        </div>
        
        {/* 정렬 옵션 */}
        <div className="w-full sm:w-auto">
          <Select
            label="정렬"
            value={sortOption}
            onChange={handleSortChange}
            options={[
              { value: 'newest', label: '최신순' },
              { value: 'price_low', label: '가격 낮은순' },
              { value: 'price_high', label: '가격 높은순' },
              { value: 'popularity', label: '인기순' }
            ]}
          />
        </div>
      </div>
      
      {/* 상품 로딩 중 */}
      {loading && (
        <div className="flex justify-center items-center min-h-[60vh]">
          <Spinner size="lg" />
        </div>
      )}
      
      {/* 상품 목록 */}
      {!loading && (
        <>
          {products.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
              {products.map((product) => (
                <Card key={product.id} className="transition-transform hover:shadow-lg hover:scale-105">
                  <Link href={`/products/${product.id}`} className="block">
                    <div className="relative w-full h-48 mb-4">
                      {(product.thumbnail_url || product.image_url) && validImageUrls[product.id] !== false ? (
                        <Image
                          src={product.thumbnail_url || product.image_url || ''}
                          alt={product.name}
                          fill
                          className="object-cover rounded-t-lg"
                          unoptimized={true}
                          onError={() => {
                            // onError에서 상태 변경을 하지 않고 이미 false로 설정되어 기본 이미지로 전환됨
                            if (validImageUrls[product.id] !== false) {
                              setValidImageUrls(prev => ({ ...prev, [product.id]: false }));
                            }
                          }}
                        />
                      ) : (
                        <Image
                          src="/images/default-product.png"
                          alt={product.name}
                          fill
                          className="object-cover rounded-t-lg"
                          priority
                        />
                      )}
                    </div>
                    <div className="p-4">
                      <h2 className="text-lg font-medium mb-2 truncate">{product.name}</h2>
                      <p className="text-gray-600 text-sm mb-2 truncate">{product.description || ''}</p>
                      <p className="text-lg font-bold text-green-600">{product.price.toLocaleString()} 원</p>
                    </div>
                  </Link>
                </Card>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <p className="text-gray-500">상품이 없습니다.</p>
            </div>
          )}
        </>
      )}
      
      {/* 페이지네이션 */}
      {!loading && totalPages > 1 && (
        <div className="flex justify-center mt-8">
          <div className="flex space-x-2">
            <Button
              onClick={() => handlePageChange(currentPage - 1)}
              disabled={currentPage === 1}
              variant="outline"
              className="px-4"
            >
              이전
            </Button>
            
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
              <Button
                key={page}
                onClick={() => handlePageChange(page)}
                variant={currentPage === page ? 'primary' : 'outline'}
                className="w-10"
              >
                {page}
              </Button>
            ))}
            
            <Button
              onClick={() => handlePageChange(currentPage + 1)}
              disabled={currentPage === totalPages}
              variant="outline"
              className="px-4"
            >
              다음
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

export default function Products() {
  return (
    <Suspense fallback={
      <div className="flex justify-center items-center min-h-[60vh]">
        <Spinner size="lg" />
      </div>
    }>
      <ProductsContent />
    </Suspense>
  );
}