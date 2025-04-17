'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Image from 'next/image';
import { getAuthHeader, checkToken } from '@/utils/auth';
import MobileProductInfo from './components/ProductInfo';
import MobileProductOptions from './components/ProductOptions';
import MobileProductTabs from './components/ProductTabs';
import { Spinner } from '@/components/ui/CommonStyles';
import Link from 'next/link';
import { LocalCartItem } from '@/types/cart';

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

export default function MobileProductDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [productDetails, setProductDetails] = useState<ProductDetail | null>(null);
  const [images, setImages] = useState<ProductImage[]>([]);
  const [options, setOptions] = useState<ProductOption[]>([]);
  const [selectedOptions, setSelectedOptions] = useState<SelectedOption[]>([]);
  const [quantity, setQuantity] = useState<number>(1);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [isAddingToCart, setIsAddingToCart] = useState<boolean>(false);
  const [cartSuccessPopup, setCartSuccessPopup] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<'info' | 'review'>('info');
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [startX, setStartX] = useState(0);
  const [translateX, setTranslateX] = useState(0);

  // 상품 정보 가져오기
  useEffect(() => {
    const fetchProductDetails = async () => {
      setLoading(true);
      try {
        const apiUrl = `/api/products/${params.id}`;
        const response = await fetch(apiUrl);
        
        if (!response.ok) {
          throw new Error('상품 정보를 불러오는데 실패했습니다.');
        }
        
        const data = await response.json();
        setProductDetails(data.product);
        setImages(data.images || []);
        setOptions(data.options || []);
        
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

  // 터치 이벤트 핸들러
  const handleTouchStart = (e: React.TouchEvent) => {
    setIsDragging(true);
    setStartX(e.touches[0].clientX);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDragging) return;
    const currentX = e.touches[0].clientX;
    const diff = currentX - startX;
    setTranslateX(diff);
  };

  const handleTouchEnd = () => {
    if (!isDragging) return;
    setIsDragging(false);
    
    if (Math.abs(translateX) > 50) {
      if (translateX > 0 && currentSlide > 0) {
        setCurrentSlide(prev => prev - 1);
      } else if (translateX < 0 && currentSlide < images.length - 1) {
        setCurrentSlide(prev => prev + 1);
      }
    }
    setTranslateX(0);
  };

  // 장바구니 추가 핸들러
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

    try {
      // 로딩 상태 시작
      setIsAddingToCart(true);
      
      // 로그인 여부 확인
      const { isLoggedIn } = checkToken();
      
      if (isLoggedIn) {
        // 로그인 상태라면 서버 API 호출
        try {
          // 인증 헤더 가져오기
          const authHeader = getAuthHeader();
          
          if (!authHeader.Authorization) {
            alert('로그인 정보가 만료되었습니다. 다시 로그인해주세요.');
            router.push('/m/auth');
            return;
          }
          
          if (selectedOptions.length > 0) {
            // 옵션 있는 상품
            const results = await Promise.all(
              selectedOptions.map(async option => {
                const response = await fetch(`${window.location.origin}/api/cart`, {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json',
                    ...authHeader
                  },
                  body: JSON.stringify({
                    product_id: productDetails.id,
                    product_option_id: option.optionId,
                    quantity: option.quantity
                  }),
                });
                
                if (!response.ok) {
                  const errorData = await response.json().catch(() => ({}));
                  throw new Error(errorData.message || '장바구니 추가에 실패했습니다.');
                }
                
                return await response.json();
              })
            );
            
            console.log('장바구니 추가 결과:', results);
            
          } else {
            // 옵션 없는 상품 - product_option_id를 null로 전달
            const requestBody = {
              product_id: productDetails.id,
              product_option_id: null,
              quantity: quantity
            };
            
            const response = await fetch(`${window.location.origin}/api/cart`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                ...authHeader
              },
              body: JSON.stringify(requestBody),
            });
            
            if (!response.ok) {
              const errorData = await response.json().catch(() => ({}));
              throw new Error(errorData.message || '장바구니 추가에 실패했습니다.');
            }
            
            const result = await response.json();
            console.log('장바구니 추가 결과:', result);
          }
          
          // 성공 팝업 표시
          setCartSuccessPopup(true);
        } catch (error) {
          console.error('장바구니 추가 오류:', error);
          alert(error instanceof Error ? error.message : '장바구니에 추가하는데 실패했습니다.');
        }
      } else {
        // 비로그인 상태라면 로컬 스토리지에 장바구니 정보 저장
        let localCart: LocalCartItem[] = [];
        const existingCart = localStorage.getItem('cart');
        
        if (existingCart) {
          try {
            localCart = JSON.parse(existingCart);
          } catch (e) {
            console.error('로컬 스토리지 파싱 오류:', e);
            localCart = [];
          }
        }
        
        if (selectedOptions.length > 0) {
          // 옵션 있는 상품
          for (const option of selectedOptions) {
            // 이미 같은 상품, 같은 옵션이 있는지 확인
            const existingItemIndex = localCart.findIndex((item: LocalCartItem) => 
              item.product_id === productDetails.id && 
              item.product_option_id === option.optionId
            );
            
            if (existingItemIndex >= 0) {
              // 기존 아이템의 수량 업데이트
              localCart[existingItemIndex].quantity += option.quantity;
            } else {
              // 새 아이템 추가
              localCart.push({
                id: `local_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
                product_id: productDetails.id,
                product_option_id: option.optionId,
                quantity: option.quantity
              });
            }
          }
        } else {
          // 옵션이 없는 경우
          const existingItemIndex = localCart.findIndex((item: LocalCartItem) => 
            item.product_id === productDetails.id && 
            (item.product_option_id === null || item.product_option_id === undefined)
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
        
        // 성공 팝업 표시
        setCartSuccessPopup(true);
      }
    } catch (error) {
      console.error('장바구니 추가 오류:', error);
      alert(error instanceof Error ? error.message : '장바구니에 추가하는데 실패했습니다.');
    } finally {
      // 로딩 상태 종료
      setIsAddingToCart(false);
    }
  };

  // 바로 구매 핸들러
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
      router.push('/m/checkout?direct=true');
    } catch (error) {
      console.error('바로 구매하기 실패:', error);
      alert('주문 처리 중 오류가 발생했습니다.');
    }
  };

  // 장바구니 팝업 닫기
  const closePopup = () => {
    setCartSuccessPopup(false);
  };

  // 장바구니로 이동
  const goToCart = () => {
    router.push('/m/cart');
  };

  if (loading) {
    return (
      <div className="flex flex-col justify-center items-center min-h-[60vh] bg-white">
        <Spinner size="lg" />
        <p className="mt-4 text-gray-500 text-sm">상품 정보를 불러오는 중입니다...</p>
      </div>
    );
  }

  if (error || !productDetails) {
    return (
      <div className="px-4 py-8 text-center">
        <div className="text-red-500 mb-4">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-12 h-12 mx-auto mb-2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
          </svg>
          <p className="text-lg font-semibold">{error || '상품 정보를 찾을 수 없습니다.'}</p>
        </div>
        <button
          className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
          onClick={() => router.push('/m/products')}
        >
          상품 목록으로 돌아가기
        </button>
      </div>
    );
  }

  return (
    <div className="pb-20">
      {/* 고정 헤더 */}
      <header className="fixed top-0 left-0 right-0 bg-white shadow-sm z-50 border-b border-gray-200">
        <div className="container mx-auto py-3 px-4">
          <div className="flex items-center">
            <button onClick={() => router.back()} className="text-gray-700">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
              </svg>
            </button>
            <Link href="/m" className="font-bold text-xl text-[#e3c478] ml-4">숙경팜</Link>
            <div className="flex space-x-3 ml-auto">
              <Link href="/m/search" aria-label="검색" className="text-gray-700">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
                </svg>
              </Link>
              <Link href="/m/cart" aria-label="장바구니" className="text-gray-700">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 3h1.386c.51 0 .955.343 1.087.835l.383 1.437M7.5 14.25a3 3 0 00-3 3h15.75m-12.75-3h11.218c1.121-2.3 2.1-4.684 2.924-7.138a60.114 60.114 0 00-16.536-1.84M7.5 14.25L5.106 5.272M6 20.25a.75.75 0 11-1.5 0 .75.75 0 011.5 0zm12.75 0a.75.75 0 11-1.5 0 .75.75 0 011.5 0z" />
                </svg>
              </Link>
              <Link href="/m/mypage" aria-label="마이페이지" className="text-gray-700">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
                </svg>
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* 컨텐츠 영역 - 헤더 높이만큼 상단 여백 추가 */}
      <div className="pt-14">
        {/* 이미지 슬라이더 */}
        <div 
          className="relative w-full aspect-square overflow-hidden"
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
        >
          <div 
            className="transition-transform duration-300 ease-in-out h-full flex"
            style={{ 
              transform: `translateX(calc(-${currentSlide * 100}% + ${translateX}px))`,
              touchAction: 'none'
            }}
          >
            {images.length > 0 ? (
              images.map((image, index) => (
                <div key={image.id} className="w-full h-full flex-shrink-0">
                  <Image
                    src={image.image_url}
                    alt={`${productDetails.name} 이미지 ${index + 1}`}
                    fill
                    sizes="100vw"
                    className="object-cover"
                    priority={index === 0}
                  />
                </div>
              ))
            ) : (
              <div className="w-full h-full flex-shrink-0">
                <Image
                  src={productDetails.thumbnail_url || '/images/default-product.jpg'}
                  alt={productDetails.name}
                  fill
                  sizes="100vw"
                  className="object-cover"
                  priority
                />
              </div>
            )}
          </div>
          
          {/* 이미지 인디케이터 */}
          {images.length > 1 && (
            <div className="absolute bottom-3 left-0 right-0 flex justify-center space-x-2">
              {images.map((_, index) => (
                <button 
                  key={index}
                  className={`w-2 h-2 rounded-full ${currentSlide === index ? 'bg-white' : 'bg-white/50'}`}
                  onClick={() => setCurrentSlide(index)}
                />
              ))}
            </div>
          )}
        </div>
        
        {/* 상품 정보 */}
        <MobileProductInfo product={productDetails} />
        
        {/* 옵션 선택 영역 */}
        <MobileProductOptions 
          product={productDetails}
          options={options}
          selectedOptions={selectedOptions}
          setSelectedOptions={setSelectedOptions}
          quantity={quantity}
          setQuantity={setQuantity}
        />
        
        {/* 탭 섹션 */}
        <MobileProductTabs 
          product={productDetails}
          activeTab={activeTab}
          setActiveTab={setActiveTab}
        />
      </div>
      
      {/* 하단 고정 영역 - 장바구니/구매 버튼 */}
      <div className="fixed bottom-14 left-0 right-0 bg-white border-t p-3 flex space-x-2 z-40">
        <button
          onClick={handleAddToCart}
          disabled={isAddingToCart}
          className="flex-1 border-2 border-green-600 bg-white text-green-600 py-2.5 rounded-md font-medium flex items-center justify-center"
        >
          {isAddingToCart ? (
            <span className="inline-block w-5 h-5 border-2 border-green-600 border-t-transparent rounded-full animate-spin mr-2" />
          ) : null}
          장바구니
        </button>
        <button
          onClick={handleBuyNow}
          className="flex-1 bg-green-600 text-white py-2.5 rounded-md font-medium"
        >
          바로 구매
        </button>
      </div>
      
      {/* 장바구니 성공 팝업 */}
      {cartSuccessPopup && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg w-full max-w-sm">
            <div className="p-5">
              <div className="flex justify-between items-start">
                <div className="bg-green-100 rounded-full p-2 text-green-600">
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <button onClick={closePopup} className="text-gray-500">
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              <h3 className="mt-3 text-lg font-medium">장바구니에 담겼습니다</h3>
              <p className="mt-1 text-sm text-gray-600">
                장바구니로 이동하여 상품을 확인하시겠습니까?
              </p>
              <div className="flex space-x-2 mt-4">
                <button
                  onClick={closePopup}
                  className="flex-1 py-2 border border-gray-300 rounded-md text-gray-700"
                >
                  계속 쇼핑
                </button>
                <button
                  onClick={goToCart}
                  className="flex-1 py-2 bg-green-600 text-white rounded-md"
                >
                  장바구니 가기
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 