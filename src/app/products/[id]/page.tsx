'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Image from 'next/image';

interface ProductDetail {
  id: string;
  name: string;
  description: string;
  price: number;
  discount_price?: number;
  stock: number;
  status: string;
  category_id?: string;
  seller_id?: string;
  thumbnail_url?: string;
  origin?: string;
  harvest_date?: string;
  storage_method?: string;
  is_organic?: boolean;
  created_at: string;
  updated_at: string;
}

interface ProductImage {
  id: string;
  product_id: string;
  image_url: string;
  is_thumbnail: boolean;
  sort_order: number;
}

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

interface LocalCartItem {
  id: string;
  product_id: string;
  product_option_id?: string | null;
  quantity: number;
}

export default function ProductDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [productDetails, setProductDetails] = useState<ProductDetail | null>(null);
  const [images, setImages] = useState<ProductImage[]>([]);
  const [options, setOptions] = useState<ProductOption[]>([]);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [selectedOptions, setSelectedOptions] = useState<SelectedOption[]>([]);
  const [quantity, setQuantity] = useState<number>(1);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [isAddingToCart, setIsAddingToCart] = useState<boolean>(false);
  const [cartSuccessPopup, setCartSuccessPopup] = useState<boolean>(false);
  
  // UUID 형식 검증 함수
  const isValidUUID = (id: string) => {
    const pattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    return pattern.test(id);
  };

  // 문자열이 UUID 형식인지 확인하고, 아니면 null 반환
  const validateUUID = (id: string | undefined | null): string | null => {
    if (!id) return null;
    return isValidUUID(id) ? id : null;
  };

  useEffect(() => {
    const fetchProductDetails = async () => {
      setLoading(true);
      try {
        // 상품 상세 정보 가져오기
        const response = await fetch(`/api/products/${params.id}`);
        if (!response.ok) {
          throw new Error('상품 정보를 불러오는데 실패했습니다.');
        }
        const data = await response.json();
        setProductDetails(data.product);
        setImages(data.images || []);
        setOptions(data.options || []);
        
        // 대표 이미지 설정
        if (data.images && data.images.length > 0) {
          const thumbnail = data.images.find((img: ProductImage) => img.is_thumbnail);
          setSelectedImage(thumbnail ? thumbnail.image_url : data.images[0].image_url);
        } else if (data.product.thumbnail_url) {
          setSelectedImage(data.product.thumbnail_url);
        }
        
        setError(null);
      } catch (err) {
        console.error('상품 상세 로딩 오류:', err);
        setError('상품 정보를 불러오는데 실패했습니다.');
      } finally {
        setLoading(false);
      }
    };

    if (params.id) {
      fetchProductDetails();
    }
  }, [params.id]);

  // 옵션이 없는 상품의 수량 변경
  const handleBaseQuantityChange = (newQuantity: number) => {
    if (newQuantity < 1) return;
    if (productDetails && productDetails.stock && newQuantity > productDetails.stock) return;
    setQuantity(newQuantity);
  };

  const handleQuantityChange = (optionId: string, newQuantity: number) => {
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

  const handleRemoveOption = (optionId: string) => {
    setSelectedOptions(selectedOptions.filter(option => option.optionId !== optionId));
  };

  const handleOptionChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const optionId = e.target.value;
    
    // 옵션을 선택하지 않은 경우 무시
    if (!optionId) return;
    
    // 이미 선택된 옵션인지 확인
    const isAlreadySelected = selectedOptions.some(option => option.optionId === optionId);
    if (isAlreadySelected) {
      alert('이미 선택된 옵션입니다.');
      e.target.value = ''; // 선택 초기화
      return;
    }
    
    // 선택한 옵션 정보 찾기
    const selectedOption = options.find(option => option.id === optionId);
    if (!selectedOption) return;
    
    // 재고 확인
    if (selectedOption.stock < 1) {
      alert('품절된 상품입니다.');
      e.target.value = '';
      return;
    }
    
    // 옵션 정보 추가
    setSelectedOptions([
      ...selectedOptions,
      {
        optionId: selectedOption.id,
        optionName: selectedOption.option_name,
        optionValue: selectedOption.option_value,
        price: productDetails ? (productDetails.discount_price || productDetails.price) : 0,
        additionalPrice: selectedOption.additional_price,
        quantity: 1,
        stock: selectedOption.stock
      }
    ]);
    
    // 선택 초기화
    e.target.value = '';
  };

  const handleAddToCart = async () => {
    // 옵션이 있는 상품인데 옵션을 선택하지 않은 경우
    if (options.length > 0 && selectedOptions.length === 0) {
      alert('옵션을 선택해주세요.');
      return;
    }
    
    if (!productDetails) {
      alert('상품 정보를 찾을 수 없습니다.');
      return;
    }

    // 상품 ID가 유효한 UUID 형식인지 확인
    const productId = productDetails.id;
    if (!isValidUUID(productId)) {
      alert('유효하지 않은 상품 ID입니다.');
      return;
    }
    
    try {
      // 로딩 상태 시작
      setIsAddingToCart(true);
      
      // 로그인 여부 확인 (로컬스토리지에서 토큰 가져오기)
      const tokenData = localStorage.getItem('token');
      const isLoggedIn = tokenData !== null;
      
      if (isLoggedIn) {
        // 로그인 상태라면 서버 API 호출
        // JSON 토큰에서 사용자 ID 추출
        try {
          // 사용자 ID만 추출하여 사용 (인코딩 문제 방지)
          let token = '';
          
          try {
            const parsedToken = JSON.parse(tokenData || '{}');
            if (parsedToken.user && parsedToken.user.id) {
              token = parsedToken.user.id;
            } else if (parsedToken.token) {
              token = parsedToken.token;
            } else {
              // JSON으로 저장된 토큰인 경우 다시 문자열로 변환하지 않음
              token = '';
            }
          } catch (error) {
            console.error('토큰 파싱 오류:', error);
            token = '';
          }
          
          if (selectedOptions.length > 0) {
            // 옵션 있는 상품
            const addPromises = selectedOptions.map(option => {
              // UUID 형식 검증
              const validOptionId = validateUUID(option.optionId);
              
              return fetch(`${window.location.origin}/api/cart`, {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                  product_id: productDetails.id,
                  product_option_id: validOptionId,
                  quantity: option.quantity
                }),
              });
            });
            
            await Promise.all(addPromises);
          } else {
            // 옵션 없는 상품 (product_option_id를 명시적으로 null로 전달)
            await fetch(`${window.location.origin}/api/cart`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
              },
              body: JSON.stringify({
                product_id: productDetails.id,
                product_option_id: null,
                quantity: quantity
              }),
            });
          }
          
          // 성공 팝업 표시
          setCartSuccessPopup(true);
        } catch (error) {
          console.error('장바구니 추가 오류:', error);
          alert('장바구니에 추가하는데 실패했습니다.');
        }
      } else {
        // 비로그인 상태라면 로컬 스토리지에 장바구니 정보 저장
        let localCart: LocalCartItem[] = [];
        const existingCart = localStorage.getItem('cart');
        
        if (existingCart) {
          localCart = JSON.parse(existingCart);
        }
        
        if (selectedOptions.length > 0) {
          // 옵션 있는 상품
          for (const option of selectedOptions) {
            // UUID 형식 검증
            const validOptionId = validateUUID(option.optionId);
            
            // 이미 같은 상품, 같은 옵션이 있는지 확인
            const existingItemIndex = localCart.findIndex((item: LocalCartItem) => 
              item.product_id === productDetails.id && 
              item.product_option_id === validOptionId
            );
            
            if (existingItemIndex >= 0) {
              // 기존 아이템의 수량 업데이트
              localCart[existingItemIndex].quantity += option.quantity;
            } else {
              // 새 아이템 추가
              localCart.push({
                id: `local_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
                product_id: productDetails.id,
                product_option_id: validOptionId,
                quantity: option.quantity
              });
            }
          }
        } else {
          // 옵션이 없는 경우, 기본 상품을 로컬 장바구니에 추가 (옵션 없는 경우 product_option_id는 null)
          const existingItemIndex = localCart.findIndex((item: LocalCartItem) => 
            item.product_id === productDetails.id && !item.product_option_id
          );
          
          if (existingItemIndex >= 0) {
            // 기존 아이템의 수량 업데이트
            localCart[existingItemIndex].quantity += quantity;
          } else {
            // 새 아이템 추가 (옵션 없는 경우 product_option_id는 null)
            localCart.push({
              id: `local_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
              product_id: productDetails.id,
              product_option_id: null,
              quantity: quantity
            });
          }
        }
        
        // 로컬 스토리지에 장바구니 정보 저장
        localStorage.setItem('cart', JSON.stringify(localCart));
        
        // 성공 팝업 표시
        setCartSuccessPopup(true);
      }
    } catch (error) {
      console.error('장바구니 추가 오류:', error);
      alert('장바구니에 추가하는데 실패했습니다.');
    } finally {
      // 로딩 상태 종료
      setIsAddingToCart(false);
    }
  };

  const handleBuyNow = () => {
    // 옵션이 있는 상품인데 옵션을 선택하지 않은 경우
    if (options.length > 0 && selectedOptions.length === 0) {
      alert('옵션을 선택해주세요.');
      return;
    }
    
    // 장바구니에 추가 후 checkout 페이지로 이동
    handleAddToCart()
      .then(() => {
        // 성공 팝업 닫기
        setCartSuccessPopup(false);
        router.push('/checkout');
      })
      .catch((error) => {
        console.error('즉시 구매 실패:', error);
      });
  };

  // 장바구니로 이동 함수
  const goToCart = () => {
    router.push('/cart');
  };

  // 팝업 닫기 함수
  const closePopup = () => {
    setCartSuccessPopup(false);
  };

  // 실제 데이터만 사용
  const displaySelectedImage = selectedImage || (images[0]?.image_url || 'https://via.placeholder.com/500');

  // 총 상품 금액 계산
  const calculateTotalPrice = () => {
    if (options.length > 0) {
      // 옵션이 있는 경우
      return selectedOptions.reduce((total, option) => {
        const basePrice = productDetails ? (productDetails.discount_price || productDetails.price) : 0;
        return total + ((basePrice + option.additionalPrice) * option.quantity);
      }, 0);
    } else {
      // 옵션이 없는 경우
      return productDetails ? (productDetails.discount_price || productDetails.price) * quantity : 0;
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-16 flex justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-green-500"></div>
          <p className="mt-4 text-gray-600">상품 정보를 불러오는 중...</p>
        </div>
      </div>
    );
  }

  if (error || !productDetails) {
    return (
      <div className="container mx-auto px-4 py-16">
        <div className="text-center py-10 text-red-600">
          <p className="text-xl">{error || '상품 정보를 찾을 수 없습니다.'}</p>
          <button
            className="mt-4 px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
            onClick={() => router.push('/products')}
          >
            상품 목록으로 돌아가기
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      {/* 장바구니 담는 중 로딩 팝업 */}
      {isAddingToCart && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 flex flex-col items-center">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-green-500 mb-4"></div>
            <p className="text-gray-700 text-lg">장바구니에 담는 중...</p>
          </div>
        </div>
      )}

      {/* 장바구니 담기 성공 팝업 */}
      {cartSuccessPopup && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-80">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-bold">장바구니 담기 완료</h3>
              <button
                className="text-gray-500 hover:text-gray-700"
                onClick={closePopup}
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <p className="text-gray-700 mb-6">상품이 장바구니에 추가되었습니다.</p>
            <div className="flex justify-end space-x-3">
              <button
                className="px-4 py-2 bg-gray-200 text-gray-800 rounded hover:bg-gray-300"
                onClick={closePopup}
              >
                계속 쇼핑하기
              </button>
              <button
                className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
                onClick={goToCart}
              >
                장바구니로 이동
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="flex flex-col lg:flex-row gap-8">
        {/* 상품 이미지 섹션 */}
        <div className="lg:w-1/2">
          <div className="relative w-full h-96 mb-4 rounded-lg overflow-hidden">
            <Image
              src={displaySelectedImage}
              alt={productDetails.name}
              fill
              sizes="(max-width: 768px) 100vw, 50vw"
              className="object-cover"
              priority
            />
          </div>
          <div className="flex gap-2 overflow-x-auto">
            {images.map((image) => (
              <div
                key={image.id}
                className={`relative w-20 h-20 cursor-pointer rounded-md overflow-hidden ${
                  image.image_url === displaySelectedImage ? 'ring-2 ring-green-500' : ''
                }`}
                onClick={() => setSelectedImage(image.image_url)}
              >
                <Image
                  src={image.image_url}
                  alt={`${productDetails.name} 이미지`}
                  fill
                  sizes="80px"
                  className="object-cover"
                />
              </div>
            ))}
          </div>
        </div>

        {/* 상품 정보 섹션 */}
        <div className="lg:w-1/2">
          {productDetails.is_organic && (
            <div className="inline-block bg-green-100 text-green-800 px-3 py-1 rounded-full text-sm font-semibold mb-2">
              유기농
            </div>
          )}
          <h1 className="text-3xl font-bold mb-4">{productDetails.name}</h1>
          
          <div className="mb-6">
            {productDetails.discount_price ? (
              <div className="flex items-baseline">
                <span className="text-gray-400 line-through text-xl mr-2">
                  {productDetails.price.toLocaleString()}원
                </span>
                <span className="text-3xl font-bold text-green-600">
                  {productDetails.discount_price.toLocaleString()}원
                </span>
                <span className="ml-2 bg-red-500 text-white px-2 py-1 rounded text-sm">
                  {Math.round(((productDetails.price - (productDetails.discount_price || 0)) / productDetails.price) * 100)}% 할인
                </span>
              </div>
            ) : (
              <span className="text-3xl font-bold text-green-600">
                {productDetails.price.toLocaleString()}원
              </span>
            )}
          </div>

          <div className="space-y-4 mb-6">
            <div className="flex border-t border-b py-3">
              <div className="w-24 font-semibold">원산지</div>
              <div>{productDetails.origin || '국내산'}</div>
            </div>
            {productDetails.harvest_date && (
              <div className="flex border-b py-3">
                <div className="w-24 font-semibold">수확일</div>
                <div>{new Date(productDetails.harvest_date).toLocaleDateString()}</div>
              </div>
            )}
            {productDetails.storage_method && (
              <div className="flex border-b py-3">
                <div className="w-24 font-semibold">보관방법</div>
                <div>{productDetails.storage_method}</div>
              </div>
            )}
            <div className="flex border-b py-3">
              <div className="w-24 font-semibold">배송방법</div>
              <div>택배배송</div>
            </div>
            <div className="flex border-b py-3">
              <div className="w-24 font-semibold">배송비</div>
              <div>3,000원 (30,000원 이상 구매 시 무료배송)</div>
            </div>
          </div>

          {/* 옵션 선택 - 옵션이 있을 때만 표시 */}
          {options.length > 0 && (
            <div className="mb-6">
              <label htmlFor="option" className="block font-semibold mb-2">
                옵션 선택
              </label>
              <select
                id="option"
                className="w-full p-2 border border-gray-300 rounded focus:outline-none focus:border-green-500"
                onChange={handleOptionChange}
                value=""
              >
                <option value="">옵션을 선택하세요</option>
                {options.map((option) => (
                  <option key={option.id} value={option.id} disabled={option.stock < 1}>
                    {option.option_name}: {option.option_value} 
                    {option.additional_price > 0 ? ` (+${option.additional_price.toLocaleString()}원)` : ''} 
                    {option.stock < 1 ? ' (품절)' : ` (재고: ${option.stock}개)`}
                  </option>
                ))}
              </select>
              
              {/* 선택된 옵션 목록 */}
              {selectedOptions.length > 0 && (
                <div className="mt-5 border-t pt-4">
                  <h3 className="text-lg font-medium mb-3">선택된 옵션</h3>
                  {selectedOptions.map((option) => (
                    <div key={option.optionId} className="flex items-center justify-between border p-3 mb-2 rounded bg-gray-50">
                      <div>
                        <p className="font-medium">{option.optionName}: {option.optionValue}</p>
                        <p className="text-sm text-gray-600">
                          {(option.price + option.additionalPrice).toLocaleString()}원
                        </p>
                      </div>
                      <div className="flex items-center">
                        <div className="flex items-center border rounded mr-2">
                          <button
                            className="px-2 py-1 hover:bg-gray-200"
                            onClick={() => handleQuantityChange(option.optionId, option.quantity - 1)}
                          >
                            -
                          </button>
                          <input
                            type="number"
                            className="w-12 text-center border-x"
                            value={option.quantity}
                            onChange={(e) => handleQuantityChange(option.optionId, parseInt(e.target.value) || 1)}
                            min="1"
                            max={option.stock}
                          />
                          <button
                            className="px-2 py-1 hover:bg-gray-200"
                            onClick={() => handleQuantityChange(option.optionId, option.quantity + 1)}
                          >
                            +
                          </button>
                        </div>
                        <button
                          className="text-gray-500 hover:text-red-500 p-1 bg-gray-200 hover:bg-gray-300 rounded-full h-6 w-6 flex items-center justify-center"
                          onClick={() => handleRemoveOption(option.optionId)}
                          aria-label="옵션 삭제"
                        >
                          X
                        </button>
                      </div>
                    </div>
                  ))}
                  <div className="mt-4 text-right text-lg font-bold">
                    총 금액: {calculateTotalPrice().toLocaleString()}원
                  </div>
                </div>
              )}
            </div>
          )}

          {/* 수량 선택 (옵션이 없을 때만 표시) */}
          {options.length === 0 && (
            <div className="mb-6">
              <label htmlFor="quantity" className="block font-semibold mb-2">
                수량
              </label>
              <div className="flex">
                <button
                  className="px-3 py-2 border border-gray-300 rounded-l-md hover:bg-gray-100"
                  onClick={() => handleBaseQuantityChange(quantity - 1)}
                >
                  -
                </button>
                <input
                  type="number"
                  id="quantity"
                  min="1"
                  max={productDetails?.stock}
                  className="w-16 text-center border-t border-b border-gray-300 focus:outline-none"
                  value={quantity}
                  onChange={(e) => handleBaseQuantityChange(parseInt(e.target.value) || 1)}
                />
                <button
                  className="px-3 py-2 border border-gray-300 rounded-r-md hover:bg-gray-100"
                  onClick={() => handleBaseQuantityChange(quantity + 1)}
                >
                  +
                </button>
              </div>
            </div>
          )}

          {/* 총 금액 */}
          <div className="mb-6">
            <div className="flex justify-between items-center">
              <span className="text-lg font-semibold">총 상품 금액</span>
              <span className="text-2xl font-bold text-green-600">
                {calculateTotalPrice().toLocaleString()}원
              </span>
            </div>
          </div>

          {/* 구매 버튼 */}
          <div className="flex gap-3">
            <button
              className="flex-1 px-6 py-3 bg-white border-2 border-green-600 text-green-600 rounded-md hover:bg-green-50 font-semibold"
              onClick={handleAddToCart}
            >
              장바구니
            </button>
            <button
              className="flex-1 px-6 py-3 bg-green-600 text-white rounded-md hover:bg-green-700 font-semibold"
              onClick={handleBuyNow}
            >
              바로 구매하기
            </button>
          </div>
        </div>
      </div>

      {/* 상품 상세 설명 */}
      <div className="mt-16">
        <h2 className="text-2xl font-bold mb-6 pb-2 border-b">상품 상세 정보</h2>
        <div className="prose max-w-none">
          <p className="whitespace-pre-line">{productDetails.description}</p>
          {/* 추가 상품 이미지 및 설명 */}
          {images.map((image, index) => (
            !image.is_thumbnail && (
              <div key={image.id} className="my-8">
                <div className="relative w-full h-96">
                  <Image
                    src={image.image_url}
                    alt={`${productDetails.name} 이미지 ${index + 1}`}
                    fill
                    sizes="(max-width: 768px) 100vw, 50vw"
                    className="object-cover"
                  />
                </div>
              </div>
            )
          ))}
        </div>
      </div>
    </div>
  );
}