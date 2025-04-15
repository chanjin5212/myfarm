'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { Button, Select, Card } from '@/components/ui/CommonStyles';

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

  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    // 상품 로드
    loadProducts();
  }, [selectedCategory, sortOption, currentPage]);

  useEffect(() => {
    // 카테고리 로드
    loadCategories();
  }, []);

  const loadProducts = async () => {
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
      // API가 배열을 직접 반환하므로, data.products 대신 data를 사용
      setProducts(Array.isArray(data) ? data : []);
      console.log('로드된 상품 수:', Array.isArray(data) ? data.length : 0);
    } catch (err) {
      setError('상품을 불러오는 중 오류가 발생했습니다.');
      console.error('상품 로드 오류:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadCategories = async () => {
    try {
      const response = await fetch('/api/categories');
      if (!response.ok) {
        throw new Error('카테고리를 불러오는데 실패했습니다.');
      }
      const data = await response.json();
      // API가 배열을 직접 반환하므로, data.categories 대신 data를 사용
      setCategories(Array.isArray(data) ? data : []);
      console.log('로드된 카테고리 수:', Array.isArray(data) ? data.length : 0);
    } catch (err) {
      console.error('카테고리 로드 오류:', err);
    }
  };

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

  const handleAddToCart = async (productId: string) => {
    try {
      const userId = localStorage.getItem('userId');
      if (!userId) {
        alert('로그인이 필요합니다.');
        router.push('/auth');
        return;
      }

      const response = await fetch('/api/cart', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId,
          productId,
          quantity: 1,
        }),
      });

      if (!response.ok) {
        throw new Error('장바구니에 추가하지 못했습니다.');
      }

      alert('상품이 장바구니에 추가되었습니다.');
    } catch (error) {
      console.error('장바구니 추가 오류:', error);
      alert('장바구니에 추가하는 중 오류가 발생했습니다.');
    }
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
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-green-500"></div>
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
                      <Image
                        src={product.image_url || '/images/default-product.png'}
                        alt={product.name}
                        fill
                        className="object-cover rounded-t-lg"
                      />
                    </div>
                    <div className="p-4">
                      <h2 className="text-lg font-medium mb-2 truncate">{product.name}</h2>
                      <p className="text-gray-600 text-sm mb-2 truncate">{product.description || ''}</p>
                      <p className="text-lg font-bold text-green-600">{product.price.toLocaleString()} 원</p>
                    </div>
                  </Link>
                  <div className="px-4 pb-4">
                    <Button
                      onClick={() => handleAddToCart(product.id)}
                      variant="outline"
                      fullWidth
                    >
                      장바구니에 추가
                    </Button>
                  </div>
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
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-green-500"></div>
      </div>
    }>
      <ProductsContent />
    </Suspense>
  );
} 