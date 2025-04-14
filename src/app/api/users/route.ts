import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { v4 as uuidv4 } from 'uuid';
import bcrypt from 'bcryptjs';

// Supabase 클라이언트 초기화
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

interface UserData {
  id?: string;
  login_id?: string;  // 로그인 아이디
  password?: string;  // 비밀번호
  google_id?: string;  // Google 소셜 ID
  kakao_id?: string;   // 카카오 소셜 ID
  naver_id?: string;   // 네이버 소셜 ID
  provider?: string;   // 소셜 로그인 제공자 (google, kakao, naver)
  email: string;
  name?: string;
  nickname?: string;   // 사용자 닉네임
  avatar_url?: string;
  phone_number?: string; // 휴대폰 번호
  postcode?: string;   // 우편번호
  address?: string;    // 기본주소
  detail_address?: string; // 상세주소
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
  login_id?: string;  // 로그인 아이디
  password?: string;  // 비밀번호
  email: string;
  google_id?: string;
  kakao_id?: string;
  naver_id?: string;
  name?: string;
  nickname?: string;   // 사용자 닉네임
  avatar_url?: string | null;
  phone_number?: string; // 휴대폰 번호
  postcode?: string;   // 우편번호
  address?: string;    // 기본주소
  detail_address?: string; // 상세주소
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
    
    // 비밀번호 정책 검증
    if (userData.password) {
      // 8~16자 검증
      if (userData.password.length < 8 || userData.password.length > 16) {
        return NextResponse.json({ error: '비밀번호는 8~16자여야 합니다.' }, { status: 400 });
      }
      // 대/소문자 포함 검증
      if (!/(?=.*[a-z])(?=.*[A-Z])/.test(userData.password)) {
        return NextResponse.json({ error: '비밀번호는 대문자와 소문자를 모두 포함해야 합니다.' }, { status: 400 });
      }
      // 숫자 포함 검증
      if (!/(?=.*\d)/.test(userData.password)) {
        return NextResponse.json({ error: '비밀번호는 숫자를 포함해야 합니다.' }, { status: 400 });
      }
      // 특수문자 포함 검증
      if (!/(?=.*[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?])/.test(userData.password)) {
        return NextResponse.json({ error: '비밀번호는 특수문자를 포함해야 합니다.' }, { status: 400 });
      }
    }
    
    // 로그인 아이디로 회원가입하는 경우, 중복 확인
    if (userData.login_id) {
      const { data: existingLoginId } = await supabase
        .from('users')
        .select('login_id')
        .eq('login_id', userData.login_id)
        .maybeSingle();
        
      if (existingLoginId) {
        return NextResponse.json({ 
          error: '이미 사용 중인 아이디입니다. 다른 아이디를 사용해주세요.' 
        }, { status: 400 });
      }
    }
    
    // 소셜 ID와 제공자 정보 확인
    const provider = userData.provider || 'google';
    
    // 이메일로 기존 사용자 확인
    const { data: existingUserByEmail } = await supabase
      .from('users')
      .select('*')
      .eq('email', userData.email)
      .maybeSingle();
    
    // 이메일로 검색된 사용자가 있는 경우
    if (existingUserByEmail) {
      const existingUser = existingUserByEmail as ExistingUser;
      const now = new Date().toISOString();
      
      // 업데이트할 데이터 구성
      const updateData: Record<string, string | boolean | null> = {
        updated_at: now,
        last_login: now
      };
      
      // 소셜 ID 업데이트
      if (provider === 'google' && userData.google_id && !existingUser.google_id) {
        updateData.google_id = userData.google_id;
      } else if (provider === 'kakao' && userData.kakao_id && !existingUser.kakao_id) {
        updateData.kakao_id = userData.kakao_id;
      } else if (provider === 'naver' && userData.naver_id && !existingUser.naver_id) {
        updateData.naver_id = userData.naver_id;
      }
      
      // 닉네임이 있으면 업데이트
      if (userData.nickname) {
        updateData.nickname = userData.nickname;
      }
      
      // 아바타 URL이 있으면 업데이트
      if (userData.avatar_url) {
        updateData.avatar_url = userData.avatar_url;
      }
      
      // 사용자 정보 업데이트
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
    
    // 소셜 ID로만 기존 사용자 확인 (이메일로 검색된 사용자가 없는 경우)
    let existingUserBySocialId = null;
    
    // 소셜 로그인 제공자별 ID 확인
    if (provider === 'google' && userData.google_id) {
      const { data } = await supabase
        .from('users')
        .select('*')
        .eq('google_id', userData.google_id)
        .maybeSingle();
      existingUserBySocialId = data as ExistingUser;
    } else if (provider === 'kakao' && userData.kakao_id) {
      const { data } = await supabase
        .from('users')
        .select('*')
        .eq('kakao_id', userData.kakao_id)
        .maybeSingle();
      existingUserBySocialId = data as ExistingUser;  
    } else if (provider === 'naver' && userData.naver_id) {
      const { data } = await supabase
        .from('users')
        .select('*')
        .eq('naver_id', userData.naver_id)
        .maybeSingle();
      existingUserBySocialId = data as ExistingUser;
    }
    
    // 소셜 ID로 검색된 사용자가 있는 경우
    if (existingUserBySocialId) {
      const now = new Date().toISOString();
      // 사용자가 있으면 nickname과 last_login, updated_at만 업데이트
      const updateData = {
        nickname: userData.nickname || existingUserBySocialId.nickname,
        updated_at: now,
        last_login: now
      };
      
      const { data: updatedUser, error: updateError } = await supabase
        .from('users')
        .update(updateData)
        .eq('id', existingUserBySocialId.id)
        .select()
        .single();
        
      if (updateError) {
        console.error('사용자 정보 업데이트 오류:', updateError);
      }
      
      return NextResponse.json({ 
        success: true, 
        data: updatedUser || existingUserBySocialId,
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
      phone_number: userData.phone_number || null,
      postcode: userData.postcode || null,
      address: userData.address || null,
      detail_address: userData.detail_address || null,
      terms_agreed: userData.terms_agreed || false,
      marketing_agreed: userData.marketing_agreed || false,
      created_at: userData.created_at || new Date().toISOString(),
      updated_at: userData.updated_at || new Date().toISOString(),
      last_login: new Date().toISOString(), // 최초 로그인 시간 설정
    };
    
    // 로그인 아이디와 비밀번호 추가 (일반 회원가입인 경우)
    if (userData.login_id) {
      newUserData.login_id = userData.login_id;
    }
    
    if (userData.password) {
      // 비밀번호 해싱 (보안 강화)
      const salt = await bcrypt.genSalt(12); // 높은 보안을 위해 12라운드 솔트 생성
      const hashedPassword = await bcrypt.hash(userData.password, salt);
      newUserData.password = hashedPassword;
    }
    
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

interface UpdateUserData {
  userId: string;
  name?: string | null;
  nickname?: string | null;
  phone_number?: string | null;
  postcode?: string | null;
  address?: string | null;
  detail_address?: string | null;
  marketing_agreed?: boolean;
}

export async function PUT(request: Request) {
  try {
    // 요청 데이터 파싱
    const updateData = await request.json() as UpdateUserData;
    
    // 필수 필드 확인
    if (!updateData.userId) {
      return NextResponse.json({ error: '사용자 ID는 필수 항목입니다.' }, { status: 400 });
    }
    
    // 사용자 존재 여부 확인
    const { data: existingUser, error: userError } = await supabase
      .from('users')
      .select('*')
      .eq('id', updateData.userId)
      .single();
      
    if (userError || !existingUser) {
      return NextResponse.json({ error: '사용자를 찾을 수 없습니다.' }, { status: 404 });
    }
    
    // 업데이트할 데이터 구성
    const updatedFields: Record<string, string | boolean | null> = {
      updated_at: new Date().toISOString()
    };
    
    // 이름이 제공된 경우
    if (updateData.name !== undefined) {
      updatedFields.name = updateData.name;
    }
    
    // 닉네임이 제공된 경우
    if (updateData.nickname !== undefined) {
      updatedFields.nickname = updateData.nickname;
    }
    
    // 휴대폰 번호가 제공된 경우
    if (updateData.phone_number !== undefined) {
      updatedFields.phone_number = updateData.phone_number;
    }
    
    // 우편번호가 제공된 경우
    if (updateData.postcode !== undefined) {
      updatedFields.postcode = updateData.postcode;
    }
    
    // 기본주소가 제공된 경우
    if (updateData.address !== undefined) {
      updatedFields.address = updateData.address;
    }
    
    // 상세주소가 제공된 경우
    if (updateData.detail_address !== undefined) {
      updatedFields.detail_address = updateData.detail_address;
    }
    
    // 마케팅 동의 여부가 제공된 경우
    if (updateData.marketing_agreed !== undefined) {
      updatedFields.marketing_agreed = updateData.marketing_agreed;
    }
    
    // 사용자 정보 업데이트
    const { data, error } = await supabase
      .from('users')
      .update(updatedFields)
      .eq('id', updateData.userId)
      .select();
      
    if (error) {
      throw new Error(error.message);
    }
    
    return NextResponse.json({ 
      success: true, 
      data,
      message: '사용자 정보가 성공적으로 업데이트되었습니다.'
    });
    
  } catch (error) {
    const err = error as ApiError;
    return NextResponse.json({ error: err.message || '알 수 없는 오류가 발생했습니다.' }, { status: 500 });
  }
} 