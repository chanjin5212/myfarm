import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { gql } from "graphql-request";
import { DeliveryTrackerGraphQLClient } from "@/lib/DeliveryTrackerGraphQLClient";

// Supabase 클라이언트 초기화
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

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
        description
      }
    }
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

export async function POST(request: NextRequest) {
  try {
    console.log('[Delivery Tracker Webhook] 콜백 수신');
    
    // 요청 본문 파싱
    const { carrierId, trackingNumber } = await request.json();
    
    if (!carrierId || !trackingNumber) {
      console.error('[Webhook] 필수 파라미터 누락:', { carrierId, trackingNumber });
      return NextResponse.json(
        { error: '필수 파라미터가 누락되었습니다' },
        { status: 400 }
      );
    }
    
    console.log(`[Webhook] 배송 상태 업데이트 - 택배사: ${carrierId}, 송장번호: ${trackingNumber}`);
    
    // 배송 정보 조회
    const { data: shipments, error: shipmentError } = await supabase
      .from('shipments')
      .select('id, order_id')
      .eq('carrier', carrierId)
      .eq('tracking_number', trackingNumber)
      .order('created_at', { ascending: false });
    
    if (shipmentError) {
      console.error('[Webhook] 송장 정보 조회 오류:', shipmentError);
      return NextResponse.json(
        { error: '송장 정보 조회에 실패했습니다' },
        { status: 500 }
      );
    }
    
    if (!shipments || shipments.length === 0) {
      console.error('[Webhook] 송장 정보를 찾을 수 없음:', { carrierId, trackingNumber });
      return NextResponse.json(
        { error: '해당 송장 정보를 찾을 수 없습니다' },
        { status: 404 }
      );
    }
    
    // 현재 배송 상태 조회
    const client = new DeliveryTrackerGraphQLClient(
      process.env.NEXT_PUBLIC_DELIVERY_TRACKER_CLIENT_ID || "",
      process.env.NEXT_PUBLIC_DELIVERY_TRACKER_CLIENT_SECRET || ""
    );
    
    const response: any = await client.request(TRACK_QUERY, {
      carrierId,
      trackingNumber
    });
    
    console.log('[Webhook] 배송 상태 조회 결과:', JSON.stringify(response, null, 2));
    
    // 상태 코드 및 주문 상태 매핑
    let statusCode = 'UNKNOWN';
    if (response?.track?.lastEvent?.status?.code) {
      statusCode = response.track.lastEvent.status.code;
    }
    
    const orderStatus = mapDeliveryStatusToOrderStatus(statusCode);
    console.log(`[Webhook] 상태 매핑: ${statusCode} -> ${orderStatus}`);
    
    // 배송 정보 업데이트
    const { error: updateShipmentError } = await supabase
      .from('shipments')
      .update({
        status: statusCode,
        status_name: response?.track?.lastEvent?.status?.name || null,
        last_status_description: response?.track?.lastEvent?.description || null,
        updated_at: new Date().toISOString()
      })
      .eq('id', shipments[0].id);
    
    if (updateShipmentError) {
      console.error('[Webhook] 송장 정보 업데이트 오류:', updateShipmentError);
      return NextResponse.json(
        { error: '송장 정보 업데이트에 실패했습니다' },
        { status: 500 }
      );
    }
    
    // 주문 상태 업데이트
    const { error: updateOrderError } = await supabase
      .from('orders')
      .update({
        status: orderStatus,
        updated_at: new Date().toISOString()
      })
      .eq('id', shipments[0].order_id);
    
    if (updateOrderError) {
      console.error('[Webhook] 주문 상태 업데이트 오류:', updateOrderError);
      return NextResponse.json(
        { error: '주문 상태 업데이트에 실패했습니다' },
        { status: 500 }
      );
    }
    
    console.log(`[Webhook] 배송 및 주문 상태 업데이트 완료 - 주문 ID: ${shipments[0].order_id}, 상태: ${orderStatus}`);
    
    return NextResponse.json({
      success: true,
      message: '배송 상태가 업데이트되었습니다',
      delivery_status: {
        code: statusCode,
        order_status: orderStatus
      }
    });
    
  } catch (error) {
    console.error('[Webhook] 처리 오류:', error);
    return NextResponse.json(
      { error: '웹훅 처리에 실패했습니다' },
      { status: 500 }
    );
  }
} 