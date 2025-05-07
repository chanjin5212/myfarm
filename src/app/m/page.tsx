'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { Spinner } from '@/components/ui/CommonStyles';
import { ChevronRight, Leaf, CalendarDays, Truck, ShoppingBag } from "lucide-react";
import React, { ReactNode } from 'react';

// UI 컴포넌트 직접 구현
type ButtonProps = {
  children: ReactNode;
  className?: string;
  variant?: 'default' | 'outline';
  type?: 'button' | 'submit' | 'reset';
  size?: 'default' | 'sm';
  [x: string]: any;
};

const Button = ({ 
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
};

type CardProps = {
  children: ReactNode;
  className?: string;
  [x: string]: any;
};

const Card = ({ children, className = "", ...props }: CardProps) => {
  return (
    <div
      className={`rounded-lg border border-gray-200 bg-white shadow-sm ${className}`}
      {...props}
    >
      {children}
    </div>
  );
};

type CardContentProps = {
  children: ReactNode;
  className?: string;
  [x: string]: any;
};

const CardContent = ({ children, className = "", ...props }: CardContentProps) => {
  return (
    <div className={`p-4 ${className}`} {...props}>
      {children}
    </div>
  );
};

type BadgeProps = {
  children: ReactNode;
  className?: string;
  [x: string]: any;
};

const Badge = ({ children, className = "", ...props }: BadgeProps) => {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${className}`}
      {...props}
    >
      {children}
    </span>
  );
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

function HomePage() {
  const [featuredProducts, setFeaturedProducts] = useState<Product[]>([]);
  const [newProducts, setNewProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchHomeData() {
      try {
        // 추천 상품
        const featuredRes = await fetch('/api/products?featured=true&limit=4');
        const featuredData = await featuredRes.json();
        
        // 신상품
        const newRes = await fetch('/api/products?sort=newest&limit=4');
        const newData = await newRes.json();
        
        // 카테고리
        const categoryRes = await fetch('/api/categories');
        const categoryData = await categoryRes.json();
        
        setFeaturedProducts(featuredData.products || []);
        setNewProducts(newData.products || []);
        setCategories(categoryData.categories || []);
      } catch (error) {
        console.error('홈 데이터 로딩 오류:', error);
      } finally {
        setLoading(false);
      }
    }
    
    fetchHomeData();
  }, []);

  // 상품 카드 컴포넌트
  const ProductCard = ({ product }: { product: Product }) => {
    const discount = product.discount_price 
      ? Math.round(((product.price - product.discount_price) / product.price) * 100) 
      : 0;
    
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
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[60vh] bg-white">
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <div className="flex flex-col pb-4">
      {/* 히어로 섹션 */}
      <section className="w-full py-8 bg-green-50">
        <div className="px-5">
          <div className="flex flex-col gap-5">
            <div className="space-y-3">
              <div className="inline-block rounded-md bg-green-100 px-3 py-1 text-sm font-medium text-green-800">
                신선 농산물
              </div>
              <h1 className="text-2xl font-bold tracking-tight text-gray-900">
                제철 농산물로<br />건강한 식탁을 차려보세요
              </h1>
              <p className="text-base text-gray-700 leading-relaxed">
                직접 재배한 신선한 농산물을 집으로 배송해 드립니다. 강원찐농부의 정성이 담긴 제철 식재료로 맛있는 식사를 준비하세요.
              </p>
              <div className="flex flex-col gap-3 sm:flex-row mt-4">
                <Button className="w-full sm:w-auto">
                  <ShoppingBag className="mr-1.5 h-4 w-4" />
                  지금 쇼핑하기
                </Button>
                <Button variant="outline" className="w-full sm:w-auto">
                  제철 상품 보기
                  <ChevronRight className="ml-1 h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
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

      {/* 특징 섹션 */}
      <section className="w-full py-8 mt-6">
        <div className="px-5">
          <div className="flex flex-col items-center justify-center space-y-3 text-center mb-5">
            <div className="inline-block rounded-md bg-green-100 px-3 py-1 text-sm font-medium text-green-800 mb-1">
            강원찐농부의 약속
            </div>
            <h2 className="text-xl font-bold text-gray-900">신선함을 전해드립니다</h2>
            <p className="text-base text-gray-700">
              농장에서 식탁까지, 최고의 품질과 신선함을 약속합니다
            </p>
          </div>
          <div className="grid grid-cols-1 gap-4 py-2">
            <div className="flex items-center space-x-4 rounded-xl border p-4 shadow-sm bg-white">
              <div className="flex-shrink-0 bg-green-100 rounded-full p-3">
                <Leaf className="h-7 w-7 text-green-600" />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-bold text-gray-900">유기농 재배</h3>
                <p className="text-sm text-gray-700">친환경 농법으로 재배된 안전한 농산물만을 엄선합니다</p>
              </div>
            </div>
            <div className="flex items-center space-x-4 rounded-xl border p-4 shadow-sm bg-white">
              <div className="flex-shrink-0 bg-green-100 rounded-full p-3">
                <CalendarDays className="h-7 w-7 text-green-600" />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-bold text-gray-900">제철 상품</h3>
                <p className="text-sm text-gray-700">계절마다 가장 맛있는 제철 농산물을 제공합니다</p>
              </div>
            </div>
            <div className="flex items-center space-x-4 rounded-xl border p-4 shadow-sm bg-white">
              <div className="flex-shrink-0 bg-green-100 rounded-full p-3">
                <Truck className="h-7 w-7 text-green-600" />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-bold text-gray-900">당일 배송</h3>
                <p className="text-sm text-gray-700">오전 주문 시 당일 배송으로 가장 신선한 상태로 받아보세요</p>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

export default function MobilePage() {
  return <HomePage />;
} 