import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import * as jwt from 'jsonwebtoken';
import axios from 'axios';
import * as CryptoJS from 'crypto-js';

// Supabase 클라이언트 초기화
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseServiceKey);

// JWT Secret
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

// CoolSMS 서명 생성 함수 (공식 문서에 기반)
function getAuthHeaderForCoolSMS(apiKey: string, apiSecret: string) {
  // ISO 8601 형식의 날짜 (UTC 기준)
  const date = new Date().toISOString();
  
  // 12-64바이트의 랜덤한 문자열 생성
  const salt = CryptoJS.lib.WordArray.random(16).toString();
  
  // 서명 데이터: <Date Time> + <Salt>
  const signatureData = date + salt;
  
  // API Secret을 키로 사용하여 HMAC-SHA256 해시 생성
  const signature = CryptoJS.HmacSHA256(signatureData, apiSecret).toString(CryptoJS.enc.Hex);
  
  // 최종 Authorization 헤더 형식: HMAC-SHA256 apiKey=<API Key>, date=<Date Time>, salt=<Salt>, signature=<Signature>
  const authorization = `HMAC-SHA256 apiKey=${apiKey}, date=${date}, salt=${salt}, signature=${signature}`;
  
  console.log('Authorization 헤더:', authorization);
  return { Authorization: authorization, date };
}

// 광고 문자 형식으로 메시지 포맷팅
function formatAdMessage(message: string): string {
  
  return `[광고]강원찐농부\n${message}\nhttps://gangwonnongbu.co.kr\n무료수신거부 080-500-4233`;
}

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

export async function POST(request: NextRequest) {
  try {
    // 1. 관리자 인증 처리
    const authResult = await verifyAdminToken(request);
    if (!authResult.isValid) {
      return NextResponse.json(
        { error: authResult.error },
        { status: 401 }
      );
    }

    // 2. 요청 본문 파싱
    const { message, isAd = true, companyName, companyPhone } = await request.json();
    
    if (!message || typeof message !== 'string') {
      return NextResponse.json({ error: '메시지 내용이 필요합니다' }, { status: 400 });
    }

    // 광고 메시지인 경우 검증 로직 제거
    // companyName과 companyPhone은 선택적으로 제공 가능

    // 3. 마케팅 수신 동의한 사용자 목록 조회
    const { data: users, error: usersError } = await supabase
      .from('users')
      .select('phone_number')
      .eq('marketing_agreed', true)
      .eq('is_deleted', false)
      .not('phone_number', 'is', null);

    if (usersError) {
      console.error('사용자 목록 조회 오류:', usersError);
      return NextResponse.json({ error: '사용자 목록을 가져오는데 실패했습니다' }, { status: 500 });
    }

    // 유효한 전화번호 필터링 (DB에서 가져온 그대로 사용)
    const validPhoneNumbers = users
      .filter(user => user.phone_number && user.phone_number.trim().length > 8)
      .map(user => user.phone_number.trim());

    if (validPhoneNumbers.length === 0) {
      return NextResponse.json({ error: '발송 가능한 전화번호가 없습니다' }, { status: 400 });
    }

    // 메시지 포맷팅 (광고 문자인 경우)
    const finalMessage = isAd ? formatAdMessage(message, companyName, companyPhone) : message;

    try {
      // 4. CoolSMS API 직접 사용하기
      const apiKey = process.env.COOLSMS_API_KEY || '';
      const apiSecret = process.env.COOLSMS_API_SECRET || '';
      const senderNumber = process.env.COOLSMS_SENDER_NUMBER || '';
      
      if (!senderNumber) {
        return NextResponse.json({ error: '발신 번호가 설정되지 않았습니다' }, { status: 500 });
      }

      // CoolSMS API 인증 헤더 생성
      const authHeader = getAuthHeaderForCoolSMS(apiKey, apiSecret);

      // 단일 문자 발송 (최대 1,000명)
      if (validPhoneNumbers.length <= 1000) {
        // CoolSMS API 요청 데이터 구조 (send-many/detail 문서 기반)
        const requestData = {
          messages: validPhoneNumbers.map(phoneNumber => ({
            to: phoneNumber,
            from: senderNumber,
            text: finalMessage,
            type: "SMS",
            country: "82"
          })),
          strict: false,
          allowDuplicates: false
        };

        // API 요청의 상세 로그
        console.log('API 요청 데이터:', JSON.stringify(requestData, null, 2));

        // Axios로 API 직접 호출
        const response = await axios.post(
          'https://api.coolsms.co.kr/messages/v4/send-many/detail', 
          requestData,
          { 
            headers: { 
              'Content-Type': 'application/json',
              'Authorization': authHeader.Authorization
            }
          }
        );

        console.log("응답 데이터:" + JSON.stringify(response.data, null, 2));
        
        return NextResponse.json({
          success: true,
          sentCount: validPhoneNumbers.length,
          result: response.data
        });
      } 
      // 대량 메시지 전송 시 (1,000명 초과)
      else {
        // 1,000명씩 나누어 전송
        const batches = [];
        for (let i = 0; i < validPhoneNumbers.length; i += 1000) {
          const batch = validPhoneNumbers.slice(i, i + 1000);
          batches.push(batch);
        }

        const results = [];
        for (const batch of batches) {
          // 각 배치마다 새로운 인증 헤더 생성
          const batchAuthHeader = getAuthHeaderForCoolSMS(apiKey, apiSecret);
          
          // CoolSMS API 요청 데이터 구조 (send-many/detail 문서 기반)
          const requestData = {
            messages: batch.map(phoneNumber => ({
              to: phoneNumber,
              from: senderNumber,
              text: finalMessage,
              type: "SMS",
              country: "82"
            })),
            strict: false,
            allowDuplicates: false
          };

          // Axios로 API 직접 호출
          const response = await axios.post(
            'https://api.coolsms.co.kr/messages/v4/send-many/detail', 
            requestData,
            { 
              headers: { 
                'Content-Type': 'application/json',
                'Authorization': batchAuthHeader.Authorization
              }
            }
          );

          console.log("응답 데이터:" + JSON.stringify(response.data, null, 2));
          results.push(response.data);
        }

        return NextResponse.json({
          success: true,
          sentCount: validPhoneNumbers.length,
          results
        });
      }
    } catch (coolsmsError: any) {
      console.error('Coolsms 오류:', coolsmsError);
      console.error('오류 상세:', coolsmsError.response?.data || coolsmsError.message);
      
      const errorMessage = coolsmsError.response?.data?.errorMessage || coolsmsError.message || '문자 발송 중 오류가 발생했습니다';
      return NextResponse.json({ 
        error: errorMessage
      }, { status: 500 });
    }
  } catch (error) {
    console.error('SMS 발송 처리 오류:', error);
    return NextResponse.json({ 
      error: '문자 메시지 발송 중 오류가 발생했습니다' 
    }, { status: 500 });
  }
} 