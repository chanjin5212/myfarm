import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// 환경 변수 가져오기
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

// Supabase 클라이언트 생성
const supabase = createClient(
  supabaseUrl || '',
  supabaseServiceKey || supabaseAnonKey || ''
);

interface UserCheckRequest {
  google_id?: string;
  kakao_id?: string;
  naver_id?: string;
  provider: string;
}

export async function POST(request: Request) {
  try {
    // 요청 데이터 파싱
    const checkData = await request.json() as UserCheckRequest;
    
    // 소셜 로그인 제공자 정보 확인
    const provider = checkData.provider || 'google';
    let existingUser = null;
    
    // 소셜 로그인 제공자별 ID 확인
    if (provider === 'google' && checkData.google_id) {
      try {
        const { data, error } = await supabase
          .from('users')
          .select('*')
          .eq('google_id', checkData.google_id)
          .maybeSingle();
          
        if (error) {
          return NextResponse.json({ 
            error: '사용자 정보 조회 중 오류가 발생했습니다.',
            details: error.message,
            code: error.code 
          }, { status: 500 });
        }
        
        existingUser = data;
        
        // 기존 사용자가 있는 경우 마지막 로그인 시간 업데이트
        if (existingUser) {
          const now = new Date().toISOString();
          const { data: updatedUser, error: updateError } = await supabase
            .from('users')
            .update({ 
              last_login: now,
              updated_at: now 
            })
            .eq('id', existingUser.id)
            .select()
            .single();
            
          if (updateError) {
            return NextResponse.json({ 
              error: '로그인 시간 업데이트 중 오류가 발생했습니다.',
              details: updateError.message 
            }, { status: 500 });
          }
          
          // 업데이트된 사용자 정보 사용
          existingUser = updatedUser;
        }
      } catch (dbError) {
        return NextResponse.json({ 
          error: 'Supabase 쿼리 실행 중 오류가 발생했습니다.',
          details: dbError instanceof Error ? dbError.message : 'Unknown error'
        }, { status: 500 });
      }
    } else if (provider === 'kakao' && checkData.kakao_id) {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('kakao_id', checkData.kakao_id)
        .maybeSingle();
        
      if (error) {
        return NextResponse.json({ error: '사용자 정보 조회 중 오류가 발생했습니다.' }, { status: 500 });
      }
      
      existingUser = data;
      
      // 기존 사용자가 있는 경우 마지막 로그인 시간 업데이트
      if (existingUser) {
        const now = new Date().toISOString();
        const { data: updatedUser, error: updateError } = await supabase
          .from('users')
          .update({ 
            last_login: now,
            updated_at: now 
          })
          .eq('id', existingUser.id)
          .select()
          .single();
          
        if (updateError) {
          return NextResponse.json({ 
            error: '로그인 시간 업데이트 중 오류가 발생했습니다.',
            details: updateError.message 
          }, { status: 500 });
        }
        
        // 업데이트된 사용자 정보 사용
        existingUser = updatedUser;
      }
    } else if (provider === 'naver' && checkData.naver_id) {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('naver_id', checkData.naver_id)
        .maybeSingle();
        
      if (error) {
        return NextResponse.json({ error: '사용자 정보 조회 중 오류가 발생했습니다.' }, { status: 500 });
      }
      
      existingUser = data;
      
      // 기존 사용자가 있는 경우 마지막 로그인 시간 업데이트
      if (existingUser) {
        const now = new Date().toISOString();
        const { data: updatedUser, error: updateError } = await supabase
          .from('users')
          .update({ 
            last_login: now,
            updated_at: now 
          })
          .eq('id', existingUser.id)
          .select()
          .single();
          
        if (updateError) {
          return NextResponse.json({ 
            error: '로그인 시간 업데이트 중 오류가 발생했습니다.',
            details: updateError.message 
          }, { status: 500 });
        }
        
        // 업데이트된 사용자 정보 사용
        existingUser = updatedUser;
      }
    }
    
    return NextResponse.json({
      exists: !!existingUser,
      user: existingUser
    });
    
  } catch (error) {
    return NextResponse.json({ 
      error: '사용자 확인 중 오류가 발생했습니다.',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
} 