import React from 'react';

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

const ProductInfo: React.FC<ProductInfoProps> = ({ product }) => {
  return (
    <div className="px-4 py-4 bg-white">
      {/* 상품명 */}
      <h1 className="text-xl font-bold mb-1">{product.name}</h1>
      
      {/* 가격 정보 */}
      <div className="mb-4">
        <p className="text-2xl font-bold text-gray-900">
          {product.price.toLocaleString()}원
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
              {new Date(product.harvest_date).toLocaleDateString('ko-KR')}
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
};

export default ProductInfo; 