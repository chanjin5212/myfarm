import { useState } from 'react';

interface CancelOrderModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (reason: string) => void;
}

const cancelReasons = [
  { id: 'change_mind', text: '구매자 변심' },
  { id: 'price_comparison', text: '더 저렴한 가격으로 다른 곳에서 구매' },
  { id: 'mistake_order', text: '주문 실수 (수량, 옵션 오류 등)' },
  { id: 'other', text: '기타' }
];

export default function CancelOrderModal({ isOpen, onClose, onConfirm }: CancelOrderModalProps) {
  const [selectedReason, setSelectedReason] = useState('change_mind');
  const [otherReason, setOtherReason] = useState('');
  
  if (!isOpen) return null;
  
  const handleConfirm = () => {
    if (selectedReason === 'other' && otherReason.trim() === '') {
      alert('취소 사유를 입력해주세요.');
      return;
    }
    
    const reason = selectedReason === 'other' 
      ? otherReason.trim() 
      : cancelReasons.find(r => r.id === selectedReason)?.text || '구매자 변심';
    
    onConfirm(reason);
  };
  
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="bg-white rounded-lg w-[90%] max-w-md p-5 mx-4">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold">주문 취소</h3>
          <button onClick={onClose} className="text-gray-500">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        
        <p className="text-gray-600 mb-4">취소 사유를 선택해주세요.</p>
        
        <div className="space-y-2 mb-4">
          {cancelReasons.map((reason) => (
            <div key={reason.id} className="flex items-center">
              <input
                type="radio"
                id={reason.id}
                name="cancelReason"
                value={reason.id}
                checked={selectedReason === reason.id}
                onChange={() => setSelectedReason(reason.id)}
                className="h-4 w-4 text-green-600 border-gray-300 focus:ring-green-500"
              />
              <label htmlFor={reason.id} className="ml-2 block text-sm text-gray-700">
                {reason.text}
              </label>
            </div>
          ))}
        </div>
        
        {selectedReason === 'other' && (
          <div className="mb-4">
            <label htmlFor="otherReason" className="block text-sm font-medium text-gray-700 mb-1">
              기타 사유 입력
            </label>
            <textarea
              id="otherReason"
              value={otherReason}
              onChange={(e) => setOtherReason(e.target.value)}
              placeholder="취소 사유를 입력해주세요."
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-green-500 focus:border-green-500 text-sm"
              rows={3}
            ></textarea>
          </div>
        )}
        
        <div className="mt-5 sm:mt-6 flex space-x-2">
          <button
            onClick={onClose}
            className="flex-1 inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 sm:text-sm"
          >
            취소
          </button>
          <button
            onClick={handleConfirm}
            className="flex-1 inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-green-600 text-base font-medium text-white hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 sm:text-sm"
          >
            확인
          </button>
        </div>
      </div>
    </div>
  );
} 