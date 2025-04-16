import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Supabase 클라이언트 초기화
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const supabase = createClient(supabaseUrl, supabaseServiceKey);

// 배송지 목록 조회
export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const userId = url.searchParams.get('userId');
    
    if (!userId) {
      return NextResponse.json({ error: '사용자 ID가 필요합니다.', addresses: [] }, { status: 200 });
    }
    
    console.log('배송지 목록 조회 요청:', userId);
    
    // 사용자 존재 여부 및 기본 정보 확인
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('id, name, phone_number, postcode, address, detail_address')
      .eq('id', userId)
      .single();
      
    if (userError) {
      console.error('사용자 정보 조회 오류:', userError);
      return NextResponse.json({ 
        error: '유효하지 않은 사용자입니다.',
        addresses: [] 
      }, { status: 200 });
    }
    
    // 사용자 정보 로그 출력
    console.log('사용자 정보:', userData);
    
    // 사용자의 배송지 목록 조회
    const { data: addresses, error } = await supabase
      .from('shipping_addresses')
      .select('*')
      .eq('user_id', userId)
      .order('is_default', { ascending: false }) // 기본 배송지가 맨 위로
      .order('created_at', { ascending: false }); // 최신순
      
    if (error) {
      console.error('배송지 목록 조회 오류:', error);
      return NextResponse.json({ 
        error: '배송지 목록을 조회할 수 없습니다.',
        addresses: [] 
      }, { status: 200 });
    }
    
    // 안전하게 배열 확인
    const addressList = addresses || [];
    console.log('기존 배송지 목록:', addressList.length);
    
    // 모든 배송지에 default_address 필드 추가 (기본값: false)
    const addressesWithFlags = addressList.map(addr => ({
      ...addr,
      default_address: false
    }));
    
    // 최종 결과 배열 준비
    let result = [...addressesWithFlags];
    
    // 사용자 기본 주소가 있으면 목록 맨 앞에 추가 (가상 객체로, 저장하지 않음)
    if (userData && userData.address) {
      // 이미 같은 주소가 배송지 목록에 있는지 확인
      const userBasicAddressExists = addressList.some(addr => 
        addr.address === userData.address && 
        addr.detail_address === userData.detail_address
      );
      
      if (!userBasicAddressExists) {
        // 사용자 기본 주소를 가상 객체로 목록에 추가
        const userDefaultAddress = {
          id: `user-default-${userId}`, // 가상 ID
          user_id: userId,
          recipient_name: userData.name || '사용자',
          phone: userData.phone_number || '',
          address: userData.address,
          detail_address: userData.detail_address || '',
          postcode: userData.postcode || '',
          is_default: true, // 기본 배송지로 표시
          memo: '내 기본 주소',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          default_address: true, // users 테이블에서 가져온 주소임을 표시
          is_editable: false, // 수정 불가능
          is_deletable: false, // 삭제 불가능
          note: "*마이페이지에서 수정 가능합니다", // 추가 설명
          type: "user_default_address", // 주소 유형 (사용자 기본 주소)
          display_name: userData.name || '사용자' // 화면에 표시할 이름을 사용자의 실제 이름으로 설정
        };
        
        // 결과 배열 맨 앞에 추가
        result.unshift(userDefaultAddress);
        console.log('사용자 기본 주소를 가상 객체로 추가함');
      } else {
        // 기존 주소 중 사용자 기본 주소와 일치하는 주소가 있을 경우
        console.log('사용자 기본 주소가 배송지 목록에 존재함');
        
        // 모든 주소에 default_address 플래그 추가 (사용자 기본 주소인 경우만 true)
        result = result.map(addr => {
          const isUserDefault = addr.address === userData.address && 
                               addr.detail_address === userData.detail_address;
          return {
            ...addr,
            default_address: isUserDefault, // users 테이블 주소와 일치하는 경우만 true
            // 사용자 기본 주소와 일치하면 display_name 추가
            display_name: isUserDefault ? userData.name || '사용자' : addr.display_name,
            // 기본 배송지로 표시
            is_default: isUserDefault ? true : addr.is_default,
            // 사용자 기본 주소인 경우 추가 플래그
            is_editable: isUserDefault ? false : true,
            is_deletable: isUserDefault ? false : true,
            note: isUserDefault ? "*마이페이지에서 수정 가능합니다" : "",
            type: isUserDefault ? "user_default_address" : "shipping_address"
          };
        });
      }
    } else {
      console.log('사용자에게 주소 정보가 없음');
    }
    
    // 최종 배송지 목록 출력
    console.log('최종 반환 배송지 수:', result.length);
    
    return NextResponse.json({ addresses: result });
    
  } catch (error) {
    console.error('배송지 목록 조회 처리 오류:', error);
    return NextResponse.json({ 
      error: '서버 오류가 발생했습니다.',
      addresses: [] 
    }, { status: 200 });
  }
}

// 신규 배송지 등록
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, recipient_name, phone, address, detail_address, is_default, memo } = body;
    
    if (!userId || !recipient_name || !phone || !address) {
      return NextResponse.json(
        { error: '필수 정보가 누락되었습니다. (받는 사람, 연락처, 주소는 필수)' }, 
        { status: 400 }
      );
    }
    
    // 사용자 존재 여부 확인
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('id')
      .eq('id', userId)
      .single();
      
    if (userError || !userData) {
      console.error('사용자 정보 조회 오류:', userError);
      return NextResponse.json({ error: '유효하지 않은 사용자입니다.' }, { status: 401 });
    }
    
    // 기본 배송지로 설정하면 기존 기본 배송지 해제
    if (is_default) {
      const { error: updateError } = await supabase
        .from('shipping_addresses')
        .update({ is_default: false })
        .eq('user_id', userId)
        .eq('is_default', true);
        
      if (updateError) {
        console.error('기존 기본 배송지 해제 오류:', updateError);
      }
    }
    
    // 사용자 기본 주소 업데이트 (사용자가 명시적으로 기본 주소로 설정했을 경우)
    if (is_default) {
      // 사용자 테이블의 주소 정보도 업데이트
      const { error: userUpdateError } = await supabase
        .from('users')
        .update({
          address: address,
          detail_address: detail_address || '',
          updated_at: new Date().toISOString()
        })
        .eq('id', userId);
        
      if (userUpdateError) {
        console.error('사용자 기본 주소 업데이트 오류:', userUpdateError);
      }
    }
    
    // 신규 배송지 등록
    const { data, error } = await supabase
      .from('shipping_addresses')
      .insert({
        user_id: userId,
        recipient_name,
        phone,
        address,
        detail_address,
        is_default: is_default || false,
        memo
      })
      .select()
      .single();
      
    if (error) {
      console.error('배송지 등록 오류:', error);
      return NextResponse.json({ error: '배송지를 등록할 수 없습니다.' }, { status: 500 });
    }
    
    return NextResponse.json(
      { message: '배송지가 성공적으로 등록되었습니다.', address: data },
      { status: 201 }
    );
    
  } catch (error) {
    console.error('배송지 등록 처리 오류:', error);
    return NextResponse.json({ error: '서버 오류가 발생했습니다.' }, { status: 500 });
  }
} 