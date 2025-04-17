import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import nodemailer from 'nodemailer';
import { v4 as uuidv4 } from 'uuid';
import { getVerificationEmailTemplate, getVerificationEmailSubject } from '@/utils/emailTemplates';

// Supabase 클라이언트 초기화
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

// 이메일 전송 설정
const transporter = nodemailer.createTransport({
  host: process.env.GMAIL_SMTP_HOST,
  port: Number(process.env.GMAIL_SMTP_PORT),
  secure: false, // true for 465, false for other ports
  auth: {
    user: process.env.GMAIL_SMTP_USER,
    pass: process.env.GMAIL_SMTP_PASS,
  },
});

export async function POST(request: Request) {
  try {
    const { login_id, email } = await request.json();
    
    // 필수 필드 검증
    if (!login_id || !email) {
      return NextResponse.json({ 
        success: false, 
        error: '아이디와 이메일은 필수 항목입니다.' 
      }, { status: 400 });
    }
    
    // 이메일 형식 검증
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json({ 
        success: false, 
        error: '유효한 이메일 주소를 입력해 주세요. (예: example@domain.com)' 
      }, { status: 400 });
    }
    
    // 사용자 존재 여부 확인
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('id, login_id, email, nickname')
      .eq('login_id', login_id)
      .eq('email', email)
      .single();
    
    if (userError || !user) {
      return NextResponse.json({ 
        success: false, 
        error: '입력하신 정보와 일치하는 사용자를 찾을 수 없습니다. 아이디와 이메일을 다시 확인해 주세요.' 
      }, { status: 404 });
    }
    
    // 인증 코드 생성 (6자리 숫자)
    const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();
    const resetId = uuidv4();
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 1); // 1시간 후 만료
    
    // 이미 이메일이 있는지 먼저 확인하고 있으면 삭제
    const { error: deleteError } = await supabase
      .from('email_verifications')
      .delete()
      .eq('email', user.email);
      
    if (deleteError) {
      console.error('기존 이메일 인증 삭제 오류:', deleteError);
      // 삭제 실패는 무시하고 계속 진행 (없을 수도 있으므로)
    }
    
    // 새로운 인증 코드 추가
    const { error: insertError } = await supabase
      .from('email_verifications')
      .insert({
        id: resetId,
        email: user.email,
        code: verificationCode,
        expires_at: expiresAt.toISOString(),
        verified: false
      });
    
    if (insertError) {
      console.error('비밀번호 재설정 요청 저장 오류:', insertError);
      return NextResponse.json({ 
        success: false, 
        error: '비밀번호 재설정 요청을 처리하는 중 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.' 
      }, { status: 500 });
    }
    
    // 이메일 제목과 내용
    const mailOptions = {
      from: process.env.GMAIL_SMTP_USER,
      to: email,
      subject: getVerificationEmailSubject('resetPassword'),
      html: getVerificationEmailTemplate(user.nickname || login_id, verificationCode, 'resetPassword')
    };
    
    try {
      // 이메일 발송
      await transporter.sendMail(mailOptions);
      
      return NextResponse.json({
        success: true,
        message: '인증번호가 이메일로 발송되었습니다. 메일함을 확인해 주세요.',
        resetId: resetId
      });
    } catch (emailError) {
      console.error('이메일 발송 오류:', emailError);
      return NextResponse.json({ 
        success: false, 
        error: '인증번호 이메일 발송 중 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.' 
      }, { status: 500 });
    }
    
  } catch (error) {
    console.error('비밀번호 재설정 요청 오류:', error);
    return NextResponse.json({ 
      success: false, 
      error: '비밀번호 재설정 요청 처리 중 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.' 
    }, { status: 500 });
  }
} 