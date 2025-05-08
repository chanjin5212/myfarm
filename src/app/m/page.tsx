'use client';

import { useState, useEffect, memo, useMemo, lazy, Suspense } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { Spinner } from '@/components/ui/CommonStyles';
import { ChevronRight, ShoppingBag } from "lucide-react";
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
  discount_price?: number;
  thumbnail_url?: string;
  is_organic?: boolean;
}

interface Category {
  id: string;
  name: string;
  image?: string;
}

// 상품 카드 컴포넌트 메모이제이션
const ProductCard = memo(({ product }: { product: Product }) => {
  const discount = useMemo(() => 
    product.discount_price 
      ? Math.round(((product.price - product.discount_price) / product.price) * 100) 
      : 0
  , [product.price, product.discount_price]);
  
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
            {product.discount_price ? (
              <div className="flex items-baseline space-x-1">
                <span className="line-through text-gray-400 text-xs">{product.price.toLocaleString()}원</span>
                <span className="text-red-500 font-semibold">{discount}%</span>
                <span className="font-bold">{product.discount_price.toLocaleString()}원</span>
              </div>
            ) : (
              <span className="font-bold">{product.price.toLocaleString()}원</span>
            )}
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

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[40vh] bg-white">
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <div className="flex flex-col pb-4">
      {/* 배너 섹션 - 우선순위 높게 로드 */}
      <section className="w-full">
        <div className="relative w-full">
          <Image
            src="/images/banner.png"
            alt="메인 배너"
            width={1200}
            height={400}
            className="w-full h-auto"
            priority
            quality={80}
          />
        </div>
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