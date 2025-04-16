import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Supabase 클라이언트 초기화
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const supabase = createClient(supabaseUrl, supabaseServiceKey);

// 배송지 조회
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const addressId = (await params).id;
    
    if (!addressId) {
      return NextResponse.json({ error: '배송지 ID가 필요합니다.' }, { status: 400 });
    }
    
    // 배송지 조회
    const { data: address, error } = await supabase
      .from('shipping_addresses')
      .select('*')
      .eq('id', addressId)
      .single();
      
    if (error) {
      console.error('배송지 조회 오류:', error);
      return NextResponse.json({ error: '배송지를 조회할 수 없습니다.' }, { status: 500 });
    }
    
    if (!address) {
      return NextResponse.json({ error: '존재하지 않는 배송지입니다.' }, { status: 404 });
    }
    
    return NextResponse.json({ address });
    
  } catch (error) {
    console.error('배송지 조회 처리 오류:', error);
    return NextResponse.json({ error: '서버 오류가 발생했습니다.' }, { status: 500 });
  }
}

// 배송지 수정
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const addressId = (await params).id;
    const body = await request.json();
    const { userId, recipient_name, phone, address, detail_address, is_default, memo } = body;
    
    if (!addressId) {
      return NextResponse.json({ error: '배송지 ID가 필요합니다.' }, { status: 400 });
    }
    
    if (!userId) {
      return NextResponse.json({ error: '사용자 ID가 필요합니다.' }, { status: 400 });
    }
    
    // 사용자 정보 조회 (기본 주소 확인용)
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('id, name, phone_number, address, detail_address')
      .eq('id', userId)
      .single();
      
    if (userError) {
      console.error('사용자 정보 조회 오류:', userError);
      return NextResponse.json({ error: '사용자 정보를 불러올 수 없습니다.' }, { status: 500 });
    }
    
    // 배송지 존재 여부 확인
    const { data: existingAddress, error: getError } = await supabase
      .from('shipping_addresses')
      .select('*')
      .eq('id', addressId)
      .single();
      
    if (getError || !existingAddress) {
      console.error('배송지 조회 오류:', getError);
      return NextResponse.json({ error: '존재하지 않는 배송지입니다.' }, { status: 404 });
    }
    
    // 현재 사용자의 배송지인지 확인
    if (existingAddress.user_id !== userId) {
      return NextResponse.json({ error: '접근 권한이 없습니다.' }, { status: 403 });
    }
    
    // 사용자의 기본 주소인 경우 수정 불가 (users 테이블의 주소와 직접 비교)
    const isUserDefaultAddress = 
      userData?.address && 
      existingAddress.address === userData.address && 
      existingAddress.detail_address === userData.detail_address;
    
    if (isUserDefaultAddress) {
      return NextResponse.json({ 
        error: '사용자의 기본 주소는 마이페이지의 개인정보 수정에서만 변경할 수 있습니다.' 
      }, { status: 403 });
    }
    
    // 유효성 검사
    if (!recipient_name || !phone || !address) {
      return NextResponse.json(
        { error: '필수 정보가 누락되었습니다. (받는 사람, 연락처, 주소는 필수)' }, 
        { status: 400 }
      );
    }
    
    // 기본 배송지로 설정하면 기존 기본 배송지 해제
    if (is_default && !existingAddress.is_default) {
      const { error: updateError } = await supabase
        .from('shipping_addresses')
        .update({ is_default: false })
        .eq('user_id', userId)
        .eq('is_default', true);
        
      if (updateError) {
        console.error('기존 기본 배송지 해제 오류:', updateError);
      }
    }
    
    // 배송지 정보 업데이트
    const updateData: any = {
      recipient_name,
      phone,
      address,
      updated_at: new Date().toISOString()
    };
    
    // 선택적 필드 업데이트
    if (detail_address !== undefined) updateData.detail_address = detail_address;
    if (is_default !== undefined) updateData.is_default = is_default;
    if (memo !== undefined) updateData.memo = memo;
    
    const { data: updatedAddress, error } = await supabase
      .from('shipping_addresses')
      .update(updateData)
      .eq('id', addressId)
      .select()
      .single();
      
    if (error) {
      console.error('배송지 수정 오류:', error);
      return NextResponse.json({ error: '배송지를 수정할 수 없습니다.' }, { status: 500 });
    }
    
    return NextResponse.json({ 
      message: '배송지가 성공적으로 수정되었습니다.',
      address: updatedAddress 
    });
    
  } catch (error) {
    console.error('배송지 수정 처리 오류:', error);
    return NextResponse.json({ error: '서버 오류가 발생했습니다.' }, { status: 500 });
  }
}

// 배송지 삭제
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const addressId = (await params).id;
    const url = new URL(request.url);
    const userId = url.searchParams.get('userId');
    
    if (!addressId) {
      return NextResponse.json({ error: '배송지 ID가 필요합니다.' }, { status: 400 });
    }
    
    if (!userId) {
      return NextResponse.json({ error: '사용자 ID가 필요합니다.' }, { status: 400 });
    }
    
    // 사용자 정보 조회 (기본 주소 확인용)
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('id, name, phone_number, address, detail_address')
      .eq('id', userId)
      .single();
      
    if (userError) {
      console.error('사용자 정보 조회 오류:', userError);
      return NextResponse.json({ error: '사용자 정보를 불러올 수 없습니다.' }, { status: 500 });
    }
    
    // 배송지 존재 여부 확인
    const { data: existingAddress, error: getError } = await supabase
      .from('shipping_addresses')
      .select('*')
      .eq('id', addressId)
      .single();
      
    if (getError || !existingAddress) {
      console.error('배송지 조회 오류:', getError);
      return NextResponse.json({ error: '존재하지 않는 배송지입니다.' }, { status: 404 });
    }
    
    // 현재 사용자의 배송지인지 확인
    if (existingAddress.user_id !== userId) {
      return NextResponse.json({ error: '접근 권한이 없습니다.' }, { status: 403 });
    }
    
    // 사용자의 기본 주소인 경우 삭제 불가 (users 테이블의 주소와 직접 비교)
    const isUserDefaultAddress = 
      userData?.address && 
      existingAddress.address === userData.address && 
      existingAddress.detail_address === userData.detail_address;
    
    if (isUserDefaultAddress) {
      return NextResponse.json({ 
        error: '사용자의 기본 주소는 삭제할 수 없습니다. 마이페이지의 개인정보 수정에서 주소를 변경해주세요.' 
      }, { status: 403 });
    }
    
    // 배송지 삭제
    const { error } = await supabase
      .from('shipping_addresses')
      .delete()
      .eq('id', addressId);
      
    if (error) {
      console.error('배송지 삭제 오류:', error);
      return NextResponse.json({ error: '배송지를 삭제할 수 없습니다.' }, { status: 500 });
    }
    
    return NextResponse.json({ 
      message: '배송지가 성공적으로 삭제되었습니다.' 
    });
    
  } catch (error) {
    console.error('배송지 삭제 처리 오류:', error);
    return NextResponse.json({ error: '서버 오류가 발생했습니다.' }, { status: 500 });
  }
} 