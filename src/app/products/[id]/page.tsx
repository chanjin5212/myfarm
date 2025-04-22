'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Image from 'next/image';
import { getAuthHeader, checkToken } from '@/utils/auth';
import ProductInfoTab from './components/ProductInfoTab';
import ReviewTab from './components/ReviewTab';
import { toast } from 'react-hot-toast';

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
  images?: ProductImage[];
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
  
  // 탭 상태 추가
  const [activeTab, setActiveTab] = useState<'info' | 'review'>('info');
  
  // 리뷰 관련 상태
  const [reviews, setReviews] = useState<any[]>([]);
  const [reviewsLoading, setReviewsLoading] = useState<boolean>(false);
  const [reviewSort, setReviewSort] = useState<string>('latest');
  
  // 버튼별 로딩 상태 추가
  const [changingOptionId, setChangingOptionId] = useState<string | null>(null);
  const [changingBaseQuantity, setChangingBaseQuantity] = useState<boolean>(false);
  const [removingOptionId, setRemovingOptionId] = useState<string | null>(null);
  const [isBuyingNow, setIsBuyingNow] = useState<boolean>(false);
  
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
      try {
        setLoading(true);
        setError(null);
        
        const apiUrl = `/api/products/${params?.id}`;
        
        const response = await fetch(apiUrl);
        
        if (!response.ok) {
          throw new Error(`상품 정보를 불러오지 못했습니다 (${response.status})`);
        }
        
        const data = await response.json();
        
        // 상품 데이터가 존재하는지 확인
        if (!data.product) {
          throw new Error('상품 정보를 찾을 수 없습니다');
        }
        
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
      } catch (error) {
        setError('상품 정보를 불러오는데 실패했습니다');
      } finally {
        setLoading(false);
      }
    };

    if (params?.id) {
      fetchProductDetails();
    }
  }, [params?.id]);

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
    
    // 수량 변경 로딩 상태 시작
    setChangingOptionId(optionId);
    
    // 수량 업데이트
    setSelectedOptions(
      selectedOptions.map(opt => 
        opt.optionId === optionId ? { ...opt, quantity: newQuantity } : opt
      )
    );
    
    // 로딩 상태 즉시 해제
    setChangingOptionId(null);
  };

  const handleRemoveOption = (optionId: string) => {
    setRemovingOptionId(optionId);
    setSelectedOptions(selectedOptions.filter(option => option.optionId !== optionId));
    setRemovingOptionId(null);
  };

  const handleBaseQuantityChange = (newQuantity: number) => {
    if (newQuantity < 1) {
      alert('최소 수량은 1개입니다.');
      return;
    }
    
    if (productDetails && productDetails.stock && newQuantity > productDetails.stock) {
      alert(`최대 ${productDetails.stock}개까지 구매 가능합니다.`);
      return;
    }
    
    setChangingBaseQuantity(true);
    setQuantity(newQuantity);
    setChangingBaseQuantity(false);
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
      setIsAddingToCart(true);
      
      const { isLoggedIn } = checkToken();
      
      if (isLoggedIn) {
        // 로그인 상태라면 서버 API 호출
        try {
          // 인증 헤더 가져오기
          const authHeader = await getAuthHeader();
          
          if (selectedOptions.length > 0) {
            // 옵션 있는 상품
            const addPromises = selectedOptions.map(option => {
              // UUID 형식 검증
              const validOptionId = validateUUID(option.optionId);
              
              return fetch(`${window.location.origin}/api/cart`, {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  ...authHeader
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
            // 옵션 없는 상품 - 명시적으로 product_option_id를 null로 전달
            const requestBody = {
              product_id: productDetails.id,
              product_option_id: null,
              quantity: quantity
            };
            
            await fetch(`${window.location.origin}/api/cart`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                ...authHeader
              },
              body: JSON.stringify(requestBody),
            });
          }
          
          toast.success('상품이 장바구니에 추가되었습니다');
        } catch (error) {
          toast.error('장바구니에 추가하지 못했습니다');
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
          // 옵션이 없는 경우
          // 옵션이 없는 상품을 찾는 방법 수정: product_option_id가 명시적으로 null 또는 없는 경우
          const existingItemIndex = localCart.findIndex((item: LocalCartItem) => 
            item.product_id === productDetails.id && 
            (item.product_option_id === null || item.product_option_id === undefined || typeof item.product_option_id === 'undefined')
          );
          
          if (existingItemIndex >= 0) {
            // 기존 아이템의 수량 업데이트
            localCart[existingItemIndex].quantity += quantity;
          } else {
            // 새 아이템 추가 - product_option_id는 명시적으로 null 설정
            const newItem: LocalCartItem = {
              id: `local_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
              product_id: productDetails.id,
              product_option_id: null,
              quantity: quantity
            };
            
            localCart.push(newItem);
          }
        }
        
        // 로컬 스토리지에 장바구니 정보 저장
        localStorage.setItem('cart', JSON.stringify(localCart));
        
        toast.success('상품이 장바구니에 추가되었습니다');
      }
    } catch (error) {
      toast.error('장바구니에 추가하지 못했습니다');
    } finally {
      setIsAddingToCart(false);
    }
  };

  const handleBuyNow = () => {
    // 옵션이 있는 상품인데 옵션을 선택하지 않은 경우
    if (options.length > 0 && selectedOptions.length === 0) {
      alert('옵션을 선택해주세요.');
      return;
    }
    
    if (!productDetails) {
      alert('상품 정보를 찾을 수 없습니다.');
      return;
    }
    
    setIsBuyingNow(true);
    
    try {
      // 바로 구매 상품 정보 생성
      let checkoutItems = [];
      
      if (options.length > 0) {
        // 옵션이 있는 상품
        checkoutItems = selectedOptions.map(option => {
          const basePrice = productDetails.discount_price || productDetails.price;
          const totalPrice = basePrice + option.additionalPrice;
          
          return {
            product_id: productDetails.id,
            product_option_id: option.optionId,
            quantity: option.quantity,
            product: {
              id: productDetails.id,
              name: productDetails.name,
              price: productDetails.price,
              discount_price: productDetails.discount_price,
              thumbnail_url: images.length > 0 ? images[0].image_url : productDetails.thumbnail_url,
              stock: productDetails.stock
            },
            product_option: {
              id: option.optionId,
              option_name: option.optionName,
              option_value: option.optionValue,
              additional_price: option.additionalPrice,
              stock: option.stock
            },
            total_price: totalPrice * option.quantity, // 옵션 가격을 포함한 총 금액
            option_price: totalPrice // 단일 옵션 가격 (할인가 + 추가가격)
          };
        });
      } else {
        // 옵션이 없는 상품
        const unitPrice = productDetails.discount_price || productDetails.price;
        
        // product_option_id 필드 자체를 생략하여 SQL NULL로 처리
        const checkoutItem = {
          product_id: productDetails.id,
          quantity: quantity,
          product: {
            id: productDetails.id,
            name: productDetails.name,
            price: productDetails.price,
            discount_price: productDetails.discount_price,
            thumbnail_url: images.length > 0 ? images[0].image_url : productDetails.thumbnail_url,
            stock: productDetails.stock
          },
          product_option: null, // 옵션 정보 없음
          total_price: unitPrice * quantity, // 총 금액
          option_price: unitPrice // 단일 상품 가격 (할인가)
        };
        
        checkoutItems = [checkoutItem];
      }
      
      // 로컬 스토리지에 체크아웃 상품 정보 저장
      localStorage.setItem('directCheckoutItems', JSON.stringify(checkoutItems));
      
      // 체크아웃 페이지로 이동
      router.push('/checkout?direct=true');
    } catch (error) {
      toast.error('주문 처리 중 오류가 발생했습니다');
    } finally {
      setIsBuyingNow(false);
    }
  };

  // 장바구니로 이동 함수
  const goToCart = () => {
    router.push('/cart');
  };

  // 팝업 닫기 함수
  const closePopup = () => {
    setCartSuccessPopup(false);
  };

  // 디버깅: DB에 저장된 thumbnail_url 직접 로깅
  useEffect(() => {
    if (productDetails?.thumbnail_url) {
      console.log('디버그: DB에 저장된 thumbnail_url:', productDetails?.thumbnail_url);
    }
  }, [productDetails]);

  // 실제 데이터만 사용 - thumbnail_url 우선 적용
  const displaySelectedImage = 
    productDetails?.thumbnail_url || 
    selectedImage || 
    (images.length > 0 && images[0]?.image_url) || 
    'https://via.placeholder.com/500';

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

  // 상품 리뷰 가져오기
  const fetchReviews = useCallback(async (page = 1) => {
    if (!activeTab || activeTab !== 'review') return;
    
    setReviewsLoading(true);
    
    try {
      // 리뷰 API 호출
      const response = await fetch(
        `/api/products/${params?.id}/reviews?page=${page}&limit=5&sort=${reviewSort}`
      );
      
      const data = await response.json();
      
      if (page === 1) {
        setReviews(data.reviews || []);
      } else {
        setReviews(prev => [...prev, ...(data.reviews || [])]);
      }
    } catch (error) {
      toast.error('상품 리뷰를 불러오는데 실패했습니다');
    } finally {
      setReviewsLoading(false);
    }
  }, [params?.id, activeTab, reviewSort]);

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
              onError={(e) => {
                // 이미지 로드 실패 시 기본 이미지로 대체
                (e.target as HTMLImageElement).src = 'https://via.placeholder.com/500?text=이미지+없음';
              }}
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
                disabled={isAddingToCart || isBuyingNow}
              >
                <option value="">옵션을 선택하세요</option>
                {options.map((option) => {
                  const basePrice = productDetails ? (productDetails.discount_price || productDetails.price) : 0;
                  const totalOptionPrice = basePrice + option.additional_price;
                  
                  return (
                    <option key={option.id} value={option.id} disabled={option.stock < 1 || isAddingToCart || isBuyingNow}>
                      {option.option_name}: {option.option_value} 
                      {option.additional_price > 0 
                        ? ` (${totalOptionPrice.toLocaleString()}원 = 기본가 + ${option.additional_price.toLocaleString()}원)` 
                        : ` (${totalOptionPrice.toLocaleString()}원)`
                      } 
                      {option.stock < 1 ? ' (품절)' : ` (재고: ${option.stock}개)`}
                    </option>
                  );
                })}
              </select>
              
              {/* 선택된 옵션 목록 */}
              {selectedOptions.length > 0 && (
                <div className="mt-5 border-t pt-4">
                  <h3 className="text-lg font-medium mb-3">선택된 옵션</h3>
                  {selectedOptions.map((option) => (
                    <div key={option.optionId} className="flex flex-col border p-3 mb-2 rounded bg-gray-50">
                      <div className="flex justify-between items-center mb-2">
                        <div>
                          <p className="font-medium">{option.optionName}: {option.optionValue}</p>
                          <p className="text-sm text-gray-600">
                            {(option.price + option.additionalPrice).toLocaleString()}원 
                            {option.additionalPrice > 0 ? ` (기본가 + ${option.additionalPrice.toLocaleString()}원)` : ''}
                          </p>
                        </div>
                        <button
                          className="text-gray-500 hover:text-red-500 p-1 bg-gray-200 hover:bg-gray-300 rounded-full h-6 w-6 flex items-center justify-center disabled:opacity-50"
                          onClick={() => handleRemoveOption(option.optionId)}
                          disabled={removingOptionId === option.optionId || isAddingToCart || isBuyingNow}
                          aria-label="옵션 삭제"
                        >
                          {removingOptionId === option.optionId ? (
                            <span className="inline-block w-3 h-3 border-2 border-gray-500 border-t-transparent rounded-full animate-spin"></span>
                          ) : 'X'}
                        </button>
                      </div>
                      <div className="flex justify-between items-center">
                        <div className="flex items-center border rounded">
                          <button
                            className="px-2 py-1 hover:bg-gray-200 disabled:opacity-50"
                            onClick={() => handleQuantityChange(option.optionId, option.quantity - 1)}
                            disabled={changingOptionId === option.optionId || isAddingToCart || isBuyingNow}
                          >
                            {changingOptionId === option.optionId ? (
                              <span className="inline-block w-4 h-4 border-2 border-gray-500 border-t-transparent rounded-full animate-spin"></span>
                            ) : '-'}
                          </button>
                          <input
                            type="number"
                            className="w-12 text-center border-x"
                            value={option.quantity}
                            onChange={(e) => handleQuantityChange(option.optionId, parseInt(e.target.value) || 1)}
                            min="1"
                            max={option.stock}
                            disabled={changingOptionId === option.optionId || isAddingToCart || isBuyingNow}
                          />
                          <button
                            className="px-2 py-1 hover:bg-gray-200 disabled:opacity-50"
                            onClick={() => handleQuantityChange(option.optionId, option.quantity + 1)}
                            disabled={changingOptionId === option.optionId || isAddingToCart || isBuyingNow}
                          >
                            {changingOptionId === option.optionId ? (
                              <span className="inline-block w-4 h-4 border-2 border-gray-500 border-t-transparent rounded-full animate-spin"></span>
                            ) : '+'}
                          </button>
                        </div>
                        <div className="text-green-600 font-semibold">
                          {((option.price + option.additionalPrice) * option.quantity).toLocaleString()}원
                        </div>
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
              <div className="flex items-center">
                <button
                  className="px-3 py-2 border border-gray-300 rounded-l-md hover:bg-gray-100 disabled:opacity-50"
                  onClick={() => handleBaseQuantityChange(quantity - 1)}
                  disabled={changingBaseQuantity || isAddingToCart || isBuyingNow}
                >
                  {changingBaseQuantity ? (
                    <span className="inline-block w-4 h-4 border-2 border-gray-500 border-t-transparent rounded-full animate-spin"></span>
                  ) : '-'}
                </button>
                <input
                  type="number"
                  id="quantity"
                  min="1"
                  max={productDetails?.stock}
                  className="w-16 text-center border-t border-b border-gray-300 focus:outline-none"
                  value={quantity}
                  onChange={(e) => handleBaseQuantityChange(parseInt(e.target.value) || 1)}
                  disabled={changingBaseQuantity || isAddingToCart || isBuyingNow}
                />
                <button
                  className="px-3 py-2 border border-gray-300 rounded-r-md hover:bg-gray-100 disabled:opacity-50"
                  onClick={() => handleBaseQuantityChange(quantity + 1)}
                  disabled={changingBaseQuantity || isAddingToCart || isBuyingNow}
                >
                  {changingBaseQuantity ? (
                    <span className="inline-block w-4 h-4 border-2 border-gray-500 border-t-transparent rounded-full animate-spin"></span>
                  ) : '+'}
                </button>
                <span className="ml-4 text-green-600 font-semibold">
                  {((productDetails.discount_price || productDetails.price) * quantity).toLocaleString()}원
                </span>
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
          <div className="flex space-x-3 mb-8">
            <button
              onClick={handleAddToCart}
              disabled={isAddingToCart || isBuyingNow}
              className="flex-1 bg-white border-2 border-green-600 text-green-600 rounded-md py-3 font-semibold hover:bg-green-50 transition duration-200 disabled:opacity-50 flex items-center justify-center"
            >
              {isAddingToCart ? (
                <>
                  <span className="inline-block w-5 h-5 mr-2 border-2 border-green-600 border-t-transparent rounded-full animate-spin"></span>
                  담는 중...
                </>
              ) : '장바구니에 담기'}
            </button>
            <button
              onClick={handleBuyNow}
              disabled={isAddingToCart || isBuyingNow}
              className="flex-1 bg-green-600 text-white rounded-md py-3 font-semibold hover:bg-green-700 transition duration-200 disabled:opacity-50 flex items-center justify-center"
            >
              {isBuyingNow ? (
                <>
                  <span className="inline-block w-5 h-5 mr-2 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                  주문 중...
                </>
              ) : '바로 구매하기'}
            </button>
          </div>
        </div>
      </div>

      {/* 탭 섹션 */}
      <div className="mt-16">
        <div className="border-b mb-6">
          <div className="flex">
            <button
              className={`px-6 py-3 font-semibold ${
                activeTab === 'info'
                  ? 'text-green-600 border-b-2 border-green-600'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
              onClick={() => setActiveTab('info')}
            >
              상품 상세정보
            </button>
            <button
              className={`px-6 py-3 font-semibold ${
                activeTab === 'review'
                  ? 'text-green-600 border-b-2 border-green-600'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
              onClick={() => setActiveTab('review')}
            >
              상품 후기
            </button>
          </div>
        </div>

        {/* 탭 컨텐츠 */}
        <div>
          {activeTab === 'info' && (
            <ProductInfoTab
              description={productDetails.description}
              origin={productDetails.origin}
              harvestDate={productDetails.harvest_date}
              storageMethod={productDetails.storage_method}
              isOrganic={productDetails.is_organic}
            />
          )}
          {activeTab === 'review' && (
            <ReviewTab productId={productDetails.id} />
          )}
        </div>
      </div>
    </div>
  );
}