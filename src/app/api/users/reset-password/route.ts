import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import nodemailer from 'nodemailer';
import { v4 as uuidv4 } from 'uuid';

// Supabase 클라이언트 초기화
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

// 이메일 전송 설정
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
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
    
    // DB에 비밀번호 재설정 요청 저장
    const { error: insertError } = await supabase
      .from('password_reset_requests')
      .insert({
        id: resetId,
        user_id: user.id,
        verification_code: verificationCode,
        expires_at: expiresAt.toISOString(),
        is_used: false
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
      from: process.env.EMAIL_USER,
      to: email,
      subject: '마이팜 - 비밀번호 재설정 인증번호 안내',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 5px;">
          <h2 style="color: #4CAF50; text-align: center;">마이팜 비밀번호 재설정</h2>
          <p style="font-size: 16px;">안녕하세요, <strong>${user.nickname || login_id}</strong>님!</p>
          <p style="font-size: 16px;">비밀번호 재설정을 위한 인증번호가 발급되었습니다.</p>
          <div style="background-color: #f5f5f5; padding: 15px; text-align: center; border-radius: 5px; margin: 20px 0;">
            <p style="font-size: 18px; margin: 5px 0;">인증번호: <strong style="color: #4CAF50; font-size: 24px;">${verificationCode}</strong></p>
          </div>
          <p>인증번호는 발급 시점으로부터 <strong>1시간 동안만 유효</strong>합니다.</p>
          <div style="background-color: #f9f9f9; padding: 15px; border-radius: 5px; margin: 20px 0;">
            <p style="font-size: 16px; margin-top: 0;"><strong>🔒 비밀번호 설정 가이드</strong></p>
            <ul style="padding-left: 20px;">
              <li>8~16자 사이로 입력해 주세요.</li>
              <li>영문 대문자(A-Z) 1개 이상 포함해야 합니다.</li>
              <li>영문 소문자(a-z) 1개 이상 포함해야 합니다.</li>
              <li>숫자(0-9) 1개 이상 포함해야 합니다.</li>
              <li>특수문자(!@#$%^&*(),.?":{}|<> 등) 1개 이상 포함해야 합니다.</li>
            </ul>
            <p style="font-size: 14px; color: #666; margin-bottom: 0;">예시: <span style="font-family: monospace; background-color: #eeeeee; padding: 2px 5px; border-radius: 3px;">MyFarm2023!</span></p>
          </div>
          <p>요청하지 않으셨다면 이 이메일을 무시하셔도 됩니다.</p>
          <div style="text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #e0e0e0;">
            <p style="color: #666; font-size: 14px;">본 메일은 발신전용으로 회신이 불가합니다.</p>
            <p style="color: #666; font-size: 14px;">© 2023 마이팜. All rights reserved.</p>
          </div>
        </div>
      `
    };
    
    // 이메일 발송
    await transporter.sendMail(mailOptions);
    
    return NextResponse.json({
      success: true,
      message: '인증번호가 이메일로 발송되었습니다. 메일함을 확인해 주세요.',
      resetId: resetId
    });
    
  } catch (error) {
    console.error('비밀번호 재설정 요청 오류:', error);
    return NextResponse.json({ 
      success: false, 
      error: '비밀번호 재설정 요청 처리 중 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.' 
    }, { status: 500 });
  }
} 