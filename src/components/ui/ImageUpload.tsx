'use client';

import { useState, useRef } from 'react';
import { Button } from './CommonStyles';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

interface ImageUploadProps {
  onUpload: (url: string, file?: File) => void;
  currentImage?: string | null;
}

export default function ImageUpload({ onUpload, currentImage }: ImageUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [previewImage, setPreviewImage] = useState<string | null>(currentImage || null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImageSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    try {
      setUploading(true);

      if (!event.target.files || event.target.files.length === 0) {
        throw new Error('이미지를 선택해주세요.');
      }

      const file = event.target.files[0];
      
      // 브라우저 메모리에 임시 URL 생성
      const tempUrl = URL.createObjectURL(file);
      setPreviewImage(tempUrl);
      
      // 파일과 임시 URL 전달 (실제 업로드는 저장 시점에 수행)
      onUpload(tempUrl, file);
      
    } catch (error) {
      console.error('이미지 처리 오류:', error);
      alert('이미지 처리에 실패했습니다.');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-2">
      {previewImage && (
        <div className="relative w-32 h-32">
          <img
            src={previewImage}
            alt="상품 이미지"
            className="w-full h-full object-cover rounded"
          />
        </div>
      )}
      
      <div className="flex items-center space-x-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
        >
          {uploading ? '처리 중...' : '이미지 선택'}
        </Button>
        
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleImageSelect}
          className="hidden"
        />
      </div>
    </div>
  );
}

// 이미지 업로드 함수 (외부에서 저장 시점에 호출)
export async function uploadImage(imageUrl: string, file?: File): Promise<string> {
  // 파일이 없으면 이미 업로드된 이미지로 간주하고 URL 그대로 반환
  if (!file) {
    return imageUrl;
  }
  
  try {
    // 메모리에서 사용하던 Blob URL이면 업로드 진행
    if (imageUrl.startsWith('blob:')) {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(2, 15)}.${fileExt}`;
      const filePath = `products/${fileName}`;

      // 이미지 업로드
      const { error: uploadError } = await supabase.storage
        .from('product-images')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false,
        });

      if (uploadError) {
        throw uploadError;
      }

      // 업로드된 이미지의 공개 URL 가져오기
      const { data: { publicUrl } } = supabase.storage
        .from('product-images')
        .getPublicUrl(filePath);

      // 메모리에서 사용하던 URL 해제
      URL.revokeObjectURL(imageUrl);
      
      return publicUrl;
    }
    
    // 이미 외부 URL이면 그대로 반환
    return imageUrl;
  } catch (error) {
    console.error('이미지 업로드 오류:', error);
    throw new Error('이미지 업로드에 실패했습니다.');
  }
} 