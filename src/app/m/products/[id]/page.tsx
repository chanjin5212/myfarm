'use client';

import React, { useState, useEffect, useCallback, useMemo, memo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Image from 'next/image';
import { getAuthHeader, checkToken } from '@/utils/auth';
import MobileProductInfo from './components/ProductInfo';
import MobileProductOptions from './components/ProductOptions';
import MobileProductTabs from './components/ProductTabs';
import { Spinner } from '@/components/ui/CommonStyles';
import Link from 'next/link';
import { LocalCartItem } from '@/types/cart';
import toast, { Toaster } from 'react-hot-toast';
import { ProductProvider } from './components/ProductContext';

interface ProductDetail {
  id: string;
  name: string;
  description: string;
  price: number;
  discount_price?: number;
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
  is_default: boolean;
  created_at: string;
  updated_at: string;
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

interface CartProduct {
  id: string;
  name: string;
  price: number;
  thumbnail_url: string;
}

// 이미지 썸네일 컴포넌트
const ProductThumbnail = memo(({ 
  image, 
  index, 
  isActive, 
  onSelect 
}: { 
  image: ProductImage, 
  index: number, 
  isActive: boolean, 
  onSelect: (index: number) => void 
}) => {
  return (
    <button
      onClick={() => onSelect(index)}
      className={`flex-shrink-0 w-16 h-16 border-2 rounded overflow-hidden 
        ${isActive ? 'border-green-500' : 'border-gray-200'}`}
    >
      <Image
        src={image.image_url}
        alt={`상품 이미지 ${index + 1}`}
        width={64}
        height={64}
        className="object-cover w-full h-full"
        unoptimized={image.image_url?.includes('blob:')}
      />
    </button>
  );
});

ProductThumbnail.displayName = 'ProductThumbnail';

// 장바구니 팝업 컴포넌트
const CartPopup = memo(({ 
  isOpen, 
  onClose, 
  onGoToCart 
}: { 
  isOpen: boolean, 
  onClose: () => void, 
  onGoToCart: () => void 
}) => {
  if (!isOpen) return null;
  
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg w-full max-w-sm">
        <div className="p-5">
          <div className="flex justify-between items-start">
            <div className="bg-green-100 rounded-full p-2 text-green-600">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <button onClick={onClose} className="text-gray-500">
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
              onClick={onClose}
              className="flex-1 py-2 border border-gray-300 rounded-md text-gray-700"
            >
              계속 쇼핑
            </button>
            <button
              onClick={onGoToCart}
              className="flex-1 py-2 bg-green-600 text-white rounded-md"
            >
              장바구니 가기
            </button>
          </div>
        </div>
      </div>
    </div>
  );
});

CartPopup.displayName = 'CartPopup';

// 메인 이미지 컴포넌트
const MainImage = memo(({ 
  images, 
  currentImage, 
  productName, 
  thumbnailUrl 
}: { 
  images: ProductImage[], 
  currentImage: number, 
  productName?: string, 
  thumbnailUrl?: string 
}) => {
  const imageUrl = useMemo(() => {
    if (images.length > 0) {
      return images[currentImage]?.image_url || '/images/default-product.jpg';
    }
    return thumbnailUrl || '/images/default-product.jpg';
  }, [images, currentImage, thumbnailUrl]);
  
  return (
    <div className="relative w-full aspect-square bg-gray-100">
      <Image
        src={imageUrl}
        alt={`${productName || '상품'} 대표 이미지`}
        fill
        sizes="100vw"
        className="object-contain"
        priority
        unoptimized={imageUrl?.includes('blob:')}
      />
    </div>
  );
});

MainImage.displayName = 'MainImage';

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
  const [activeTab, setActiveTab] = useState<'info' | 'review' | 'inquiry'>('info');
  const [currentImage, setCurrentImage] = useState<number>(0);

  // 상품 정보 가져오기
  useEffect(() => {
    const fetchProductDetails = async () => {
      setLoading(true);
      
      const controller = new AbortController();
      
      try {
        const apiUrl = `/api/products/${params?.id}`;
        const response = await fetch(apiUrl, {
          signal: controller.signal
        });
        
        if (!response.ok) {
          throw new Error('상품 정보를 불러오는데 실패했습니다.');
        }
        
        const data = await response.json();
        setProductDetails(data.product);
        setImages(data.images || []);
        setOptions(data.options || []);
        
        setError(null);
      } catch (err) {
        if (err instanceof Error && err.name !== 'AbortError') {
          console.error('상품 상세 로딩 오류:', err);
          setError('상품 정보를 불러오는데 실패했습니다.');
        }
      } finally {
        setLoading(false);
      }
      
      return () => {
        controller.abort();
      };
    };

    if (params?.id) {
      fetchProductDetails();
    }
  }, [params?.id]);

  // 선택한 썸네일에 따라 메인 이미지 변경
  const handleThumbnailClick = useCallback((index: number) => {
    setCurrentImage(index);
  }, []);

  // 장바구니 추가 핸들러
  const handleAddToCart = useCallback(async () => {
    // 옵션이 있는 상품인데 옵션을 선택하지 않은 경우
    if (!productDetails) {
      toast.error('상품 정보를 찾을 수 없습니다.');
      return;
    }
    
    if (options.length > 0 && selectedOptions.length === 0) {
      toast.error('옵션을 선택해주세요.');
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
            toast.error('로그인 정보가 만료되었습니다. 다시 로그인해주세요.');
            router.push('/m/auth');
            return;
          }
          
          if (selectedOptions.length > 0) {
            // 옵션 있는 상품 - 순차적으로 처리하여 안정성 향상
            const successfulOptions = [];
            const failedOptions = [];
            
            for (const option of selectedOptions) {
              try {
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
                
                const result = await response.json();
                successfulOptions.push(option.optionValue);
              } catch (err) {
                console.error(`옵션 [${option.optionValue}] 추가 실패:`, err);
                failedOptions.push(option.optionValue);
              }
            }
            
            // 결과 처리
            if (successfulOptions.length > 0) {
              if (failedOptions.length > 0) {
                toast.success(`일부 옵션이 장바구니에 추가되었습니다. (${successfulOptions.join(', ')})`);
                toast.error(`일부 옵션 추가 실패: ${failedOptions.join(', ')}`);
              } else {
                toast.success("장바구니에 상품이 추가되었습니다.");
              }
            } else {
              toast.error("장바구니에 상품을 추가하지 못했습니다.");
            }
            
          } else {
            // 옵션이 없는 상품 - product_option_id를 null로 전달
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
            
            // 성공 처리
            toast.success("장바구니에 상품이 추가되었습니다.");
          }
          
          // 성공 팝업 표시
          setCartSuccessPopup(true);
        } catch (error) {
          console.error('장바구니 추가 오류:', error);
          toast.error(error instanceof Error ? error.message : '장바구니에 추가하는데 실패했습니다.');
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
        toast.success("장바구니에 상품이 추가되었습니다.");
      }
    } catch (error) {
      console.error('장바구니 추가 오류:', error);
      toast.error(error instanceof Error ? error.message : '장바구니에 추가하는데 실패했습니다.');
    } finally {
      // 로딩 상태 종료
      setIsAddingToCart(false);
    }
  }, [productDetails, options.length, selectedOptions, quantity, router]);

  // 바로 구매 핸들러
  const handleBuyNow = useCallback(() => {
    if (!productDetails) {
      toast.error("상품 정보를 찾을 수 없습니다.");
      return;
    }

    // Find the first option with stock available
    const availableOption = options.find(opt => opt.stock > 0);
    if (options.length > 0 && !availableOption) {
      toast.error("재고가 없습니다");
      return;
    }

    if (selectedOptions.length === 0 && options.length > 0) {
      toast.error("옵션을 선택해주세요");
      return;
    }

    if (quantity <= 0) {
      toast.error("수량을 선택해주세요");
      return;
    }

    // 체크아웃 페이지로 전달할 데이터
    let buyNowData: any;

    if (selectedOptions.length > 0) {
      // 기존 API와 호환성 유지를 위해 첫 번째 옵션만 option으로 설정
      const firstOption = {
        id: selectedOptions[0].optionId,
        name: selectedOptions[0].optionName,
        value: selectedOptions[0].optionValue,
        additionalPrice: selectedOptions[0].additionalPrice,
      };

      // 모든 선택된 옵션 정보를 배열로 저장
      const allOptions = selectedOptions.map(opt => ({
        id: opt.optionId,
        name: opt.optionName,
        value: opt.optionValue,
        additionalPrice: opt.additionalPrice,
        quantity: opt.quantity
      }));

      // 옵션이 있는 상품의 경우 각 옵션별 최종 가격 계산 (기본 가격 + 추가 가격)
      const productForCart: CartProduct = {
        id: productDetails.id,
        name: productDetails.name,
        price: productDetails.price, // 기본 가격은 그대로 저장
        thumbnail_url: productDetails.thumbnail_url || ""
      };

      buyNowData = {
        product: productForCart,
        // 총 구매 수량 (모든 옵션의 수량 합계)
        quantity: selectedOptions.reduce((total, opt) => total + opt.quantity, 0),
        // 첫 번째 옵션 (기존 코드와의 호환성)
        option: firstOption,
        // 모든 옵션 배열
        allOptions: allOptions,
        // 총 금액 계산하여 추가 (각 옵션별 [기본가격 + 추가가격] × 수량의 합계)
        totalPrice: selectedOptions.reduce((total, opt) => 
          total + ((productDetails.price + opt.additionalPrice) * opt.quantity), 0)
      };
    } else {
      // 옵션이 없는 상품
      const productForCart: CartProduct = {
        id: productDetails.id,
        name: productDetails.name,
        price: productDetails.price,
        thumbnail_url: productDetails.thumbnail_url || ""
      };

      buyNowData = {
        product: productForCart,
        quantity: quantity,
        option: null,
        allOptions: null,
        totalPrice: productDetails.price * quantity // 옵션 없는 상품의 총 금액
      };
    }

    // 로컬 스토리지에 즉시 구매 정보 저장
    localStorage.setItem("buyNowItem", JSON.stringify(buyNowData));
    router.push("/m/checkout?type=buy-now");
  }, [productDetails, options, selectedOptions, quantity, router]);

  // 장바구니 팝업 관련 핸들러
  const closePopup = useCallback(() => {
    setCartSuccessPopup(false);
  }, []);

  // 장바구니로 이동
  const goToCart = useCallback(() => {
    router.push('/m/cart');
  }, [router]);

  // 썸네일 목록 렌더링 최적화
  const thumbnailsList = useMemo(() => {
    if (images.length <= 1) return null;
    
    return (
      <div className="flex overflow-x-auto py-3 px-4 gap-2 bg-white">
        {images.map((image, index) => (
          <ProductThumbnail
            key={image.id}
            image={image}
            index={index}
            isActive={currentImage === index}
            onSelect={handleThumbnailClick}
          />
        ))}
      </div>
    );
  }, [images, currentImage, handleThumbnailClick]);

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
    <ProductProvider>
      <div className="pb-20">
        <Toaster position="top-center" />
        {/* 고정 헤더 */}
        <header className="fixed top-0 left-0 right-0 bg-white shadow-sm z-50 border-b border-gray-200">
          <div className="container mx-auto py-3 px-4">
            <div className="flex items-center">
              <button onClick={() => router.back()} className="text-gray-700">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
                </svg>
              </button>
              <h1 className="text-xl font-bold">상품목록</h1>
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
        <div className="pt-1 pb-1">
          {/* 메인 이미지 */}
          <MainImage 
            images={images} 
            currentImage={currentImage} 
            productName={productDetails.name} 
            thumbnailUrl={productDetails.thumbnail_url} 
          />
          
          {/* 이미지 썸네일 목록 */}
          {thumbnailsList}
          
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
          {productDetails.status === 'active' ? (
            <>
              <button
                onClick={handleAddToCart}
                disabled={isAddingToCart || !checkToken().isLoggedIn}
                className={`flex-1 border-2 border-green-600 bg-white py-2.5 rounded-md font-medium flex items-center justify-center ${!checkToken().isLoggedIn ? 'text-gray-400 border-gray-300 bg-gray-100 cursor-not-allowed' : 'text-green-600'}`}
              >
                {isAddingToCart ? (
                  <Spinner size="sm" className="mr-2 border-t-green-600 border-b-green-600" />
                ) : null}
                {checkToken().isLoggedIn ? '장바구니' : '장바구니(로그인 필요)'}
              </button>
              <button
                onClick={handleBuyNow}
                className="flex-1 bg-green-600 text-white py-2.5 rounded-md font-medium"
              >
                바로 구매
              </button>
            </>
          ) : (
            <div className="flex-1 py-3 bg-gray-100 rounded-md text-center font-medium text-gray-700">
              {productDetails.status === 'out_of_stock' ? (
                <>
                  <span className="text-red-500 mr-1">품절</span> 
                  상품입니다
                </>
              ) : (
                <>
                  <span className="text-gray-600 mr-1">판매중지</span> 
                  상품입니다
                </>
              )}
            </div>
          )}
        </div>
        
        {/* 장바구니 성공 팝업 */}
        <CartPopup 
          isOpen={cartSuccessPopup} 
          onClose={closePopup} 
          onGoToCart={goToCart} 
        />
      </div>
    </ProductProvider>
  );
} 