'use client';

import { useState, useEffect, memo, useMemo, useRef } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { ChevronRight } from "lucide-react";
import React, { ReactNode } from 'react';

// Button 컴포넌트 메모이제이션
const Button = memo(({ 
  children, 
  className = "", 
  variant = "default", 
  type = "button",
  size = "default",
  ...props 
}: ButtonProps) => {
  const baseStyles = "inline-flex items-center justify-center rounded-md font-medium transition-colors focus-visible:outline-none disabled:opacity-50";
  
  const variantStyles = {
    default: "bg-green-600 hover:bg-green-700 text-white",
    outline: "border border-green-600 text-green-700 hover:bg-green-50"
  };
  
  const sizeStyles = {
    default: "h-11 px-4 py-2 text-sm",
    sm: "h-9 px-3 py-1 text-xs"
  };
  
  return (
    <button
      type={type}
      className={`${baseStyles} ${variantStyles[variant]} ${sizeStyles[size]} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
});

Button.displayName = 'Button';

// 타입 정의
type ButtonProps = {
  children: ReactNode;
  className?: string;
  variant?: 'default' | 'outline';
  type?: 'button' | 'submit' | 'reset';
  size?: 'default' | 'sm';
  [x: string]: any;
};

// 메모이제이션된 컴포넌트로 변경
const Card = memo(({ children, className = "", ...props }: CardProps) => {
  return (
    <div
      className={`rounded-lg border border-gray-200 bg-white shadow-sm ${className}`}
      {...props}
    >
      {children}
    </div>
  );
});

Card.displayName = 'Card';

type CardProps = {
  children: ReactNode;
  className?: string;
  [x: string]: any;
};

const CardContent = memo(({ children, className = "", ...props }: CardContentProps) => {
  return (
    <div className={`p-4 ${className}`} {...props}>
      {children}
    </div>
  );
});

CardContent.displayName = 'CardContent';

type CardContentProps = {
  children: ReactNode;
  className?: string;
  [x: string]: any;
};

const Badge = memo(({ children, className = "", ...props }: BadgeProps) => {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${className}`}
      {...props}
    >
      {children}
    </span>
  );
});

Badge.displayName = 'Badge';

type BadgeProps = {
  children: ReactNode;
  className?: string;
  [x: string]: any;
};

interface Product {
  id: string;
  name: string;
  price: number;
  thumbnail_url?: string;
  is_organic?: boolean;
}

interface Category {
  id: string;
  name: string;
  image?: string;
}

// 배너 슬라이더 컴포넌트
const BannerSlider = memo(() => {
  const originalBanners = [
    { id: 1, src: '/images/banner1.png', alt: '강원찐농부 배너 1' },
    { id: 2, src: '/images/banner2.png', alt: '강원찐농부 배너 2' }
  ];
  
  const [currentIndex, setCurrentIndex] = useState(1); // 1부터 시작 (실제 첫 번째 배너)
  const [transition, setTransition] = useState(true);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  // 실제 렌더링할 배열 구성 (마지막 + 전체 + 첫번째)
  const banners = [originalBanners[originalBanners.length - 1], ...originalBanners, originalBanners[0]];
  
  // 자동 슬라이드
  useEffect(() => {
    timeoutRef.current = setTimeout(() => {
      setTransition(true);
      setCurrentIndex(prevIndex => prevIndex + 1);
    }, 5000);
    
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [currentIndex]);
  
  // 트랜지션이 끝났을 때 처리
  const handleTransitionEnd = () => {
    // 마지막 슬라이드(복제된 첫번째)에 도달했을 때
    if (currentIndex === banners.length - 1) {
      setTransition(false); // 트랜지션 효과 끄기
      setCurrentIndex(1); // 실제 첫번째 슬라이드로 즉시 이동
    }
  };
  
  // 인디케이터 클릭 시 해당 배너로 이동
  const goToSlide = (index: number) => {
    setCurrentIndex(index);
    setTransition(true);
  };
  
  return (
    <div className="relative w-full overflow-hidden">
      <div 
        className="flex" 
        style={{ 
          transform: `translateX(-${currentIndex * 100 / banners.length}%)`,
          transition: transition ? 'transform 0.5s ease-in-out' : 'none',
          width: `${banners.length * 100}%`
        }}
        onTransitionEnd={handleTransitionEnd}
      >
        {banners.map((banner, i) => (
          <div 
            key={i} 
            className="w-full flex-shrink-0" 
            style={{ width: `${100 / banners.length}%` }}
          >
            <Image
              src={typeof banner === 'object' ? banner.src : ''}
              alt={typeof banner === 'object' ? banner.alt : '배너 이미지'}
              width={1200}
              height={400}
              className="w-full h-auto"
              priority={i === 1} // 첫 번째 실제 배너에 priority 적용
              quality={80}
            />
          </div>
        ))}
      </div>
      
      {/* 인디케이터 */}
      <div className="absolute bottom-3 left-0 right-0 flex justify-center gap-1.5 z-10">
        {originalBanners.map((_, index) => (
          <button
            key={index}
            onClick={() => goToSlide(index + 1)} // 실제 배너는 인덱스 1부터 시작
            className={`w-2 h-2 rounded-full ${
              index === (currentIndex - 1) % originalBanners.length 
                ? 'bg-white' 
                : 'bg-white/50'
            }`}
            aria-label={`배너 ${index + 1}로 이동`}
          />
        ))}
      </div>
    </div>
  );
});

BannerSlider.displayName = 'BannerSlider';

// 상품 카드 컴포넌트 메모이제이션
const ProductCard = memo(({ product }: { product: Product }) => {
  return (
    <Link href={`/m/products/${product.id}`} className="block">
      <div className="rounded-lg overflow-hidden shadow-sm hover:shadow-md transition-shadow bg-white">
        <div className="relative aspect-square">
          <Image
            src={product.thumbnail_url || '/images/default-product.jpg'}
            alt={product.name}
            fill
            sizes="(max-width: 768px) 50vw, 33vw"
            className="object-cover"
            loading="lazy"
            placeholder="blur"
            blurDataURL="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII="
          />
          {product.is_organic && (
            <span className="absolute top-2 left-2 bg-green-100 text-green-800 text-xs font-semibold px-2 py-1 rounded-full">
              유기농
            </span>
          )}
        </div>
        <div className="p-3">
          <h3 className="font-medium text-sm truncate">{product.name}</h3>
          <div className="mt-1">
            <span className="font-bold">{product.price.toLocaleString()}원</span>
          </div>
        </div>
      </div>
    </Link>
  );
});

ProductCard.displayName = 'ProductCard';

function HomePage() {
  const [featuredProducts, setFeaturedProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    
    async function fetchHomeData() {
      try {
        // 추천 상품만 먼저 로드하여 화면에 빠르게 표시
        const featuredRes = await fetch('/api/products?featured=true&limit=4');
        const featuredData = await featuredRes.json();
        
        if (isMounted) {
          setFeaturedProducts(featuredData.products || []);
          setLoading(false);
        }
      } catch (error) {
        console.error('홈 데이터 로딩 오류:', error);
        if (isMounted) {
          setLoading(false);
        }
      }
    }
    
    fetchHomeData();
    
    // 클린업 함수에서 마운트 상태 추적
    return () => {
      isMounted = false;
    };
  }, []);

  return (
    <div className="flex flex-col pb-4">
      {/* 배너 슬라이더로 변경 */}
      <section className="w-full">
        <BannerSlider />
      </section>

      {/* 추천 상품 */}
      <section className="mt-1 px-5">
        <div className="flex justify-between items-center mb-4 mt-8">
          <h2 className="text-xl font-bold text-gray-900">추천 상품</h2>
          <Link href="/m/products?featured=true" className="text-sm font-medium text-green-600 flex items-center">
            더보기
            <ChevronRight className="ml-0.5 h-4 w-4" />
          </Link>
        </div>
        <div className="grid grid-cols-2 gap-3">
          {featuredProducts.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      </section>
    </div>
  );
}

export default memo(function MobilePage() {
  return <HomePage />;
}); 