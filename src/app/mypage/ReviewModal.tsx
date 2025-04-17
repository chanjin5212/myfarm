'use client';

import { useState } from 'react';
import { Button, Input, Modal, Textarea } from '@/components/ui/CommonStyles';
import { StarIcon } from '@heroicons/react/24/solid';
import { StarIcon as StarOutline } from '@heroicons/react/24/outline';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import { getAuthHeader } from '@/utils/auth';

interface ReviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  orderId: string;
  productName: string;
  productId?: string;
}

export default function ReviewModal({
  isOpen,
  onClose,
  orderId,
  productName,
  productId
}: ReviewModalProps) {
  const [rating, setRating] = useState(5);
  const [content, setContent] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!content.trim()) {
      toast.error('리뷰 내용을 입력해주세요.');
      return;
    }
    
    setIsSubmitting(true);
    try {
      // 주문 정보 가져오기 (product_id를 얻기 위해)
      const authHeader = getAuthHeader();
      
      let finalProductId = productId;
      
      if (!finalProductId) {
        // 주문 상세 정보를 가져와서 product_id 확인
        const orderDetailResponse = await fetch(`/api/orders/${orderId}/items`, {
          headers: authHeader
        });
        
        if (!orderDetailResponse.ok) {
          const errorText = await orderDetailResponse.text();
          console.error('주문 상세 정보 가져오기 실패:', errorText);
          throw new Error('주문 정보를 가져올 수 없습니다.');
        }
        
        const orderDetail = await orderDetailResponse.json();
        
        // 주문의 상품 중 상품명으로 찾기
        if (orderDetail.items && orderDetail.items.length > 0) {
          // productName과 일치하는 상품 찾기
          const matchingItem = orderDetail.items.find((item: any) => 
            item.product_name === productName || item.name === productName
          );
          
          if (matchingItem) {
            finalProductId = matchingItem.product_id;
          } else {
            // 일치하는 상품이 없으면 첫 번째 상품 사용
            finalProductId = orderDetail.items[0].product_id;
          }
        }
      }
      
      if (!finalProductId) {
        throw new Error('리뷰를 등록할 상품을 찾을 수 없습니다.');
      }
      
      // 리뷰 등록 API 호출
      const reviewResponse = await fetch('/api/reviews', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...authHeader
        },
        body: JSON.stringify({
          product_id: finalProductId,
          order_id: orderId,
          rating,
          content
        }),
      });
      
      // 응답 확인 (HTML 오류 대응)
      const responseText = await reviewResponse.text();
      let responseData;
      
      try {
        // 응답이 JSON인지 확인
        responseData = JSON.parse(responseText);
      } catch (e) {
        console.error('응답이 JSON 형식이 아님:', responseText);
        console.error('응답 형식 오류:', e);
        if (responseText.includes('<!DOCTYPE html>')) {
          throw new Error('서버 오류가 발생했습니다. 관리자에게 문의하세요.');
        }
        throw new Error('서버에서 유효하지 않은 응답을 반환했습니다.');
      }
      
      if (!reviewResponse.ok) {
        throw new Error(responseData.error || '리뷰를 등록할 수 없습니다.');
      }
      
      toast.success('리뷰가 성공적으로 등록되었습니다.');
      setContent('');
      setRating(5);
      onClose();
      router.refresh(); // 페이지 새로고침
    } catch (error) {
      console.error('리뷰 등록 오류:', error);
      toast.error(error instanceof Error ? error.message : '리뷰를 등록할 수 없습니다.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="상품 리뷰 작성"
      size="lg"
    >
      <div className="p-4">
        <div className="mb-6 text-center">
          <h3 className="text-lg font-medium text-gray-900 mb-2">{productName}</h3>
          <p className="text-sm text-gray-500">이 상품에 대한 솔직한 리뷰를 남겨주세요.</p>
        </div>
        
        <form onSubmit={handleSubmit}>
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">별점</label>
            <div className="flex items-center justify-center space-x-1">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  onClick={() => setRating(star)}
                  className="focus:outline-none"
                >
                  {star <= rating ? (
                    <StarIcon className="h-8 w-8 text-yellow-400" />
                  ) : (
                    <StarOutline className="h-8 w-8 text-yellow-400" />
                  )}
                </button>
              ))}
            </div>
          </div>
          
          <div className="mb-6">
            <label htmlFor="review-content" className="block text-sm font-medium text-gray-700 mb-2">
              리뷰 내용
            </label>
            <Textarea
              id="review-content"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="상품의 맛, 신선도, 배송 상태 등 구체적인 경험을 작성해주세요."
              className="w-full min-h-[120px]"
              rows={5}
              required
            />
          </div>
          
          <div className="flex justify-end space-x-2">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={isSubmitting}
            >
              취소
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting}
            >
              {isSubmitting ? '제출 중...' : '리뷰 등록'}
            </Button>
          </div>
        </form>
      </div>
    </Modal>
  );
} 