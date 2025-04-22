'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button, Spinner } from '@/components/ui/CommonStyles';
import toast from 'react-hot-toast';
import Image from 'next/image';
import { gql } from "graphql-request";
import { DeliveryTrackerGraphQLClient } from "@/lib/DeliveryTrackerGraphQLClient";
import { formatDistanceToNow } from 'date-fns';
import { ko } from 'date-fns/locale';
import TrackingModal from '@/components/modals/TrackingModal';
import { ORDER_STATUS_MAP, DELIVERY_STATUS_MAP } from '@/constants/orderStatus';

// 택배사 목록 쿼리
const CARRIER_LIST_QUERY = gql`
  query CarrierList($after: String, $countryCode: String) {
    carriers(first: 100, after: $after, countryCode: $countryCode) {
      pageInfo {
        hasNextPage
        endCursor
      }
      edges {
        node {
          id
          name
        }
      }
    }
  }
`;

// 고정 택배사 목록은 백업용으로 유지
const fallbackCarrierOptions = [
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

// 택배사 목록 API 응답 타입 정의
interface CarrierNode {
  id: string;
  name: string;
}

interface CarrierEdge {
  node: CarrierNode;
}

interface PageInfo {
  hasNextPage: boolean;
  endCursor: string | null;
}

interface CarriersResponse {
  carriers: {
    pageInfo: PageInfo;
    edges: CarrierEdge[];
  };
}

// 택배사 객체 타입 정의
interface CarrierOption {
  value: string;
  label: string;
}

// 배송 추적 쿼리
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
      events(last: 10) {
        edges {
          node {
            time
            status {
              code
              name
            }
            description
          }
        }
      }
    }
  }
`;

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

  // 택배사 목록 상태 추가
  const [carrierOptions, setCarrierOptions] = useState(fallbackCarrierOptions);
  const [isLoadingCarriers, setIsLoadingCarriers] = useState(true);

  // 배송 상세 모달 상태
  const [showTrackingModal, setShowTrackingModal] = useState(false);
  const [selectedShipment, setSelectedShipment] = useState<any>(null);

  // 주문 정보 가져오기
  useEffect(() => {
    fetchOrderDetails();
    fetchCarrierList();
  }, [orderId]);

  // 택배사 목록 가져오기
  const fetchCarrierList = async () => {
    try {
      setIsLoadingCarriers(true);
      
      const client = new DeliveryTrackerGraphQLClient(
        process.env.NEXT_PUBLIC_DELIVERY_TRACKER_CLIENT_ID || "",
        process.env.NEXT_PUBLIC_DELIVERY_TRACKER_CLIENT_SECRET || ""
      );
      
      let allCarriers: any[] = [];
      let hasNextPage = true;
      let endCursor: string | null = null;

      while (hasNextPage) {
        const response = await client.request(CARRIER_LIST_QUERY, { 
          after: endCursor,
          countryCode: 'KR'  // 한국 택배사만 조회
        }) as CarriersResponse;
        
        if (response?.carriers?.edges?.length > 0) {
          const carriers = response.carriers.edges.map(edge => ({
            value: edge.node.id,
            label: edge.node.name
          }));
          
          allCarriers = [...allCarriers, ...carriers];
        }

        hasNextPage = response.carriers.pageInfo.hasNextPage;
        endCursor = response.carriers.pageInfo.endCursor;
      }
      
      // 개발용 택배사 추가
      allCarriers.push({
        value: 'dev.track.dummy',
        label: '개발용'
      });
      
      if (allCarriers.length > 0) {
        setCarrierOptions(allCarriers);
      } else {
        // 한국 택배사가 없으면 기본 목록 사용
        setCarrierOptions(fallbackCarrierOptions);
      }
    } catch (error) {
      console.error('택배사 목록 로딩 오류:', error);
      
      // 에러 발생 시에도 개발용 택배사는 추가
      const fallbackWithDevCarrier = [
        ...fallbackCarrierOptions,
        { value: 'dev.track.dummy', label: '개발용' }
      ];
      setCarrierOptions(fallbackWithDevCarrier);
    } finally {
      setIsLoadingCarriers(false);
    }
  };

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

      // 송장 정보가 있는 경우 입력 폼에 미리 표시
      if (data.shipments && data.shipments.length > 0) {
        const latestShipment = data.shipments[0];
        setCarrier(latestShipment.carrier);
        setTrackingNumber(latestShipment.tracking_number);
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
      toast.error('택배사를 입력해주세요');
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

      console.log(`[송장 정보 추가] 시작 - 택배사: ${carrier}, 송장번호: ${trackingNumber}`);
      
      // 택배사 이름 가져오기
      const carrierName = carrierOptions.find(option => option.value === carrier)?.label || carrier;
      
      const response = await fetch(`/api/admin/orders/${orderId}/shipment`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${adminToken}`
        },
        body: JSON.stringify({
          tracking_number: trackingNumber,
          carrier: carrier,
          carrier_name: carrierName,
          status: 'shipped',
          order_id: orderId.toString()
        })
      });

      const data = await response.json();
      console.log('[송장 정보 추가] API 응답:', data);
      
      if (!response.ok) {
        throw new Error(data.error || '송장 정보 처리에 실패했습니다');
      }

      toast.success(data.message);
      
      // 주문 상태는 API에서 자동으로 설정됨
      console.log(`[송장 정보 추가] 완료 - 배송 상태 코드: ${data.delivery_status?.code}, 주문 상태: ${data.delivery_status?.order_status}`);
      
      setCarrier('');
      setTrackingNumber('');
      setIsAddingShipment(false);
      fetchOrderDetails();
    } catch (error) {
      console.error('[송장 정보 추가] 오류:', error);
      toast.error(error instanceof Error ? error.message : '송장 정보 처리에 실패했습니다');
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

  // 배송 상세 모달 열기
  const openTrackingModal = (shipment: any) => {
    setSelectedShipment(shipment);
    setShowTrackingModal(true);
  };

  // 배송 상세 모달 닫기
  const closeTrackingModal = () => {
    setShowTrackingModal(false);
    setSelectedShipment(null);
  };

  // 날짜 포맷팅 함수 (상대적 시간)
  const formatRelativeTime = (dateString: string) => {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return formatDistanceToNow(date, { addSuffix: true, locale: ko });
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
                {Object.keys(ORDER_STATUS_MAP).map((status) => (
                  <option key={status} value={status}>
                    {ORDER_STATUS_MAP[status].text}
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
            <h3 className="font-medium mb-2">송장 정보 {shipments.length > 0 ? '수정' : '입력'}</h3>
            <div className="mb-2">
              <select
                value={carrier}
                onChange={(e) => setCarrier(e.target.value)}
                className="block w-full p-2 border border-gray-300 rounded-md mb-2"
                disabled={isAddingShipment || isLoadingCarriers}
              >
                <option value="">택배사 선택</option>
                {isLoadingCarriers ? (
                  <option value="" disabled>택배사 목록 로딩중...</option>
                ) : (
                  carrierOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))
                )}
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
                disabled={isAddingShipment || !trackingNumber || !carrier || isLoadingCarriers}
                className="w-full"
              >
                {isAddingShipment ? <Spinner size="sm" /> : shipments.length > 0 ? '송장 정보 수정' : '송장 정보 추가'}
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
                      ORDER_STATUS_MAP[orderInfo.status]?.color || 'bg-gray-100 text-gray-800'
                    }`}>
                      {ORDER_STATUS_MAP[orderInfo.status]?.text || orderInfo.status}
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

      {/* 배송 정보 */}
      <div className="bg-white rounded-lg shadow-sm p-4 mb-6">
        <h2 className="text-lg font-semibold mb-4">배송 정보</h2>
        {shipments.length > 0 ? (
          <div className="space-y-4">
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
                <div key={shipment.id} className="border rounded-lg p-4 bg-gray-50">
                  <div className="grid grid-cols-2 gap-2 mb-3">
                    <div>
                      <div className="text-xs text-gray-500">택배사</div>
                      <div className="font-medium">{carrierName}</div>
                    </div>
                    <div>
                      <div className="text-xs text-gray-500">송장번호</div>
                      <div className="font-medium">{shipment.tracking_number}</div>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2 mb-3">
                    <div>
                      <div className="text-xs text-gray-500">상태</div>
                      <div className="font-medium">
                        {DELIVERY_STATUS_MAP[shipment.status] || shipment.status}
                        {shipment.status_name && (
                          <span className="ml-1 text-gray-500">({shipment.status_name})</span>
                        )}
                      </div>
                    </div>
                    <div>
                      <div className="text-xs text-gray-500">등록일</div>
                      <div className="font-medium">{formatDate(shipment.created_at)}</div>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    {trackingUrl && (
                      <a
                        href={trackingUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="block text-center py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                      >
                        배송조회
                      </a>
                    )}
                    <button
                      onClick={() => openTrackingModal(shipment)}
                      className="block text-center py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
                    >
                      상세정보
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-8 text-gray-500">
            등록된 배송 정보가 없습니다
          </div>
        )}
      </div>

      {/* 주문 상품 목록 */}
      <div className="bg-white rounded-lg shadow-sm p-4 mb-6">
        <h2 className="text-lg font-semibold mb-4">주문 상품</h2>
        {orderItems.length > 0 ? (
          <div className="space-y-4">
            {orderItems.map((item) => (
              <div key={item.id} className="border rounded-lg p-4 bg-gray-50">
                <div className="mb-3">
                  <div className="font-medium text-gray-900 mb-1">{item.product_name}</div>
                  {item.options && (
                    <div className="text-sm text-gray-500 mb-2">
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
                  <div className="text-sm text-gray-500">
                    {item.quantity}개 × {formatPrice(item.price)}
                  </div>
                </div>
                <div className="flex justify-between items-center pt-3 border-t">
                  <span className="text-sm text-gray-500">총 금액</span>
                  <span className="font-medium">{formatPrice(item.price * item.quantity)}</span>
                </div>
              </div>
            ))}
            <div className="flex justify-between items-center pt-4 border-t">
              <span className="font-medium">총 결제금액</span>
              <span className="font-bold text-lg">{formatPrice(orderInfo.total_amount)}</span>
            </div>
          </div>
        ) : (
          <div className="text-center py-8 text-gray-500">
            주문 상품이 없습니다
          </div>
        )}
      </div>

      {/* 배송 추적 모달 */}
      <TrackingModal 
        isOpen={showTrackingModal} 
        onClose={closeTrackingModal} 
        shipment={selectedShipment} 
        carrierOptions={carrierOptions}
        deliveryStatusMap={DELIVERY_STATUS_MAP}
      />
    </div>
  );
} 