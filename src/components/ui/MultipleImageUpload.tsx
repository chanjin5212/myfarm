'use client';

import { useState, useRef } from 'react';
import { Button, Spinner } from './CommonStyles';
import { createClient } from '@supabase/supabase-js';
import { toast } from 'react-hot-toast';

// Supabase 클라이언트 초기화
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export interface ProductImage {
  id?: string;
  product_id?: string;
  image_url: string;
  is_thumbnail?: boolean;
  sort_order?: number;
  file?: File; // 실제 파일 객체 저장
}

interface MultipleImageUploadProps {
  onImagesChange: (images: ProductImage[]) => void;
  onSetThumbnail: (url: string) => void;
  currentImages?: ProductImage[];
  productId?: string;
}

export default function MultipleImageUpload({
  onImagesChange,
  onSetThumbnail,
  currentImages = [],
  productId
}: MultipleImageUploadProps) {
  const [images, setImages] = useState<ProductImage[]>(currentImages);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    try {
      setUploading(true);

      if (!event.target.files || event.target.files.length === 0) {
        return;
      }

      const files = Array.from(event.target.files);
      const newImages: ProductImage[] = [];

      // 파일 처리 (실제 업로드는 하지 않음)
      for (const file of files) {
        // 브라우저 메모리에 임시 URL 생성
        const tempUrl = URL.createObjectURL(file);

        newImages.push({
          image_url: tempUrl,
          is_thumbnail: images.length === 0 && newImages.length === 0, // 첫 번째 이미지를 썸네일로 설정
          sort_order: images.length + newImages.length,
          file: file // 원본 파일 객체 보관
        });
      }

      // 썸네일 설정
      if (newImages.length > 0 && images.length === 0) {
        const thumbnailImage = newImages.find(img => img.is_thumbnail);
        if (thumbnailImage) {
          onSetThumbnail(thumbnailImage.image_url);
        }
      }

      const updatedImages = [...images, ...newImages];
      setImages(updatedImages);
      onImagesChange(updatedImages);
      
      // 입력 필드 초기화
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      
      toast.success('이미지가 추가되었습니다. 저장 버튼을 누르면 업로드됩니다.');
    } catch (error) {
      console.error('이미지 처리 오류:', error);
      toast.error('이미지 처리에 실패했습니다.');
    } finally {
      setUploading(false);
    }
  };

  const handleSetAsThumbnail = (index: number) => {
    const updatedImages = images.map((img, i) => ({
      ...img,
      is_thumbnail: i === index
    }));
    
    setImages(updatedImages);
    onImagesChange(updatedImages);
    onSetThumbnail(updatedImages[index].image_url);
    toast.success('대표 이미지가 변경되었습니다.');
  };

  const handleRemoveImage = (index: number) => {
    const imageToRemove = images[index];
    
    // 브라우저 메모리에서 URL 해제 (file 객체가 있는 경우 = 아직 업로드되지 않은 이미지)
    if (imageToRemove.file) {
      URL.revokeObjectURL(imageToRemove.image_url);
    }
    
    const updatedImages = images.filter((_, i) => i !== index);
    
    // 삭제하는 이미지가 썸네일이었다면 첫 번째 이미지를 썸네일로 설정
    if (imageToRemove.is_thumbnail && updatedImages.length > 0) {
      updatedImages[0].is_thumbnail = true;
      onSetThumbnail(updatedImages[0].image_url);
    }
    
    setImages(updatedImages);
    onImagesChange(updatedImages);
  };

  const handleReorderImages = (index: number, direction: 'up' | 'down') => {
    if (
      (direction === 'up' && index === 0) || 
      (direction === 'down' && index === images.length - 1)
    ) {
      return;
    }

    const newImages = [...images];
    const newIndex = direction === 'up' ? index - 1 : index + 1;
    
    // 두 이미지 위치 교체
    [newImages[index], newImages[newIndex]] = [newImages[newIndex], newImages[index]];
    
    // sort_order 재정렬
    const reorderedImages = newImages.map((img, i) => ({
      ...img,
      sort_order: i
    }));
    
    setImages(reorderedImages);
    onImagesChange(reorderedImages);
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-3">
        {images.map((image, index) => (
          <div 
            key={index} 
            className={`relative w-32 h-32 border rounded ${image.is_thumbnail ? 'border-blue-500 ring-2 ring-blue-300' : 'border-gray-200'}`}
          >
            <img
              src={image.image_url}
              alt={`상품 이미지 ${index + 1}`}
              className="w-full h-full object-cover rounded"
            />
            <div className="absolute bottom-0 right-0 left-0 bg-black bg-opacity-60 p-1 flex justify-between">
              <button
                type="button"
                onClick={() => handleSetAsThumbnail(index)}
                className="text-white text-xs p-1"
                title="대표 이미지로 설정"
              >
                ★
              </button>
              <div className="flex space-x-1">
                <button
                  type="button"
                  onClick={() => handleReorderImages(index, 'up')}
                  disabled={index === 0}
                  className={`text-white text-xs p-1 ${index === 0 ? 'opacity-50' : ''}`}
                  title="위로 이동"
                >
                  ↑
                </button>
                <button
                  type="button"
                  onClick={() => handleReorderImages(index, 'down')}
                  disabled={index === images.length - 1}
                  className={`text-white text-xs p-1 ${index === images.length - 1 ? 'opacity-50' : ''}`}
                  title="아래로 이동"
                >
                  ↓
                </button>
                <button
                  type="button"
                  onClick={() => handleRemoveImage(index)}
                  className="text-white text-xs p-1"
                  title="이미지 삭제"
                >
                  ✕
                </button>
              </div>
            </div>
            {image.is_thumbnail && (
              <div className="absolute top-0 left-0 bg-blue-500 text-white text-xs px-1 py-0.5 rounded-br">
                대표
              </div>
            )}
          </div>
        ))}
        
        <div className="w-32 h-32 border-2 border-dashed border-gray-300 rounded flex items-center justify-center">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
          >
            {uploading ? <Spinner size="sm" /> : '+ 이미지 추가'}
          </Button>
        </div>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileChange}
        multiple
        className="hidden"
      />
    </div>
  );
}

// 상품 저장 시 호출할 수 있는 이미지 업로드 함수 (외부에서 사용)
export async function uploadProductImages(images: ProductImage[], productId: string): Promise<ProductImage[]> {
  try {
    const uploadedImages: ProductImage[] = [];
    
    for (const image of images) {
      // 이미 업로드된 이미지는 건너뜀 (기존 이미지)
      if (!image.file) {
        uploadedImages.push(image);
        continue;
      }
      
      const file = image.file;
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(2, 15)}.${fileExt}`;
      const filePath = `products/${productId}/${fileName}`;

      // 이미지 업로드
      const { error: uploadError } = await supabase.storage
        .from('product-images')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false,
        });

      if (uploadError) {
        console.error('이미지 업로드 오류:', uploadError);
        throw uploadError;
      }

      // 업로드된 이미지의 공개 URL 가져오기
      const { data: { publicUrl } } = supabase.storage
        .from('product-images')
        .getPublicUrl(filePath);

      uploadedImages.push({
        ...image,
        image_url: publicUrl,
        file: undefined // 파일 객체 제거
      });
    }
    
    return uploadedImages;
  } catch (error) {
    console.error('이미지 업로드 처리 오류:', error);
    throw error;
  }
} 