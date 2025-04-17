'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { Spinner } from '@/components/ui/CommonStyles';

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

// 슬라이더 컴포넌트
function BannerSlider() {
  const [currentSlide, setCurrentSlide] = useState(0);
  const banners = [
    { id: 1, image: '/images/banner1.jpg', title: '신선한 유기농 채소', link: '/m/products?category=vegetables' },
    { id: 2, image: '/images/banner2.jpg', title: '제철 과일 할인', link: '/m/products?category=fruits' },
    { id: 3, image: '/images/banner3.jpg', title: '건강한 식탁', link: '/m/products?category=healthy' },
  ];

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % banners.length);
    }, 5000);
    return () => clearInterval(timer);
  }, [banners.length]);

  return (
    <div className="relative overflow-hidden h-48">
      <div 
        className="flex transition-transform duration-500 ease-in-out h-full"
        style={{ transform: `translateX(-${currentSlide * 100}%)` }}
      >
        {banners.map((banner) => (
          <div key={banner.id} className="w-full h-full flex-shrink-0">
            <Link href={banner.link}>
              <div className="relative w-full h-full">
                <Image 
                  src={banner.image} 
                  alt={banner.title}
                  fill
                  className="object-cover"
                  sizes="100vw"
                  priority={banner.id === 1}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent flex items-end p-4">
                  <h3 className="text-white font-bold text-xl drop-shadow-md">{banner.title}</h3>
                </div>
              </div>
            </Link>
          </div>
        ))}
      </div>
      
      {/* 페이지 인디케이터 */}
      <div className="absolute bottom-3 left-0 right-0 flex justify-center space-x-2">
        {banners.map((_, index) => (
          <button 
            key={index}
            className={`w-2 h-2 rounded-full ${currentSlide === index ? 'bg-white' : 'bg-white/50'}`}
            onClick={() => setCurrentSlide(index)}
          />
        ))}
      </div>
    </div>
  );
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
      <div className="flex flex-col justify-center items-center min-h-[60vh] bg-white">
        <Spinner size="lg" />
        <p className="mt-4 text-gray-500 text-sm">상품 정보를 불러오는 중입니다...</p>
      </div>
    );
  }

  return (
    <div className="pb-6">
      {/* 배너 슬라이더 */}
      <BannerSlider />
      
      {/* 카테고리 */}
      <section className="mt-6 px-4">
        <h2 className="text-lg font-bold mb-3">카테고리</h2>
        <div className="grid grid-cols-4 gap-2">
          {categories.slice(0, 8).map((category) => (
            <Link key={category.id} href={`/m/products?category=${category.id}`}>
              <div className="flex flex-col items-center">
                <div className="w-14 h-14 bg-green-100 rounded-full flex items-center justify-center mb-1 overflow-hidden">
                  {category.image ? (
                    <Image
                      src={category.image}
                      alt={category.name}
                      width={56}
                      height={56}
                      className="object-cover"
                    />
                  ) : (
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6 text-green-600">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 8.25H7.5a2.25 2.25 0 00-2.25 2.25v9a2.25 2.25 0 002.25 2.25h9a2.25 2.25 0 002.25-2.25v-9a2.25 2.25 0 00-2.25-2.25H15M9 12l3 3m0 0l3-3m-3 3V2.25" />
                    </svg>
                  )}
                </div>
                <span className="text-xs truncate w-full text-center">{category.name}</span>
              </div>
            </Link>
          ))}
        </div>
        {categories.length > 8 && (
          <div className="text-center mt-2">
            <Link href="/m/categories" className="text-sm text-green-600 font-medium">
              전체 카테고리 보기
            </Link>
          </div>
        )}
      </section>
      
      {/* 추천 상품 */}
      <section className="mt-6 px-4">
        <div className="flex justify-between items-center mb-3">
          <h2 className="text-lg font-bold">추천 상품</h2>
          <Link href="/m/products?featured=true" className="text-sm text-green-600">
            더보기
          </Link>
        </div>
        <div className="grid grid-cols-2 gap-3">
          {featuredProducts.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      </section>
      
      {/* 신상품 */}
      <section className="mt-6 px-4">
        <div className="flex justify-between items-center mb-3">
          <h2 className="text-lg font-bold">신상품</h2>
          <Link href="/m/products?sort=newest" className="text-sm text-green-600">
            더보기
          </Link>
        </div>
        <div className="grid grid-cols-2 gap-3">
          {newProducts.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      </section>
    </div>
  );
}

export default function MobilePage() {
  return <HomePage />;
} 