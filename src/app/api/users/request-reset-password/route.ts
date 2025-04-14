import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import nodemailer from 'nodemailer';

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
    
    // 사용자 확인
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('id, name')
      .eq('login_id', login_id)
      .eq('email', email)
      .single();
      
    if (userError || !user) {
      console.log('사용자 찾기 오류:', userError);
      console.log('찾으려는 데이터:', { login_id, email });
      return NextResponse.json({ 
        success: false, 
        error: '입력하신 정보와 일치하는 사용자를 찾을 수 없습니다.' 
      }, { status: 404 });
    }
    
    // 6자리 인증 코드 생성
    const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();
    
    // 만료 시간 설정 (현재 시간 + 30분)
    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + 30);
    
    // 기존 인증 코드가 있으면 삭제
    await supabase
      .from('email_verifications')
      .delete()
      .eq('email', email);
    
    // 새 인증 코드 저장
    const { error: insertError } = await supabase
      .from('email_verifications')
      .insert({
        email: email,
        code: verificationCode,
        created_at: new Date().toISOString(),
        expires_at: expiresAt.toISOString(),
        verified: false
      });
    
    if (insertError) {
      console.error('재설정 요청 저장 오류:', insertError);
      return NextResponse.json({ 
        success: false, 
        error: '비밀번호 재설정 요청 처리 중 오류가 발생했습니다.' 
      }, { status: 500 });
    }
    
    // 이메일 발송
    const mailOptions = {
      from: `"숙경팜" <${process.env.EMAIL_FROM}>`,
      to: email,
      subject: '숙경팜 - 비밀번호 재설정 인증 코드',
      text: `안녕하세요 ${user.name}님,\n\n비밀번호 재설정을 위한 인증 코드는 ${verificationCode}입니다.\n이 코드는 30분 동안 유효합니다.\n\n숙경팜 드림`,
      html: `
        <div style="font-family: 'Apple SD Gothic Neo', 'Noto Sans KR', sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #336633; margin-bottom: 20px;">숙경팜 비밀번호 재설정</h2>
          <p>안녕하세요 <strong>${user.name}</strong>님,</p>
          <p>비밀번호 재설정을 위한 인증 코드는 다음과 같습니다:</p>
          <div style="background-color: #f8f9fa; padding: 15px; font-size: 24px; font-weight: bold; text-align: center; letter-spacing: 5px; margin: 20px 0;">
            ${verificationCode}
          </div>
          <p>이 코드는 발급 후 <strong>30분</strong> 동안 유효합니다.</p>
          <p>감사합니다.<br>숙경팜 드림</p>
        </div>
      `
    };
    
    try {
      await transporter.sendMail(mailOptions);
    } catch (error) {
      console.error('이메일 발송 오류:', error);
      return NextResponse.json({ 
        success: false, 
        error: '인증 코드 이메일 발송 중 오류가 발생했습니다.' 
      }, { status: 500 });
    }
    
    return NextResponse.json({
      success: true,
      message: '비밀번호 재설정 인증 코드가 이메일로 발송되었습니다.'
    });
    
  } catch (error) {
    console.error('비밀번호 재설정 요청 오류:', error);
    return NextResponse.json({ 
      success: false, 
      error: '비밀번호 재설정 요청 처리 중 오류가 발생했습니다.' 
    }, { status: 500 });
  }
} 