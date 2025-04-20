import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Supabase 클라이언트 초기화
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: NextRequest) {
  try {
    // 인증 확인
    const authHeader = request.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: '인증이 필요합니다.' }, { status: 401 });
    }
    
    // Bearer 토큰에서 사용자 ID 추출
    const userId = authHeader.split(' ')[1].trim();
    
    if (!userId) {
      return NextResponse.json({ error: '유효하지 않은 인증 정보입니다.' }, { status: 401 });
    }
    
    // 파일 처리
    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    
    if (!file) {
      return NextResponse.json({ error: '이미지 파일이 없습니다.' }, { status: 400 });
    }
    
    // 파일 타입 확인
    if (!file.type.startsWith('image/')) {
      return NextResponse.json({ error: '이미지 파일만 업로드 가능합니다.' }, { status: 400 });
    }
    
    // 파일 크기 제한 (5MB)
    if (file.size > 5 * 1024 * 1024) {
      return NextResponse.json({ error: '이미지 크기는 5MB 이하여야 합니다.' }, { status: 400 });
    }
    
    // 파일 이름 생성 (고유한 이름으로 충돌 방지)
    const timestamp = Date.now();
    const fileExt = file.name.split('.').pop();
    const fileName = `${timestamp}-${Math.random().toString(36).substring(2, 8)}.${fileExt}`;
    const filePath = `reviews/${userId}/${fileName}`;
    
    // 파일 버퍼로 변환
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    
    // Supabase Storage에 업로드
    const { data, error } = await supabase.storage
      .from('product-images')
      .upload(filePath, buffer, {
        contentType: file.type,
        cacheControl: '3600',
        upsert: false
      });
    
    if (error) {
      console.error('이미지 업로드 오류:', error);
      return NextResponse.json({ error: '이미지 업로드에 실패했습니다.' }, { status: 500 });
    }
    
    // 이미지 URL 생성
    const { data: urlData } = supabase.storage
      .from('product-images')
      .getPublicUrl(filePath);
    
    return NextResponse.json({ 
      success: true, 
      imageUrl: urlData.publicUrl 
    });
    
  } catch (error) {
    console.error('리뷰 이미지 업로드 오류:', error);
    return NextResponse.json({ 
      error: '이미지 업로드 중 오류가 발생했습니다.' 
    }, { status: 500 });
  }
} 