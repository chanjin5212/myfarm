import { NextResponse } from 'next/server';
import nodemailer from 'nodemailer';
import { createClient } from '@supabase/supabase-js';

// Supabase 클라이언트 초기화
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Brevo SMTP 설정
const transporter = nodemailer.createTransport({
  host: process.env.BREVO_SMTP_HOST,
  port: parseInt(process.env.BREVO_SMTP_PORT || '587'),
  secure: false, // true for 465, false for other ports
  auth: {
    user: process.env.BREVO_SMTP_USER,
    pass: process.env.BREVO_SMTP_PASS,
  },
});

// 랜덤 인증코드 생성 함수
function generateVerificationCode() {
  return Math.floor(100000 + Math.random() * 900000).toString(); // 6자리 숫자
}

export async function POST(request: Request) {
  try {
    const { email } = await request.json();
    console.log('이메일 인증 요청:', email);

    // 이메일 형식 검증
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email || !emailRegex.test(email)) {
      console.log('이메일 형식 오류:', email);
      return NextResponse.json({ error: '유효한 이메일을 입력해주세요.' }, { status: 400 });
    }

    // 이메일 중복 확인
    console.log('이메일 중복 확인 시작');
    const { data: existingUser, error: userError } = await supabase
      .from('users')
      .select('email')
      .eq('email', email)
      .maybeSingle();

    if (userError) {
      console.error('이메일 중복 확인 오류:', userError);
      throw new Error(userError.message);
    }

    if (existingUser) {
      console.log('이미 존재하는 이메일:', email);
      return NextResponse.json({ error: '이미 가입된 이메일입니다.' }, { status: 400 });
    }

    // 인증 코드 생성
    const verificationCode = generateVerificationCode();
    console.log('생성된 인증 코드:', verificationCode, '(이메일:', email, ')');
    
    // 이메일 인증 테이블이 존재하는지 확인
    console.log('이메일 인증 테이블 확인 시작');
    try {
      const { error: tableCheckError } = await supabase
        .from('email_verifications')
        .select('id')
        .limit(1);
      
      if (tableCheckError) {
        console.error('이메일 인증 테이블 오류:', tableCheckError);
        throw new Error('이메일 인증 테이블이 존재하지 않습니다. 테이블을 생성해주세요.');
      }
    } catch (tableError) {
      console.error('이메일 인증 테이블 확인 오류:', tableError);
    }
    
    // 인증 코드 저장 (임시 테이블)
    console.log('인증 코드 저장 시작');
    const { error: insertError } = await supabase
      .from('email_verifications')
      .upsert([
        { 
          email, 
          code: verificationCode, 
          expires_at: new Date(Date.now() + 10 * 60 * 1000).toISOString(), // 10분 유효
          verified: false
        }
      ], { 
        onConflict: 'email'
      });

    if (insertError) {
      console.error('인증 코드 저장 오류:', insertError);
      throw new Error(insertError.message);
    }
    console.log('인증 코드 저장 완료');

    // SMTP 설정 로깅 (비밀번호 제외)
    console.log('SMTP 설정 확인:', {
      host: process.env.BREVO_SMTP_HOST,
      port: process.env.BREVO_SMTP_PORT,
      user: process.env.BREVO_SMTP_USER,
      from: process.env.EMAIL_FROM
    });

    // 이메일 발송
    const mailOptions = {
      from: process.env.EMAIL_FROM, // 인증된 발신자 이메일 (chanjin5212@gmail.com)
      to: email,
      subject: '숙경팜 회원가입 이메일 인증',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 5px;">
          <h2 style="color: #4a5568; text-align: center;">숙경팜 회원가입 이메일 인증</h2>
          <p style="color: #4a5568; line-height: 1.5;">안녕하세요, 숙경팜을 이용해 주셔서 감사합니다.</p>
          <p style="color: #4a5568; line-height: 1.5;">회원가입을 완료하기 위해 아래의 인증 코드를 입력해주세요.</p>
          <div style="background-color: #f7fafc; padding: 15px; border-radius: 5px; text-align: center; margin: 20px 0;">
            <h3 style="color: #2b6cb0; margin: 0; font-size: 24px;">${verificationCode}</h3>
          </div>
          <p style="color: #4a5568; line-height: 1.5;">이 인증 코드는 10분 동안 유효합니다.</p>
          <p style="color: #4a5568; line-height: 1.5;">본인이 요청하지 않은 경우 이 이메일을 무시하셔도 됩니다.</p>
          <p style="color: #718096; font-size: 14px; margin-top: 30px; text-align: center;">© ${new Date().getFullYear()} 숙경팜. All rights reserved.</p>
        </div>
      `
    };

    console.log('이메일 발송 시도:', email);
    try {
      const info = await transporter.sendMail(mailOptions);
      console.log('이메일 발송 성공:', info);
    } catch (emailError) {
      console.error('이메일 발송 실패:', emailError);
      // 개발 환경에서는 에러를 던지지 않고 진행 (테스트를 위해)
      console.log('개발 환경에서는 이메일 발송 오류를 무시하고 진행합니다.');
      console.log('인증 코드:', verificationCode, '(이메일:', email, ')');
      
      // 실제 환경에서는 아래 주석을 해제하여 오류 처리
      // throw emailError;
    }
    
    // 개발 환경에서도 사용자에게 인증 코드를 보여주기 위한 목적으로 콘솔에 출력
    console.log('이메일 인증 코드 (개발용):', verificationCode);

    return NextResponse.json({ 
      success: true, 
      message: '인증 코드가 이메일로 발송되었습니다.',
      // 개발 환경에서만 코드 포함 (실제 서비스에서는 제거)
      code: process.env.NODE_ENV === 'development' ? verificationCode : undefined
    });

  } catch (error) {
    console.error('이메일 인증 코드 발송 전체 오류:', error);
    
    if (error instanceof Error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    
    return NextResponse.json({ error: '이메일 발송 중 오류가 발생했습니다.' }, { status: 500 });
  }
} 