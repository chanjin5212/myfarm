import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import bcrypt from 'bcryptjs';

// Supabase 클라이언트 초기화
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

export async function POST(request: Request) {
  try {
    const { email, verificationCode, newPassword } = await request.json();
    
    // 필수 필드 검증
    if (!email || !verificationCode || !newPassword) {
      return NextResponse.json({
        success: false,
        error: '이메일, 인증 코드, 새 비밀번호는 모두 필수 항목입니다.'
      }, { status: 400 });
    }
    
    // 비밀번호 길이 검증 (8~16자)
    if (newPassword.length < 8 || newPassword.length > 16) {
      return NextResponse.json({
        success: false,
        error: '비밀번호는 8자에서 16자 사이여야 합니다.'
      }, { status: 400 });
    }
    
    // 대문자 포함 여부 검증
    if (!/[A-Z]/.test(newPassword)) {
      return NextResponse.json({
        success: false,
        error: '비밀번호에는 최소 1개 이상의 영문 대문자가 포함되어야 합니다.'
      }, { status: 400 });
    }
    
    // 소문자 포함 여부 검증
    if (!/[a-z]/.test(newPassword)) {
      return NextResponse.json({
        success: false,
        error: '비밀번호에는 최소 1개 이상의 영문 소문자가 포함되어야 합니다.'
      }, { status: 400 });
    }
    
    // 숫자 포함 여부 검증
    if (!/[0-9]/.test(newPassword)) {
      return NextResponse.json({
        success: false,
        error: '비밀번호에는 최소 1개 이상의 숫자가 포함되어야 합니다.'
      }, { status: 400 });
    }
    
    // 특수 문자 포함 여부 검증
    if (!/[!@#$%^&*(),.?":{}|<>]/.test(newPassword)) {
      return NextResponse.json({
        success: false,
        error: '비밀번호에는 최소 1개 이상의 특수 문자(!@#$%^&*(),.?":{}|<> 등)가 포함되어야 합니다.'
      }, { status: 400 });
    }
    
    // 이메일 인증 확인
    const { data: verification, error: verificationError } = await supabase
      .from('email_verifications')
      .select('*')
      .eq('email', email)
      .eq('code', verificationCode)
      .eq('verified', true)
      .single();
    
    if (verificationError || !verification) {
      return NextResponse.json({
        success: false,
        error: '인증이 완료되지 않았거나 유효하지 않은 인증 정보입니다.'
      }, { status: 400 });
    }
    
    // 사용자 확인
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('id')
      .eq('email', email)
      .single();
    
    if (userError || !user) {
      return NextResponse.json({
        success: false,
        error: '해당 이메일로 등록된 사용자를 찾을 수 없습니다.'
      }, { status: 404 });
    }
    
    // 비밀번호 해싱
    const salt = bcrypt.genSaltSync(12);
    const hashedPassword = bcrypt.hashSync(newPassword, salt);
    
    // 사용자 비밀번호 업데이트
    const { error: updateError } = await supabase
      .from('users')
      .update({ password: hashedPassword, updated_at: new Date().toISOString() })
      .eq('id', user.id);
    
    if (updateError) {
      console.error('비밀번호 업데이트 오류:', JSON.stringify(updateError, null, 2));
      return NextResponse.json({
        success: false,
        error: '비밀번호 업데이트 중 오류가 발생했습니다: ' + (updateError.message || '데이터베이스 오류')
      }, { status: 500 });
    }
    
    return NextResponse.json({
      success: true,
      message: '비밀번호가 성공적으로 변경되었습니다.'
    });
    
  } catch (error) {
    console.error('비밀번호 업데이트 오류:', typeof error === 'object' ? JSON.stringify(error, null, 2) : error);
    return NextResponse.json({
      success: false,
      error: '비밀번호 업데이트 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.'
    }, { status: 500 });
  }
} 