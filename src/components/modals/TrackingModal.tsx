'use client';

import { useState, useEffect } from 'react';
import { gql } from "graphql-request";
import { DeliveryTrackerGraphQLClient } from "@/lib/DeliveryTrackerGraphQLClient";
import { formatDistanceToNow } from 'date-fns';
import { ko } from 'date-fns/locale';
import { Spinner } from '@/components/ui/CommonStyles';
import { DELIVERY_STATUS_MAP } from '@/constants/orderStatus';

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

interface ShipmentType {
  id: string;
  carrier: string;
  tracking_number: string;
  status: string;
  created_at: string;
}

interface CarrierOption {
  value: string;
  label: string;
}

interface TrackingModalProps {
  isOpen: boolean;
  onClose: () => void;
  shipment: ShipmentType | null;
  carrierOptions: CarrierOption[];
  deliveryStatusMap: Record<string, string>;
}

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

// 날짜 포맷팅 함수 (상대적 시간)
const formatRelativeTime = (dateString: string) => {
  if (!dateString) return '-';
  const date = new Date(dateString);
  return formatDistanceToNow(date, { addSuffix: true, locale: ko });
};

export default function TrackingModal({ 
  isOpen, 
  onClose, 
  shipment, 
  carrierOptions,
  deliveryStatusMap = DELIVERY_STATUS_MAP
}: TrackingModalProps) {
  const [trackingData, setTrackingData] = useState<any>(null);
  const [isLoadingTracking, setIsLoadingTracking] = useState(false);
  const [trackingError, setTrackingError] = useState<string | null>(null);
  const [expandedRows, setExpandedRows] = useState<number[]>([]);

  useEffect(() => {
    if (isOpen && shipment) {
      fetchTrackingInfo(shipment);
    }
  }, [isOpen, shipment]);

  // 행 확장/축소 토글 함수
  const toggleRowExpand = (index: number) => {
    setExpandedRows(prev => 
      prev.includes(index) 
        ? prev.filter(i => i !== index) 
        : [...prev, index]
    );
  };
  
  // 텍스트 길이에 따라 축약 표시하는 함수
  const truncateText = (text: string, maxLength: number = 30) => {
    if (!text) return '';
    if (text.length <= maxLength) return text;
    return `${text.substring(0, maxLength)}...`;
  };

  // 배송 상세 정보 조회 함수
  const fetchTrackingInfo = async (shipment: ShipmentType) => {
    if (!shipment) return;

    try {
      setIsLoadingTracking(true);
      setTrackingError(null);
      
      const client = new DeliveryTrackerGraphQLClient(
        process.env.NEXT_PUBLIC_DELIVERY_TRACKER_CLIENT_ID || "",
        process.env.DELIVERY_TRACKER_CLIENT_SECRET || ""
      );
      
      try {
        const response: any = await client.request(TRACK_QUERY, {
          carrierId: shipment.carrier,
          trackingNumber: shipment.tracking_number
        });
        
        // GraphQL 응답에 데이터가 있는 경우
        if (response?.track) {
          setTrackingData(response);
        } else {
          // 데이터가 없지만 에러가 명시적으로 반환되지 않은 경우
          setTrackingError('배송 정보를 찾을 수 없습니다');
        }
      } catch (requestError: any) {
        console.error('배송 추적 GraphQL 오류:', requestError);
        
        // GraphQL 응답 에러 추출 시도
        let errorMessage = '배송 추적 정보를 불러오는데 실패했습니다';
        
        if (requestError.response?.errors && requestError.response.errors.length > 0) {
          const graphqlError = requestError.response.errors[0];
          errorMessage = graphqlError.message || errorMessage;
          
          // 특정 에러 메시지 패턴 감지 및 사용자 친화적 메시지로 변환
          if (
            errorMessage.includes('운송장 미등록') || 
            errorMessage.includes('상품을 준비중') || 
            (graphqlError.extensions?.code === 'NOT_FOUND')
          ) {
            errorMessage = '아직 배송이 시작되지 않았거나 운송장이 등록되지 않았습니다.';
          }
        } else if (requestError.message) {
          errorMessage = requestError.message;
        }
        
        setTrackingError(errorMessage);
      }
    } catch (error: any) {
      console.error('배송 추적 정보 처리 오류:', error);
      setTrackingError('배송 정보를 불러오는데 실패했습니다. 다시 시도해주세요.');
    } finally {
      setIsLoadingTracking(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md max-h-[90vh] overflow-y-auto">
        <div className="p-5">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-bold">배송 상세 정보</h3>
            <button
              onClick={onClose}
              className="text-gray-500 hover:text-gray-700"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-6 w-6"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>
          
          {shipment && (
            <div className="mb-4 p-3 bg-gray-50 rounded-lg">
              <div className="grid grid-cols-2 gap-2 mb-2">
                <div>
                  <div className="text-xs text-gray-500">택배사</div>
                  <div className="font-medium">
                    {carrierOptions.find(option => option.value === shipment.carrier)?.label || shipment.carrier}
                  </div>
                </div>
                <div>
                  <div className="text-xs text-gray-500">송장번호</div>
                  <div className="font-medium">{shipment.tracking_number}</div>
                </div>
              </div>
            </div>
          )}
          
          {isLoadingTracking ? (
            <div className="flex justify-center items-center py-12">
              <Spinner size="lg" />
            </div>
          ) : trackingError ? (
            <div className="p-4 bg-yellow-50 rounded-lg border border-yellow-100 text-center text-yellow-800">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 mx-auto mb-2 text-yellow-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <p>{trackingError}</p>
            </div>
          ) : trackingData?.track ? (
            <div>
              <div className="text-sm font-semibold text-gray-600 mb-2">배송 추적</div>
              <div className="rounded-lg border border-gray-200 overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-gray-100">
                    <tr>
                      <th className="py-2 px-3 text-left font-medium text-gray-700 w-1/3">시간</th>
                      <th className="py-2 px-3 text-left font-medium text-gray-700 w-1/3">상태</th>
                      <th className="py-2 px-3 text-left font-medium text-gray-700">상세</th>
                    </tr>
                  </thead>
                  <tbody>
                    {/* 현재 상태(마지막 이벤트)를 가장 위에 하이라이트로 표시 */}
                    <tr className="border-b border-blue-100 bg-blue-50">
                      <td className="py-2 px-3 text-xs text-gray-600">
                        {formatDate(trackingData.track.lastEvent.time)}
                      </td>
                      <td className="py-2 px-3 font-bold text-blue-700">
                        {trackingData.track.lastEvent.status.name || deliveryStatusMap[trackingData.track.lastEvent.status.code]}
                      </td>
                      <td className="py-2 px-3">
                        {trackingData.track.lastEvent.description}
                      </td>
                    </tr>
                    
                    {/* 나머지 이벤트 목록 */}
                    {[...trackingData.track.events.edges]
                      .sort((a, b) => new Date(b.node.time).getTime() - new Date(a.node.time).getTime())
                      // 마지막 이벤트와 중복 이벤트 제거 (시간과 상태가 동일한 경우)
                      .filter(edge => {
                        const lastEventTime = new Date(trackingData.track.lastEvent.time).getTime();
                        const edgeTime = new Date(edge.node.time).getTime();
                        const lastEventStatus = trackingData.track.lastEvent.status.code;
                        const edgeStatus = edge.node.status.code;
                        
                        // 시간과 상태가 모두 같으면 필터링
                        return !(lastEventTime === edgeTime && lastEventStatus === edgeStatus);
                      })
                      .map((edge: any, index: number) => {
                        const isExpanded = expandedRows.includes(index);
                        const hasLongDesc = edge.node.description && edge.node.description.length > 30;
                        
                        return (
                          <tr 
                            key={index} 
                            className={`border-b border-gray-100 ${index % 2 === 0 ? 'bg-gray-50' : 'bg-white'} cursor-pointer hover:bg-gray-100`}
                            onClick={() => hasLongDesc && toggleRowExpand(index)}
                          >
                            <td className="py-2 px-3 text-xs text-gray-600">
                              {formatDate(edge.node.time)}
                            </td>
                            <td className="py-2 px-3 font-medium">
                              {edge.node.status.name || deliveryStatusMap[edge.node.status.code]}
                            </td>
                            <td className="py-2 px-3">
                              {hasLongDesc ? (
                                <div>
                                  {isExpanded ? edge.node.description : truncateText(edge.node.description)}
                                  {hasLongDesc && (
                                    <button 
                                      className="ml-1 text-blue-500 text-xs font-medium"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        toggleRowExpand(index);
                                      }}
                                    >
                                      {isExpanded ? '접기' : '펼치기'}
                                    </button>
                                  )}
                                </div>
                              ) : edge.node.description}
                            </td>
                          </tr>
                        );
                      })}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              배송 정보를 찾을 수 없습니다
            </div>
          )}
        </div>
        <div className="bg-gray-50 px-5 py-3 rounded-b-lg">
          <button
            onClick={onClose}
            className="w-full py-2 bg-gray-200 hover:bg-gray-300 rounded-md font-medium"
          >
            닫기
          </button>
        </div>
      </div>
    </div>
  );
} 