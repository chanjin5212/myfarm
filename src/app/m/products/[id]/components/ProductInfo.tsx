import React from 'react';

interface ProductInfoProps {
  product: {
    id: string;
    name: string;
    price: number;
    discount_price?: number;
    is_organic?: boolean;
    origin?: string;
    harvest_date?: string;
    storage_method?: string;
  };
}

export default function MobileProductInfo({ product }: ProductInfoProps) {
  // 할인율 계산
  const discount = product.discount_price
    ? Math.round(((product.price - product.discount_price) / product.price) * 100)
    : 0;

  // 날짜 포맷팅
  const formatDate = (dateString?: string) => {
    if (!dateString) return '정보 없음';
    return new Date(dateString).toLocaleDateString('ko-KR');
  };

  return (
    <div className="px-4 py-4 border-b">
      {/* 유기농 뱃지 */}
      {product.is_organic && (
        <div className="inline-block mb-1.5 px-2 py-0.5 bg-green-100 text-green-800 text-xs font-semibold rounded-full">
          유기농
        </div>
      )}
      
      {/* 상품명 */}
      <h1 className="text-xl font-bold mb-2">{product.name}</h1>
      
      {/* 가격 정보 */}
      <div className="mb-4">
        {product.discount_price ? (
          <div className="flex items-baseline space-x-2">
            <span className="text-gray-400 line-through text-sm">
              {product.price.toLocaleString()}원
            </span>
            <span className="text-red-500 font-semibold">
              {discount}% 할인
            </span>
            <span className="text-2xl font-bold text-gray-900">
              {product.discount_price.toLocaleString()}원
            </span>
          </div>
        ) : (
          <span className="text-2xl font-bold text-gray-900">
            {product.price.toLocaleString()}원
          </span>
        )}
      </div>
      
      {/* 기본 상품 정보 */}
      <div className="space-y-1.5 text-sm">
        <div className="flex justify-between py-1 border-t border-gray-100">
          <span className="text-gray-500">원산지</span>
          <span className="font-medium">{product.origin || '국내산'}</span>
        </div>
        
        {product.harvest_date && (
          <div className="flex justify-between py-1 border-t border-gray-100">
            <span className="text-gray-500">수확일</span>
            <span className="font-medium">{formatDate(product.harvest_date)}</span>
          </div>
        )}
        
        {product.storage_method && (
          <div className="flex justify-between py-1 border-t border-gray-100">
            <span className="text-gray-500">보관방법</span>
            <span className="font-medium">{product.storage_method}</span>
          </div>
        )}
        
        <div className="flex justify-between py-1 border-t border-gray-100">
          <span className="text-gray-500">배송방법</span>
          <span className="font-medium">택배배송</span>
        </div>
        
        <div className="flex justify-between py-1 border-t border-gray-100 border-b">
          <span className="text-gray-500">배송비</span>
          <span className="font-medium">3,000원 <span className="text-green-600">(30,000원 이상 무료배송)</span></span>
        </div>
      </div>
    </div>
  );
} 