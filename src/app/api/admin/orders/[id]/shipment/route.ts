import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import * as jwt from 'jsonwebtoken';
import { gql } from "graphql-request";
import { DeliveryTrackerGraphQLClient } from "@/lib/DeliveryTrackerGraphQLClient";
import { addDays } from 'date-fns';

// Supabase 클라이언트 초기화
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

// JWT Secret
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

// 배송 상태 조회 쿼리
const TRACK_QUERY = gql`
  query Track(
    $carrierId: ID!,
    $trackingNumber: String!
  ) {
    track(
      carrierId: $carrierId,
      trackingNumber: $trackingNumber
    ) {
      lastEvent {
        time
        status {
          code
          name
        }
      }
    }
  }
`;

// 배송 상태 웹훅 등록 쿼리
const REGISTER_WEBHOOK_QUERY = gql`
  mutation RegisterTrackWebhook(
    $input: RegisterTrackWebhookInput!
  ) {
    registerTrackWebhook(input: $input)
  }
`;

// 배송 상태 코드를 시스템 상태로 변환
const mapDeliveryStatusToOrderStatus = (statusCode: string): string => {
  switch (statusCode) {
    case 'DELIVERED':
      return 'delivered';
    case 'IN_TRANSIT':
    case 'OUT_FOR_DELIVERY':
    case 'ATTEMPT_FAIL':
    case 'AVAILABLE_FOR_PICKUP':
    case 'EXCEPTION':
      return 'shipping';
    case 'AT_PICKUP':
    case 'INFORMATION_RECEIVED':
    case 'UNKNOWN':
    case 'NOT_FOUND':
      return 'preparing';
    default:
      return 'preparing';
  }
};

// 48시간 후의 ISO8601 형식 날짜-시간 문자열 생성
const getExpirationTime = (): string => {
  const expirationDate = addDays(new Date(), 2); // 현재로부터 48시간(2일) 후
  return expirationDate.toISOString();
};

// 웹훅 등록 함수
const registerWebhook = async (carrierId: string, trackingNumber: string): Promise<boolean> => {
  try {
    console.log(`[웹훅 등록] 시작 - 택배사: ${carrierId}, 송장번호: ${trackingNumber}`);
    
    const clientId = process.env.NEXT_PUBLIC_DELIVERY_TRACKER_CLIENT_ID;
    const clientSecret = process.env.NEXT_PUBLIC_DELIVERY_TRACKER_CLIENT_SECRET;
    const webhookUrl = process.env.DELIVERY_TRACKER_WEBHOOK_URL;
    
    if (!clientId || !clientSecret || !webhookUrl) {
      console.error('[웹훅 등록] 환경 변수 누락:', { 
        hasClientId: !!clientId, 
        hasClientSecret: !!clientSecret, 
        hasWebhookUrl: !!webhookUrl 
      });
      return false;
    }
    
    const client = new DeliveryTrackerGraphQLClient(clientId, clientSecret);
    
    // 웹훅 만료 시간 (48시간 후)
    const expirationTime = getExpirationTime();
    
    const response = await client.request(REGISTER_WEBHOOK_QUERY, {
      input: {
        carrierId,
        trackingNumber,
        callbackUrl: webhookUrl,
        expirationTime
      }
    });
    
    console.log('[웹훅 등록] 응답:', JSON.stringify(response, null, 2));
    return true;
  } catch (error) {
    console.error('[웹훅 등록] 오류:', error);
    return false;
  }
};

// 배송 상태 조회 함수
const fetchDeliveryStatus = async (carrierId: string, trackingNumber: string): Promise<{ statusCode: string, orderStatus: string }> => {
  try {
    console.log(`[배송 상태 조회] 시작 - 택배사: ${carrierId}, 송장번호: ${trackingNumber}`);
    
    const client = new DeliveryTrackerGraphQLClient(
      process.env.NEXT_PUBLIC_DELIVERY_TRACKER_CLIENT_ID || "",
      process.env.NEXT_PUBLIC_DELIVERY_TRACKER_CLIENT_SECRET || ""
    );

    const response: any = await client.request(TRACK_QUERY, {
      carrierId,
      trackingNumber
    });

    console.log('[배송 상태 조회] API 응답:', JSON.stringify(response, null, 2));

    if (response?.track?.lastEvent?.status?.code) {
      const statusCode = response.track.lastEvent.status.code;
      const orderStatus = mapDeliveryStatusToOrderStatus(statusCode);
      console.log(`[배송 상태 조회] 상태 코드 매핑: ${statusCode} -> ${orderStatus}`);
      return {
        statusCode,
        orderStatus
      };
    }
    
    // 데이터는 있지만 상태 코드가 없는 경우
    console.log('[배송 상태 조회] 상태 코드 없음, UNKNOWN으로 처리');
    return {
      statusCode: 'UNKNOWN',
      orderStatus: mapDeliveryStatusToOrderStatus('UNKNOWN')
    };
  } catch (error: any) {
    console.error('배송 상태 조회 오류:', error);
    
    // 에러 응답에 대한 상세 로깅
    if (error.response) {
      console.log('[배송 상태 조회] 에러 응답:', JSON.stringify(error.response, null, 2));
    }
    
    // 특정 에러 메시지 패턴 감지
    if (error.response?.errors && error.response.errors.length > 0) {
      const graphqlError = error.response.errors[0];
      console.log('[배송 상태 조회] GraphQL 에러:', JSON.stringify(graphqlError, null, 2));
      
      if (
        graphqlError.message.includes('운송장 미등록') || 
        graphqlError.message.includes('상품을 준비중') || 
        graphqlError.extensions?.code === 'NOT_FOUND'
      ) {
        console.log('[배송 상태 조회] NOT_FOUND 에러 감지');
        const orderStatus = mapDeliveryStatusToOrderStatus('NOT_FOUND');
        console.log(`[배송 상태 조회] NOT_FOUND -> 주문 상태: ${orderStatus}`);
        return {
          statusCode: 'NOT_FOUND',
          orderStatus
        };
      }
    }
    
    // 기타 에러는 UNKNOWN으로 처리
    console.log('[배송 상태 조회] 기타 에러, UNKNOWN으로 처리');
    return {
      statusCode: 'UNKNOWN',
      orderStatus: mapDeliveryStatusToOrderStatus('UNKNOWN')
    };
  }
};

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

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // 관리자 인증
    const authResult = await verifyAdminToken(request);
    if (!authResult.isValid) {
      return NextResponse.json(
        { error: authResult.error },
        { status: 401 }
      );
    }

    const { id: orderId } = await params;
    
    if (!orderId) {
      return NextResponse.json(
        { error: '주문 ID가 필요합니다' },
        { status: 400 }
      );
    }

    // 요청 본문 파싱
    const { tracking_number, carrier, carrier_name, status = 'shipped' } = await request.json();
    
    if (!tracking_number) {
      return NextResponse.json(
        { error: '송장번호가 필요합니다' },
        { status: 400 }
      );
    }

    if (!carrier) {
      return NextResponse.json(
        { error: '택배사 정보가 필요합니다' },
        { status: 400 }
      );
    }

    // 주문 정보 조회 (존재하는지 확인)
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .select('*')
      .eq('id', orderId.toString())
      .single();
    
    if (orderError || !order) {
      console.error('주문 정보 조회 오류:', orderError);
      return NextResponse.json(
        { error: '주문 정보를 가져오는데 실패했습니다' },
        { status: 500 }
      );
    }

    // 배송 추적 API를 통해 현재 배송 상태 조회
    const { statusCode, orderStatus } = await fetchDeliveryStatus(carrier, tracking_number);
    console.log(`[송장 정보 처리] 배송 상태 조회 결과 - 상태 코드: ${statusCode}, 주문 상태: ${orderStatus}`);
    
    // 배송 상태가 null이면 기본값 사용
    const shipmentStatus = statusCode;
    
    // 기존 송장 정보 조회
    const { data: existingShipments, error: existingError } = await supabase
      .from('shipments')
      .select('*')
      .eq('order_id', orderId.toString())
      .order('created_at', { ascending: false })
      .limit(1);

    if (existingError) {
      console.error('기존 송장 정보 조회 오류:', existingError);
      return NextResponse.json(
        { error: '송장 정보 조회에 실패했습니다' },
        { status: 500 }
      );
    }

    let result;
    if (existingShipments && existingShipments.length > 0) {
      // 기존 송장 정보가 있으면 업데이트
      const { data: shipment, error: updateError } = await supabase
        .from('shipments')
        .update({
          tracking_number,
          carrier,
          carrier_name,
          status: statusCode, // 원본 상태 코드 저장
          updated_at: new Date().toISOString()
        })
        .eq('id', existingShipments[0].id)
        .select()
        .single();
      
      if (updateError) {
        console.error('송장 정보 업데이트 오류:', updateError);
        return NextResponse.json(
          { error: '송장 정보 업데이트에 실패했습니다' },
          { status: 500 }
        );
      }
      result = shipment;
    } else {
      // 기존 송장 정보가 없으면 새로 추가
      const { data: shipment, error: insertError } = await supabase
        .from('shipments')
        .insert({
          order_id: orderId.toString(),
          tracking_number,
          carrier,
          carrier_name,
          status: statusCode, // 원본 상태 코드 저장
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .select()
        .single();
      
      if (insertError) {
        console.error('송장 정보 추가 오류:', insertError);
        return NextResponse.json(
          { error: '송장 정보 추가에 실패했습니다' },
          { status: 500 }
        );
      }
      result = shipment;
    }

    // 주문 상태 업데이트
    console.log(`[주문 상태 업데이트] 시작 - 주문 ID: ${orderId}, 새 상태: ${orderStatus}`);
    console.log(`[주문 상태 업데이트] 현재 주문 정보:`, JSON.stringify(order, null, 2));

    try {
      // 주문 ID 다시 확인
      console.log(`[주문 상태 업데이트] 주문 ID 타입: ${typeof orderId}, 값: ${orderId}`);
      
      const { data: updatedOrder, error: updateOrderError } = await supabase
        .from('orders')
        .update({
          status: orderStatus,
          updated_at: new Date().toISOString()
        })
        .eq('id', orderId.toString())
        .select()
        .single();
      
      if (updateOrderError) {
        console.error('주문 상태 업데이트 오류:', updateOrderError);
        // 주문 상태 업데이트 실패해도 송장 정보는 추가/수정 되었으므로 에러 반환하지 않음
      } else {
        console.log(`[주문 상태 업데이트] 완료 - 이전 상태: ${order.status}, 새 상태: ${orderStatus}`);
        console.log(`[주문 상태 업데이트] 업데이트된 주문 정보:`, JSON.stringify(updatedOrder, null, 2));
      }
    } catch (updateError) {
      console.error('[주문 상태 업데이트] 예외 발생:', updateError);
    }
    
    // Delivery Tracker Webhook 등록
    const webhookRegistered = await registerWebhook(carrier, tracking_number);
    console.log(`[웹훅 등록] 결과: ${webhookRegistered ? '성공' : '실패'}`);

    return NextResponse.json({
      success: true,
      message: existingShipments && existingShipments.length > 0 ? '송장 정보가 수정되었습니다' : '송장 정보가 추가되었습니다',
      shipment: result,
      delivery_status: {
        code: statusCode,
        order_status: orderStatus
      },
      webhook_registered: webhookRegistered
    });
    
  } catch (error) {
    console.error('송장 정보 처리 에러:', error);
    return NextResponse.json(
      { error: '송장 정보 처리에 실패했습니다' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // 관리자 인증
    const authResult = await verifyAdminToken(request);
    if (!authResult.isValid) {
      return NextResponse.json(
        { error: authResult.error },
        { status: 401 }
      );
    }

    const { id: orderId } = await params;
    
    if (!orderId) {
      return NextResponse.json(
        { error: '주문 ID가 필요합니다' },
        { status: 400 }
      );
    }

    // URL에서 shipment_id 추출
    const url = new URL(request.url);
    const shipmentId = url.searchParams.get('shipment_id');

    // shipment_id가 없는 경우 에러 반환
    if (!shipmentId) {
      return NextResponse.json(
        { error: '송장 ID가 필요합니다' },
        { status: 400 }
      );
    }

    // 송장 정보 삭제
    const { error: deleteError } = await supabase
      .from('shipments')
      .delete()
      .eq('id', shipmentId)
      .eq('order_id', orderId.toString());
    
    if (deleteError) {
      console.error('송장 정보 삭제 오류:', deleteError);
      return NextResponse.json(
        { error: '송장 정보 삭제에 실패했습니다' },
        { status: 500 }
      );
    }

    // 주문 상태를 'paid'로 업데이트 (송장이 없으므로 배송 전 상태로 되돌림)
    const { error: updateOrderError } = await supabase
      .from('orders')
      .update({
        status: 'paid',
        updated_at: new Date().toISOString()
      })
      .eq('id', orderId.toString());
    
    if (updateOrderError) {
      console.error('주문 상태 업데이트 오류:', updateOrderError);
      // 주문 상태 업데이트 실패해도 송장 정보는 삭제되었으므로 에러 반환하지 않음
    }

    return NextResponse.json({
      success: true,
      message: '송장 정보가 삭제되었습니다'
    });
    
  } catch (error) {
    console.error('송장 정보 삭제 에러:', error);
    return NextResponse.json(
      { error: '송장 정보 삭제에 실패했습니다' },
      { status: 500 }
    );
  }
} 