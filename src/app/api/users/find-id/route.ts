import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import nodemailer from 'nodemailer';
import { getVerificationEmailTemplate, getVerificationEmailSubject } from '@/utils/emailTemplates';

// Supabase 클라이언트 초기화
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Gmail SMTP 설정
const transporter = nodemailer.createTransport({
  host: process.env.GMAIL_SMTP_HOST || 'smtp.gmail.com',
  port: Number(process.env.GMAIL_SMTP_PORT) || 587,
  secure: false,
  auth: {
    user: process.env.GMAIL_SMTP_USER,
    pass: process.env.GMAIL_SMTP_PASS,
  },
});

// 6자리 인증 코드 생성 함수
function generateVerificationCode() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

export async function POST(request: Request) {
  try {
    const { name, email } = await request.json();
    
    // 필수 필드 검증
    if (!name || !email) {
      return NextResponse.json({ 
        success: false, 
        error: '이름과 이메일은 필수 항목입니다.' 
      }, { status: 400 });
    }
    
    // 이메일 형식 검증
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json({ 
        success: false, 
        error: '유효한 이메일 주소를 입력해주세요.' 
      }, { status: 400 });
    }
    
    // 사용자 존재 여부 확인
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('*')
      .eq('email', email)
      .eq('name', name)
      .single();
      
    if (userError || !user) {
      return NextResponse.json({ 
        success: false, 
        error: '입력하신 정보와 일치하는 사용자를 찾을 수 없습니다.' 
      }, { status: 404 });
    }
    
    // 로그인 아이디가 없고 소셜 로그인으로만 가입한 경우
    if (!user.login_id) {
      // 어떤 소셜 로그인으로 가입했는지 확인
      const socialProviders = [];
      if (user.google_id) socialProviders.push('Google');
      if (user.kakao_id) socialProviders.push('Kakao');
      if (user.naver_id) socialProviders.push('Naver');
      
      return NextResponse.json({
        success: false,
        error: '일반 로그인으로 가입한 계정이 아닙니다. 다음 소셜 로그인으로 가입하셨습니다: ' + socialProviders.join(', '),
        isSocialLoginOnly: true,
        socialProviders
      }, { status: 400 });
    }
    
    // 인증 코드 생성
    const verificationCode = generateVerificationCode();
    
    // 데이터베이스에 인증 코드 저장
    const now = new Date();
    const expiresAt = new Date(now.getTime() + 10 * 60000); // 10분 후 만료
    
    // 기존 인증 코드가 있으면 삭제
    await supabase
      .from('email_verifications')
      .delete()
      .eq('email', email);
      
    // 새 인증 코드 저장
    const { error: verificationError } = await supabase
      .from('email_verifications')
      .insert({
        email: email,
        code: verificationCode,
        created_at: now.toISOString(),
        expires_at: expiresAt.toISOString(),
        verified: false
      });
      
    if (verificationError) {
      console.error('인증 코드 저장 오류:', verificationError);
      return NextResponse.json({ 
        success: false, 
        error: '아이디 찾기 요청을 처리하는 중 오류가 발생했습니다.' 
      }, { status: 500 });
    }
    
    // 이메일로 인증 코드 전송
    const mailOptions = {
      from: process.env.EMAIL_FROM || '"숙경팜" <admin@sukkyungfarm.com>',
      to: email,
      subject: getVerificationEmailSubject('findId'),
      html: getVerificationEmailTemplate(name, verificationCode, 'findId')
    };
    
    try {
      await transporter.sendMail(mailOptions);
    } catch (emailError) {
      console.error('이메일 전송 오류:', emailError);
      return NextResponse.json({ 
        success: false, 
        error: '인증 코드 이메일 전송에 실패했습니다.' 
      }, { status: 500 });
    }
    
    // 응답
    return NextResponse.json({
      success: true,
      message: '인증 코드가 이메일로 전송되었습니다.',
      verificationCode  // 개발 환경에서만 포함하고, 실제 운영에서는 제거할 것
    });
    
  } catch (error) {
    console.error('아이디 찾기 요청 오류:', error);
    return NextResponse.json({ 
      success: false, 
      error: '아이디 찾기 요청을 처리하는 중 오류가 발생했습니다.' 
    }, { status: 500 });
  }
} 