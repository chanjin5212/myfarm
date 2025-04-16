import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { orderId, amount, paymentKey } = await request.json();
    
    // 토스페이먼츠 결제 승인 API 호출
    const response = await fetch('https://api.tosspayments.com/v1/payments/confirm', {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${Buffer.from(`${process.env.TOSS_SECRET_KEY}:`).toString('base64')}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        orderId,
        amount,
        paymentKey
      })
    });
    
    const result = await response.json();
    
    if (!response.ok) {
      throw new Error(result.message || '결제 승인 실패');
    }
    
    return NextResponse.json(result);
  } catch (error) {
    console.error('결제 승인 실패:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : '결제 처리 실패' }, 
      { status: 400 }
    );
  }
}