import React from 'react';

interface ProductOption {
  id: string;
  product_id: string;
  option_name: string;
  option_value: string;
  additional_price: number;
  stock: number;
}

interface SelectedOption {
  optionId: string;
  optionName: string;
  optionValue: string;
  price: number;
  additionalPrice: number;
  quantity: number;
  stock: number;
}

interface ProductOptionsProps {
  product: {
    id: string;
    name: string;
    price: number;
    discount_price?: number;
    stock: number;
  };
  options: ProductOption[];
  selectedOptions: SelectedOption[];
  setSelectedOptions: (options: SelectedOption[]) => void;
  quantity: number;
  setQuantity: (quantity: number) => void;
}

export default function MobileProductOptions({
  product,
  options,
  selectedOptions,
  setSelectedOptions,
  quantity,
  setQuantity
}: ProductOptionsProps) {
  // 실제 판매 가격 (할인가 또는 정상가)
  const actualPrice = product.discount_price || product.price;
  
  // 총 금액 계산
  const calculateTotalPrice = () => {
    if (options.length > 0) {
      // 옵션이 있는 경우 선택된 옵션들의 가격 합계
      return selectedOptions.reduce((total, option) => {
        return total + ((actualPrice + option.additionalPrice) * option.quantity);
      }, 0);
    } else {
      // 옵션이 없는 경우 수량 * 기본 가격
      return actualPrice * quantity;
    }
  };
  
  // 옵션 선택 핸들러
  const handleOptionChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const optionId = e.target.value;
    if (!optionId) return;
    
    // 이미 선택된 옵션인지 확인
    const isAlreadySelected = selectedOptions.some(
      option => option.optionId === optionId
    );
    
    if (isAlreadySelected) {
      alert('이미 선택된 옵션입니다.');
      e.target.value = '';
      return;
    }
    
    // 선택된 옵션 정보 가져오기
    const selectedOption = options.find(option => option.id === optionId);
    if (!selectedOption) return;
    
    // 재고 확인
    if (selectedOption.stock < 1) {
      alert('품절된 상품입니다.');
      e.target.value = '';
      return;
    }
    
    // 선택 옵션 추가
    setSelectedOptions([
      ...selectedOptions,
      {
        optionId: selectedOption.id,
        optionName: selectedOption.option_name,
        optionValue: selectedOption.option_value,
        price: actualPrice,
        additionalPrice: selectedOption.additional_price,
        quantity: 1,
        stock: selectedOption.stock
      }
    ]);
    
    // 셀렉트 박스 초기화
    e.target.value = '';
  };
  
  // 옵션 수량 변경 핸들러
  const handleOptionQuantityChange = (optionId: string, newQuantity: number) => {
    // 수량은 최소 1 이상이어야 함
    if (newQuantity < 1) {
      alert('최소 수량은 1개입니다.');
      return;
    }
    
    // 선택한 옵션 찾기
    const option = selectedOptions.find(opt => opt.optionId === optionId);
    if (!option) return;
    
    // 재고 확인
    if (newQuantity > option.stock) {
      alert(`최대 ${option.stock}개까지 구매 가능합니다.`);
      return;
    }
    
    // 수량 업데이트
    setSelectedOptions(
      selectedOptions.map(opt => 
        opt.optionId === optionId ? { ...opt, quantity: newQuantity } : opt
      )
    );
  };
  
  // 옵션 삭제 핸들러
  const handleRemoveOption = (optionId: string) => {
    setSelectedOptions(selectedOptions.filter(option => option.optionId !== optionId));
  };
  
  // 기본 수량 변경 핸들러 (옵션이 없는 상품용)
  const handleBaseQuantityChange = (newQuantity: number) => {
    if (newQuantity < 1) {
      alert('최소 수량은 1개입니다.');
      return;
    }
    
    if (product.stock && newQuantity > product.stock) {
      alert(`최대 ${product.stock}개까지 구매 가능합니다.`);
      return;
    }
    
    setQuantity(newQuantity);
  };
  
  return (
    <div className="px-4 py-4 border-b">
      {/* 옵션 선택 (옵션이 있을 때만 표시) */}
      {options.length > 0 && (
        <div className="mb-4">
          <label htmlFor="option-select" className="block text-sm font-medium mb-1.5 text-gray-700">
            옵션 선택
          </label>
          <select
            id="option-select"
            className="w-full p-2.5 border border-gray-300 rounded-md bg-white focus:outline-none focus:ring-1 focus:ring-green-500 focus:border-green-500"
            onChange={handleOptionChange}
            defaultValue=""
          >
            <option value="" disabled>옵션을 선택하세요</option>
            {options.map((option) => {
              const totalOptionPrice = actualPrice + option.additional_price;
              
              return (
                <option
                  key={option.id}
                  value={option.id}
                  disabled={option.stock < 1}
                >
                  {option.option_name}: {option.option_value} 
                  {option.additional_price > 0 
                    ? ` (+${option.additional_price.toLocaleString()}원)` 
                    : ''
                  } 
                  {option.stock < 1 ? ' (품절)' : ` / 재고: ${option.stock}개`}
                </option>
              );
            })}
          </select>
        </div>
      )}
      
      {/* 선택된 옵션 목록 */}
      {selectedOptions.length > 0 && (
        <div className="mb-4 space-y-3">
          {selectedOptions.map((option) => (
            <div key={option.optionId} className="bg-gray-50 rounded-md p-3">
              <div className="flex justify-between mb-2">
                <div>
                  <p className="font-medium text-sm">
                    {option.optionName}: {option.optionValue}
                  </p>
                  <p className="text-xs text-gray-500">
                    {(option.price + option.additionalPrice).toLocaleString()}원
                    {option.additionalPrice > 0 && ` (+${option.additionalPrice.toLocaleString()}원)`}
                  </p>
                </div>
                <button
                  onClick={() => handleRemoveOption(option.optionId)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              
              <div className="flex justify-between items-center">
                <div className="flex border border-gray-300 rounded-md">
                  <button
                    className="px-3 py-1 text-gray-500"
                    onClick={() => handleOptionQuantityChange(option.optionId, option.quantity - 1)}
                  >
                    -
                  </button>
                  <input
                    type="number"
                    min="1"
                    max={option.stock}
                    value={option.quantity}
                    onChange={(e) => handleOptionQuantityChange(option.optionId, parseInt(e.target.value) || 1)}
                    className="w-12 text-center border-x border-gray-300"
                  />
                  <button
                    className="px-3 py-1 text-gray-500"
                    onClick={() => handleOptionQuantityChange(option.optionId, option.quantity + 1)}
                  >
                    +
                  </button>
                </div>
                <span className="font-semibold">
                  {((option.price + option.additionalPrice) * option.quantity).toLocaleString()}원
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
      
      {/* 수량 선택 (옵션이 없을 때만 표시) */}
      {options.length === 0 && (
        <div className="mb-4">
          <label htmlFor="quantity" className="block text-sm font-medium mb-1.5 text-gray-700">
            수량
          </label>
          <div className="flex items-center">
            <div className="flex border border-gray-300 rounded-md">
              <button
                className="px-3 py-1 text-gray-500"
                onClick={() => handleBaseQuantityChange(quantity - 1)}
              >
                -
              </button>
              <input
                id="quantity"
                type="number"
                min="1"
                max={product.stock}
                value={quantity}
                onChange={(e) => handleBaseQuantityChange(parseInt(e.target.value) || 1)}
                className="w-12 text-center border-x border-gray-300"
              />
              <button
                className="px-3 py-1 text-gray-500"
                onClick={() => handleBaseQuantityChange(quantity + 1)}
              >
                +
              </button>
            </div>
            <span className="ml-auto font-semibold">
              {(actualPrice * quantity).toLocaleString()}원
            </span>
          </div>
        </div>
      )}
      
      {/* 총 상품 금액 */}
      <div className="pt-3 border-t border-gray-200">
        <div className="flex justify-between items-center">
          <span className="font-medium">총 상품 금액</span>
          <span className="text-xl font-bold text-green-600">
            {calculateTotalPrice().toLocaleString()}원
          </span>
        </div>
      </div>
    </div>
  );
} 