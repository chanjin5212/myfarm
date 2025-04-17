import { LocalCartItem } from '@/types/cart';

/**
 * 로컬 스토리지에서 장바구니 데이터를 가져옵니다.
 * @returns 장바구니 아이템 배열
 */
export const getLocalCart = (): LocalCartItem[] => {
  if (typeof window === 'undefined') return [];
  
  const cartData = localStorage.getItem('cart');
  if (!cartData) return [];
  
  try {
    return JSON.parse(cartData);
  } catch (error) {
    console.error('장바구니 데이터 파싱 오류:', error);
    return [];
  }
};

/**
 * 로컬 스토리지 장바구니에 상품을 추가합니다.
 * @param item 추가할 장바구니 아이템
 */
export const addToLocalCart = (item: LocalCartItem): void => {
  if (typeof window === 'undefined') return;
  
  const cart = getLocalCart();
  
  // 같은 상품 + 같은 옵션이 있는지 확인
  const existingItemIndex = cart.findIndex(cartItem => 
    cartItem.product_id === item.product_id && 
    cartItem.product_option_id === item.product_option_id
  );
  
  if (existingItemIndex >= 0) {
    // 기존 아이템 수량 업데이트
    cart[existingItemIndex].quantity += item.quantity;
  } else {
    // 새 아이템 추가
    cart.push(item);
  }
  
  localStorage.setItem('cart', JSON.stringify(cart));
};

/**
 * 로컬 스토리지 장바구니의 특정 아이템 수량을 업데이트합니다.
 * @param itemId 업데이트할 아이템 ID
 * @param quantity 새로운 수량
 */
export const updateLocalCartItem = (itemId: string, quantity: number): void => {
  if (typeof window === 'undefined') return;
  
  const cart = getLocalCart();
  
  const updatedCart = cart.map(item => 
    item.id === itemId ? { ...item, quantity } : item
  );
  
  localStorage.setItem('cart', JSON.stringify(updatedCart));
};

/**
 * 로컬 스토리지 장바구니에서 특정 아이템을 삭제합니다.
 * @param itemId 삭제할 아이템 ID
 */
export const removeFromLocalCart = (itemId: string): void => {
  if (typeof window === 'undefined') return;
  
  const cart = getLocalCart();
  
  const updatedCart = cart.filter(item => item.id !== itemId);
  
  localStorage.setItem('cart', JSON.stringify(updatedCart));
};

/**
 * 로컬 스토리지 장바구니를 비웁니다.
 */
export const clearLocalCart = (): void => {
  if (typeof window === 'undefined') return;
  
  localStorage.removeItem('cart');
}; 