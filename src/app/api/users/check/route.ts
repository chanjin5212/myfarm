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
  email?: string;
}

export async function GET(request: Request) {
  try {
    // 인증 헤더에서 토큰 추출
    const authHeader = request.headers.get('Authorization');
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: '인증 토큰이 필요합니다.' }, { status: 401 });
    }
    
    try {
      // Bearer 접두사 제거
      const token = authHeader.substring(7);
      
      if (!token) {
        return NextResponse.json({ error: '유효한 토큰이 필요합니다.' }, { status: 401 });
      }
      
      // 여기서 토큰 검증 로직 구현 (예: JWT 검증)
      // 실제 구현에서는 토큰의 유효성을 검사하고 사용자 ID를 추출해야 함
      
      // 테스트 목적으로 간단히 토큰을 사용자 ID로 가정
      const userId = token;
      
      try {
        // 사용자 정보 조회
        const { data: user, error } = await supabase
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
        
        try {
          // 마지막 로그인 시간 업데이트
          const now = new Date().toISOString();
          const { data: updatedUser, error: updateError } = await supabase
            .from('users')
            .update({ 
              last_login: now,
              updated_at: now 
            })
            .eq('id', userId)
            .select()
            .single();
            
          if (updateError) {
            console.error('로그인 시간 업데이트 오류:', updateError);
            // 업데이트는 실패했지만, 사용자 정보는 반환
            return NextResponse.json({
              user: user
            });
          }
          
          return NextResponse.json({
            user: updatedUser
          });
        } catch (updateError) {
          console.error('로그인 시간 업데이트 중 예외 발생:', updateError);
          // 업데이트는 실패했지만, 사용자 정보는 반환
          return NextResponse.json({
            user: user
          });
        }
      } catch (dbError) {
        console.error('데이터베이스 조회 중 예외 발생:', dbError);
        return NextResponse.json({ 
          error: '사용자 정보를 조회하는 중 오류가 발생했습니다.',
          details: dbError instanceof Error ? dbError.message : 'Unknown error'
        }, { status: 500 });
      }
    } catch (tokenError) {
      console.error('토큰 처리 중 예외 발생:', tokenError);
      return NextResponse.json({ 
        error: '인증 토큰을 처리하는 중 오류가 발생했습니다.',
        details: tokenError instanceof Error ? tokenError.message : 'Unknown error'
      }, { status: 401 });
    }
  } catch (error) {
    console.error('사용자 확인 중 예외 발생:', error);
    return NextResponse.json({ 
      error: '사용자 확인 중 오류가 발생했습니다.',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

// 토큰을 본문에서 받는 메소드 추가
export async function POST(request: Request) {
  try {
    // 요청 데이터 확인
    const { token, ...checkData } = await request.json();
    
    // provider가 있으면 소셜 로그인 체크 로직으로 진행
    if (checkData.provider) {
      return handleSocialCheck(checkData);
    }
    
    // 토큰이 없는 경우
    if (!token) {
      return NextResponse.json({ error: '인증 토큰이 필요합니다.' }, { status: 401 });
    }
    
    // 토큰 디코딩
    const decodedToken = decodeURIComponent(token);
    
    // 여기서 토큰 검증 로직 구현 (예: JWT 검증)
    // 실제 구현에서는 토큰의 유효성을 검사하고 사용자 ID를 추출해야 함
    
    // 테스트 목적으로 간단히 토큰을 사용자 ID로 가정
    const userId = decodedToken;
    
    // 사용자 정보 조회
    const { data: user, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', userId)
      .maybeSingle();
      
    if (error) {
      return NextResponse.json({ 
        error: '사용자 정보 조회 중 오류가 발생했습니다.', 
        details: error.message 
      }, { status: 500 });
    }
    
    if (!user) {
      return NextResponse.json({ error: '사용자를 찾을 수 없습니다.' }, { status: 404 });
    }
    
    // 마지막 로그인 시간 업데이트
    const now = new Date().toISOString();
    const { data: updatedUser, error: updateError } = await supabase
      .from('users')
      .update({ 
        last_login: now,
        updated_at: now 
      })
      .eq('id', userId)
      .select()
      .single();
      
    if (updateError) {
      return NextResponse.json({ 
        error: '로그인 시간 업데이트 중 오류가 발생했습니다.',
        details: updateError.message 
      }, { status: 500 });
    }
    
    return NextResponse.json({
      user: updatedUser
    });
    
  } catch (error) {
    return NextResponse.json({ 
      error: '사용자 확인 중 오류가 발생했습니다.',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

// 소셜 로그인 체크 로직을 별도 함수로 분리
async function handleSocialCheck(checkData: UserCheckRequest) {
  // 소셜 로그인 제공자 정보 확인
  const provider = checkData.provider || 'google';
  let existingUser = null;
  
  // 먼저 이메일로 사용자 조회 시도
  if (checkData.email) {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('email', checkData.email)
        .maybeSingle();
        
      if (error) {
        return NextResponse.json({ 
          error: '사용자 정보 조회 중 오류가 발생했습니다.',
          details: error.message,
          code: error.code 
        }, { status: 500 });
      }
      
      existingUser = data;
      
      // 기존 사용자가 있는 경우, 해당 소셜 ID가 없다면 업데이트
      if (existingUser) {
        const updateData: Record<string, string | boolean | null> = {
          last_login: new Date().toISOString(),
          updated_at: new Date().toISOString()
        };
        
        // 소셜 ID 업데이트
        if (provider === 'google' && checkData.google_id && !existingUser.google_id) {
          updateData.google_id = checkData.google_id;
        } else if (provider === 'kakao' && checkData.kakao_id && !existingUser.kakao_id) {
          updateData.kakao_id = checkData.kakao_id;
        } else if (provider === 'naver' && checkData.naver_id && !existingUser.naver_id) {
          updateData.naver_id = checkData.naver_id;
        }
        
        const { data: updatedUser, error: updateError } = await supabase
          .from('users')
          .update(updateData)
          .eq('id', existingUser.id)
          .select()
          .single();
          
        if (updateError) {
          return NextResponse.json({ 
            error: '사용자 정보 업데이트 중 오류가 발생했습니다.',
            details: updateError.message 
          }, { status: 500 });
        }
        
        // 업데이트된 사용자 정보 사용
        existingUser = updatedUser;
        
        return NextResponse.json({
          exists: true,
          user: existingUser
        });
      }
    } catch (dbError) {
      return NextResponse.json({ 
        error: 'Supabase 쿼리 실행 중 오류가 발생했습니다.',
        details: dbError instanceof Error ? dbError.message : 'Unknown error'
      }, { status: 500 });
    }
  }
  
  // 이메일로 검색된 사용자가 없는 경우, 소셜 ID로 검색
  if (!existingUser) {
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
  }
  
  return NextResponse.json({
    exists: !!existingUser,
    user: existingUser || null
  });
} 