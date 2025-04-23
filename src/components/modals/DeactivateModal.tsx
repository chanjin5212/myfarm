'use client';

import { useState } from 'react';
import { getAuthHeader, logout } from '@/utils/auth';
import { Spinner } from '@/components/ui/CommonStyles';

interface DeactivateModalProps {
  isOpen: boolean;
  onClose: () => void;
  hasPassword: boolean;
  onComplete: () => void;
}

const deactivationReasons = [
  '서비스가 마음에 들지 않아요',
  '자주 사용하지 않아요',
  '개인정보 보호를 위해서',
  '다른 서비스를 이용할 예정이에요',
  '앱 오류/버그가 많아요',
  '기타'
];

export default function DeactivateModal({
  isOpen,
  onClose,
  hasPassword,
  onComplete
}: DeactivateModalProps) {
  const [reason, setReason] = useState<string>('');
  const [customReason, setCustomReason] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [agreeTerms, setAgreeTerms] = useState(false);
  const [step, setStep] = useState<'confirm' | 'process' | 'complete'>('confirm');

  const handleReasonChange = (selectedReason: string) => {
    setReason(selectedReason);
    if (selectedReason !== '기타') {
      setCustomReason('');
    }
  };

  const handleClose = () => {
    // 모달이 닫힐 때 상태 초기화
    setReason('');
    setCustomReason('');
    setPassword('');
    setError(null);
    setIsSubmitting(false);
    setAgreeTerms(false);
    setStep('confirm');
    onClose();
  };

  const handleSubmit = async () => {
    try {
      setError(null);
      setIsSubmitting(true);

      // 입력 확인
      if (!reason) {
        setError('탈퇴 사유를 선택해주세요.');
        setIsSubmitting(false);
        return;
      }

      if (reason === '기타' && !customReason.trim()) {
        setError('탈퇴 사유를 입력해주세요.');
        setIsSubmitting(false);
        return;
      }

      if (hasPassword && !password) {
        setError('비밀번호를 입력해주세요.');
        setIsSubmitting(false);
        return;
      }

      if (!agreeTerms) {
        setError('탈퇴 동의 사항에 동의해주세요.');
        setIsSubmitting(false);
        return;
      }

      // 최종 사유 데이터
      const finalReason = reason === '기타' ? customReason.trim() : reason;

      // 서버에 탈퇴 요청
      const response = await fetch('/api/users/deactivate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeader()
        },
        body: JSON.stringify({
          password: hasPassword ? password : undefined,
          reason: finalReason
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        setError(errorData.error || '회원 탈퇴 처리 중 오류가 발생했습니다.');
        setIsSubmitting(false);
        return;
      }

      // 성공적인 탈퇴
      setStep('complete');
      setIsSubmitting(false);

      // 5초 후 자동으로 로그아웃 및 메인 페이지로 이동
      setTimeout(() => {
        logout();
        onComplete();
      }, 3000);
    } catch (err) {
      console.error('회원탈퇴 처리 중 오류:', err);
      setError('회원 탈퇴 처리 중 오류가 발생했습니다.');
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md max-h-[90vh] overflow-y-auto">
        <div className="p-5">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-bold">회원탈퇴</h3>
            <button
              onClick={handleClose}
              disabled={isSubmitting}
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

          {step === 'confirm' && (
            <div className="space-y-6">
              <div className="bg-yellow-50 p-4 rounded-md border-l-4 border-yellow-400">
                <div className="flex">
                  <div className="flex-shrink-0">
                    <svg
                      className="h-5 w-5 text-yellow-400"
                      viewBox="0 0 20 20"
                      fill="currentColor"
                    >
                      <path
                        fillRule="evenodd"
                        d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                        clipRule="evenodd"
                      />
                    </svg>
                  </div>
                  <div className="ml-3">
                    <p className="text-sm text-yellow-700">
                      회원 탈퇴 시 모든 개인정보가 삭제되며, 이 작업은 되돌릴 수 없습니다.
                    </p>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    탈퇴 사유를 선택해주세요
                  </label>
                  <div className="space-y-2">
                    {deactivationReasons.map((r) => (
                      <div key={r} className="flex items-center">
                        <input
                          type="radio"
                          id={`reason-${r}`}
                          name="reason"
                          value={r}
                          checked={reason === r}
                          onChange={() => handleReasonChange(r)}
                          className="h-4 w-4 text-green-600 focus:ring-green-500 border-gray-300 rounded"
                        />
                        <label
                          htmlFor={`reason-${r}`}
                          className="ml-3 block text-sm text-gray-700"
                        >
                          {r}
                        </label>
                      </div>
                    ))}
                  </div>
                </div>

                {reason === '기타' && (
                  <div>
                    <label
                      htmlFor="custom-reason"
                      className="block text-sm font-medium text-gray-700 mb-1"
                    >
                      기타 사유를 입력해주세요
                    </label>
                    <textarea
                      id="custom-reason"
                      className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                      rows={3}
                      value={customReason}
                      onChange={(e) => setCustomReason(e.target.value)}
                    ></textarea>
                  </div>
                )}

                {hasPassword && (
                  <div>
                    <label
                      htmlFor="password"
                      className="block text-sm font-medium text-gray-700 mb-1"
                    >
                      비밀번호 확인
                    </label>
                    <input
                      type="password"
                      id="password"
                      placeholder="현재 비밀번호를 입력해주세요"
                      className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                    />
                  </div>
                )}

                <div className="mt-4">
                  <div className="flex items-start">
                    <div className="flex items-center h-5">
                      <input
                        id="agree"
                        name="agree"
                        type="checkbox"
                        checked={agreeTerms}
                        onChange={(e) => setAgreeTerms(e.target.checked)}
                        className="h-4 w-4 text-green-600 focus:ring-green-500 border-gray-300 rounded"
                      />
                    </div>
                    <div className="ml-3 text-sm">
                      <label htmlFor="agree" className="text-gray-700">
                        탈퇴 시 계정 및 개인정보가 영구 삭제되며, 복구가 불가능함에 동의합니다.
                      </label>
                    </div>
                  </div>
                </div>

                {error && (
                  <div className="p-3 text-sm bg-red-50 border border-red-100 text-red-600 rounded-md">
                    {error}
                  </div>
                )}
              </div>

              <div className="space-x-3 flex">
                <button
                  onClick={handleClose}
                  disabled={isSubmitting}
                  className="flex-1 px-4 py-2 bg-gray-200 text-gray-700 rounded-md focus:outline-none"
                >
                  취소
                </button>
                <button
                  onClick={handleSubmit}
                  disabled={isSubmitting}
                  className="flex-1 px-4 py-2 bg-red-600 text-white rounded-md focus:outline-none"
                >
                  {isSubmitting ? (
                    <div className="flex justify-center items-center">
                      <Spinner size="sm" />
                      <span className="ml-2">처리중...</span>
                    </div>
                  ) : (
                    '탈퇴하기'
                  )}
                </button>
              </div>
            </div>
          )}

          {step === 'complete' && (
            <div className="text-center py-5 space-y-4">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-16 w-16 text-green-500 mx-auto"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              <h3 className="text-lg font-medium text-gray-900">탈퇴 처리 완료</h3>
              <p className="text-sm text-gray-600">
                회원 탈퇴가 완료되었습니다. 그동안 이용해 주셔서 감사합니다.
              </p>
              <p className="text-xs text-gray-500">
                잠시 후 자동으로 로그아웃됩니다...
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
} 