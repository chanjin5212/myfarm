'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';

interface Product {
  id: string;
  name: string;
  price: number;
  discount_price?: number;
  thumbnail_url?: string;
  stock: number;
  status: string;
  category_id?: string;
}

interface Category {
  id: string;
  name: string;
  parent_id?: string;
}

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const response = await fetch('/api/categories');
        if (!response.ok) {
          throw new Error('카테고리 정보를 불러오는데 실패했습니다.');
        }
        const data = await response.json();
        setCategories(data);
      } catch (err) {
        console.error('카테고리 로딩 오류:', err);
        setError('카테고리 정보를 불러오는데 실패했습니다.');
      }
    };

    fetchCategories();
  }, []);

  useEffect(() => {
    const fetchProducts = async () => {
      setLoading(true);
      try {
        let url = '/api/products';
        if (selectedCategory) {
          url += `?category=${selectedCategory}`;
        }
        const response = await fetch(url);
        if (!response.ok) {
          throw new Error('상품 정보를 불러오는데 실패했습니다.');
        }
        const data = await response.json();
        setProducts(data);
        setError(null);
      } catch (err) {
        console.error('상품 로딩 오류:', err);
        setError('상품 정보를 불러오는데 실패했습니다.');
        setProducts([]);
      } finally {
        setLoading(false);
      }
    };

    fetchProducts();
  }, [selectedCategory]);

  const handleCategoryChange = (categoryId: string) => {
    setSelectedCategory(categoryId);
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-8">상품 목록</h1>

      {/* 카테고리 필터 */}
      <div className="mb-8">
        <h2 className="text-xl font-semibold mb-4">카테고리</h2>
        <div className="flex flex-wrap gap-2">
          <button
            className={`px-4 py-2 rounded ${
              selectedCategory === '' ? 'bg-green-600 text-white' : 'bg-gray-200'
            }`}
            onClick={() => handleCategoryChange('')}
          >
            전체
          </button>
          {categories.length > 0 ? (
            categories.map((category) => (
              <button
                key={category.id}
                className={`px-4 py-2 rounded ${
                  selectedCategory === category.id ? 'bg-green-600 text-white' : 'bg-gray-200'
                }`}
                onClick={() => handleCategoryChange(category.id)}
              >
                {category.name}
              </button>
            ))
          ) : (
            <div className="text-gray-500">카테고리 정보를 불러오는 중...</div>
          )}
        </div>
      </div>

      {loading ? (
        <div className="text-center py-10">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-green-500"></div>
          <p className="mt-2 text-gray-600">상품을 불러오는 중...</p>
        </div>
      ) : error ? (
        <div className="text-center py-10 text-red-600">{error}</div>
      ) : products.length === 0 ? (
        <div className="text-center py-10 text-gray-600">
          <p>등록된 상품이 없습니다.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {products.map((product) => (
            <Link href={`/products/${product.id}`} key={product.id}>
              <div className="bg-white rounded-lg overflow-hidden shadow-md hover:shadow-lg transition-shadow duration-300 h-full flex flex-col">
                <div className="relative h-48 w-full">
                  <Image
                    src={product.thumbnail_url || 'https://via.placeholder.com/300'}
                    alt={product.name}
                    fill
                    sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                    className="object-cover"
                  />
                  {product.discount_price && (
                    <div className="absolute top-2 left-2 bg-red-500 text-white px-2 py-1 rounded text-xs font-semibold">
                      {Math.round(((product.price - product.discount_price) / product.price) * 100)}% 할인
                    </div>
                  )}
                  {product.stock <= 0 && (
                    <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center">
                      <span className="text-white font-bold text-lg">품절</span>
                    </div>
                  )}
                </div>
                <div className="p-4 flex-grow">
                  <h3 className="text-lg font-semibold mb-2 line-clamp-2">{product.name}</h3>
                  <div className="flex items-baseline">
                    {product.discount_price ? (
                      <>
                        <span className="text-gray-400 line-through text-sm mr-2">
                          {product.price.toLocaleString()}원
                        </span>
                        <span className="text-lg font-bold text-green-600">
                          {product.discount_price.toLocaleString()}원
                        </span>
                      </>
                    ) : (
                      <span className="text-lg font-bold text-green-600">
                        {product.price.toLocaleString()}원
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
} 