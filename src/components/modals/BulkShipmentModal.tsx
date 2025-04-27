import { useState, useEffect } from 'react';
import { Button, Spinner } from '@/components/ui/CommonStyles';
import toast from 'react-hot-toast';

interface ShipmentItem {
  order_id: string;
  order_number: string;
  tracking_number: string;
  recipient: string;
  selected: boolean;
}

interface BulkShipmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  orders: any[];
  carrierOptions: any[];
  onRefresh: () => void;
}

export default function BulkShipmentModal({
  isOpen,
  onClose,
  orders,
  carrierOptions,
  onRefresh
}: BulkShipmentModalProps) {
  const [shipmentItems, setShipmentItems] = useState<ShipmentItem[]>([]);
  const [carrier, setCarrier] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [selectAll, setSelectAll] = useState(false);
  const [isLoadingCarriers, setIsLoadingCarriers] = useState(false);
  
  // 모달이 열릴 때 배송정보가 없는 주문만 필터링
  useEffect(() => {
    if (isOpen && orders.length > 0) {
      const filteredOrders = orders
        .filter(order => 
          (!order.shipments || order.shipments.length === 0) && 
          (order.status === 'paid' || order.status === 'preparing')
        )
        .map(order => ({
          order_id: order.id,
          order_number: order.order_number,
          tracking_number: '',
          recipient: order.shipping_name,
          selected: false
        }));
      
      setShipmentItems(filteredOrders);
      setSelectAll(false);
    }
  }, [isOpen, orders]);

  // 전체 선택/해제 처리
  const handleSelectAll = () => {
    const newSelectAll = !selectAll;
    setSelectAll(newSelectAll);
    
    setShipmentItems(prev => 
      prev.map(item => ({
        ...item,
        selected: newSelectAll
      }))
    );
  };

  // 개별 선택/해제 처리
  const handleSelectItem = (index: number) => {
    setShipmentItems(prev => {
      const updated = [...prev];
      updated[index] = {
        ...updated[index],
        selected: !updated[index].selected
      };
      
      // 모든 항목이 선택되었는지 확인하여 전체 선택 상태 업데이트
      const allSelected = updated.every(item => item.selected);
      setSelectAll(allSelected);
      
      return updated;
    });
  };

  // 송장번호 입력 처리
  const handleTrackingNumberChange = (index: number, value: string) => {
    setShipmentItems(prev => {
      const updated = [...prev];
      updated[index] = {
        ...updated[index],
        tracking_number: value
      };
      return updated;
    });
  };

  // 일괄 송장번호 입력 처리
  const handleBulkSubmit = async () => {
    // 선택된 항목 중 송장번호가 없는 항목 체크
    const selectedItems = shipmentItems.filter(item => item.selected);
    
    if (selectedItems.length === 0) {
      toast.error('선택된 주문이 없습니다');
      return;
    }
    
    if (!carrier) {
      toast.error('택배사를 선택해주세요');
      return;
    }
    
    const emptyTrackingItems = selectedItems.filter(item => !item.tracking_number.trim());
    if (emptyTrackingItems.length > 0) {
      toast.error('송장번호를 모두 입력해주세요');
      return;
    }
    
    try {
      setIsProcessing(true);
      
      const adminToken = localStorage.getItem('adminToken');
      if (!adminToken) {
        toast.error('관리자 권한이 없습니다');
        return;
      }
      
      // 택배사 이름 가져오기
      const carrierName = carrierOptions.find(option => option.value === carrier)?.label || carrier;
      
      // 선택된 항목만 처리
      const results = await Promise.all(
        selectedItems.map(async (item) => {
          try {
            const response = await fetch(`/api/admin/orders/${item.order_id}/shipment`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${adminToken}`
              },
              body: JSON.stringify({
                tracking_number: item.tracking_number,
                carrier: carrier,
                carrier_name: carrierName,
                status: 'shipped',
                order_id: item.order_id
              })
            });
            
            const data = await response.json();
            
            if (!response.ok) {
              throw new Error(data.error || '송장 정보 처리에 실패했습니다');
            }
            
            return {
              success: true,
              order_number: item.order_number,
              message: data.message
            };
          } catch (error) {
            return {
              success: false,
              order_number: item.order_number,
              message: error instanceof Error ? error.message : '송장 정보 처리에 실패했습니다'
            };
          }
        })
      );
      
      // 결과 처리
      const successCount = results.filter(r => r.success).length;
      const failCount = results.length - successCount;
      
      if (successCount > 0 && failCount === 0) {
        toast.success(`${successCount}건의 송장정보가 등록되었습니다`);
        onRefresh(); // 주문 목록 새로고침
        onClose(); // 모달 닫기
      } else if (successCount > 0 && failCount > 0) {
        toast.success(`${successCount}건 성공, ${failCount}건 실패했습니다`);
        onRefresh(); // 주문 목록 새로고침
      } else {
        toast.error('모든 송장정보 등록이 실패했습니다');
      }
    } catch (error) {
      console.error('일괄 송장 등록 오류:', error);
      toast.error('송장정보 등록에 실패했습니다');
    } finally {
      setIsProcessing(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-hidden">
        <div className="p-4 border-b border-gray-200 flex justify-between items-center">
          <h2 className="text-lg font-semibold">일괄 송장 등록</h2>
          <button 
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700"
            disabled={isProcessing}
          >
            ✕
          </button>
        </div>
        
        <div className="p-4 border-b border-gray-200">
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">택배사 선택</label>
            <select
              value={carrier}
              onChange={(e) => setCarrier(e.target.value)}
              className="block w-full p-2 border border-gray-300 rounded-md"
              disabled={isProcessing || isLoadingCarriers}
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
          </div>
          
          <div className="flex justify-between items-center mb-2">
            <div className="text-sm font-medium text-gray-700">
              송장번호 입력 대상: {shipmentItems.length}건
            </div>
            <div>
              <label className="inline-flex items-center">
                <input
                  type="checkbox"
                  checked={selectAll}
                  onChange={handleSelectAll}
                  className="form-checkbox h-4 w-4 text-green-600"
                  disabled={isProcessing}
                />
                <span className="ml-2 text-sm">전체 선택</span>
              </label>
            </div>
          </div>
        </div>
        
        <div className="overflow-y-auto" style={{ maxHeight: 'calc(90vh - 220px)' }}>
          {shipmentItems.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              송장번호를 등록할 주문이 없습니다
            </div>
          ) : (
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th scope="col" className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-12">
                    선택
                  </th>
                  <th scope="col" className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    주문번호
                  </th>
                  <th scope="col" className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    수령인
                  </th>
                  <th scope="col" className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    송장번호
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {shipmentItems.map((item, index) => (
                  <tr key={item.order_id} className={item.selected ? 'bg-green-50' : ''}>
                    <td className="px-3 py-3 whitespace-nowrap">
                      <input
                        type="checkbox"
                        checked={item.selected}
                        onChange={() => handleSelectItem(index)}
                        className="form-checkbox h-4 w-4 text-green-600"
                        disabled={isProcessing}
                      />
                    </td>
                    <td className="px-3 py-3 whitespace-nowrap text-sm">
                      {item.order_number}
                    </td>
                    <td className="px-3 py-3 whitespace-nowrap text-sm">
                      {item.recipient}
                    </td>
                    <td className="px-3 py-3 whitespace-nowrap">
                      <input
                        type="text"
                        value={item.tracking_number}
                        onChange={(e) => handleTrackingNumberChange(index, e.target.value)}
                        placeholder="송장번호 입력"
                        className={`p-1 text-sm border rounded w-full ${
                          item.selected ? 'border-green-300' : 'border-gray-300'
                        }`}
                        disabled={isProcessing || !item.selected}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
        
        <div className="p-4 border-t border-gray-200 flex justify-between">
          <div className="text-sm text-gray-500">
            {shipmentItems.filter(item => item.selected).length}건 선택됨
          </div>
          <div className="flex gap-2">
            <Button
              onClick={onClose}
              className="bg-gray-200 text-gray-800 hover:bg-gray-300"
              disabled={isProcessing}
            >
              취소
            </Button>
            <Button
              onClick={handleBulkSubmit}
              disabled={
                isProcessing || 
                shipmentItems.filter(item => item.selected).length === 0 ||
                !carrier
              }
              className="bg-green-600 text-white hover:bg-green-700"
            >
              {isProcessing ? <Spinner size="sm" /> : '일괄 등록'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
} 