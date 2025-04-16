'use client';

import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { StarIcon } from '@heroicons/react/24/solid';
import { StarIcon as StarIconOutline, HandThumbUpIcon } from '@heroicons/react/24/outline';
import Image from 'next/image';
import { checkToken, getAuthHeader } from '@/utils/auth';
import { toast } from 'react-hot-toast';

interface Review {
  id: number;
  product_id: number;
  user_id: number;
  order_item_id: number;
  rating: number;
  title: string;
  content: string;
  created_at: string;
  helpful_count: number;
  status: string;
  username: string;
  images?: string[];
  replies?: ReviewReply[];
}

interface ReviewReply {
  id: number;
  review_id: number;
  user_id: number;
  content: string;
  created_at: string;
  username: string;
  is_admin: boolean;
}

interface ReviewTabProps {
  productId: number;
}

export default function ReviewTab({ productId }: ReviewTabProps) {
  // useSession 대신 기존 인증 시스템 사용
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [user, setUser] = useState<any>(null);
  
  const [reviews, setReviews] = useState<Review[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showReviewForm, setShowReviewForm] = useState(false);
  const [rating, setRating] = useState(5);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [reviewImages, setReviewImages] = useState<File[]>([]);
  const [canReview, setCanReview] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [sortBy, setSortBy] = useState('recent'); // 'recent', 'highest', 'lowest', 'helpful'
  const [reviewsCount, setReviewsCount] = useState(0);
  const [averageRating, setAverageRating] = useState(0);

  // 로그인 상태를 확인하고 업데이트하는 함수
  const updateLoginStatus = () => {
    const { user: currentUser, isLoggedIn: loginStatus } = checkToken();
    setUser(currentUser);
    setIsLoggedIn(loginStatus);
  };

  // 컴포넌트 마운트 시와 로그인 상태 변경 시 상태 업데이트
  useEffect(() => {
    updateLoginStatus();
    
    const handleLoginStatusChange = () => {
      updateLoginStatus();
    };
    
    window.addEventListener('login-status-change', handleLoginStatusChange);
    
    return () => {
      window.removeEventListener('login-status-change', handleLoginStatusChange);
    };
  }, []);

  // 리뷰 가져오기
  useEffect(() => {
    fetchReviews();
    if (isLoggedIn) {
      checkCanReview();
    }
  }, [productId, page, sortBy, isLoggedIn]);

  const fetchReviews = async () => {
    try {
      setIsLoading(true);
      const response = await axios.get(`/api/products/${productId}/reviews`, {
        params: { page, limit: 5, sort: sortBy }
      });
      
      if (page === 1) {
        setReviews(response.data.reviews);
      } else {
        setReviews(prev => [...prev, ...response.data.reviews]);
      }
      
      setHasMore(response.data.reviews.length === 5);
      setReviewsCount(response.data.total);
      setAverageRating(response.data.averageRating);
      setError(null);
    } catch (err) {
      setError('리뷰를 불러오는 데 실패했습니다.');
      console.error('리뷰 불러오기 오류:', err);
    } finally {
      setIsLoading(false);
    }
  };

  // 리뷰 작성 가능 여부 확인
  const checkCanReview = async () => {
    if (!isLoggedIn) {
      setCanReview(false);
      return;
    }

    try {
      // 인증 헤더 추가
      const headers = getAuthHeader();
      
      const response = await axios.get(`/api/users/me/can-review/${productId}`, { 
        headers 
      });
      setCanReview(response.data.canReview);
    } catch (err) {
      console.error('리뷰 작성 가능 여부 확인 오류:', err);
      setCanReview(false);
    }
  };

  // 리뷰 작성 제출
  const handleSubmitReview = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!isLoggedIn) {
      toast.error('로그인이 필요합니다.');
      return;
    }

    if (!title.trim() || !content.trim()) {
      toast.error('제목과 내용을 모두 입력해주세요.');
      return;
    }

    try {
      const formData = new FormData();
      formData.append('product_id', productId.toString());
      formData.append('rating', rating.toString());
      formData.append('title', title);
      formData.append('content', content);
      
      // 이미지 추가
      reviewImages.forEach(image => {
        formData.append('images', image);
      });

      // 인증 헤더를 포함하여 요청
      const headers = {
        ...getAuthHeader(),
        'Content-Type': 'multipart/form-data'
      };

      await axios.post('/api/reviews', formData, { headers });

      toast.success('리뷰가 등록되었습니다.');
      setShowReviewForm(false);
      setRating(5);
      setTitle('');
      setContent('');
      setReviewImages([]);
      setPage(1);
      fetchReviews();
      checkCanReview();
    } catch (err) {
      toast.error('리뷰 등록에 실패했습니다.');
      console.error('리뷰 등록 오류:', err);
    }
  };

  // 리뷰 이미지 추가
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const fileArray = Array.from(e.target.files);
      if (fileArray.length + reviewImages.length > 3) {
        toast.error('이미지는 최대 3개까지 업로드할 수 있습니다.');
        return;
      }
      setReviewImages(prev => [...prev, ...fileArray]);
    }
  };

  // 리뷰 이미지 삭제
  const removeImage = (index: number) => {
    setReviewImages(prev => prev.filter((_, i) => i !== index));
  };

  // 도움이 됐어요 클릭
  const handleHelpfulClick = async (reviewId: number) => {
    if (!isLoggedIn) {
      toast.error('로그인이 필요합니다.');
      return;
    }

    try {
      // 인증 헤더 추가
      const headers = getAuthHeader();
      
      await axios.post(`/api/reviews/${reviewId}/helpful`, {}, { headers });
      
      // 리뷰 목록 업데이트
      setReviews(prev => 
        prev.map(review => 
          review.id === reviewId 
            ? { ...review, helpful_count: review.helpful_count + 1 } 
            : review
        )
      );
      
      toast.success('도움이 됐어요를 선택했습니다.');
    } catch (err) {
      toast.error('처리 중 오류가 발생했습니다.');
      console.error('도움이 됐어요 오류:', err);
    }
  };

  // 리뷰 등록 폼 표시/숨김
  const toggleReviewForm = () => {
    if (!isLoggedIn) {
      toast.error('로그인이 필요합니다.');
      return;
    }
    
    if (!canReview) {
      toast.error('상품을 구매한 후에 리뷰를 작성할 수 있습니다.');
      return;
    }
    
    setShowReviewForm(!showReviewForm);
  };

  // 더 많은 리뷰 로드
  const loadMoreReviews = () => {
    setPage(prev => prev + 1);
  };

  // 정렬 방식 변경
  const handleSortChange = (newSort: string) => {
    if (sortBy !== newSort) {
      setSortBy(newSort);
      setPage(1);
    }
  };

  // 날짜 포맷팅 (n일 전)
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
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
  };

  return (
    <div className="mt-8">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-semibold">상품 리뷰 ({reviewsCount})</h2>
        <button
          onClick={toggleReviewForm}
          className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors"
        >
          리뷰 작성하기
        </button>
      </div>

      {/* 리뷰 요약 */}
      <div className="bg-gray-50 p-4 rounded-lg mb-6 flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <div className="flex">
            {Array.from({ length: 5 }).map((_, i) => (
              i < Math.round(averageRating) ? (
                <StarIcon key={i} className="h-5 w-5 text-yellow-400" />
              ) : (
                <StarIconOutline key={i} className="h-5 w-5 text-yellow-400" />
              )
            ))}
          </div>
          <span className="font-medium text-lg">{averageRating.toFixed(1)}</span>
        </div>
        <div className="flex space-x-2">
          <button 
            className={`px-3 py-1 rounded-full text-sm ${sortBy === 'recent' ? 'bg-green-600 text-white' : 'bg-gray-200'}`}
            onClick={() => handleSortChange('recent')}
          >
            최신순
          </button>
          <button 
            className={`px-3 py-1 rounded-full text-sm ${sortBy === 'highest' ? 'bg-green-600 text-white' : 'bg-gray-200'}`}
            onClick={() => handleSortChange('highest')}
          >
            별점 높은순
          </button>
          <button 
            className={`px-3 py-1 rounded-full text-sm ${sortBy === 'lowest' ? 'bg-green-600 text-white' : 'bg-gray-200'}`}
            onClick={() => handleSortChange('lowest')}
          >
            별점 낮은순
          </button>
          <button 
            className={`px-3 py-1 rounded-full text-sm ${sortBy === 'helpful' ? 'bg-green-600 text-white' : 'bg-gray-200'}`}
            onClick={() => handleSortChange('helpful')}
          >
            추천순
          </button>
        </div>
      </div>

      {/* 리뷰 작성 폼 */}
      {showReviewForm && (
        <div className="bg-white p-6 mb-6 border rounded-lg shadow-sm">
          <h3 className="text-lg font-medium mb-4">리뷰 작성</h3>
          <form onSubmit={handleSubmitReview}>
            <div className="mb-4">
              <label className="block text-sm font-medium mb-2">별점</label>
              <div className="flex space-x-1">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    onClick={() => setRating(star)}
                    className="focus:outline-none"
                  >
                    {star <= rating ? (
                      <StarIcon className="h-8 w-8 text-yellow-400" />
                    ) : (
                      <StarIconOutline className="h-8 w-8 text-yellow-400" />
                    )}
                  </button>
                ))}
              </div>
            </div>
            <div className="mb-4">
              <label htmlFor="title" className="block text-sm font-medium mb-2">
                제목
              </label>
              <input
                type="text"
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                placeholder="리뷰 제목을 입력하세요"
                maxLength={50}
                required
              />
            </div>
            <div className="mb-4">
              <label htmlFor="content" className="block text-sm font-medium mb-2">
                내용
              </label>
              <textarea
                id="content"
                value={content}
                onChange={(e) => setContent(e.target.value)}
                className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                rows={5}
                placeholder="상품에 대한 리뷰를 작성해주세요"
                maxLength={500}
                required
              />
            </div>
            <div className="mb-4">
              <label className="block text-sm font-medium mb-2">
                이미지 (최대 3개)
              </label>
              <div className="flex items-center space-x-2">
                <label className="cursor-pointer px-4 py-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300">
                  이미지 추가
                  <input
                    type="file"
                    className="hidden"
                    accept="image/*"
                    onChange={handleImageUpload}
                    multiple
                  />
                </label>
                <span className="text-sm text-gray-500">
                  {reviewImages.length}/3
                </span>
              </div>
              {reviewImages.length > 0 && (
                <div className="mt-2 flex space-x-2">
                  {reviewImages.map((img, index) => (
                    <div key={index} className="relative">
                      <img
                        src={URL.createObjectURL(img)}
                        alt={`리뷰 이미지 ${index + 1}`}
                        className="w-20 h-20 object-cover rounded"
                      />
                      <button
                        type="button"
                        onClick={() => removeImage(index)}
                        className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 w-5 h-5 flex items-center justify-center text-xs"
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div className="flex space-x-2">
              <button
                type="submit"
                className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors"
              >
                등록하기
              </button>
              <button
                type="button"
                onClick={() => setShowReviewForm(false)}
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 transition-colors"
              >
                취소
              </button>
            </div>
          </form>
        </div>
      )}

      {/* 리뷰 목록 */}
      {isLoading && page === 1 ? (
        <div className="text-center py-8">
          <p>리뷰를 불러오는 중입니다...</p>
        </div>
      ) : error ? (
        <div className="text-center py-8 text-red-500">
          <p>{error}</p>
        </div>
      ) : reviews.length === 0 ? (
        <div className="text-center py-8 bg-gray-50 rounded-lg">
          <p className="text-gray-500">아직 리뷰가 없습니다. 첫 리뷰를 작성해보세요!</p>
        </div>
      ) : (
        <div className="space-y-6">
          {reviews.map((review) => (
            <div key={review.id} className="border rounded-lg p-4">
              <div className="flex justify-between">
                <div>
                  <div className="flex items-center space-x-2 mb-2">
                    <div className="flex">
                      {Array.from({ length: 5 }).map((_, i) => (
                        i < review.rating ? (
                          <StarIcon key={i} className="h-5 w-5 text-yellow-400" />
                        ) : (
                          <StarIconOutline key={i} className="h-5 w-5 text-yellow-400" />
                        )
                      ))}
                    </div>
                    <span className="font-medium">{review.username}</span>
                    <span className="text-gray-500 text-sm">
                      {formatDate(review.created_at)}
                    </span>
                  </div>
                  <h3 className="font-medium text-lg mb-1">{review.title}</h3>
                  <p className="text-gray-700 mb-3 whitespace-pre-line">{review.content}</p>
                </div>
                <button
                  onClick={() => handleHelpfulClick(review.id)}
                  className="flex items-center space-x-1 text-gray-500 hover:text-gray-700"
                >
                  <HandThumbUpIcon className="h-5 w-5" />
                  <span>{review.helpful_count}</span>
                </button>
              </div>
              
              {/* 리뷰 이미지 */}
              {review.images && review.images.length > 0 && (
                <div className="mt-3 flex space-x-2">
                  {review.images.map((imgUrl, index) => (
                    <div key={index} className="relative">
                      <Image
                        src={imgUrl}
                        alt={`리뷰 이미지 ${index + 1}`}
                        width={80}
                        height={80}
                        className="object-cover rounded"
                      />
                    </div>
                  ))}
                </div>
              )}
              
              {/* 리뷰 답변 */}
              {review.replies && review.replies.length > 0 && (
                <div className="mt-4 bg-gray-50 p-3 rounded">
                  {review.replies.map((reply) => (
                    <div key={reply.id} className="mb-2 last:mb-0">
                      <div className="flex items-center space-x-2 mb-1">
                        <span className="font-medium">
                          {reply.is_admin ? '관리자' : reply.username}
                        </span>
                        <span className="text-gray-500 text-sm">
                          {formatDate(reply.created_at)}
                        </span>
                      </div>
                      <p className="text-gray-700">{reply.content}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
          
          {/* 더 보기 버튼 */}
          {hasMore && (
            <div className="text-center py-4">
              <button
                onClick={loadMoreReviews}
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 transition-colors"
                disabled={isLoading}
              >
                {isLoading ? '불러오는 중...' : '더 보기'}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
} 