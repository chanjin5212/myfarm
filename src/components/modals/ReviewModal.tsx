'use client';

import { useState, useRef } from 'react';
import { Button, Input, Modal, Textarea } from '@/components/ui/CommonStyles';
import { StarIcon } from '@heroicons/react/24/solid';
import { StarIcon as StarOutline } from '@heroicons/react/24/outline';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import { getAuthHeader } from '@/utils/auth';
import Image from 'next/image';
import { XCircleIcon, PhotoIcon } from '@heroicons/react/24/outline';

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
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [image, setImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState(false);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // 파일 크기 제한 (5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error('이미지 크기는 5MB 이하여야 합니다.');
      return;
    }

    // 이미지 파일만 허용
    if (!file.type.startsWith('image/')) {
      toast.error('이미지 파일만 업로드 가능합니다.');
      return;
    }

    setImage(file);
    const reader = new FileReader();
    reader.onloadend = () => {
      setImagePreview(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveImage = () => {
    setImage(null);
    setImagePreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const uploadImage = async (file: File): Promise<string> => {
    try {
      setUploadProgress(true);
      const authHeader = getAuthHeader();
      const formData = new FormData();
      formData.append('file', file);
      
      // 이미지 업로드 API 엔드포인트로 전송
      const uploadResponse = await fetch('/api/upload/review-image', {
        method: 'POST',
        headers: {
          ...authHeader
        },
        body: formData
      });
      
      if (!uploadResponse.ok) {
        const errorData = await uploadResponse.json();
        throw new Error(errorData.error || '이미지 업로드에 실패했습니다.');
      }
      
      const data = await uploadResponse.json();
      return data.imageUrl;
    } catch (error) {
      console.error('이미지 업로드 오류:', error);
      throw error;
    } finally {
      setUploadProgress(false);
    }
  };

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
      
      // 이미지가 있으면 먼저 업로드
      let imageUrl = null;
      if (image) {
        imageUrl = await uploadImage(image);
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
          content,
          image_url: imageUrl
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
      setImage(null);
      setImagePreview(null);
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
          
          {/* 이미지 업로드 섹션 */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              사진 첨부 (선택)
            </label>
            <div className="space-y-2">
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleImageChange}
                accept="image/*"
                className="hidden"
              />
              
              {imagePreview ? (
                <div className="relative w-full h-48 border border-gray-200 rounded-md overflow-hidden">
                  <Image
                    src={imagePreview}
                    alt="리뷰 이미지 미리보기"
                    fill
                    style={{ objectFit: 'contain' }}
                  />
                  <button
                    type="button"
                    onClick={handleRemoveImage}
                    className="absolute top-2 right-2 bg-white rounded-full p-1"
                  >
                    <XCircleIcon className="w-6 h-6 text-red-500" />
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full h-20 flex flex-col items-center justify-center border-2 border-dashed border-gray-300 rounded-lg hover:border-green-500 transition-colors duration-200"
                >
                  <PhotoIcon className="h-8 w-8 text-gray-400 mb-1" />
                  <span className="text-sm text-gray-500">이미지 추가하기</span>
                </button>
              )}
              <p className="text-xs text-gray-500">
                5MB 이하의 이미지 파일 1개를 업로드할 수 있습니다.
              </p>
            </div>
          </div>
          
          <div className="flex justify-end space-x-2">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={isSubmitting || uploadProgress}
            >
              취소
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting || uploadProgress}
            >
              {isSubmitting || uploadProgress ? '제출 중...' : '리뷰 등록'}
            </Button>
          </div>
        </form>
      </div>
    </Modal>
  );
} 