'use client';

import React from 'react';

interface ProductInfoTabProps {
  description: string;
  origin?: string;
  harvestDate?: string;
  storageMethod?: string;
  isOrganic?: boolean;
}

export default function ProductInfoTab({
  description,
  origin,
  harvestDate,
  storageMethod,
  isOrganic
}: ProductInfoTabProps) {
  return (
    <div className="mt-8">
      <h2 className="text-xl font-semibold mb-4">상품 상세정보</h2>
      
      {/* 상품 설명 */}
      <div className="mb-8 whitespace-pre-line">
        {description}
      </div>
      
      {/* 상품 정보 테이블 */}
      <div className="border rounded-lg overflow-hidden">
        <table className="w-full">
          <tbody>
            <tr className="border-b">
              <td className="bg-gray-50 p-4 font-medium w-1/4">원산지</td>
              <td className="p-4">{origin || '국내산'}</td>
            </tr>
            {harvestDate && (
              <tr className="border-b">
                <td className="bg-gray-50 p-4 font-medium">수확일</td>
                <td className="p-4">{new Date(harvestDate).toLocaleDateString()}</td>
              </tr>
            )}
            {storageMethod && (
              <tr className="border-b">
                <td className="bg-gray-50 p-4 font-medium">보관방법</td>
                <td className="p-4">{storageMethod}</td>
              </tr>
            )}
            <tr className="border-b">
              <td className="bg-gray-50 p-4 font-medium">구분</td>
              <td className="p-4">{isOrganic ? '유기농' : '일반'}</td>
            </tr>
            <tr className="border-b">
              <td className="bg-gray-50 p-4 font-medium">배송방법</td>
              <td className="p-4">택배배송</td>
            </tr>
            <tr>
              <td className="bg-gray-50 p-4 font-medium">배송비</td>
              <td className="p-4">3,000원 (30,000원 이상 구매 시 무료배송)</td>
            </tr>
          </tbody>
        </table>
      </div>
      
      {/* 품질보증 및 교환/환불 정책 */}
      <div className="mt-8">
        <h3 className="text-lg font-semibold mb-3">품질보증 및 교환/환불 정책</h3>
        <div className="bg-gray-50 p-4 rounded-lg">
          <ul className="list-disc pl-5 space-y-2 text-gray-700">
            <li>상품 수령 후 24시간 이내에 상품 상태 확인을 권장합니다.</li>
            <li>신선식품의 특성상 단순 변심에 의한 교환 및 환불은 불가능합니다.</li>
            <li>상품 하자 및 오배송의 경우, 수령 후 24시간 이내 고객센터로 연락 주시기 바랍니다.</li>
            <li>상품 이미지는 실제와 다를 수 있으며, 패키지 변경될 수 있습니다.</li>
            <li>자세한 교환/환불 규정은 홈페이지 하단의 이용약관을 참고하시기 바랍니다.</li>
          </ul>
        </div>
      </div>
    </div>
  );
} 