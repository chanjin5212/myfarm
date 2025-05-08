import React, { useState, useCallback, memo, useMemo } from 'react';
import toast from 'react-hot-toast';
import { Spinner } from '@/components/ui/CommonStyles';

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
    stock?: number;
  };
  options: ProductOption[];
  selectedOptions: SelectedOption[];
  setSelectedOptions: (options: SelectedOption[]) => void;
  quantity: number;
  setQuantity: (quantity: number) => void;
}

// 옵션 아이템 컴포넌트 메모이제이션
const OptionItem = memo(({ 
  option, 
  onRemove, 
  onChangeQuantity, 
  changingOptionId 
}: { 
  option: SelectedOption; 
  onRemove: (id: string) => void; 
  onChangeQuantity: (id: string, quantity: number) => void;
  changingOptionId: string | null;
}) => {
  const formattedPrice = useMemo(() => 
    (option.price + option.additionalPrice).toLocaleString(), 
    [option.price, option.additionalPrice]
  );
  
  const formattedAdditionalPrice = useMemo(() => 
    option.additionalPrice > 0 ? ` (+${option.additionalPrice.toLocaleString()}원)` : '',
    [option.additionalPrice]
  );
  
  return (
    <div className="bg-gray-50 rounded-md p-3">
      <div className="flex justify-between mb-2">
        <div>
          <p className="font-medium text-sm">
            {option.optionName}: {option.optionValue}
          </p>
          <p className="text-xs text-gray-500">
            {formattedPrice}원
            {formattedAdditionalPrice}
          </p>
        </div>
        <button
          onClick={() => onRemove(option.optionId)}
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
            onClick={() => onChangeQuantity(option.optionId, option.quantity - 1)}
            disabled={changingOptionId === option.optionId}
          >
            {changingOptionId === option.optionId ? (
              <Spinner size="sm" className="w-3 h-3" />
            ) : (
              '-'
            )}
          </button>
          <input
            type="number"
            min="1"
            max={option.stock}
            value={option.quantity}
            onChange={(e) => onChangeQuantity(option.optionId, parseInt(e.target.value) || 1)}
            className="w-12 text-center border-x border-gray-300"
            disabled={changingOptionId === option.optionId}
          />
          <button
            className="px-3 py-1 text-gray-500"
            onClick={() => onChangeQuantity(option.optionId, option.quantity + 1)}
            disabled={changingOptionId === option.optionId}
          >
            {changingOptionId === option.optionId ? (
              <Spinner size="sm" className="w-3 h-3" />
            ) : (
              '+'
            )}
          </button>
        </div>
        <div className="text-sm font-semibold">
          {((option.price + option.additionalPrice) * option.quantity).toLocaleString()}원
        </div>
      </div>
    </div>
  );
});

OptionItem.displayName = 'OptionItem';

// 수량 컨트롤 컴포넌트 메모이제이션
const QuantityControl = memo(({ 
  quantity, 
  onChangeQuantity, 
  isChanging, 
  maxStock 
}: { 
  quantity: number; 
  onChangeQuantity: (quantity: number) => void;
  isChanging: boolean;
  maxStock?: number;
}) => {
  return (
    <div className="flex space-x-3 items-center">
      <div className="flex border border-gray-300 rounded-md">
        <button
          className="px-3 py-1 text-gray-500"
          onClick={() => onChangeQuantity(quantity - 1)}
          disabled={isChanging || quantity <= 1}
        >
          {isChanging ? <Spinner size="sm" className="w-3 h-3" /> : '-'}
        </button>
        <input
          type="number"
          min="1"
          max={maxStock}
          value={quantity}
          onChange={(e) => onChangeQuantity(parseInt(e.target.value) || 1)}
          className="w-12 text-center border-x border-gray-300"
          disabled={isChanging}
        />
        <button
          className="px-3 py-1 text-gray-500"
          onClick={() => onChangeQuantity(quantity + 1)}
          disabled={isChanging || (maxStock !== undefined && quantity >= maxStock)}
        >
          {isChanging ? <Spinner size="sm" className="w-3 h-3" /> : '+'}
        </button>
      </div>
    </div>
  );
});

QuantityControl.displayName = 'QuantityControl';

const ProductOptions = memo(({
  product,
  options,
  selectedOptions,
  setSelectedOptions,
  quantity,
  setQuantity
}: ProductOptionsProps) => {
  // 실제 판매 가격
  const actualPrice = product.price;
  // 로딩 상태 관리
  const [changingOptionId, setChangingOptionId] = useState<string | null>(null);
  const [changingBaseQuantity, setChangingBaseQuantity] = useState<boolean>(false);
  
  // 총 금액 계산 메모이제이션
  const totalPrice = useMemo(() => {
    if (options.length > 0) {
      // 옵션이 있는 경우 선택된 옵션들의 가격 합계
      return selectedOptions.reduce((total, option) => {
        return total + ((actualPrice + option.additionalPrice) * option.quantity);
      }, 0);
    } else {
      // 옵션이 없는 경우 수량 * 기본 가격
      return actualPrice * quantity;
    }
  }, [actualPrice, options.length, selectedOptions, quantity]);
  
  // 옵션 선택 핸들러
  const handleOptionChange = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
    const optionId = e.target.value;
    if (!optionId) return;
    
    // 이미 선택된 옵션인지 확인
    const isAlreadySelected = selectedOptions.some(
      option => option.optionId === optionId
    );
    
    if (isAlreadySelected) {
      toast.error('이미 선택된 옵션입니다.');
      e.target.value = '';
      return;
    }
    
    // 선택된 옵션 정보 가져오기
    const selectedOption = options.find(option => option.id === optionId);
    if (!selectedOption) return;
    
    // 재고 확인
    if (selectedOption.stock < 1) {
      toast.error('품절된 상품입니다.');
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
  }, [selectedOptions, options, actualPrice, setSelectedOptions]);
  
  // 옵션 수량 변경 핸들러
  const handleOptionQuantityChange = useCallback((optionId: string, newQuantity: number) => {
    // 수량은 최소 1 이상이어야 함
    if (newQuantity < 1) {
      toast.error('최소 수량은 1개입니다.');
      return;
    }
    
    // 선택한 옵션 찾기
    const option = selectedOptions.find(opt => opt.optionId === optionId);
    if (!option) return;
    
    // 재고 확인
    if (newQuantity > option.stock) {
      toast.error(`최대 ${option.stock}개까지 구매 가능합니다.`);
      return;
    }
    
    setChangingOptionId(optionId);
    
    // 수량 업데이트
    setSelectedOptions(
      selectedOptions.map(opt => 
        opt.optionId === optionId ? { ...opt, quantity: newQuantity } : opt
      )
    );
    
    setChangingOptionId(null);
  }, [selectedOptions, setSelectedOptions]);
  
  // 기본 수량 변경 핸들러 (옵션이 없는 상품용)
  const handleBaseQuantityChange = useCallback((newQuantity: number) => {
    if (newQuantity < 1) {
      toast.error('최소 수량은 1개입니다.');
      return;
    }
    
    if (product.stock && newQuantity > product.stock) {
      toast.error(`최대 ${product.stock}개까지 구매 가능합니다.`);
      return;
    }
    
    setChangingBaseQuantity(true);
    
    // 수량 업데이트
    setQuantity(newQuantity);
    
    setChangingBaseQuantity(false);
  }, [product.stock, setQuantity]);
  
  // 옵션 삭제 핸들러
  const handleRemoveOption = useCallback((optionId: string) => {
    setSelectedOptions(selectedOptions.filter(option => option.optionId !== optionId));
  }, [selectedOptions, setSelectedOptions]);
  
  // 옵션 렌더링 최적화
  const optionItems = useMemo(() => {
    return selectedOptions.map(option => (
      <OptionItem
        key={option.optionId}
        option={option}
        onRemove={handleRemoveOption}
        onChangeQuantity={handleOptionQuantityChange}
        changingOptionId={changingOptionId}
      />
    ));
  }, [selectedOptions, handleRemoveOption, handleOptionQuantityChange, changingOptionId]);
  
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
          {optionItems}
        </div>
      )}
      
      {/* 옵션이 없는 상품의 수량 선택 */}
      {options.length === 0 && (
        <div className="flex justify-between items-center mb-4">
          <span className="text-sm font-medium text-gray-700">수량</span>
          <QuantityControl 
            quantity={quantity} 
            onChangeQuantity={handleBaseQuantityChange}
            isChanging={changingBaseQuantity}
            maxStock={product.stock}
          />
        </div>
      )}
      
      {/* 총 금액 표시 */}
      <div className="mt-4 pt-4 border-t border-gray-200 flex justify-between items-center">
        <span className="text-sm font-medium text-gray-700">총 상품 금액</span>
        <span className="text-lg font-bold text-gray-900">{totalPrice.toLocaleString()}원</span>
      </div>
    </div>
  );
});

ProductOptions.displayName = 'ProductOptions';

export default ProductOptions;