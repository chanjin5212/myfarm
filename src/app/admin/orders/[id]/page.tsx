'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button, Spinner } from '@/components/ui/CommonStyles';
import toast from 'react-hot-toast';
import Image from 'next/image';

// 주문 상태 맵
const orderStatusMap: Record<string, { color: string; text: string }> = {
  pending: { color: 'bg-yellow-100 text-yellow-800', text: '주문 대기중' },
  payment_pending: { color: 'bg-blue-100 text-blue-800', text: '결제 진행중' },
  paid: { color: 'bg-green-100 text-green-800', text: '결제 완료' },
  preparing: { color: 'bg-indigo-100 text-indigo-800', text: '상품 준비중' },
  shipping: { color: 'bg-purple-100 text-purple-800', text: '배송중' },
  delivered: { color: 'bg-green-100 text-green-800', text: '배송 완료' },
  canceled: { color: 'bg-red-100 text-red-800', text: '주문 취소' },
  cancelled: { color: 'bg-red-100 text-red-800', text: '주문 취소' },
  refunded: { color: 'bg-gray-100 text-gray-800', text: '환불 완료' },
};

// 택배사 목록
const carrierOptions = [
  { value: 'cj', label: 'CJ대한통운' },
  { value: 'lotte', label: '롯데택배' },
  { value: 'hanjin', label: '한진택배' },
  { value: 'post', label: '우체국택배' },
  { value: 'logen', label: '로젠택배' },
  { value: 'epost', label: '우체국 EMS' },
];

// 날짜 포맷팅 함수
const formatDate = (dateString: string) => {
  if (!dateString) return '-';
  const date = new Date(dateString);
  return date.toLocaleString('ko-KR', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
};

// 가격 포맷팅 함수
const formatPrice = (price: number) => {
  return price?.toLocaleString('ko-KR') + '원' || '0원';
};

export default function AdminOrderDetailPage() {
  const params = useParams();
  const router = useRouter();
  const orderId = params?.id as string;

  // 주문 정보 상태
  const [orderInfo, setOrderInfo] = useState<any>(null);
  const [orderItems, setOrderItems] = useState<any[]>([]);
  const [shipments, setShipments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // 상태 변경을 위한 상태
  const [isUpdating, setIsUpdating] = useState(false);
  const [selectedStatus, setSelectedStatus] = useState('');
  
  // 송장 입력을 위한 상태
  const [isAddingShipment, setIsAddingShipment] = useState(false);
  const [carrier, setCarrier] = useState('');
  const [trackingNumber, setTrackingNumber] = useState('');
  
  // 결제 취소를 위한 상태
  const [isCancelling, setIsCancelling] = useState(false);
  const [cancelReason, setCancelReason] = useState('');

  // 주문 정보 가져오기
  useEffect(() => {
    fetchOrderDetails();
  }, [orderId]);

  const fetchOrderDetails = async () => {
    try {
      setLoading(true);
      const adminToken = localStorage.getItem('adminToken');
      
      if (!adminToken) {
        toast.error('관리자 권한이 없습니다');
        router.push('/admin/login');
        return;
      }

      // 주문 정보 조회
      const response = await fetch(`/api/admin/orders/${orderId}`, {
        headers: {
          'Authorization': `Bearer ${adminToken}`
        }
      });

      if (!response.ok) {
        throw new Error('주문 정보를 가져오는데 실패했습니다');
      }

      const data = await response.json();
      setOrderInfo(data.order || null);
      setOrderItems(data.orderItems || []);
      setShipments(data.shipments || []);
      
      // 현재 주문 상태 설정
      if (data.order) {
        setSelectedStatus(data.order.status);
      }
    } catch (error) {
      console.error('주문 상세 로딩 오류:', error);
      setError('주문 정보를 불러오는데 실패했습니다');
      toast.error('주문 정보를 불러오는데 실패했습니다');
    } finally {
      setLoading(false);
    }
  };

  // 주문 상태 변경 함수
  const updateOrderStatus = async () => {
    try {
      setIsUpdating(true);
      const adminToken = localStorage.getItem('adminToken');
      
      if (!adminToken) {
        toast.error('관리자 권한이 없습니다');
        router.push('/admin/login');
        return;
      }

      const response = await fetch(`/api/admin/orders/${orderId}/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${adminToken}`
        },
        body: JSON.stringify({ status: selectedStatus })
      });

      if (!response.ok) {
        throw new Error('주문 상태 변경에 실패했습니다');
      }

      toast.success('주문 상태가 변경되었습니다');
      fetchOrderDetails();
    } catch (error) {
      console.error('주문 상태 변경 오류:', error);
      toast.error('주문 상태 변경에 실패했습니다');
    } finally {
      setIsUpdating(false);
    }
  };

  // 송장 정보 추가 함수
  const addShipment = async () => {
    if (!trackingNumber.trim()) {
      toast.error('송장번호를 입력해주세요');
      return;
    }

    if (!carrier) {
      toast.error('택배사를 선택해주세요');
      return;
    }

    try {
      setIsAddingShipment(true);
      const adminToken = localStorage.getItem('adminToken');
      
      if (!adminToken) {
        toast.error('관리자 권한이 없습니다');
        router.push('/admin/login');
        return;
      }

      const response = await fetch(`/api/admin/orders/${orderId}/shipment`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${adminToken}`
        },
        body: JSON.stringify({
          tracking_number: trackingNumber,
          carrier,
          status: 'shipped',
          order_id: orderId
        })
      });

      if (!response.ok) {
        throw new Error('송장 정보 추가에 실패했습니다');
      }

      toast.success('송장 정보가 추가되었습니다');
      
      // 송장을 추가했다면 주문 상태도 배송중으로 업데이트
      await fetch(`/api/admin/orders/${orderId}/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${adminToken}`
        },
        body: JSON.stringify({ status: 'shipping' })
      });
      
      setCarrier('');
      setTrackingNumber('');
      setIsAddingShipment(false);
      fetchOrderDetails();
    } catch (error) {
      console.error('송장 정보 추가 오류:', error);
      toast.error('송장 정보 추가에 실패했습니다');
      setIsAddingShipment(false);
    }
  };

  // 결제 취소 함수
  const cancelPayment = async () => {
    if (!cancelReason.trim()) {
      toast.error('취소 사유를 입력해주세요');
      return;
    }

    try {
      setIsCancelling(true);
      const adminToken = localStorage.getItem('adminToken');
      
      if (!adminToken) {
        toast.error('관리자 권한이 없습니다');
        router.push('/admin/login');
        return;
      }

      const response = await fetch(`/api/admin/orders/${orderId}/cancel`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${adminToken}`
        },
        body: JSON.stringify({ reason: cancelReason })
      });

      if (!response.ok) {
        throw new Error('결제 취소에 실패했습니다');
      }

      toast.success('주문이 취소되었습니다');
      setCancelReason('');
      setIsCancelling(false);
      fetchOrderDetails();
    } catch (error) {
      console.error('결제 취소 오류:', error);
      toast.error('결제 취소에 실패했습니다');
      setIsCancelling(false);
    }
  };

  // 페이지 내용 렌더링
  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <Spinner size="lg" />
      </div>
    );
  }

  if (error || !orderInfo) {
    return (
      <div className="container mx-auto py-6 px-4 pt-20">
        <div className="bg-white rounded-lg shadow p-6 text-center">
          <p className="text-red-500 mb-4">{error || '주문 정보를 찾을 수 없습니다'}</p>
          <Button onClick={() => router.push('/admin/orders')}>주문 목록으로 돌아가기</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6 px-4 pt-20">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">주문 상세</h1>
          <p className="text-gray-600">주문번호: {orderInfo.order_number}</p>
        </div>
        <Button onClick={() => router.push('/admin/orders')}>주문 목록으로</Button>
      </div>

      {/* 관리자 작업 패널 */}
      <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
        <h2 className="text-lg font-semibold mb-4">주문 관리</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* 주문 상태 관리 */}
          <div className="border rounded-md p-4">
            <h3 className="font-medium mb-2">주문 상태 변경</h3>
            <div className="mb-4">
              <select
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
                className="block w-full p-2 border border-gray-300 rounded-md mb-2"
                disabled={isUpdating}
              >
                {Object.keys(orderStatusMap).map((status) => (
                  <option key={status} value={status}>
                    {orderStatusMap[status].text}
                  </option>
                ))}
              </select>
              <Button
                variant="primary"
                onClick={updateOrderStatus}
                disabled={isUpdating || selectedStatus === orderInfo.status}
                className="w-full"
              >
                {isUpdating ? <Spinner size="sm" /> : '상태 변경'}
              </Button>
            </div>
          </div>

          {/* 송장 입력 */}
          <div className="border rounded-md p-4">
            <h3 className="font-medium mb-2">송장 정보 입력</h3>
            <div className="mb-2">
              <select
                value={carrier}
                onChange={(e) => setCarrier(e.target.value)}
                className="block w-full p-2 border border-gray-300 rounded-md mb-2"
                disabled={isAddingShipment}
              >
                <option value="">택배사 선택</option>
                {carrierOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
              <input
                type="text"
                value={trackingNumber}
                onChange={(e) => setTrackingNumber(e.target.value)}
                placeholder="송장번호 입력"
                className="block w-full p-2 border border-gray-300 rounded-md mb-2"
                disabled={isAddingShipment}
              />
              <Button
                variant="primary"
                onClick={addShipment}
                disabled={isAddingShipment || !trackingNumber || !carrier}
                className="w-full"
              >
                {isAddingShipment ? <Spinner size="sm" /> : '송장 정보 추가'}
              </Button>
            </div>
          </div>

          {/* 결제 취소 */}
          <div className="border rounded-md p-4">
            <h3 className="font-medium mb-2">주문 취소</h3>
            <div className="mb-2">
              <textarea
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                placeholder="취소 사유 입력"
                className="block w-full p-2 border border-gray-300 rounded-md mb-2 h-20"
                disabled={isCancelling || !['pending', 'payment_pending', 'paid'].includes(orderInfo.status)}
              />
              <Button
                variant="outline"
                onClick={cancelPayment}
                disabled={
                  isCancelling || 
                  !cancelReason || 
                  !['pending', 'payment_pending', 'paid'].includes(orderInfo.status)
                }
                className="w-full bg-red-500 text-white hover:bg-red-600"
              >
                {isCancelling ? <Spinner size="sm" /> : '주문 취소'}
              </Button>
              {!['pending', 'payment_pending', 'paid'].includes(orderInfo.status) && (
                <p className="text-xs text-gray-500 mt-1">
                  이미 처리중인 주문은 취소할 수 없습니다.
                </p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* 주문 기본 정보 */}
      <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
        <h2 className="text-lg font-semibold mb-4">기본 정보</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <table className="w-full text-sm">
              <tbody>
                <tr className="border-b">
                  <td className="py-2 font-medium text-gray-600 w-1/3">주문번호</td>
                  <td className="py-2">{orderInfo.order_number}</td>
                </tr>
                <tr className="border-b">
                  <td className="py-2 font-medium text-gray-600">주문일시</td>
                  <td className="py-2">{formatDate(orderInfo.created_at)}</td>
                </tr>
                <tr className="border-b">
                  <td className="py-2 font-medium text-gray-600">주문자명</td>
                  <td className="py-2">{orderInfo.shipping_name}</td>
                </tr>
                <tr className="border-b">
                  <td className="py-2 font-medium text-gray-600">연락처</td>
                  <td className="py-2">{orderInfo.shipping_phone}</td>
                </tr>
                <tr>
                  <td className="py-2 font-medium text-gray-600">배송지</td>
                  <td className="py-2">
                    {orderInfo.shipping_address} {orderInfo.shipping_detail_address}
                    {orderInfo.shipping_memo && (
                      <div className="text-gray-500 mt-1">
                        <span className="font-medium">메모:</span> {orderInfo.shipping_memo}
                      </div>
                    )}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
          <div>
            <table className="w-full text-sm">
              <tbody>
                <tr className="border-b">
                  <td className="py-2 font-medium text-gray-600 w-1/3">주문 상태</td>
                  <td className="py-2">
                    <span className={`px-2 py-1 text-xs rounded-full ${
                      orderStatusMap[orderInfo.status]?.color || 'bg-gray-100 text-gray-800'
                    }`}>
                      {orderStatusMap[orderInfo.status]?.text || orderInfo.status}
                    </span>
                  </td>
                </tr>
                <tr className="border-b">
                  <td className="py-2 font-medium text-gray-600">결제 방법</td>
                  <td className="py-2">
                    {orderInfo.payment_method === 'card'
                      ? '카드'
                      : orderInfo.payment_method === 'bank'
                      ? '무통장입금'
                      : orderInfo.payment_method === 'kakao'
                      ? '카카오페이'
                      : orderInfo.payment_method === 'toss'
                      ? '토스페이'
                      : orderInfo.payment_method}
                  </td>
                </tr>
                <tr className="border-b">
                  <td className="py-2 font-medium text-gray-600">결제 금액</td>
                  <td className="py-2 font-semibold">{formatPrice(orderInfo.total_amount)}</td>
                </tr>
                <tr className="border-b">
                  <td className="py-2 font-medium text-gray-600">결제 상태</td>
                  <td className="py-2">
                    {orderInfo.status === 'payment_pending' ? '결제중' : 
                     orderInfo.status === 'paid' || 
                     orderInfo.status === 'preparing' || 
                     orderInfo.status === 'shipping' || 
                     orderInfo.status === 'delivered' ? '결제완료' : 
                     orderInfo.status === 'refunded' ? '환불됨' : 
                     orderInfo.status === 'canceled' || orderInfo.status === 'cancelled' ? '취소됨' : '대기중'}
                  </td>
                </tr>
                <tr>
                  <td className="py-2 font-medium text-gray-600">마지막 수정일</td>
                  <td className="py-2">{formatDate(orderInfo.updated_at)}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* 송장 정보 */}
      <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
        <h2 className="text-lg font-semibold mb-4">배송 정보</h2>
        {shipments.length > 0 ? (
          <table className="min-w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="py-3 px-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  택배사
                </th>
                <th className="py-3 px-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  송장번호
                </th>
                <th className="py-3 px-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  상태
                </th>
                <th className="py-3 px-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  등록일
                </th>
                <th className="py-3 px-4 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                  조회
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {shipments.map((shipment) => {
                // 택배사별 배송 조회 URL
                const trackingUrl = shipment.carrier === 'cj' 
                  ? `https://www.cjlogistics.com/ko/tool/parcel/tracking?gnbInvcNo=${shipment.tracking_number}`
                  : shipment.carrier === 'lotte'
                  ? `https://www.lotteglogis.com/home/reservation/tracking/index?InvNo=${shipment.tracking_number}`
                  : shipment.carrier === 'hanjin'
                  ? `https://www.hanjin.com/kor/CMS/DeliveryMgr/WaybillResult.do?mCode=MN038&schLang=KR&wblnumText=${shipment.tracking_number}`
                  : shipment.carrier === 'post'
                  ? `https://service.epost.go.kr/trace.RetrieveRegiPrclDeliv.postal?sid1=${shipment.tracking_number}`
                  : shipment.carrier === 'logen'
                  ? `https://www.ilogen.com/web/personal/trace/${shipment.tracking_number}`
                  : shipment.carrier === 'epost'
                  ? `https://service.epost.go.kr/trace.RetrieveEmsTrace.postal?ems_gubun=E&POST_CODE=${shipment.tracking_number}`
                  : '';

                const carrierName = carrierOptions.find(option => option.value === shipment.carrier)?.label || shipment.carrier;
                
                return (
                  <tr key={shipment.id} className="hover:bg-gray-50">
                    <td className="py-4 px-4 text-sm text-gray-900">
                      {carrierName}
                    </td>
                    <td className="py-4 px-4 text-sm text-gray-900">
                      {shipment.tracking_number}
                    </td>
                    <td className="py-4 px-4 text-sm text-gray-900">
                      {shipment.status === 'shipped' ? '배송중' : 
                       shipment.status === 'delivered' ? '배송완료' : shipment.status}
                    </td>
                    <td className="py-4 px-4 text-sm text-gray-500">
                      {formatDate(shipment.created_at)}
                    </td>
                    <td className="py-4 px-4 text-sm text-center">
                      {trackingUrl ? (
                        <a
                          href={trackingUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-500 hover:underline"
                        >
                          배송조회
                        </a>
                      ) : (
                        '배송조회 불가'
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        ) : (
          <div className="text-center py-8 text-gray-500">
            등록된 배송 정보가 없습니다
          </div>
        )}
      </div>

      {/* 주문 상품 목록 */}
      <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
        <h2 className="text-lg font-semibold mb-4">주문 상품</h2>
        <table className="min-w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="py-3 px-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                상품정보
              </th>
              <th className="py-3 px-4 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                수량
              </th>
              <th className="py-3 px-4 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                가격
              </th>
              <th className="py-3 px-4 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                총 금액
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {orderItems.length > 0 ? (
              orderItems.map((item) => (
                <tr key={item.id} className="hover:bg-gray-50">
                  <td className="py-4 px-4">
                    <div className="flex items-center">
                      <div className="h-16 w-16 flex-shrink-0 relative overflow-hidden rounded border border-gray-200 mr-4">
                        {item.product_image || (item.options && item.options.image_url) ? (
                          <Image
                            src={item.product_image || (item.options && item.options.image_url) || '/images/default-product.jpg'}
                            alt={item.product_name || '상품 이미지'}
                            fill
                            sizes="64px"
                            className="object-cover"
                          />
                        ) : (
                          <div className="h-full w-full flex items-center justify-center bg-gray-100">
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-8 h-8 text-gray-400">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002.25 6v12a1.5 1.5 0 001.5 1.5zm10.5-11.25h.008v.008h-.008V8.25zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
                            </svg>
                          </div>
                        )}
                      </div>
                      <div>
                        <div className="font-medium text-gray-900">{item.product_name}</div>
                        {item.options && (
                          <div className="text-sm text-gray-500">
                            {item.options.option_name || item.options.name ? (
                              <span>
                                {`${item.options.option_name || item.options.name}: ${item.options.option_value || item.options.value}`}
                                {item.options.additional_price > 0 && (
                                  <span className="ml-1">(+{item.options.additional_price.toLocaleString()}원)</span>
                                )}
                              </span>
                            ) : (
                              <span>기본 상품</span>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="py-4 px-4 text-right text-sm text-gray-500">
                    {item.quantity}개
                  </td>
                  <td className="py-4 px-4 text-right text-sm text-gray-500">
                    {formatPrice(item.price)}
                  </td>
                  <td className="py-4 px-4 text-right text-sm font-medium text-gray-900">
                    {formatPrice(item.price * item.quantity)}
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={4} className="py-8 text-center text-gray-500">
                  주문 상품이 없습니다
                </td>
              </tr>
            )}
          </tbody>
          <tfoot>
            <tr className="border-t-2 border-gray-200">
              <td colSpan={3} className="py-4 px-4 text-right font-medium">
                총 결제금액
              </td>
              <td className="py-4 px-4 text-right font-bold text-lg text-gray-900">
                {formatPrice(orderInfo.total_amount)}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
} 