import { CartItem } from '@/types/cart';
import { getAuthHeader } from '@/utils/auth';

/**
 * 서버에서 장바구니 아이템을 가져옵니다.
 * @returns 장바구니 아이템 배열
 */
export const getCart = async (): Promise<CartItem[]> => {
  try {
    const headers = getAuthHeader();
    
    if (!headers.Authorization) {
      throw new Error('인증 정보가 없습니다.');
    }
    
    const response = await fetch('/api/cart', {
      headers
    });
    
    if (!response.ok) {
      throw new Error('장바구니 정보를 가져오는데 실패했습니다.');
    }
    
    const data = await response.json();
    return data.items || [];
  } catch (error) {
    console.error('장바구니 로딩 오류:', error);
    throw error;
  }
};

/**
 * 서버의 장바구니 아이템 수량을 업데이트합니다.
 * @param itemId 업데이트할 아이템 ID 
 * @param quantity 새로운 수량
 * @returns 업데이트된 아이템
 */
export const updateCartItem = async (
  itemId: string, 
  quantity: number
): Promise<CartItem> => {
  try {
    const headers = getAuthHeader();
    
    if (!headers.Authorization) {
      throw new Error('인증 정보가 없습니다.');
    }
    
    const response = await fetch(`/api/cart/items/${itemId}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        ...headers
      },
      body: JSON.stringify({ quantity })
    });
    
    if (!response.ok) {
      throw new Error('아이템 수량 업데이트에 실패했습니다.');
    }
    
    return await response.json();
  } catch (error) {
    console.error('장바구니 아이템 업데이트 오류:', error);
    throw error;
  }
};

/**
 * 서버에서 장바구니 아이템을 삭제합니다.
 * @param itemId 삭제할 아이템 ID
 */
export const removeCartItem = async (itemId: string): Promise<void> => {
  try {
    const headers = getAuthHeader();
    
    if (!headers.Authorization) {
      throw new Error('인증 정보가 없습니다.');
    }
    
    const response = await fetch(`/api/cart/items/${itemId}`, {
      method: 'DELETE',
      headers
    });
    
    if (!response.ok) {
      throw new Error('아이템 삭제에 실패했습니다.');
    }
  } catch (error) {
    console.error('장바구니 아이템 삭제 오류:', error);
    throw error;
  }
}; 