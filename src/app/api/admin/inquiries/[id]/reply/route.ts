import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import * as jwt from 'jsonwebtoken';

// Supabase 클라이언트 초기화
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

// JWT Secret
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

// 관리자 토큰 검증 함수
async function verifyAdminToken(request: NextRequest) {
  const authHeader = request.headers.get('Authorization');
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return { isValid: false, error: '인증 토큰이 필요합니다' };
  }
  
  const token = authHeader.replace('Bearer ', '');
  
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as {
      id: string;
      login_id: string;
      role: string;
    };
    
    if (decoded.role !== 'admin') {
      return { isValid: false, error: '관리자 권한이 없습니다' };
    }
    
    return { isValid: true, userId: decoded.id };
  } catch (error) {
    return { isValid: false, error: '유효하지 않은 토큰입니다' };
  }
}

// 문의 답변 등록 API
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // 관리자 인증
    const authResult = await verifyAdminToken(req);
    if (!authResult.isValid) {
      return NextResponse.json(
        { error: authResult.error },
        { status: 401 }
      );
    }

    const { id: inquiryId } = await params;
    const userId = authResult.userId;
    
    // 요청 본문 가져오기
    const { content } = await req.json();
    
    if (!content || content.trim() === '') {
      return NextResponse.json({ error: '답변 내용은 필수입니다.' }, { status: 400 });
    }
    
    // 문의가 존재하는지 확인
    const { data: inquiry, error: inquiryError } = await supabase
      .from('product_inquiries')
      .select('id, status')
      .eq('id', inquiryId)
      .single();

    if (inquiryError || !inquiry) {
      return NextResponse.json({ error: '존재하지 않는 문의입니다.' }, { status: 404 });
    }

    // 답변 등록
    const { error: insertError } = await supabase
      .from('inquiry_replies')
      .insert({
        inquiry_id: inquiryId,
        user_id: userId,
        content: content.trim()
      });

    if (insertError) {
      console.error('답변 등록 오류:', insertError);
      return NextResponse.json({ error: '답변 등록에 실패했습니다.' }, { status: 500 });
    }

    // 문의 상태를 '답변완료'로 업데이트 (pending 상태일 때만)
    if (inquiry.status === 'pending') {
      const { error: updateError } = await supabase
        .from('product_inquiries')
        .update({ status: 'answered' })
        .eq('id', inquiryId);

      if (updateError) {
        console.error('문의 상태 업데이트 오류:', updateError);
        // 답변 등록은 성공했으므로 오류는 반환하지 않음
      }
    }

    return NextResponse.json({ success: true, message: '답변이 등록되었습니다.' });
  } catch (error) {
    console.error('답변 등록 API 오류:', error);
    return NextResponse.json(
      { error: '서버 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
} 