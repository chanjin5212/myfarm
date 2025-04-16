import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// 환경 변수에서 토스 페이먼츠 시크릿 키 가져오기
const TOSS_SECRET_KEY = process.env.TOSS_PAYMENTS_SECRET_KEY;
const TOSS_API_URL = 'https://api.tosspayments.com/v1/payments';

export async function POST(request: NextRequest) {
  try {
    // 요청 본문에서 필요한 정보 추출
    const body = await request.json();
    const { paymentKey, orderId, amount } = body;

    if (!paymentKey || !orderId || !amount) {
      return NextResponse.json(
        { error: '필수 파라미터가 누락되었습니다.' },
        { status: 400 }
      );
    }
    
    // 인증 헤더에서 토큰 추출
    const authHeader = request.headers.get('Authorization');
    if (!authHeader) {
      return NextResponse.json(
        { error: '인증 정보가 필요합니다.' },
        { status: 401 }
      );
    }
    
    // Bearer 토큰에서 사용자 ID 추출
    let userId;
    try {
      const token = authHeader.replace('Bearer ', '');
      // URL 인코딩 디코드
      userId = decodeURIComponent(token);
      console.log('추출된 사용자 ID:', userId);
    } catch (error) {
      console.error('토큰 디코딩 오류:', error);
      return NextResponse.json(
        { error: '잘못된 인증 형식입니다.' },
        { status: 401 }
      );
    }
    
    // Supabase 클라이언트 초기화
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
    const supabase = createClient(supabaseUrl, supabaseKey);
    
    // 사용자 확인 시도 (오류가 발생해도 계속 진행)
    try {
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('id, login_id, name, email')
        .eq('id', userId)
        .single();
      
      if (userError) {
        console.warn('사용자 조회 실패, 계속 진행합니다:', userError);
      } else {
        console.log('인증된 사용자:', userData);
      }
    } catch (userCheckError) {
      console.warn('사용자 확인 중 오류 발생, 계속 진행합니다:', userCheckError);
    }

    // 주문 정보 검증 (user_id 확인 없이 진행)
    const { data: orderData, error: orderError } = await supabase
      .from('orders')
      .select('*, order_items(*)')
      .eq('id', orderId)
      .single();

    if (orderError || !orderData) {
      console.error('주문 조회 실패:', orderError);
      return NextResponse.json(
        { error: '주문 정보를 찾을 수 없습니다.' },
        { status: 404 }
      );
    }
    
    // 주문이 이미 결제되었는지 확인
    if (orderData.status === 'paid') {
      console.log('이미 결제된 주문입니다:', orderData);
      return NextResponse.json({
        success: true,
        message: '이미 결제가 완료된 주문입니다.',
        orderId: orderId,
        paymentKey: orderData.payment_key,
      });
    }

    // 주문 금액 검증
    if (orderData.total_amount !== amount) {
      console.error(
        `금액 불일치: 주문금액 ${orderData.total_amount}, 결제금액 ${amount}`
      );
      return NextResponse.json(
        { error: '결제 금액이 주문 금액과 일치하지 않습니다.' },
        { status: 400 }
      );
    }

    // 토스 페이먼츠 API 호출하여 결제 승인
    const tossPaymentResponse = await fetch(
      `${TOSS_API_URL}/${paymentKey}`,
      {
        method: 'POST',
        headers: {
          Authorization: `Basic ${Buffer.from(`${TOSS_SECRET_KEY}:`).toString('base64')}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          orderId,
          amount,
        }),
      }
    );

    if (!tossPaymentResponse.ok) {
      const errorResponse = await tossPaymentResponse.json();
      console.error('토스 페이먼츠 API 오류:', errorResponse);
      
      return NextResponse.json(
        { 
          error: '결제 승인 중 오류가 발생했습니다.', 
          details: errorResponse 
        },
        { status: tossPaymentResponse.status }
      );
    }

    const paymentData = await tossPaymentResponse.json();
    console.log('토스 페이먼츠 응답:', paymentData);
    
    // 결제 성공 시 주문 상태 업데이트 먼저 수행
    let orderUpdateSuccess = false;
    let retries = 0;
    const maxRetries = 3;
    
    while (!orderUpdateSuccess && retries < maxRetries) {
      try {
        const { error: orderUpdateError, data: updatedOrder } = await supabase
          .from('orders')
          .update({
            status: 'paid',
            tid: paymentKey,
            payment_method: paymentData.method || 'card',
            updated_at: new Date().toISOString(),
          })
          .eq('id', orderId)
          .select()
          .single();
    
        if (orderUpdateError) {
          console.error(`주문 상태 업데이트 실패 (시도 ${retries + 1}/${maxRetries}):`, orderUpdateError);
          retries++;
          
          if (retries < maxRetries) {
            // 잠시 대기 후 재시도
            await new Promise(resolve => setTimeout(resolve, 1000)); 
          }
        } else {
          console.log('주문 상태 업데이트 성공:', updatedOrder);
          orderUpdateSuccess = true;
        }
      } catch (updateError) {
        console.error(`주문 업데이트 중 예외 발생 (시도 ${retries + 1}/${maxRetries}):`, updateError);
        retries++;
        
        if (retries < maxRetries) {
          // 잠시 대기 후 재시도
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }
    }
    
    if (!orderUpdateSuccess) {
      console.error('최대 재시도 횟수 초과. 주문 상태 업데이트에 실패했지만, 결제는 성공했습니다.');
    }
    
    // 결제 정보 저장 시도 (예외 처리 추가)
    try {
      // 필수 필드만 저장하여 오류 가능성 낮춤
      const paymentRecord = {
        order_id: orderId,
        payment_key: paymentKey,
        payment_method: paymentData.method || 'card',
        payment_provider: 'toss',
        amount: amount,
        status: paymentData.status || 'DONE',
        // JSONB 형식으로 직접 저장 (문자열로 변환하지 않음)
        payment_details: {
          orderId: paymentData.orderId,
          method: paymentData.method,
          totalAmount: paymentData.totalAmount,
          balanceAmount: paymentData.balanceAmount,
          status: paymentData.status,
          requestedAt: paymentData.requestedAt,
          approvedAt: paymentData.approvedAt,
          card: paymentData.card ? {
            company: paymentData.card.company,
            number: paymentData.card.number,
            installmentPlanMonths: paymentData.card.installmentPlanMonths
          } : null
        }
      };
      
      const { error: paymentInsertError } = await supabase
        .from('payments')
        .insert(paymentRecord);
  
      if (paymentInsertError) {
        console.error('결제 정보 저장 실패:', paymentInsertError);
        console.log('저장 시도한 결제 정보:', paymentRecord);
        // 실패해도 결제는 성공했으므로 계속 진행
      } else {
        console.log('결제 정보 저장 성공');
      }
    } catch (paymentSaveError) {
      console.error('결제 정보 저장 중 예외 발생:', paymentSaveError);
      // 계속 진행
    }

    // 사용자의 장바구니에서 결제 완료된 상품들 삭제
    try {
      // 1. 사용자의 장바구니 ID 찾기
      const { data: cartData, error: cartError } = await supabase
        .from('carts')
        .select('id')
        .eq('user_id', userId)
        .single();

      if (cartError) {
        console.error('장바구니 조회 실패:', cartError);
      } else if (cartData) {
        const cartId = cartData.id;
        console.log('사용자 장바구니 ID:', cartId);

        // 2. 장바구니 아이템 조회
        const { data: cartItems, error: cartItemsError } = await supabase
          .from('cart_items')
          .select('id, product_id, product_option_id')
          .eq('cart_id', cartId);
          
        if (cartItemsError) {
          console.error('장바구니 아이템 조회 실패:', cartItemsError);
        } else {
          console.log('현재 장바구니 아이템:', cartItems);
          
          // 3. 주문 아이템 정보 가져오기
          const { data: orderItems, error: orderItemsError } = await supabase
            .from('order_items')
            .select('product_id, product_option_id')
            .eq('order_id', orderId);

          if (orderItemsError) {
            console.error('주문 상품 정보 조회 실패:', orderItemsError);
          } else if (orderItems && orderItems.length > 0) {
            console.log('주문한 상품 정보:', orderItems);
            
            // 삭제할 아이템 ID 목록 
            const itemsToDelete: string[] = [];
            
            // 각 주문 아이템을 장바구니 아이템과 비교하여 일치하는 것 찾기
            for (const orderItem of orderItems) {
              const matchingCartItems = cartItems?.filter(cartItem => {
                const productMatch = cartItem.product_id === orderItem.product_id;
                
                // product_option_id 비교 로직 개선
                // 둘 다 null이거나 undefined인 경우 || 둘 다 같은 값인 경우 
                const optionMatch = 
                  ((!cartItem.product_option_id && !orderItem.product_option_id) || 
                   (cartItem.product_option_id === orderItem.product_option_id));
                   
                return productMatch && optionMatch;
              });
              
              if (matchingCartItems && matchingCartItems.length > 0) {
                matchingCartItems.forEach(item => {
                  if (!itemsToDelete.includes(item.id)) {
                    itemsToDelete.push(item.id);
                  }
                });
                
                console.log(`상품 ${orderItem.product_id}${orderItem.product_option_id ? ' (옵션: ' + orderItem.product_option_id + ')' : ''} 삭제 대상 ID:`, 
                  matchingCartItems.map(item => item.id));
              } else {
                console.log(`상품 ${orderItem.product_id}${orderItem.product_option_id ? ' (옵션: ' + orderItem.product_option_id + ')' : ''} 에 해당하는 장바구니 아이템이 없습니다.`);
              }
            }
            
            // 삭제할 아이템이 있으면 한 번에 삭제
            if (itemsToDelete.length > 0) {
              console.log('삭제할 장바구니 아이템 ID:', itemsToDelete);
              
              const { error: deleteError, count } = await supabase
                .from('cart_items')
                .delete()
                .in('id', itemsToDelete)
                .select('count');
                
              if (deleteError) {
                console.error('장바구니 아이템 삭제 실패:', deleteError);
              } else {
                console.log(`장바구니에서 ${count || itemsToDelete.length}개 상품 삭제 성공`);
              }
            } else {
              console.log('삭제할 장바구니 아이템이 없습니다.');
            }
          }
        }
      }
    } catch (cartDeleteError) {
      console.error('장바구니 삭제 중 오류 발생:', cartDeleteError);
      // 장바구니 삭제 실패해도 결제는 성공했으므로 계속 진행
    }

    // 결제 성공 응답
    return NextResponse.json({
      success: true,
      orderId: orderId,
      paymentKey: paymentKey,
      paymentInfo: {
        method: paymentData.method,
        totalAmount: paymentData.totalAmount,
        approvedAt: paymentData.approvedAt
      }
    });
  } catch (error) {
    console.error('결제 처리 중 오류 발생:', error);
    return NextResponse.json(
      { error: '결제 처리 중 서버 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
} 