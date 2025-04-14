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
    let addressList = addresses || [];
    console.log('기존 배송지 목록:', addressList.length);
    
    // 사용자 기본 주소 확인을 위한 변수
    let userBasicAddressExists = false;
    
    // 각 배송지에 default_user_address 가상 필드 추가 (API 응답용)
    if (addressList.length > 0) {
      // 사용자 정보와 일치하는 주소가 있는지 확인
      userBasicAddressExists = addressList.some(addr => 
        addr.address === userData.address && 
        addr.detail_address === userData.detail_address
      );
      
      // 각 주소에 default_user_address 가상 필드 추가
      addressList = addressList.map(addr => ({
        ...addr,
        default_user_address: addr.address === userData.address && 
                              addr.detail_address === userData.detail_address
      }));
    }
    
    // 사용자 기본 주소가 배송지 목록에 없고, users 테이블에 주소 정보가 있는 경우
    if (!userBasicAddressExists && userData && userData.address) {
      console.log('사용자 기본 주소 추가 시도:', userData.address);
      
      try {
        // 사용자 기본 주소 추가
        const { data: newAddress, error: insertError } = await supabase
          .from('shipping_addresses')
          .insert({
            user_id: userId,
            recipient_name: userData.name || '사용자',
            phone: userData.phone_number || '',
            address: userData.address,
            detail_address: userData.detail_address || '',
            is_default: addressList.length === 0, // 첫 배송지라면 기본 배송지로 설정
            memo: '기본 주소'
          })
          .select()
          .single();
          
        if (insertError) {
          console.error('기본 주소 추가 오류:', insertError);
        } else if (newAddress) {
          console.log('새 기본 주소 추가됨:', newAddress.id);
          // 새로 추가된 주소에 default_user_address 가상 필드 추가
          addressList.unshift({
            ...newAddress,
            default_user_address: true
          });
        }
      } catch (insertError) {
        console.error('기본 주소 추가 예외:', insertError);
      }
    } else {
      console.log('사용자 기본 주소 이미 있거나 주소 정보가 없음:', userBasicAddressExists ? '있음' : '없음');
    }
    
    // 최종 배송지 목록 출력
    console.log('최종 반환 배송지 수:', addressList.length);
    
    return NextResponse.json({ addresses: addressList });
    
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