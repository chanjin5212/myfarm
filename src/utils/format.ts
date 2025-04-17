/**
 * 가격 형식을 포맷팅하는 유틸리티 함수
 * @param price 포맷팅할 가격
 * @returns 포맷팅된 가격 문자열 (예: '10,000원')
 */
export function formatPrice(price: number | string | undefined | null): string {
  if (price === undefined || price === null) return '0원';
  
  const numPrice = typeof price === 'string' ? parseFloat(price) : price;
  return `${numPrice.toLocaleString()}원`;
}

/**
 * 날짜 형식을 포맷팅하는 유틸리티 함수
 * @param dateString 포맷팅할 날짜 문자열
 * @returns 포맷팅된 날짜 문자열
 */
export function formatDate(dateString: string | Date | undefined | null): string {
  if (!dateString) return '-';
  
  const date = typeof dateString === 'string' ? new Date(dateString) : dateString;
  
  return date.toLocaleString('ko-KR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

/**
 * 상대적 날짜 표시 함수 (예: '3일 전')
 * @param dateString 상대적 날짜로 표시할 날짜 문자열
 * @returns 상대적 날짜 문자열
 */
export function formatRelativeDate(dateString: string | Date | undefined | null): string {
  if (!dateString) return '-';
  
  const date = typeof dateString === 'string' ? new Date(dateString) : dateString;
  const now = new Date();
  const diffTime = Math.abs(now.getTime() - date.getTime());
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
  
  if (diffDays === 0) {
    return '오늘';
  } else if (diffDays < 30) {
    return `${diffDays}일 전`;
  } else if (diffDays < 365) {
    const months = Math.floor(diffDays / 30);
    return `${months}개월 전`;
  } else {
    const years = Math.floor(diffDays / 365);
    return `${years}년 전`;
  }
}

/**
 * 전화번호 포맷팅 함수 (하이픈 추가)
 * @param phoneNumber 포맷팅할 전화번호
 * @returns 포맷팅된 전화번호 문자열
 */
export function formatPhoneNumber(phoneNumber: string | undefined | null): string {
  if (!phoneNumber) return '';
  
  // 이미 하이픈이 있는 경우 그대로 반환
  if (phoneNumber.includes('-')) {
    return phoneNumber;
  }
  
  // 하이픈 없는 숫자만 있는 경우 포맷팅
  const cleaned = phoneNumber.replace(/\D/g, '');
  
  // 01012345678 형식의 휴대폰 번호 -> 010-1234-5678
  if (cleaned.length === 11) {
    return `${cleaned.substring(0, 3)}-${cleaned.substring(3, 7)}-${cleaned.substring(7)}`;
  }
  
  // 0101235678 형식 (가운데 3자리)
  if (cleaned.length === 10) {
    return `${cleaned.substring(0, 3)}-${cleaned.substring(3, 6)}-${cleaned.substring(6)}`;
  }
  
  // 다른 형식은 그대로 반환
  return phoneNumber;
} 