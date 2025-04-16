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
}

export default function ReviewModal({
  isOpen,
  onClose,
  orderId,
  productName
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
      const authHeader = getAuthHeader();
      const response = await fetch('/api/reviews', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...authHeader
        },
        body: JSON.stringify({
          order_id: orderId,
          rating,
          content
        }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || '리뷰를 등록할 수 없습니다.');
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