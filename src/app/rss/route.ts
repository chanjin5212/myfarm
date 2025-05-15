import { Feed } from 'feed';
import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET() {
  // 최신 20개 상품만 노출
  const { data: products, error } = await supabase
    .from('products')
    .select('*')
    .eq('status', 'active')
    .order('created_at', { ascending: false })
    .limit(20);

  if (error) {
    return new NextResponse('상품 정보를 불러오지 못했습니다.', { status: 500 });
  }

  const feed = new Feed({
    title: '강원농부 신상품 RSS',
    description: '강원농부의 최신 상품 소식',
    id: 'https://gangwonnongbu.co.kr/',
    link: 'https://gangwonnongbu.co.kr/',
    language: 'ko',
    favicon: 'https://gangwonnongbu.co.kr/favicon.ico',
    copyright: `© ${new Date().getFullYear()} 강원농부`,
    updated: new Date(),
  });

  (products || []).forEach((product) => {
    let desc = product.description || '';
    desc += `<br/>가격: ${product.price?.toLocaleString()}원`;
    if (product.discount_price) {
      desc += ` (할인가: ${product.discount_price?.toLocaleString()}원)`;
    }
    if (product.is_organic) {
      desc += '<br/>유기농 상품';
    }
    feed.addItem({
      title: product.name,
      id: `https://gangwonnongbu.co.kr/products/${product.id}`,
      link: `https://gangwonnongbu.co.kr/products/${product.id}`,
      description: desc,
      date: new Date(product.created_at),
      enclosure: product.thumbnail_url
        ? { url: product.thumbnail_url, type: 'image/jpeg' }
        : undefined,
    });
  });

  return new NextResponse(feed.rss2(), {
    headers: {
      'Content-Type': 'application/rss+xml; charset=utf-8',
    },
  });
}
