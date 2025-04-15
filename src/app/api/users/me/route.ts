import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Supabase 클라이언트 초기화
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabaseClient = createClient(supabaseUrl, supabaseServiceKey);

// 현재 로그인한 사용자 ID 가져오기
async function getUserId(request: NextRequest) {
  // Authorization 헤더에서 토큰 가져오기
  const authHeader = request.headers.get('Authorization');
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    console.log('[사용자 API] 인증 헤더가 없거나 잘못된 형식입니다.');
    return null;
  }
  
  try {
    // Bearer 접두사 제거
    const token = authHeader.split(' ')[1].trim();
    
    // UUID 형식의 사용자 ID인지 확인
    if (isValidUUID(token)) {
      console.log('[사용자 API] UUID 형식의 사용자 ID로 인증:', token);
      
      // 사용자 ID가 users 테이블에 존재하는지 확인
      const { data: userData, error: userError } = await supabaseClient
        .from('users')
        .select('id')
        .eq('id', token)
        .maybeSingle();
        
      if (userError) {
        console.error('[사용자 API] 사용자 확인 오류:', userError.message);
        return null;
      }
      
      if (!userData) {
        console.log('[사용자 API] 해당 ID의 사용자를 찾을 수 없습니다.');
        return null;
      }
      
      return token; // 사용자 ID 반환
    }
    
    console.error('[사용자 API] 유효하지 않은 토큰 형식:', token);
    return null;
  } catch (error) {
    console.error('[사용자 API] 토큰 처리 중 오류 발생:', error);
    return null;
  }
}

// UUID 형식인지 확인하는 함수
function isValidUUID(id: string | null | undefined): boolean {
  if (id === null || id === undefined) return false;
  const pattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return pattern.test(id);
}

// 전화번호 포맷팅 함수 (필요시 하이픈 추가)
function formatPhoneNumber(phoneNumber: string): string {
  // 이미 하이픈이 있는 경우 그대로 반환
  if (phoneNumber.includes('-')) {
    return phoneNumber;
  }
  
  // 하이픈 없는 숫자만 있는 경우 포맷팅
  const cleaned = phoneNumber.replace(/\D/g, '');
  
  // 01012345678 형식의 휴대폰 번호 -> 010-1234-5678
  if (cleaned.length === 11) {
    return `${cleaned.substring(0, 3)}-${cleaned.substring(3, 7)}-${cleaned.substring(7)}`;
  }
  
  // 0101235678 형식 (가운데 3자리)
  if (cleaned.length === 10) {
    return `${cleaned.substring(0, 3)}-${cleaned.substring(3, 6)}-${cleaned.substring(6)}`;
  }
  
  // 다른 형식은 그대로 반환
  return phoneNumber;
}

// GET 요청 처리 함수
export async function GET(request: NextRequest) {
  const userId = await getUserId(request);
  
  if (!userId) {
    return NextResponse.json({ error: '인증되지 않은 사용자' }, { status: 401 });
  }

  try {
    // 사용자 정보 조회
    const { data: user, error } = await supabaseClient
      .from('users')
      .select('*')
      .eq('id', userId)
      .maybeSingle();
      
    if (error) {
      console.error('사용자 정보 조회 오류:', error);
      return NextResponse.json({ 
        error: '사용자 정보 조회 중 오류가 발생했습니다.', 
        details: error.message 
      }, { status: 500 });
    }
    
    if (!user) {
      return NextResponse.json({ error: '사용자를 찾을 수 없습니다.' }, { status: 404 });
    }
    
    // 개인정보 보호를 위해 비밀번호 해시 등 민감한 정보는 제외
    const { password_hash, ...safeUserData } = user;
    
    // 마지막 로그인 시간 업데이트
    const now = new Date().toISOString();
    await supabaseClient
      .from('users')
      .update({ 
        updated_at: now 
      })
      .eq('id', userId);
    
    return NextResponse.json(safeUserData);
  } catch (error) {
    console.error('사용자 정보 조회 중 예외 발생:', error);
    return NextResponse.json({ 
      error: '사용자 정보를 조회하는 중 오류가 발생했습니다.',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

// PUT 요청 처리 함수 - 사용자 정보 업데이트
export async function PUT(request: NextRequest) {
  const userId = await getUserId(request);
  
  if (!userId) {
    return NextResponse.json({ error: '인증되지 않은 사용자' }, { status: 401 });
  }

  try {
    // 요청 데이터 파싱
    const requestData = await request.json();
    
    // 업데이트할 필드 추출
    const {
      name,
      nickname,
      phone_number,
      postcode,
      address,
      detail_address,
      marketing_agreed
    } = requestData;
    
    // 전화번호 포맷팅 (필요시)
    const formattedPhoneNumber = phone_number ? formatPhoneNumber(phone_number) : null;
    
    // 허용된 필드만 업데이트 데이터로 구성
    const updateData: any = {
      updated_at: new Date().toISOString()
    };
    
    // 값이 제공된 필드만 업데이트 데이터에 포함
    if (name !== undefined) updateData.name = name;
    if (nickname !== undefined) updateData.nickname = nickname;
    if (formattedPhoneNumber !== undefined) updateData.phone_number = formattedPhoneNumber;
    if (postcode !== undefined) updateData.postcode = postcode;
    if (address !== undefined) updateData.address = address;
    if (detail_address !== undefined) updateData.detail_address = detail_address;
    if (marketing_agreed !== undefined) updateData.marketing_agreed = marketing_agreed;
    
    console.log('[사용자 API] 업데이트 데이터:', updateData);
    
    // Supabase로 사용자 정보 업데이트
    const { data, error } = await supabaseClient
      .from('users')
      .update(updateData)
      .eq('id', userId)
      .select();
      
    if (error) {
      console.error('[사용자 API] 업데이트 오류:', error);
      return NextResponse.json({ 
        error: '사용자 정보 업데이트 중 오류가 발생했습니다.',
        details: error.message 
      }, { status: 500 });
    }
    
    // 업데이트된 정보에서 민감한 정보 제거
    const updatedUser = data && data[0] ? data[0] : null;
    
    if (!updatedUser) {
      return NextResponse.json({ 
        error: '사용자 정보 업데이트 결과를 확인할 수 없습니다.' 
      }, { status: 404 });
    }
    
    const { password_hash, ...safeUserData } = updatedUser;
    
    return NextResponse.json({
      message: '사용자 정보가 성공적으로 업데이트되었습니다.',
      user: safeUserData
    });
  } catch (error) {
    console.error('[사용자 API] 업데이트 처리 중 예외 발생:', error);
    return NextResponse.json({ 
      error: '사용자 정보를 업데이트하는 중 오류가 발생했습니다.',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
} 