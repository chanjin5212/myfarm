import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { v4 as uuidv4 } from 'uuid';

// Supabase 클라이언트 초기화
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

interface UserData {
  id?: string;
  google_id?: string;  // Google 소셜 ID
  kakao_id?: string;   // 카카오 소셜 ID
  naver_id?: string;   // 네이버 소셜 ID
  provider?: string;   // 소셜 로그인 제공자 (google, kakao, naver)
  email: string;
  name?: string;
  nickname?: string;   // 사용자 닉네임
  avatar_url?: string;
  terms_agreed?: boolean;
  marketing_agreed?: boolean;
  created_at?: string;
  updated_at?: string;
  last_login?: string;
}

interface ApiError extends Error {
  status?: number;
}

interface ExistingUser {
  id: string;
  email: string;
  google_id?: string;
  kakao_id?: string;
  naver_id?: string;
  name?: string;
  nickname?: string;   // 사용자 닉네임
  avatar_url?: string | null;
  terms_agreed?: boolean;
  marketing_agreed?: boolean;
  created_at?: string;
  updated_at?: string;
  last_login?: string;
  [key: string]: string | boolean | null | undefined; // 더 구체적인 인덱스 시그니처
}

export async function POST(request: Request) {
  try {
    // 요청 데이터 파싱
    const userData = await request.json() as UserData;
    
    // 필수 필드 확인
    if (!userData.email || userData.email.trim() === '') {
      return NextResponse.json({ error: '이메일은 필수 항목입니다.' }, { status: 400 });
    }
    
    // 소셜 ID와 제공자 정보 확인
    const provider = userData.provider || 'google';
    
    // 소셜 ID로만 기존 사용자 확인 (이메일 체크 제거)
    let existingUser = null;
    
    // 소셜 로그인 제공자별 ID 확인
    if (provider === 'google' && userData.google_id) {
      const { data } = await supabase
        .from('users')
        .select('*')
        .eq('google_id', userData.google_id)
        .maybeSingle();
      existingUser = data as ExistingUser;
    } else if (provider === 'kakao' && userData.kakao_id) {
      const { data } = await supabase
        .from('users')
        .select('*')
        .eq('kakao_id', userData.kakao_id)
        .maybeSingle();
      existingUser = data as ExistingUser;  
    } else if (provider === 'naver' && userData.naver_id) {
      const { data } = await supabase
        .from('users')
        .select('*')
        .eq('naver_id', userData.naver_id)
        .maybeSingle();
      existingUser = data as ExistingUser;
    }
    
    // 기존 사용자가 있는 경우
    if (existingUser) {
      const now = new Date().toISOString();
      // 사용자가 있으면 nickname과 last_login, updated_at만 업데이트
      const updateData = {
        nickname: userData.nickname || existingUser.nickname,
        updated_at: now,
        last_login: now
      };
      
      const { data: updatedUser, error: updateError } = await supabase
        .from('users')
        .update(updateData)
        .eq('id', existingUser.id)
        .select()
        .single();
        
      if (updateError) {
        console.error('사용자 정보 업데이트 오류:', updateError);
      }
      
      return NextResponse.json({ 
        success: true, 
        data: updatedUser || existingUser,
        message: '기존 사용자 정보가 업데이트되었습니다.'
      });
    }
    
    // 새 사용자 등록
    const newUserData: Record<string, string | boolean | null> = {
      id: uuidv4(), // 항상 새로운 UUID 생성
      email: userData.email,
      name: userData.name || '사용자',
      nickname: userData.nickname || '사용자',
      avatar_url: userData.avatar_url || null,
      terms_agreed: userData.terms_agreed || false,
      marketing_agreed: userData.marketing_agreed || false,
      created_at: userData.created_at || new Date().toISOString(),
      updated_at: userData.updated_at || new Date().toISOString(),
      last_login: new Date().toISOString(), // 최초 로그인 시간 설정
    };
    
    // 소셜 ID 추가
    if (provider === 'google' && userData.google_id) {
      newUserData.google_id = userData.google_id;
    } else if (provider === 'kakao' && userData.kakao_id) {
      newUserData.kakao_id = userData.kakao_id;
    } else if (provider === 'naver' && userData.naver_id) {
      newUserData.naver_id = userData.naver_id;
    }
    
    // users 테이블에 사용자 정보 저장
    const { data, error } = await supabase
      .from('users')
      .insert([newUserData])
      .select();
    
    if (error) {
      throw new Error(error.message);
    }
    
    return NextResponse.json({ success: true, data });
    
  } catch (error) {
    const err = error as ApiError;
    return NextResponse.json({ error: err.message || '알 수 없는 오류가 발생했습니다.' }, { status: 500 });
  }
} 