'use client';

import { useState, useEffect, useCallback } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { checkToken, getAuthHeader, User } from '@/utils/auth';
import { toast, Toaster } from 'react-hot-toast';
import { CartItem, LocalCartItem, GroupedCartItem, EditableOption } from '@/types/cart';
import { updateLocalCartItem, removeFromLocalCart } from '@/utils/cart';
import { getCart, updateCartItem, removeCartItem } from '@/utils/api/cart';

import { Spinner } from '@/components/ui/CommonStyles';

// PC 버전과 동일한 인터페이스 사용
interface ProductOption {
  id: string;
  option_name: string;
  option_value: string;
  additional_price: number;
  stock: number;
}

export default function MobileCartPage() {
  const router = useRouter();
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedItems, setSelectedItems] = useState<string[]>([]);
  const [user, setUser] = useState<User | null>(null);
  const [totalPrice, setTotalPrice] = useState(0);
  const [finalPrice, setFinalPrice] = useState(0);
  const [groupedCartItems, setGroupedCartItems] = useState<GroupedCartItem[]>([]);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editingProductId, setEditingProductId] = useState<string | null>(null);
  const [editOptions, setEditOptions] = useState<EditableOption[]>([]);
  const [isSelectAll, setIsSelectAll] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [removingItemIds, setRemovingItemIds] = useState<string[]>([]);
  const [availableOptions, setAvailableOptions] = useState<ProductOption[]>([]);
  const [selectedGroups, setSelectedGroups] = useState<string[]>([]);
  
  // 장바구니 데이터 가져오기 함수
  const fetchCartItems = useCallback(async () => {
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
          router.push('/m/auth');
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
      }
    } catch (error) {
      console.error('장바구니 로딩 오류:', error);
      setError('장바구니 정보를 불러오는데 실패했습니다.');
    } finally {
      setLoading(false);
    }
  }, [router]);
  
  // 장바구니 데이터 로드
  useEffect(() => {
    let mounted = true;

    const loadCart = async () => {
      if (mounted) {
        await fetchCartItems();
      }
    };

    loadCart();

    return () => {
      mounted = false;
    };
  }, [fetchCartItems]);

  // 장바구니 아이템을 상품별로 그룹화하는 함수
  const groupCartItems = (items: CartItem[]) => {
    const groupedItems: Record<string, GroupedCartItem> = {};

    items.forEach(item => {
      const productId = item.product_id;
      
      if (!groupedItems[productId]) {
        groupedItems[productId] = {
          product_id: productId,
          product: item.product,
          options: [],
          totalQuantity: 0,
          totalPrice: 0
        };
      }
      
      const basePrice = item.product.price;
      const optionPrice = item.product_option ? item.product_option.additional_price : 0;
      const totalOptionPrice = (basePrice + optionPrice) * item.quantity;
      
      groupedItems[productId].options.push({
        id: item.product_option ? item.product_option.id : 'base',
        cart_item_id: item.id,
        option_name: item.product_option ? item.product_option.option_name : '기본',
        option_value: item.product_option ? item.product_option.option_value : '옵션 없음',
        additional_price: optionPrice,
        quantity: item.quantity,
        stock: item.product_option ? item.product_option.stock : item.product.stock
      });
      
      groupedItems[productId].totalQuantity += item.quantity;
      groupedItems[productId].totalPrice += totalOptionPrice;
    });
    
    return Object.values(groupedItems);
  };
  
  // 로컬 장바구니 아이템을 그룹화
  useEffect(() => {
    if (cartItems.length > 0) {
      const groupedItems = groupCartItems(cartItems);
      setGroupedCartItems(groupedItems);
      
      // 초기에 모든 아이템 선택
      const allGroupIds = groupedItems.map(group => group.product_id);
      const allItemIds = groupedItems.flatMap(group => 
        group.options.map(option => option.cart_item_id)
      );
      
      setSelectedGroups(allGroupIds);
      setSelectedItems(allItemIds);
      setIsSelectAll(true);
    }
  }, [cartItems]);
  
  // 모든 아이템 선택/해제
  const handleSelectAll = (isSelected: boolean) => {
    setIsSelectAll(isSelected);
    
    if (isSelected) {
      // 모든 그룹 선택
      const allGroupIds = groupedCartItems.map(group => group.product_id);
      setSelectedGroups(allGroupIds);
      // 모든 아이템 선택
      const allItemIds = groupedCartItems.flatMap(group => 
        group.options.map(option => option.cart_item_id)
      );
      setSelectedItems(allItemIds);
    } else {
      setSelectedGroups([]);
      setSelectedItems([]);
    }
  };
  
  // 특정 상품 그룹 전체 선택/해제
  const handleSelectGroup = (groupProductId: string, isSelected: boolean) => {
    const group = groupedCartItems.find(g => g.product_id === groupProductId);
    if (!group) return;
    
    const groupItemIds = group.options.map(opt => opt.cart_item_id);
    
    if (isSelected) {
      // 그룹 선택 추가
      setSelectedGroups(prev => [...new Set([...prev, groupProductId])]);
      // 그룹의 모든 아이템 선택
      setSelectedItems(prev => [...new Set([...prev, ...groupItemIds])]);
    } else {
      // 그룹 선택 제거
      setSelectedGroups(prev => prev.filter(id => id !== groupProductId));
      // 그룹의 모든 아이템 선택 해제
      setSelectedItems(prev => prev.filter(id => !groupItemIds.includes(id)));
    }
    
    // 전체 선택 상태 업데이트
    const allGroupIds = groupedCartItems.map(g => g.product_id);
    const isAllSelected = isSelected ? 
      allGroupIds.every(id => [...selectedGroups, groupProductId].includes(id)) :
      allGroupIds.every(id => id === groupProductId ? false : selectedGroups.includes(id));
    setIsSelectAll(isAllSelected);
  };
  
  // 단일 아이템 선택/해제 함수 제거
  const handleSelectItem = (itemId: string, isSelected: boolean) => {
    const group = groupedCartItems.find(g => 
      g.options.some(opt => opt.cart_item_id === itemId)
    );
    if (!group) return;
    
    // 그룹 단위로 선택/해제
    handleSelectGroup(group.product_id, isSelected);
  };

  // 총 가격 계산 함수
  const calculateTotal = () => {
    let total = 0;
    
    groupedCartItems.forEach(group => {
      const groupTotal = group.totalPrice;
      if (selectedGroups.includes(group.product_id)) {
        total += groupTotal;
      }
    });
    
    return total;
  };
  
  // Calculate totals when selected items change
  useEffect(() => {
    const productTotal = calculateTotal();
    setTotalPrice(productTotal);
    setFinalPrice(productTotal);
  }, [selectedItems, selectedGroups, groupedCartItems]);

  // 수량 변경 핸들러
  const handleQuantityChange = async (itemId: string, newQuantity: number) => {
    if (newQuantity < 1) return;
    
    const item = cartItems.find(item => item.id === itemId);
    if (!item) return;
    
    const maxStock = item.product_option ? 
      Math.min(item.product.stock, item.product_option.stock) : 
      item.product.stock;
    
    if (newQuantity > maxStock) {
      toast.error(`재고가 ${maxStock}개 남았습니다.`);
      newQuantity = maxStock;
    }
    
    try {
      const { isLoggedIn } = checkToken();
      
      if (!isLoggedIn) {
        // 로컬 스토리지 장바구니 업데이트
        updateLocalCartItem(itemId, newQuantity);
        
        // 현재 상태 업데이트
        setCartItems(prevItems => 
          prevItems.map(item => 
            item.id === itemId ? { ...item, quantity: newQuantity } : item
          )
        );
      } else {
        // 서버 장바구니 업데이트
        await updateCartItem(itemId, newQuantity);
        
        // 현재 상태 업데이트
        setCartItems(prevItems => 
          prevItems.map(item => 
            item.id === itemId ? { ...item, quantity: newQuantity } : item
          )
        );
      }
    } catch (err) {
      console.error('수량 업데이트 오류:', err);
      toast.error('수량 업데이트에 실패했습니다.');
    }
  };

  // 주문하기
  const handleCheckout = () => {
    if (cartItems.length === 0) {
      toast.error('장바구니가 비어있습니다.');
      return;
    }
    
    setActionLoading(true);
    
    const { isLoggedIn } = checkToken();
    
    if (!isLoggedIn) {
      if (confirm('로그인이 필요합니다. 로그인 페이지로 이동하시겠습니까?')) {
        router.push('/m/auth');
      } else {
        setActionLoading(false);
      }
      return;
    }
    
    try {
      // 선택된 상품이 있으면 선택된 상품만, 없으면 모든 상품
      const itemsToCheckout = selectedItems.length > 0
        ? cartItems.filter(item => selectedItems.includes(item.id))
        : cartItems;
      
      // 주문 정보 구성 - CartItem 형태로 변환
      const checkoutItems = itemsToCheckout.map(item => ({
        id: item.id,
        productId: item.product_id,
        productOptionId: item.product_option_id || null,
        name: item.product.name,
        price: item.product_option 
          ? (item.product.price) + (item.product_option.additional_price || 0)
          : (item.product.price),
        quantity: item.quantity,
        image: item.product.thumbnail_url || '/images/default-product.png',
        option: item.product_option ? {
          name: item.product_option.option_name,
          value: item.product_option.option_value
        } : undefined,
        shippingFee: 0
      }));
      
      // 체크아웃 아이템 로컬 스토리지에 저장
      localStorage.setItem('checkoutItems', JSON.stringify(checkoutItems));
      
      // 체크아웃 페이지로 이동
      router.push('/m/checkout');
    } catch (error) {
      console.error('체크아웃 처리 오류:', error);
      toast.error('주문 처리 중 오류가 발생했습니다.');
      setActionLoading(false);
    }
  };

  // 특정 아이템 단일 삭제
  const handleRemoveSingleItem = async (itemId: string) => {
    if (!confirm('이 상품을 장바구니에서 삭제하시겠습니까?')) {
      return;
    }
    
    try {
      setRemovingItemIds(prev => [...prev, itemId]);
      
      const { isLoggedIn } = checkToken();
      
      if (!isLoggedIn) {
        // 로컬 스토리지에서 아이템 제거
        removeFromLocalCart(itemId);
        
        // 현재 상태 업데이트
        setCartItems(prevItems => prevItems.filter(item => item.id !== itemId));
        setSelectedItems(prev => prev.filter(id => id !== itemId));
        
        // 그룹화된 아이템도 업데이트
        setGroupedCartItems(prevGroups => {
          // 먼저 어떤 그룹에 속하는지 찾기
          const updatedGroups = [...prevGroups];
          
          for (let i = 0; i < updatedGroups.length; i++) {
            const group = updatedGroups[i];
            // 해당 아이템이 이 그룹에 속하는지 확인
            const optionIndex = group.options.findIndex(opt => opt.cart_item_id === itemId);
            
            if (optionIndex !== -1) {
              // 옵션 하나만 제거
              if (group.options.length === 1) {
                // 마지막 옵션이면 그룹 자체를 제거
                updatedGroups.splice(i, 1);
              } else {
                // 해당 옵션만 제거하고 그룹 정보 업데이트
                const removedOption = group.options[optionIndex];
                group.options.splice(optionIndex, 1);
                
                // 총액 및 수량 업데이트
                const basePrice = group.product.price;
                const optionPrice = removedOption.additional_price;
                const itemTotal = (basePrice + optionPrice) * removedOption.quantity;
                
                group.totalQuantity -= removedOption.quantity;
                group.totalPrice -= itemTotal;
              }
              break;
            }
          }
          
          return updatedGroups;
        });
        
        toast.success('상품이 삭제되었습니다.');
      } else {
        // 서버에서 아이템 삭제
        await removeCartItem(itemId);
        
        // 현재 상태 업데이트
        setCartItems(prevItems => {
          const updatedItems = prevItems.filter(item => item.id !== itemId);
          
          // 그룹화된 아이템도 바로 업데이트
          const updatedGroups = groupCartItems(updatedItems);
          setGroupedCartItems(updatedGroups);
          
          return updatedItems;
        });
        
        setSelectedItems(prev => prev.filter(id => id !== itemId));
        toast.success('상품이 삭제되었습니다.');
      }
    } catch (error) {
      console.error('상품 삭제 오류:', error);
      toast.error('상품 삭제 중 오류가 발생했습니다.');
    } finally {
      setRemovingItemIds(prev => prev.filter(id => id !== itemId));
    }
  };
  
  // 선택된 아이템 삭제
  const handleRemoveSelectedItems = async () => {
    if (selectedItems.length === 0) {
      toast.error('선택된 상품이 없습니다.');
      return;
    }
    
    if (!confirm('선택한 상품을 장바구니에서 삭제하시겠습니까?')) {
      return;
    }
    
    try {
      setActionLoading(true);
      setRemovingItemIds(selectedItems);
      
      const { isLoggedIn } = checkToken();
      
      if (!isLoggedIn) {
        // 로컬 스토리지에서 선택한 아이템 제거
        for (const itemId of selectedItems) {
          removeFromLocalCart(itemId);
        }
        
        // 현재 상태 업데이트
        setCartItems(prevItems => {
          const updatedItems = prevItems.filter(item => !selectedItems.includes(item.id));
          
          // 그룹화된 아이템도 바로 업데이트
          const updatedGroups = groupCartItems(updatedItems);
          setGroupedCartItems(updatedGroups);
          
          return updatedItems;
        });
        
        // 선택 목록 초기화
        setSelectedItems([]);
        setIsSelectAll(false);
        
        toast.success('선택한 상품이 삭제되었습니다.');
      } else {
        // 서버 요청을 위한 Promise 배열 생성
        const deletePromises = selectedItems.map(itemId => removeCartItem(itemId));
        
        // 모든 삭제 요청 실행
        await Promise.all(deletePromises);
        
        // 현재 상태 업데이트
        setCartItems(prevItems => {
          const updatedItems = prevItems.filter(item => !selectedItems.includes(item.id));
          
          // 그룹화된 아이템도 바로 업데이트
          const updatedGroups = groupCartItems(updatedItems);
          setGroupedCartItems(updatedGroups);
          
          return updatedItems;
        });
        
        // 선택 목록 초기화
        setSelectedItems([]);
        setIsSelectAll(false);
        
        toast.success('선택한 상품이 삭제되었습니다.');
      }
    } catch (error) {
      console.error('상품 삭제 오류:', error);
      toast.error('상품 삭제 중 오류가 발생했습니다.');
    } finally {
      setActionLoading(false);
      setRemovingItemIds([]);
    }
  };

  // 옵션 편집 모달 열기
  const handleOpenEditModal = async (groupProductId: string) => {
    const group = groupedCartItems.find(g => g.product_id === groupProductId);
    if (!group) return;
    
    setEditingProductId(groupProductId);
    
    // 상품의 모든 옵션 정보 가져오기
    try {
      const response = await fetch(`/api/products/${groupProductId}`);
      if (response.ok) {
        const data = await response.json();
        const allOptions = data.options || [];
        
        // 현재 선택된 옵션들
        const currentOptions = group.options.map(opt => ({
          cart_item_id: opt.cart_item_id,
          option_name: opt.option_name,
          option_value: opt.option_value,
          additional_price: opt.additional_price,
          quantity: opt.quantity,
          stock: opt.stock
        }));
        
        setEditOptions(currentOptions);
        setAvailableOptions(allOptions);
      }
    } catch (error) {
      console.error('옵션 정보 로드 오류:', error);
    }

    setEditModalOpen(true);
  };
  
  // 옵션 추가 핸들러
  const handleAddOption = (option: ProductOption) => {
    // 재고가 0인 경우 추가 불가
    if (option.stock <= 0) {
      toast.error('재고가 없는 상품입니다.');
      return;
    }

    // 이미 선택된 옵션인지 확인
    const isAlreadySelected = editOptions.some(
      opt => opt.option_name === option.option_name && opt.option_value === option.option_value
    );
    
    if (isAlreadySelected) {
      toast.error('이미 선택된 옵션입니다.');
      return;
    }
    
    // 새로운 옵션 추가
    setEditOptions(prev => [
      ...prev,
      {
        cart_item_id: `new_${option.id}`,
        option_name: option.option_name,
        option_value: option.option_value,
        additional_price: option.additional_price,
        quantity: 1,
        stock: option.stock
      }
    ]);
  };

  // 옵션 삭제 핸들러 (편집 모달에서만 사용)
  const handleRemoveOptionFromModal = (cartItemId: string) => {
    setEditOptions(prev => prev.filter(opt => opt.cart_item_id !== cartItemId));
  };

  // 옵션 편집 모달 닫기
  const handleCloseEditModal = () => {
    setEditModalOpen(false);
    setEditingProductId(null);
    setEditOptions([]);
  };

  // 편집 내용 저장 함수 수정
  const handleSaveEdit = async () => {
    if (actionLoading) return;
    
    try {
      setActionLoading(true);
      
      const { isLoggedIn } = checkToken();
      const group = groupedCartItems.find(g => g.product_id === editingProductId);
      if (!group) return;
      
      // 삭제된 옵션 ID 목록 생성
      const removedOptionIds = group.options
        .map(opt => opt.cart_item_id)
        .filter(id => !editOptions.some(opt => opt.cart_item_id === id));
      
      if (!isLoggedIn) {
        // 로컬 스토리지 업데이트
        const existingCart = localStorage.getItem('cart');
        if (existingCart) {
          const localCart = JSON.parse(existingCart);
          
          // 삭제된 옵션 제거
          const updatedCart = localCart.filter((item: LocalCartItem) => !removedOptionIds.includes(item.id));
          
          // 기존 아이템 업데이트 및 새 아이템 추가
          editOptions.forEach(option => {
            if (option.cart_item_id.startsWith('new_')) {
              // 새 옵션 추가
              updatedCart.push({
                id: `local_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                product_id: group.product_id,
                product_option_id: option.cart_item_id.replace('new_', ''),
                quantity: option.quantity
              });
            } else {
              // 기존 옵션 수량 업데이트
              const itemIndex = updatedCart.findIndex((i: LocalCartItem) => i.id === option.cart_item_id);
              if (itemIndex !== -1) {
                updatedCart[itemIndex].quantity = option.quantity;
              }
            }
          });
          
          localStorage.setItem('cart', JSON.stringify(updatedCart));
          
          // 로컬 스토리지 업데이트 후 즉시 장바구니 데이터 다시 불러오기
          const itemsWithProducts = await Promise.all(
            updatedCart.map(async (item: LocalCartItem) => {
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
          setGroupedCartItems(groupCartItems(itemsWithProducts.filter(Boolean)));
        }
      } else {
        // 서버 요청을 위한 Promise 배열 생성
        const updatePromises = [
          // 삭제된 옵션 제거
          ...removedOptionIds.map(cartItemId => 
            fetch(`/api/cart/items/${cartItemId}`, {
              method: 'DELETE',
              headers: getAuthHeader()
            })
          ),
          // 기존 옵션 수량 업데이트 및 새 옵션 추가
          ...editOptions.map(option => {
            if (option.cart_item_id.startsWith('new_')) {
              // 새 옵션 추가
              return fetch('/api/cart', {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  ...getAuthHeader()
                },
                body: JSON.stringify({
                  product_id: group.product_id,
                  product_option_id: option.cart_item_id.replace('new_', ''),
                  quantity: option.quantity
                })
              });
            } else {
              // 기존 옵션 수량 업데이트
              return fetch(`/api/cart/items/${option.cart_item_id}`, {
                method: 'PATCH',
                headers: {
                  'Content-Type': 'application/json',
                  ...getAuthHeader()
                },
                body: JSON.stringify({ quantity: option.quantity })
              });
            }
          })
        ];
        
        // 모든 요청 실행
        await Promise.all(updatePromises);
        
        // 서버에서 장바구니 데이터 다시 불러오기
        const response = await fetch('/api/cart', {
          headers: getAuthHeader()
        });
        
        if (!response.ok) {
          throw new Error('장바구니 정보를 가져오는데 실패했습니다.');
        }
        
        const data = await response.json();
        setCartItems(data.items || []);
        setGroupedCartItems(groupCartItems(data.items || []));
      }
      
      // 성공 후 상태 초기화 및 모달 닫기
      setActionLoading(false);
      handleCloseEditModal();
      toast.success('장바구니가 업데이트되었습니다.');
      
    } catch (error) {
      console.error('장바구니 수정 오류:', error);
      toast.error('장바구니 업데이트에 실패했습니다.');
      setActionLoading(false);
    }
  };
  
  // 편집 모달에서 옵션 수량 변경 핸들러
  const handleEditOptionQuantityChange = (optionId: string, quantity: number) => {
    if (quantity < 1) return;
    
    const option = editOptions.find(opt => opt.cart_item_id === optionId);
    if (!option) return;
    
    if (quantity > option.stock) {
      toast.error(`최대 ${option.stock}개까지 구매 가능합니다.`);
      quantity = option.stock;
    }
    
    setEditOptions(prev => 
      prev.map(opt => 
        opt.cart_item_id === optionId ? { ...opt, quantity } : opt
      )
    );
  };

  // 편집 모달에서의 총 금액 계산
  const calculateEditModalTotal = () => {
    if (!editingProductId) return { totalPrice: 0, finalPrice: 0 };
    
    // 해당 상품 그룹 찾기
    const group = groupedCartItems.find(g => g.product_id === editingProductId);
    if (!group) return { totalPrice: 0, finalPrice: 0 };
    
    // 옵션 총 가격 계산
    const totalPrice = editOptions.reduce((total, option) => {
      const basePrice = group.product.price;
      const optionPrice = option.additional_price;
      return total + ((basePrice + optionPrice) * option.quantity);
    }, 0);
    
    const finalPrice = totalPrice;
    
    return { totalPrice, finalPrice };
  };

  // 편집 모달에서의 총 금액
  const editModalTotals = calculateEditModalTotal();

  // 상품 가격 계산 함수
  const getItemPrice = (item: CartItem) => {
    const basePrice = item.product.price;
    return item.product_option
      ? basePrice + (item.product_option.additional_price || 0)
      : basePrice;
  };

  // 상품 그룹의 총 가격 계산
  const getGroupTotalPrice = (group: GroupedCartItem) => {
    const basePrice = group.product.price;
    
    return group.options.reduce((total, option) => {
      const itemPrice = basePrice + (option.additional_price || 0);
      return total + (itemPrice * option.quantity);
    }, 0);
  };

  // 개별 상품 옵션의 가격 계산
  const getOptionPrice = (item: CartItem) => {
    const basePrice = item.product.price;
    return item.product_option
      ? basePrice + (item.product_option.additional_price || 0)
      : basePrice;
  };

  // 총 상품 금액 계산
  const calculateTotalProductPrice = () => {
    return groupedCartItems.reduce((total, group) => {
      const basePrice = group.product.price;
      
      return total + group.options.reduce((groupTotal, option) => {
        const optionPrice = basePrice + (option.additional_price || 0);
        return groupTotal + (optionPrice * option.quantity);
      }, 0);
    }, 0);
  };

  if (!user && !checkToken().isLoggedIn) {
    return (
      <div className="min-h-screen bg-gray-50 px-4 py-8 flex flex-col items-center justify-center">
        <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 text-gray-400 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
        </svg>
        <p className="text-gray-500 text-center mb-3">로그인 후 장바구니를 이용하실 수 있습니다.</p>
        <button
          onClick={() => router.push('/m/auth')}
          className="bg-green-600 text-white px-6 py-3 rounded-md text-base font-medium hover:bg-green-700"
        >
          로그인하기
        </button>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex flex-col justify-center items-center min-h-[60vh] bg-white">
        <Spinner size="lg" />
        <p className="mt-4 text-gray-500 text-sm">상품 정보를 불러오는 중입니다...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 px-4 py-8">
        <div className="text-center py-10">
          <p className="text-red-600 mb-4">{error}</p>
          <button
            className="px-4 py-2 bg-green-600 text-white rounded-md"
            onClick={() => router.push('/m/products')}
          >
            상품 목록으로 돌아가기
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)] bg-gray-50">
      <Toaster position="top-center" />
      {/* 컨텐츠 영역 */}
      <div className="flex-1 overflow-y-auto">
        {groupedCartItems.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-16 h-16 text-gray-300 mb-4">
              <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 3h1.386c.51 0 .955.343 1.087.835l.383 1.437M7.5 14.25a3 3 0 00-3 3h15.75m-12.75-3h11.218c1.121-2.3 2.1-4.684 2.924-7.138a60.114 60.114 0 00-16.536-1.84M7.5 14.25L5.106 5.272M6 20.25a.75.75 0 11-1.5 0 .75.75 0 011.5 0zm12.75 0a.75.75 0 11-1.5 0 .75.75 0 011.5 0z" />
            </svg>
            <p className="text-gray-500 mb-6">장바구니가 비어있습니다.</p>
            <Link
              href="/m/products"
              className="px-6 py-3 bg-green-600 text-white rounded-md text-sm font-medium"
            >
              상품 둘러보기
            </Link>
          </div>
        ) : (
          <div className="space-y-3 p-4">
            {/* 전체 선택 영역 */}
            <div className="bg-white rounded-lg shadow-sm mb-3 p-3">
              <div className="flex items-center">
                <input
                  type="checkbox"
                  checked={isSelectAll}
                  onChange={(e) => handleSelectAll(e.target.checked)}
                  className="w-5 h-5 rounded text-green-600 focus:ring-green-500"
                />
                <label className="ml-2 text-sm">
                  전체선택 ({selectedGroups.length}/{groupedCartItems.length})
                </label>
                <button 
                  className="ml-auto text-sm text-gray-500"
                  onClick={() => handleRemoveSelectedItems()}
                  disabled={selectedItems.length === 0 || actionLoading}
                >
                  선택삭제
                </button>
              </div>
            </div>
            
            {/* 상품 목록 */}
            <div className="space-y-3 mb-4">
              {groupedCartItems.map((group) => (
                <div key={group.product_id} className="bg-white rounded-lg shadow-sm overflow-hidden">
                  <div className="p-3 border-b border-gray-100">
                    <div className="flex items-center">
                      <input
                        type="checkbox"
                        checked={selectedGroups.includes(group.product_id)}
                        onChange={(e) => handleSelectGroup(group.product_id, e.target.checked)}
                        className="w-5 h-5 rounded text-green-600 focus:ring-green-500"
                      />
                      <div className="ml-2 text-sm font-medium truncate">
                        {group.product.name}
                      </div>
                    </div>
                  </div>
                  
                  <div className="p-3">
                    <div className="flex">
                      <div className="relative h-20 w-20 min-w-20 mr-3">
                        <Image
                          src={group.product.thumbnail_url || 'https://via.placeholder.com/100'}
                          alt={group.product.name}
                          fill
                          sizes="80px"
                          className="object-cover rounded"
                        />
                      </div>
                      <div className="flex-1">
                        <Link 
                          href={`/m/products/${group.product_id}`} 
                          className="text-sm font-medium line-clamp-2 mb-1"
                        >
                          {group.product.name}
                        </Link>
                        <div className="text-sm font-bold mb-1">
                          {group.product.price.toLocaleString()}원
                        </div>
                      </div>
                    </div>
                    
                    {/* 옵션 목록 */}
                    {group.options.length > 0 && (
                      <div className="mt-2 space-y-2">
                        {group.options.map((option) => {
                          if (option.option_name === '기본' && option.option_value === '옵션 없음') {
                            return (
                              <div key={option.cart_item_id} className="flex items-center">
                                <div className="text-sm text-gray-600">
                                  수량: {option.quantity}개
                                </div>
                                <div className="ml-auto text-sm text-gray-800 font-medium">
                                  {((group.product.price) * option.quantity).toLocaleString()}원
                                </div>
                              </div>
                            );
                          }
                          return (
                            <div key={option.cart_item_id} className="flex items-center">
                              <div className="text-xs bg-gray-50 p-2 rounded flex-1">
                                <div className="flex justify-between mb-1">
                                  <span className="text-gray-700">
                                    {option.option_name}: {option.option_value}
                                    {option.additional_price > 0 && (
                                      <span className="text-gray-500 ml-1">(+{option.additional_price.toLocaleString()}원)</span>
                                    )}
                                  </span>
                                </div>
                                <div className="flex justify-between items-center">
                                  <div className="text-gray-600">
                                    수량: {option.quantity}개
                                  </div>
                                  <div className="text-gray-800 font-medium">
                                    {(((group.product.price) + option.additional_price) * option.quantity).toLocaleString()}원
                                  </div>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                    
                    <div className="mt-3 pt-3 border-t border-gray-100 flex justify-between items-center">
                      <div>
                        <div className="text-xs text-gray-500">
                          {group.totalPrice.toLocaleString()}원
                        </div>
                        <div className="text-sm font-medium">
                          총 {group.totalQuantity}개 | {group.totalPrice.toLocaleString()}원
                        </div>
                      </div>
                      <button
                        className="px-3 py-1.5 border border-gray-300 rounded-md text-xs"
                        onClick={() => handleOpenEditModal(group.product_id)}
                      >
                        옵션/수량
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            
            {/* 주문 요약 */}
            <div className="bg-white rounded-lg shadow-sm p-4 mb-32">
              <h3 className="text-lg font-medium mb-3">주문 요약</h3>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">상품 금액</span>
                  <span>{editModalOpen ? editModalTotals.totalPrice.toLocaleString() : totalPrice.toLocaleString()}원</span>
                </div>
              </div>
              <div className="mt-3 pt-3 border-t border-gray-200">
                <div className="flex justify-between items-center">
                  <span className="font-medium">결제 예상 금액</span>
                  <span className="text-lg font-bold text-green-600">
                    {editModalOpen ? editModalTotals.finalPrice.toLocaleString() : finalPrice.toLocaleString()}원
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
      
      {/* 하단 고정 주문하기 버튼 */}
      {groupedCartItems.length > 0 && (
        <div className="fixed bottom-[3.5rem] left-0 right-0 bg-white border-t border-gray-200 p-4 z-20">
          <button
            className={`w-full py-3 bg-green-600 text-white rounded-md font-medium ${
              actionLoading ? 'opacity-70' : 'active:bg-green-700'
            }`}
            onClick={handleCheckout}
            disabled={actionLoading || selectedItems.length === 0}
          >
            {actionLoading ? (
              <span className="flex items-center justify-center">
                <span className="inline-block w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></span>
                처리 중...
              </span>
            ) : `${finalPrice.toLocaleString()}원 주문하기`}
          </button>
        </div>
      )}
      
      {/* 옵션 수정 모달 */}
      {editModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg w-full max-w-md max-h-[80vh] overflow-auto">
            <div className="p-4 border-b border-gray-200 flex justify-between items-center">
              <h3 className="text-lg font-bold">상품 옵션 수정</h3>
              <button
                className="text-gray-500"
                onClick={handleCloseEditModal}
              >
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            {(() => {
              const group = groupedCartItems.find(g => g.product_id === editingProductId);
              if (!group) return null;
              
              return (
                <>
                  <div className="p-4 border-b border-gray-100">
                    <div className="flex items-start mb-3">
                      <div className="relative h-16 w-16 min-w-16 mr-3">
                        <Image
                          src={group.product.thumbnail_url || 'https://via.placeholder.com/100'}
                          alt={group.product.name}
                          fill
                          sizes="64px"
                          className="object-cover rounded"
                        />
                      </div>
                      <div>
                        <p className="font-medium line-clamp-1">{group.product.name}</p>
                        <div className="text-sm font-bold mb-1">
                          {group.product.price.toLocaleString()}원
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <div className="p-4">
                    {/* 옵션 선택 영역 */}
                    <div className="mb-4">
                      <h4 className="text-sm font-medium mb-2">옵션 선택</h4>
                      <div className="space-y-2">
                        <select
                          className="w-full p-2 border border-gray-300 rounded text-sm"
                          onChange={(e) => {
                            const selectedOption = availableOptions.find(opt => opt.id === e.target.value);
                            if (selectedOption) {
                              handleAddOption(selectedOption);
                              e.target.value = ''; // 선택 초기화
                            }
                          }}
                        >
                          <option value="">옵션을 선택해주세요</option>
                          {availableOptions.map((option) => (
                            <option key={option.id} value={option.id}>
                              {option.option_name}: {option.option_value}
                              {option.additional_price > 0 && (
                                ` (+${option.additional_price.toLocaleString()}원)`
                              )}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>

                    {/* 선택된 옵션 목록 */}
                    <div className="space-y-3">
                      <h4 className="text-sm font-medium">선택된 옵션</h4>
                      {editOptions.map((option) => (
                        <div key={option.cart_item_id} className="bg-gray-50 p-3 rounded">
                          <div className="flex justify-between mb-2">
                            <div className="text-sm">
                              {option.option_name !== '기본' ? (
                                <>
                                  <span className="font-medium">{option.option_name}: {option.option_value}</span>
                                  {option.additional_price > 0 && (
                                    <span className="text-xs text-gray-500 ml-1">(+{option.additional_price.toLocaleString()}원)</span>
                                  )}
                                </>
                              ) : (
                                <span className="font-medium">기본 상품</span>
                              )}
                            </div>
                            <button
                              className="text-gray-500 hover:text-red-500"
                              onClick={() => handleRemoveOptionFromModal(option.cart_item_id)}
                            >
                              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                              </svg>
                            </button>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-xs text-gray-500">수량:</span>
                            <div className="flex border border-gray-300 rounded">
                              <button
                                className="px-2 py-1 text-gray-600"
                                onClick={() => handleEditOptionQuantityChange(option.cart_item_id, Math.max(1, option.quantity - 1))}
                              >
                                -
                              </button>
                              <input
                                type="number"
                                min="1"
                                max={option.stock}
                                value={option.quantity}
                                onChange={(e) => handleEditOptionQuantityChange(option.cart_item_id, Math.max(1, Math.min(option.stock, parseInt(e.target.value) || 1)))}
                                className="w-12 text-center text-sm border-x border-gray-300 focus:outline-none"
                              />
                              <button
                                className="px-2 py-1 text-gray-600"
                                onClick={() => handleEditOptionQuantityChange(option.cart_item_id, Math.min(option.stock, option.quantity + 1))}
                              >
                                +
                              </button>
                            </div>
                          </div>
                          {option.stock < 10 && (
                            <div className="text-xs text-red-500 mt-1">
                              ※ 재고 {option.stock}개 남음
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                  
                  <div className="p-4 border-t border-gray-200">
                    <div className="flex gap-2">
                      <button
                        className="flex-1 py-3 bg-gray-200 text-gray-800 rounded-md font-medium"
                        onClick={handleCloseEditModal}
                      >
                        취소
                      </button>
                      <button
                        className={`flex-1 py-3 bg-green-600 text-white rounded-md font-medium flex justify-center items-center ${
                          actionLoading ? 'opacity-70' : ''
                        }`}
                        onClick={handleSaveEdit}
                        disabled={actionLoading}
                      >
                        {actionLoading ? (
                          <>
                            <span className="inline-block w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></span>
                            저장 중...
                          </>
                        ) : '저장'}
                      </button>
                    </div>
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