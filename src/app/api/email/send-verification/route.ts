import { NextResponse } from 'next/server';
import nodemailer from 'nodemailer';
import { createClient } from '@supabase/supabase-js';
import { getVerificationEmailTemplate, getVerificationEmailSubject } from '@/utils/emailTemplates';

// Supabase 클라이언트 초기화
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Gmail SMTP 설정
const transporter = nodemailer.createTransport({
  host: process.env.GMAIL_SMTP_HOST || 'smtp.gmail.com',
  port: parseInt(process.env.GMAIL_SMTP_PORT || '587'),
  secure: false, // true for 465, false for other ports
  auth: {
    user: process.env.GMAIL_SMTP_USER,
    pass: process.env.GMAIL_SMTP_PASS,
  }
});

// 랜덤 인증코드 생성 함수
function generateVerificationCode() {
  return Math.floor(100000 + Math.random() * 900000).toString(); // 6자리 숫자
}

export async function POST(request: Request) {
  try {
    const { email } = await request.json();

    // 이메일 형식 검증
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email || !emailRegex.test(email)) {
      return NextResponse.json({ error: '유효한 이메일을 입력해주세요.' }, { status: 400 });
    }

    // 이메일 중복 확인
    try {
      // 'single()' 대신 'select().eq().limit(1)'를 사용합니다
      const { data: existingUsers, error: userError } = await supabase
        .from('users')
        .select('email')
        .eq('email', email)
        .limit(1);

      if (userError) {
        throw new Error(`이메일 중복 확인 중 오류: ${userError.message}`);
      }

      if (existingUsers && existingUsers.length > 0) {
        return NextResponse.json({ error: '이미 가입된 이메일입니다.' }, { status: 400 });
      }
    } catch (error) {
      if (error instanceof Error) {
        return NextResponse.json({ error: `이메일 확인 중 오류: ${error.message}` }, { status: 500 });
      }
      return NextResponse.json({ error: '이메일 확인 중 오류가 발생했습니다.' }, { status: 500 });
    }

    // 인증 코드 생성
    const verificationCode = generateVerificationCode();
    
    // 이메일 인증 테이블이 존재하는지 확인
    try {
      const { error: tableCheckError } = await supabase
        .from('email_verifications')
        .select('id')
        .limit(1);
      
      if (tableCheckError) {
        throw new Error('이메일 인증 테이블이 존재하지 않습니다. 테이블을 생성해주세요.');
      }
    } catch (tableError) {
      if (tableError instanceof Error) {
        return NextResponse.json({ error: `서버 오류: ${tableError.message}` }, { status: 500 });
      }
      return NextResponse.json({ error: '서버 오류가 발생했습니다.' }, { status: 500 });
    }
    
    // 인증 코드 저장 (임시 테이블)
    try {
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
        throw new Error(`인증 코드 저장 오류: ${insertError.message}`);
      }
    } catch (insertError) {
      if (insertError instanceof Error) {
        return NextResponse.json({ error: `인증 코드 저장 오류: ${insertError.message}` }, { status: 500 });
      }
      return NextResponse.json({ error: '인증 코드 저장 중 오류가 발생했습니다.' }, { status: 500 });
    }

    // 이메일 발송
    const mailOptions = {
      from: `"숙경팜" <${process.env.EMAIL_FROM}>`,
      to: email,
      subject: getVerificationEmailSubject('register'),
      html: getVerificationEmailTemplate('고객', verificationCode, 'register'),
      text: `숙경팜 회원가입 이메일 인증\n\n안녕하세요, 숙경팜을 이용해 주셔서 감사합니다.\n회원가입을 완료하기 위해 아래의 인증 코드를 입력해주세요.\n\n인증 코드: ${verificationCode}\n\n이 인증 코드는 10분 동안 유효합니다.\n본인이 요청하지 않은 경우 이 이메일을 무시하셔도 됩니다.`
    };

    try {
      await transporter.sendMail(mailOptions);
    } catch (emailError) {
      let errorDetail = '';
      if (emailError instanceof Error) {
        errorDetail = emailError.message;
      }
      
      // 클라이언트에게 이메일 발송 실패를 알리면서 개발용 코드는 전달
      return NextResponse.json({ 
        success: false, 
        error: '이메일 발송에 실패했습니다. 관리자에게 문의하세요.',
        errorDetail: process.env.NODE_ENV === 'development' ? errorDetail : undefined,
        message: '이메일 발송은 실패했지만 개발 환경에서 진행하기 위해 인증 코드를 제공합니다.',
        code: process.env.NODE_ENV === 'development' ? verificationCode : undefined
      }, { status: 200 }); // 개발 환경에서는 200 상태코드로 반환하여 진행
    }

    return NextResponse.json({ 
      success: true, 
      message: '인증 코드가 이메일로 발송되었습니다.',
      // 개발 환경에서만 코드 포함 (실제 서비스에서는 제거)
      code: process.env.NODE_ENV === 'development' ? verificationCode : undefined
    });

  } catch (error) {
    if (error instanceof Error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    
    return NextResponse.json({ error: '이메일 발송 중 오류가 발생했습니다.' }, { status: 500 });
  }
} 