import React, { memo, useMemo } from 'react';

interface ProductInfoProps {
  product: {
    id: string;
    name: string;
    price: number;
    is_organic?: boolean;
    origin?: string;
    harvest_date?: string;
    storage_method?: string;
  };
}

const ProductInfo: React.FC<ProductInfoProps> = memo(({ product }) => {
  // 가격 포맷팅 메모이제이션
  const formattedPrice = useMemo(() => product.price.toLocaleString(), [product.price]);
  
  // 수확일 포맷팅 메모이제이션
  const formattedHarvestDate = useMemo(() => {
    if (!product.harvest_date) return null;
    return new Date(product.harvest_date).toLocaleDateString('ko-KR');
  }, [product.harvest_date]);

  return (
    <div className="px-4 py-4 bg-white">
      {/* 상품명 */}
      <h1 className="text-xl font-bold mb-1">{product.name}</h1>
      
      {/* 가격 정보 */}
      <div className="mb-4">
        <p className="text-2xl font-bold text-gray-900">
          {formattedPrice}원
        </p>
      </div>
      
      {/* 상품 기본 정보 */}
      <div className="grid grid-cols-2 gap-3 text-sm border-t border-gray-200 pt-4">
        {product.is_organic && (
          <div className="flex items-center">
            <span className="text-green-600 font-medium">유기농</span>
            <span className="ml-1 text-xs bg-green-100 text-green-600 px-1 py-0.5 rounded">인증</span>
          </div>
        )}
        
        {product.origin && (
          <div className="flex items-center">
            <span className="text-gray-500">원산지</span>
            <span className="ml-2 text-gray-900">{product.origin}</span>
          </div>
        )}
        
        {product.harvest_date && (
          <div className="flex items-center">
            <span className="text-gray-500">수확일</span>
            <span className="ml-2 text-gray-900">
              {formattedHarvestDate}
            </span>
          </div>
        )}
        
        {product.storage_method && (
          <div className="flex items-center">
            <span className="text-gray-500">보관방법</span>
            <span className="ml-2 text-gray-900">{product.storage_method}</span>
          </div>
        )}
      </div>
    </div>
  );
});

ProductInfo.displayName = 'ProductInfo';

export default ProductInfo; 