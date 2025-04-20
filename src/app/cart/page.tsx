'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { checkToken, getAuthHeader, User } from '@/utils/auth';
import { toast } from 'react-hot-toast';

interface CartItem {
  id: string;
  product_id: string;
  product_option_id?: string;
  quantity: number;
  product: {
    id: string;
    name: string;
    price: number;
    discount_price?: number;
    thumbnail_url?: string;
    stock: number;
  };
  product_option?: {
    id: string;
    option_name: string;
    option_value: string;
    additional_price: number;
    stock: number;
  };
}

// 로컬 스토리지의 장바구니 아이템용 인터페이스
interface LocalCartItem {
  id: string;
  product_id: string;
  product_option_id?: string;
  quantity: number;
}

interface ProductOption {
  id: string;
  option_name: string;
  option_value: string;
  additional_price: number;
  stock: number;
}

// 그룹화된 장바구니 아이템 인터페이스
interface GroupedCartItem {
  product_id: string;
  product: {
    id: string;
    name: string;
    price: number;
    discount_price?: number;
    thumbnail_url?: string;
    stock: number;
  };
  options: {
    id: string;
    cart_item_id: string;
    option_name: string;
    option_value: string;
    additional_price: number;
    quantity: number;
    stock: number;
  }[];
  totalQuantity: number;
  totalPrice: number;
}

// 주문 수정 관련 인터페이스 추가
interface EditableOption {
  cart_item_id: string;
  option_name: string;
  option_value: string;
  additional_price: number;
  quantity: number;
  stock: number;
}

export default function CartPage() {
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedItems, setSelectedItems] = useState<string[]>([]);
  const [user, setUser] = useState<User | null>(null);
  const [totalPrice, setTotalPrice] = useState(0);
  const [finalPrice, setFinalPrice] = useState(0);
  const [groupedCartItems, setGroupedCartItems] = useState<GroupedCartItem[]>([]);
  
  // 주문 편집 관련 상태 추가
  const [editItemId, setEditItemId] = useState<string | null>(null);
  const [editProductId, setEditProductId] = useState<string | null>(null);
  const [editQuantity, setEditQuantity] = useState(1);
  const [editOptions, setEditOptions] = useState<EditableOption[]>([]);
  
  // 로딩 상태 관련 추가
  const [actionLoading, setActionLoading] = useState(false);
  const [editModalLoading, setEditModalLoading] = useState(false);
  const [removingItemIds, setRemovingItemIds] = useState<string[]>([]);
  const [editingProductId, setEditingProductId] = useState<string | null>(null);
  
  const router = useRouter();

  useEffect(() => {
    // 로그인 상태 확인
    const { user: currentUser } = checkToken();
    setUser(currentUser);

  }, []);

  // 장바구니 데이터 가져오기 함수
  const fetchCartItems = async () => {
    setLoading(true);
    setError(null);
    
    try {

      const { isLoggedIn } = checkToken();

      if (!isLoggedIn) {
        
        // 로컬 스토리지에서 장바구니 데이터 가져오기
        const localCartData = localStorage.getItem('cart');
        if (!localCartData) {
          setCartItems([]);
          setGroupedCartItems([]);
          setSelectedItems([]);
          return;
        }
        
        const parsedCart = JSON.parse(localCartData);
        
        // 각 상품 정보 가져오기
        const itemsWithProducts = await Promise.all(
          parsedCart.map(async (item: LocalCartItem) => {
            try {
              const response = await fetch(`/api/products/${item.product_id}`);
              if (response.ok) {
                const data = await response.json();
                return {
                  ...item,
                  product: data.product,
                  product_option: item.product_option_id ? 
                    data.options.find((opt: ProductOption) => opt.id === item.product_option_id) : undefined
                };
              }
              return null;
            } catch (err) {
              console.error(`상품 정보 로딩 오류 (${item.product_id}):`, err);
              return null;
            }
          })
        );
        
        setCartItems(itemsWithProducts.filter(Boolean));
      } else {
        // 서버에서 장바구니 데이터 가져오기
        const headers = getAuthHeader();
        
        if (!headers.Authorization) {
          setError('인증 정보가 만료되었습니다. 다시 로그인해주세요.');
          router.push('/auth');
          return;
        }
        
        const response = await fetch('/api/cart', {
          headers
        });
        
        if (!response.ok) {
          throw new Error('장바구니 정보를 가져오는데 실패했습니다.');
        }
        
        const data = await response.json();
        
        // 서버 데이터 설정
        setCartItems(data.items || []);
        
        // 아이템 그룹화
        const groupedItems = groupCartItems(data.items || []);
        setGroupedCartItems(groupedItems);
        
        // 자동으로 모든 아이템 선택
        setSelectedItems(
          (data.items || []).map((item: CartItem) => item.id)
        );
      }
    } catch (error) {
      console.error('장바구니 로딩 오류:', error);
      setError('장바구니 정보를 불러오는데 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };
  
  // 장바구니 데이터 로드
  useEffect(() => {
    fetchCartItems();
  }, [user, router]);

  // 장바구니 아이템을 상품별로 그룹화하는 함수
  const groupCartItems = (items: CartItem[]) => {
    const grouped: GroupedCartItem[] = [];
    
    items.forEach(item => {
      const existingGroup = grouped.find(group => group.product_id === item.product_id);
      
      if (existingGroup) {
        // 이미 해당 상품 그룹이 있는 경우, 옵션 추가
        if (item.product_option) {
          existingGroup.options.push({
            id: item.product_option.id,
            cart_item_id: item.id,
            option_name: item.product_option.option_name,
            option_value: item.product_option.option_value,
            additional_price: item.product_option.additional_price,
            quantity: item.quantity,
            stock: item.product_option.stock
          });
        } else {
          // 옵션이 없는 상품의 경우 (기본 옵션 추가)
          existingGroup.options.push({
            id: 'no-option',
            cart_item_id: item.id,
            option_name: '기본 상품',
            option_value: '',
            additional_price: 0,
            quantity: item.quantity,
            stock: item.product.stock
          });
        }
        
        // 상품 수량 합산 (모든 옵션의 수량 합산으로 수정)
        existingGroup.totalQuantity += item.quantity;
        
        // 총 금액 업데이트
        const itemPrice = (item.product.discount_price || item.product.price) +
          (item.product_option?.additional_price || 0);
        existingGroup.totalPrice += itemPrice * item.quantity;
      } else {
        // 새 상품 그룹 생성
        const options = [];
        if (item.product_option) {
          options.push({
            id: item.product_option.id,
            cart_item_id: item.id,
            option_name: item.product_option.option_name,
            option_value: item.product_option.option_value,
            additional_price: item.product_option.additional_price,
            quantity: item.quantity,
            stock: item.product_option.stock
          });
        } else {
          // 옵션이 없는 상품의 경우 (기본 옵션 추가)
          options.push({
            id: 'no-option',
            cart_item_id: item.id,
            option_name: '기본 상품',
            option_value: '',
            additional_price: 0,
            quantity: item.quantity,
            stock: item.product.stock
          });
        }
        
        const itemPrice = (item.product.discount_price || item.product.price) +
          (item.product_option?.additional_price || 0);
          
        grouped.push({
          product_id: item.product_id,
          product: item.product,
          options: options,
          totalQuantity: item.quantity,
          totalPrice: itemPrice * item.quantity
        });
      }
    });
    
    return grouped;
  };
  
  // 장바구니 아이템이 변경될 때마다 그룹화 수행
  useEffect(() => {
    const grouped = groupCartItems(cartItems);
    setGroupedCartItems(grouped);
  }, [cartItems]);

  const handleQuantityChange = async (itemId: string, newQuantity: number) => {
    if (newQuantity < 1) return;
    
    const item = cartItems.find(item => item.id === itemId);
    if (!item) return;
    
    const maxStock = item.product_option ? 
      Math.min(item.product.stock, item.product_option.stock) : 
      item.product.stock;
    
    if (newQuantity > maxStock) {
      alert(`재고가 ${maxStock}개 남았습니다.`);
      newQuantity = maxStock;
    }
    
    try {
      if (!user) {
        // 로컬 스토리지 장바구니 업데이트
        const localCart = JSON.parse(localStorage.getItem('cart') || '[]');
        const updatedCart = localCart.map((cartItem: LocalCartItem) => 
          cartItem.id === itemId ? { ...cartItem, quantity: newQuantity } : cartItem
        );
        localStorage.setItem('cart', JSON.stringify(updatedCart));
        
        // 현재 상태 업데이트
        setCartItems(prevItems => 
          prevItems.map(item => 
            item.id === itemId ? { ...item, quantity: newQuantity } : item
          )
        );
      } else {
        // 서버 장바구니 업데이트
        const headers = getAuthHeader();
        
        if (!headers.Authorization) {
          alert('로그인이 필요합니다.');
          router.push('/auth');
          return;
        }
        
        const response = await fetch(`/api/cart/items/${itemId}`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            ...headers
          },
          body: JSON.stringify({ quantity: newQuantity })
        });
        
        if (!response.ok) {
          throw new Error('수량 업데이트에 실패했습니다.');
        }
        
        // 현재 상태 업데이트
        setCartItems(prevItems => 
          prevItems.map(item => 
            item.id === itemId ? { ...item, quantity: newQuantity } : item
          )
        );
      }
    } catch (err) {
      console.error('수량 업데이트 오류:', err);
      alert('수량 업데이트에 실패했습니다.');
    }
  };

  // 선택된 상품의 총 가격 계산
  const calculateTotalPrice = () => {
    let total = 0;
    
    cartItems.forEach(item => {
      if (selectedItems.includes(item.id)) {
        const basePrice = item.product.price;
        const optionPrice = item.product_option ? item.product_option.additional_price : 0;
        total += (basePrice + optionPrice) * item.quantity;
      }
    });
    
    return total;
  };
  
  // 선택된 상품 기반으로 가격 업데이트
  useEffect(() => {
    const productTotal = calculateTotalPrice();
    setTotalPrice(productTotal);
    setFinalPrice(productTotal);
  }, [cartItems, selectedItems]);

  const handleCheckout = () => {
    if (selectedItems.length === 0) {
      toast.error('선택된 상품이 없습니다');
      return;
    }
    
    const selectedCartItems = cartItems.filter(item => selectedItems.includes(item.id));
    const checkoutItems = selectedCartItems.map(item => {
      const basePrice = item.product.price;
      const optionPrice = item.product_option ? item.product_option.additional_price : 0;
      const itemPrice = basePrice + optionPrice;
      
      return {
        id: item.id,
        productId: item.product_id,
        productOptionId: item.product_option ? item.product_option.id : null,
        name: item.product.name,
        price: itemPrice,
        quantity: item.quantity,
        image: item.product.thumbnail_url || '/images/default-product.jpg',
        option: item.product_option ? {
          name: item.product_option.option_name,
          value: item.product_option.option_value,
          additional_price: item.product_option.additional_price
        } : undefined,
        totalPrice: itemPrice * item.quantity
      };
    });
    
    localStorage.setItem('checkoutItems', JSON.stringify(checkoutItems));
    router.push('/checkout');
  };

  // 모든 아이템 선택/해제
  const handleSelectAll = (isSelected: boolean) => {
    if (isSelected) {
      setSelectedItems(cartItems.map(item => item.id));
    } else {
      setSelectedItems([]);
    }
  };
  
  // 그룹 단위로 아이템 선택/해제 (개별 아이템 선택 함수는 더 이상 사용하지 않음)
  const handleSelectGroup = (groupProductId: string, isSelected: boolean) => {
    const groupItems = cartItems.filter(item => item.product_id === groupProductId);
    const groupItemIds = groupItems.map(item => item.id);
    
    if (isSelected) {
      // 그룹 내 모든 아이템 선택
      setSelectedItems(prev => [...prev, ...groupItemIds]);
    } else {
      // 그룹 내 모든 아이템 선택 해제
      setSelectedItems(prev => prev.filter(id => !groupItemIds.includes(id)));
    }
  };
  
  // 선택된 아이템 삭제
  const handleRemoveSelectedItems = async () => {
    if (selectedItems.length === 0) {
      alert('삭제할 상품을 선택해주세요.');
      return;
    }
    
    if (confirm(`선택한 ${selectedItems.length}개 상품을 장바구니에서 삭제하시겠습니까?`)) {
      try {
        setActionLoading(true);
        setRemovingItemIds(selectedItems);
        
        if (!user) {
          // 로컬 스토리지에서 선택한 아이템 제거
          const localCart = JSON.parse(localStorage.getItem('cart') || '[]');
          const updatedCart = localCart.filter((item: LocalCartItem) => !selectedItems.includes(item.id));
          localStorage.setItem('cart', JSON.stringify(updatedCart));
          
          // 현재 상태 업데이트
          setCartItems(prevItems => prevItems.filter(item => !selectedItems.includes(item.id)));
        } else {
          // 서버 요청을 위한 Promise 배열 생성
          const headers = getAuthHeader();
          
          if (!headers.Authorization) {
            setError('인증 정보가 만료되었습니다. 다시 로그인해주세요.');
            router.push('/auth');
            return;
          }
          
          const deletePromises = selectedItems.map(itemId => 
            fetch(
              `/api/cart/items/${itemId}`,
              {
                method: 'DELETE',
                headers
              }
            )
          );
          
          // 모든 삭제 요청 실행
          await Promise.all(deletePromises);
          
          // 현재 상태 업데이트
          setCartItems(prevItems => prevItems.filter(item => !selectedItems.includes(item.id)));
        }
        
        // 선택 목록 초기화
        setSelectedItems([]);
      } catch (err) {
        console.error('선택 상품 삭제 오류:', err);
        alert('선택한 상품 삭제에 실패했습니다.');
      } finally {
        setActionLoading(false);
        setRemovingItemIds([]);
      }
    }
  };

  // 주문 편집 모달 열기 함수 수정 - 상품 그룹 단위로 편집
  const handleOpenEditModal = (groupProductId: string) => {
    setEditModalLoading(true);
    setEditingProductId(groupProductId);
    
    try {
      const group = groupedCartItems.find(g => g.product_id === groupProductId);
      if (!group) return;
      
      // 해당 상품의 모든 옵션 정보 설정
      setEditProductId(groupProductId);
      
      // 옵션 정보 설정
      const options = group.options.map(opt => ({
        cart_item_id: opt.cart_item_id,
        option_name: opt.option_name,
        option_value: opt.option_value,
        additional_price: opt.additional_price,
        quantity: opt.quantity,
        stock: opt.stock
      }));
      
      setEditOptions(options);
      
      // 기본 상품 ID 설정 (뒤 호환성)
      if (options.length > 0) {
        setEditItemId(options[0].cart_item_id);
        setEditQuantity(options[0].quantity);
      } else {
        // 옵션이 없는 상품일 경우
        const basicItem = cartItems.find(item => item.product_id === groupProductId);
        if (basicItem) {
          setEditItemId(basicItem.id);
          setEditQuantity(basicItem.quantity);
        }
      }
    } finally {
      setEditModalLoading(false);
    }
  };
  
  // 주문 편집 모달 닫기
  const handleCloseEditModal = () => {
    setEditItemId(null);
    setEditProductId(null);
    setEditOptions([]);
    setEditQuantity(1);
    setEditingProductId(null);
  };
  
  // 편집 내용 저장 함수 수정
  const handleSaveEdit = async () => {
    if (actionLoading) return; // 이미 로딩 중이면 중복 실행 방지
    
    try {
      setActionLoading(true);
      
      // 각 옵션별로 수량 업데이트
      for (const option of editOptions) {
        const { isLoggedIn } = checkToken();
      
        if (!isLoggedIn) {
          // 로컬 스토리지 업데이트 로직
          const existingCart = localStorage.getItem('cart');
          
          if (existingCart) {
            const localCart = JSON.parse(existingCart);
            const item = localCart.find((i: LocalCartItem) => i.id === option.cart_item_id);
            
            if (item) {
              item.quantity = option.quantity;
              localStorage.setItem('cart', JSON.stringify(localCart));
            }
          }
        } else {
          // 서버 장바구니 업데이트
          const headers = getAuthHeader();
          
          if (!headers.Authorization) {
            setError('인증 정보가 만료되었습니다. 다시 로그인해주세요.');
            router.push('/auth');
            return;
          }
          
          const response = await fetch(`/api/cart/items/${option.cart_item_id}`, {
            method: 'PATCH',
            headers: {
              'Content-Type': 'application/json',
              ...headers
            },
            body: JSON.stringify({ quantity: option.quantity })
          });
          
          if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || '장바구니 업데이트에 실패했습니다.');
          }
        }
      }
      
      // 장바구니 데이터 다시 불러오기
      await fetchCartItems();
      
      // 성공 후 상태 초기화 및 모달 닫기
      setActionLoading(false);
      handleCloseEditModal();
      
    } catch (error) {
      console.error('장바구니 수정 오류:', error);
      alert(error instanceof Error ? error.message : '장바구니 수정에 실패했습니다.');
      setActionLoading(false);
    }
  };
  
  // 옵션 수량 변경 핸들러 추가
  const handleEditOptionQuantityChange = (optionId: string, quantity: number) => {
    setEditOptions(prev => 
      prev.map(opt => 
        opt.cart_item_id === optionId 
          ? { ...opt, quantity } 
          : opt
      )
    );
  };

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-16 flex justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-green-500"></div>
          <p className="mt-4 text-gray-600">장바구니 정보를 불러오는 중...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto px-4 py-16">
        <div className="text-center py-10 text-red-600">
          <p className="text-xl">{error}</p>
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
      <h1 className="text-3xl font-bold mb-8">장바구니</h1>
      
      {groupedCartItems.length === 0 ? (
        <div className="text-center py-16">
          <p className="text-xl text-gray-600 mb-6">장바구니가 비어있습니다.</p>
          <Link
            href="/products"
            className="px-6 py-3 bg-green-600 text-white rounded-md hover:bg-green-700"
          >
            상품 둘러보기
          </Link>
        </div>
      ) : (
        <div className="flex flex-col lg:flex-row gap-8">
          {/* 장바구니 아이템 목록 */}
          <div className="lg:w-2/3">
            <div className="bg-white rounded-lg shadow overflow-hidden">
              <div className="bg-gray-50 py-4 px-6 border-b">
                <div className="flex items-center">
                  <div className="w-8 text-center">
                    <input
                      type="checkbox"
                      checked={selectedItems.length === cartItems.length && cartItems.length > 0}
                      onChange={(e) => handleSelectAll(e.target.checked)}
                      className="w-4 h-4 text-green-600 rounded focus:ring-green-500"
                    />
                  </div>
                  <div className="flex-grow">상품 정보</div>
                  <div className="w-28 text-center">금액</div>
                  <div className="w-24 text-center">관리</div>
                </div>
              </div>
              
              {groupedCartItems.map((groupItem) => (
                <div key={groupItem.product_id} className="py-6 px-6 border-b last:border-0">
                  <div className="flex items-start">
                    <div className="w-8 flex justify-center mr-2 pt-2">
                      <input
                        type="checkbox"
                        checked={groupItem.options.every(option => 
                          selectedItems.includes(option.cart_item_id)
                        )}
                        onChange={(e) => handleSelectGroup(groupItem.product_id, e.target.checked)}
                        className="w-4 h-4 text-green-600 rounded focus:ring-green-500"
                      />
                    </div>
                    <div className="flex-grow">
                      <div className="flex">
                        <div className="relative h-20 w-20 min-w-20 mr-4">
                          <Image
                            src={groupItem.product.thumbnail_url || 'https://via.placeholder.com/100'}
                            alt={groupItem.product.name}
                            fill
                            sizes="80px"
                            className="object-cover rounded"
                          />
                        </div>
                        <div>
                          <Link href={`/products/${groupItem.product_id}`} className="text-lg font-semibold hover:text-green-600">
                            {groupItem.product.name}
                          </Link>
                          <p className="text-green-600 font-semibold mt-1">
                            {groupItem.product.discount_price ? 
                              `${groupItem.product.discount_price.toLocaleString()}원` : 
                              `${groupItem.product.price.toLocaleString()}원`
                            }
                            {groupItem.product.discount_price && (
                              <span className="text-gray-400 line-through text-sm ml-2">
                                {groupItem.product.price.toLocaleString()}원
                              </span>
                            )}
                          </p>
                          
                          {/* 옵션 목록 */}
                          {groupItem.options.length > 0 ? (
                            <div className="mt-3 space-y-2">
                              <p className="text-sm font-medium text-gray-700">선택된 옵션:</p>
                              {groupItem.options.map(option => (
                                <div key={option.id} className="text-sm flex justify-between items-center bg-gray-50 p-2 rounded">
                                  <div>
                                    <span className="font-medium">{option.option_name}: {option.option_value}</span>
                                    {option.additional_price > 0 && (
                                      <span className="text-gray-500 ml-1">(+{option.additional_price.toLocaleString()}원)</span>
                                    )}
                                  </div>
                                  <div className="text-gray-600">
                                    {option.quantity}개
                                  </div>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <div className="mt-3">
                              <p className="text-sm text-gray-700">기본 상품</p>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                    
                    <div className="w-28 text-center font-semibold">
                      <div className="flex flex-col items-end">
                        <span className="text-lg">
                          {groupItem.totalPrice.toLocaleString()}원
                        </span>
                        <span className="text-xs text-gray-500">
                          총 {groupItem.totalQuantity}개
                        </span>
                      </div>
                    </div>
                    
                    <div className="w-24 text-center">
                      <button
                        className="text-blue-500 hover:text-blue-700 text-sm underline flex items-center justify-center"
                        onClick={() => handleOpenEditModal(groupItem.product_id)}
                        disabled={editModalLoading || editingProductId === groupItem.product_id}
                      >
                        {editingProductId === groupItem.product_id ? (
                          <>
                            <span className="inline-block w-4 h-4 mr-1 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></span>
                            로딩중
                          </>
                        ) : '주문 수정'}
                      </button>
                    </div>
                  </div>
                </div>
              ))}
              
              {groupedCartItems.length > 0 && (
                <div className="py-4 px-6 bg-gray-50">
                  <button
                    className={`px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600 text-sm flex items-center ${actionLoading ? 'opacity-70 cursor-not-allowed' : ''}`}
                    onClick={handleRemoveSelectedItems}
                    disabled={actionLoading || selectedItems.length === 0}
                  >
                    {actionLoading && removingItemIds.length > 0 ? (
                      <>
                        <span className="inline-block w-4 h-4 mr-2 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                        삭제 중...
                      </>
                    ) : '선택 상품 삭제'}
                  </button>
                </div>
              )}
            </div>
          </div>
          
          {/* 주문 요약 */}
          <div className="lg:w-1/3">
            <div className="bg-white p-6 rounded-md shadow-md border border-gray-200 sticky top-8">
              <h3 className="text-lg font-semibold mb-4">주문 요약</h3>
              <div className="space-y-3 border-b border-gray-200 pb-3 mb-3">
                <div className="flex justify-between">
                  <span className="text-gray-600">총 상품가격</span>
                  <span>{totalPrice.toLocaleString()}원</span>
                </div>
                <div className="flex justify-between pt-3 mb-2 font-semibold text-lg">
                  <span>총 주문금액</span>
                  <span className="text-red-600">{finalPrice.toLocaleString()}원</span>
                </div>
              </div>
              <button
                onClick={handleCheckout}
                disabled={selectedItems.length === 0}
                className={`w-full py-3 text-white rounded-md font-medium ${
                  selectedItems.length === 0 ? 'bg-gray-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700'
                }`}
              >
                {selectedItems.length === 0 ? '상품을 선택해주세요' : '주문하기'}
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* 주문 수정 모달 */}
      {editProductId && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-lg p-6 w-full max-w-md">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-bold">주문 내용 수정</h3>
              <button
                className="text-gray-500 hover:text-gray-700"
                onClick={handleCloseEditModal}
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            {(() => {
              const group = groupedCartItems.find(g => g.product_id === editProductId);
              if (!group) return null;
              
              return (
                <>
                  <div className="mb-4">
                    <p className="font-semibold text-lg">{group.product.name}</p>
                    <p className="text-green-600 text-sm">
                      {group.product.discount_price ? 
                        `${group.product.discount_price.toLocaleString()}원` : 
                        `${group.product.price.toLocaleString()}원`
                      }
                      {group.product.discount_price && (
                        <span className="text-gray-400 line-through ml-2">
                          {group.product.price.toLocaleString()}원
                        </span>
                      )}
                    </p>
                  </div>
                  
                  {editOptions.length > 0 ? (
                    <div className="space-y-4 mb-6">
                      <h4 className="font-medium">선택된 옵션</h4>
                      {editOptions.map(option => (
                        <div key={option.cart_item_id} className="bg-gray-50 p-3 rounded">
                          <div className="flex justify-between mb-2">
                            <div>
                              <p className="font-medium">{option.option_name}: {option.option_value}</p>
                              {option.additional_price > 0 && (
                                <p className="text-sm text-gray-600">+{option.additional_price.toLocaleString()}원</p>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center">
                            <span className="mr-2 text-sm">수량:</span>
                            <div className="flex border border-gray-300 rounded">
                              <button
                                className="px-3 py-1 hover:bg-gray-100"
                                onClick={() => handleEditOptionQuantityChange(option.cart_item_id, Math.max(1, option.quantity - 1))}
                              >
                                -
                              </button>
                              <input
                                type="number"
                                min="1"
                                max={option.stock}
                                value={option.quantity}
                                onChange={(e) => handleEditOptionQuantityChange(option.cart_item_id, parseInt(e.target.value) || 1)}
                                className="w-12 text-center border-x border-gray-300 focus:outline-none"
                              />
                              <button
                                className="px-3 py-1 hover:bg-gray-100"
                                onClick={() => handleEditOptionQuantityChange(option.cart_item_id, Math.min(option.stock, option.quantity + 1))}
                              >
                                +
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="mb-6">
                      <label className="block text-gray-700 font-semibold mb-2">수량</label>
                      <div className="flex">
                        <button
                          className="px-3 py-2 border border-gray-300 rounded-l-md hover:bg-gray-100"
                          onClick={() => setEditQuantity(prev => Math.max(1, prev - 1))}
                        >
                          -
                        </button>
                        <input
                          type="number"
                          min="1"
                          value={editQuantity}
                          onChange={(e) => setEditQuantity(parseInt(e.target.value) || 1)}
                          className="w-16 text-center border-y border-gray-300 focus:outline-none"
                        />
                        <button
                          className="px-3 py-2 border border-gray-300 rounded-r-md hover:bg-gray-100"
                          onClick={() => setEditQuantity(prev => prev + 1)}
                        >
                          +
                        </button>
                      </div>
                    </div>
                  )}
                  
                  <div className="flex justify-end">
                    <button
                      className="px-4 py-2 bg-gray-200 text-gray-800 rounded mr-2 hover:bg-gray-300"
                      onClick={handleCloseEditModal}
                      disabled={actionLoading}
                    >
                      취소
                    </button>
                    <button
                      className={`px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 flex items-center ${actionLoading ? 'opacity-70 cursor-not-allowed' : ''}`}
                      onClick={handleSaveEdit}
                      disabled={actionLoading}
                    >
                      {actionLoading ? (
                        <>
                          <span className="inline-block w-4 h-4 mr-2 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                          저장 중...
                        </>
                      ) : '저장'}
                    </button>
                  </div>
                </>
              );
            })()}
          </div>
        </div>
      )}
    </div>
  );
} 