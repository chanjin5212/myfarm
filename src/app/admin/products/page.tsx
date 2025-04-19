'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button, Input, Spinner, Select } from '@/components/ui/CommonStyles';
import { formatPrice } from '@/lib/utils';
import { toast } from 'react-hot-toast';

interface Product {
  id: string;
  name: string;
  price: number;
  stock: number;
  status: string;
  thumbnail_url: string | null;
  created_at: string;
}

type StatusFilter = 'all' | 'active' | 'inactive' | 'out_of_stock';

export default function AdminProductsPage() {
  const router = useRouter();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');

  useEffect(() => {
    fetchProducts();
  }, [searchTerm, page, statusFilter]);

  const fetchProducts = async () => {
    try {
      setLoading(true);
      // 상태 필터가 'all'이 아닌 경우에만 상태 필터 쿼리 추가
      const statusQuery = statusFilter !== 'all' ? `&status=${statusFilter}` : '';
      const response = await fetch(`/api/admin/products?search=${searchTerm}&page=${page}&limit=10${statusQuery}`);
      
      if (!response.ok) {
        throw new Error('상품 목록을 불러오는데 실패했습니다.');
      }
      
      const data = await response.json();
      setProducts(data.products);
    } catch (error) {
      console.error('상품 목록 로딩 오류:', error);
      toast.error('상품 목록을 불러오는데 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateStatus = async (productId: string, status: string) => {
    try {
      const response = await fetch(`/api/admin/products/${productId}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status }),
      });

      if (!response.ok) {
        throw new Error('상품 상태 변경에 실패했습니다.');
      }

      toast.success('상품 상태가 변경되었습니다.');
      fetchProducts();
    } catch (error) {
      console.error('상품 상태 변경 오류:', error);
      toast.error('상품 상태 변경에 실패했습니다.');
    }
  };

  // 상품 비활성화 함수 (삭제 대신 상태 변경)
  const handleDeactivateProduct = async (productId: string) => {
    if (!confirm('정말 이 상품을 비활성화하시겠습니까? 판매 중지 상태로 변경됩니다.')) {
      return;
    }

    try {
      await handleUpdateStatus(productId, 'inactive');
    } catch (error) {
      console.error('상품 비활성화 오류:', error);
    }
  };

  // 상품 상태에 따른 UI 텍스트와 색상 반환
  const getStatusDisplay = (status: string) => {
    switch (status) {
      case 'active':
        return {
          text: '판매중',
          colorClass: 'bg-green-100 text-green-800'
        };
      case 'inactive':
      case 'discontinued':
        return {
          text: '판매중지',
          colorClass: 'bg-gray-100 text-gray-800'
        };
      case 'out_of_stock':
        return {
          text: '품절',
          colorClass: 'bg-red-100 text-red-800'
        };
      default:
        return {
          text: '상태 미정',
          colorClass: 'bg-yellow-100 text-yellow-800'
        };
    }
  };

  return (
    <div className="p-4">
      <div className="flex flex-col space-y-4 mb-4">
        <div className="flex justify-between items-center">
          <div className="flex items-center space-x-2">
            <Select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
              className="w-32"
              options={[
                { value: 'all', label: '모든 상품' },
                { value: 'active', label: '판매중' },
                { value: 'inactive', label: '판매중지' },
                { value: 'out_of_stock', label: '품절' }
              ]}
            >
            </Select>
            <span className="text-gray-500 text-sm">총 {products.length}개 상품</span>
          </div>
          <Button
            onClick={() => router.push('/admin/products/add')}
            size="sm"
          >
            새 상품 추가
          </Button>
        </div>

        <Input
          type="text"
          placeholder="상품명으로 검색"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      {loading ? (
        <div className="flex justify-center items-center h-64">
          <Spinner size="lg" />
        </div>
      ) : (
        <>
          <div className="space-y-3">
            {products.length > 0 ? (
              products.map((product) => {
                const statusDisplay = getStatusDisplay(product.status);
                return (
                  <div key={product.id} className="bg-white rounded-lg shadow">
                    <div className="p-3 flex items-center">
                      <div className="w-16 h-16 bg-gray-50 rounded flex-shrink-0 mr-3 overflow-hidden">
                        {product.thumbnail_url && (
                          <img
                            src={product.thumbnail_url}
                            alt={product.name}
                            className="w-full h-full object-cover"
                          />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-medium text-sm text-gray-900 truncate">{product.name}</h3>
                        <div className="flex flex-col">
                          <div className="font-semibold">
                            {formatPrice(product.price)}원
                          </div>
                        </div>
                        <div className="flex items-center justify-between mt-1">
                          <div className="flex items-center space-x-2">
                            <span className="text-xs text-gray-500">재고: {product.stock}</span>
                            <span className={`text-xs px-1.5 py-0.5 rounded-full ${statusDisplay.colorClass}`}>
                              {statusDisplay.text}
                            </span>
                          </div>
                          <div className="flex space-x-1">
                            <Button
                              variant="primary"
                              size="sm"
                              onClick={() => router.push(`/admin/products/${product.id}/edit`)}
                            >
                              수정
                            </Button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="bg-white rounded-lg shadow p-4 text-center text-gray-500">
                {statusFilter !== 'all' ? `${getStatusDisplay(statusFilter).text} 상태의 상품이 없습니다.` : '상품이 없습니다.'}
              </div>
            )}
          </div>

          {products.length > 0 && (
            <div className="mt-4 flex justify-center space-x-2">
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
                disabled={products.length < 10}
              >
                다음
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
} 