-- public.email_verifications definition

-- Drop table

-- DROP TABLE email_verifications;

CREATE TABLE email_verifications (
	id uuid DEFAULT uuid_generate_v4() NOT NULL,
	email text NOT NULL,
	code text NOT NULL,
	created_at timestamptz DEFAULT now() NULL,
	expires_at timestamptz NOT NULL,
	verified bool DEFAULT false NULL,
	CONSTRAINT email_verifications_email_key UNIQUE (email),
	CONSTRAINT email_verifications_pkey PRIMARY KEY (id)
);
CREATE INDEX idx_email_verifications_email ON public.email_verifications USING btree (email);


-- public.users definition

-- Drop table

-- DROP TABLE users;

CREATE TABLE users (
	id uuid NOT NULL,
	email text NOT NULL,
	"name" text NULL,
	avatar_url text NULL,
	terms_agreed bool DEFAULT false NULL,
	marketing_agreed bool DEFAULT false NULL,
	created_at timestamptz DEFAULT timezone('utc'::text, now()) NOT NULL,
	updated_at timestamptz DEFAULT timezone('utc'::text, now()) NOT NULL,
	google_id text NULL,
	kakao_id text NULL,
	naver_id text NULL,
	last_login timestamptz NULL,
	nickname text NULL,
	login_id text NULL,
	"password" text NULL,
	phone_number text NULL,
	postcode varchar(10) NULL,
	address text NULL,
	detail_address text NULL,
	is_admin bool DEFAULT false NULL,
	CONSTRAINT users_email_unique UNIQUE (email),
	CONSTRAINT users_login_id_key UNIQUE (login_id),
	CONSTRAINT users_pkey PRIMARY KEY (id)
);
CREATE INDEX idx_users_google_id ON public.users USING btree (google_id);
CREATE INDEX idx_users_kakao_id ON public.users USING btree (kakao_id);
CREATE INDEX idx_users_naver_id ON public.users USING btree (naver_id);


-- public.carts definition

-- Drop table

-- DROP TABLE carts;

CREATE TABLE carts (
	id uuid DEFAULT uuid_generate_v4() NOT NULL,
	user_id uuid NULL,
	created_at timestamptz DEFAULT CURRENT_TIMESTAMP NULL,
	updated_at timestamptz DEFAULT CURRENT_TIMESTAMP NULL,
	CONSTRAINT carts_pkey PRIMARY KEY (id),
	CONSTRAINT carts_user_id_fkey FOREIGN KEY (user_id) REFERENCES users(id)
);


-- public.categories definition

-- Drop table

-- DROP TABLE categories;

CREATE TABLE categories (
	id uuid DEFAULT uuid_generate_v4() NOT NULL,
	"name" varchar(100) NOT NULL,
	parent_id uuid NULL,
	description text NULL,
	is_active bool DEFAULT true NULL,
	created_at timestamptz DEFAULT CURRENT_TIMESTAMP NULL,
	updated_at timestamptz DEFAULT CURRENT_TIMESTAMP NULL,
	CONSTRAINT categories_pkey PRIMARY KEY (id),
	CONSTRAINT categories_parent_id_fkey FOREIGN KEY (parent_id) REFERENCES categories(id)
);


-- public.products definition

-- Drop table

-- DROP TABLE products;

CREATE TABLE products (
	id uuid NOT NULL DEFAULT uuid_generate_v4(),
	created_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
	updated_at timestamptz NULL,
	name varchar(255) NOT NULL,
	description text NULL,
	price int4 NOT NULL,
	-- discount_price int4 NULL,
	stock int4 NOT NULL DEFAULT 0,
	"status" varchar(20) NOT NULL DEFAULT 'active'::character varying,
	category_id uuid NULL,
	thumbnail_url text NULL,
	origin varchar(100) NULL,
	harvest_date date NULL,
	storage_method varchar(255) NULL,
	is_organic bool NULL DEFAULT false,
	CONSTRAINT products_pkey PRIMARY KEY (id)
);


-- public.product_attributes definition

-- Drop table

-- DROP TABLE product_attributes;

CREATE TABLE product_attributes (
	id uuid DEFAULT uuid_generate_v4() NOT NULL,
	product_id uuid NULL,
	attribute_name varchar(100) NOT NULL,
	attribute_value varchar(255) NOT NULL,
	created_at timestamptz DEFAULT CURRENT_TIMESTAMP NULL,
	CONSTRAINT product_attributes_pkey PRIMARY KEY (id),
	CONSTRAINT product_attributes_product_id_fkey FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
);


-- public.product_images definition

-- Drop table

-- DROP TABLE product_images;

CREATE TABLE product_images (
	id uuid DEFAULT uuid_generate_v4() NOT NULL,
	product_id uuid NULL,
	image_url text NOT NULL,
	is_thumbnail bool DEFAULT false NULL,
	sort_order int4 DEFAULT 0 NULL,
	created_at timestamptz DEFAULT CURRENT_TIMESTAMP NULL,
	CONSTRAINT product_images_pkey PRIMARY KEY (id),
	CONSTRAINT product_images_product_id_fkey FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
);


-- public.product_likes definition

-- Drop table

-- DROP TABLE product_likes;

CREATE TABLE product_likes (
	id uuid DEFAULT uuid_generate_v4() NOT NULL,
	product_id uuid NULL,
	user_id uuid NULL,
	created_at timestamptz DEFAULT CURRENT_TIMESTAMP NULL,
	CONSTRAINT product_likes_pkey PRIMARY KEY (id),
	CONSTRAINT product_likes_product_id_user_id_key UNIQUE (product_id, user_id),
	CONSTRAINT product_likes_product_id_fkey FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
	CONSTRAINT product_likes_user_id_fkey FOREIGN KEY (user_id) REFERENCES users(id)
);


-- public.product_options definition

-- Drop table

-- DROP TABLE product_options;

CREATE TABLE product_options (
	id uuid DEFAULT uuid_generate_v4() NOT NULL,
	product_id uuid NULL,
	option_name varchar(100) NOT NULL,
	option_value varchar(100) NOT NULL,
	additional_price int4 DEFAULT 0 NULL,
	stock int4 DEFAULT 0 NULL,
	created_at timestamptz DEFAULT CURRENT_TIMESTAMP NULL,
	updated_at timestamptz DEFAULT CURRENT_TIMESTAMP NULL,
	CONSTRAINT product_options_pkey PRIMARY KEY (id),
	CONSTRAINT product_options_product_id_fkey FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
);


-- public.product_reviews definition

-- Drop table

-- DROP TABLE product_reviews;

CREATE TABLE IF NOT EXISTS product_reviews (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    order_id UUID REFERENCES orders(id) ON DELETE SET NULL,
    rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
    content TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'active',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 리뷰 인덱스 생성
CREATE INDEX idx_product_reviews_product_id ON product_reviews(product_id);
CREATE INDEX idx_product_reviews_user_id ON product_reviews(user_id);
CREATE INDEX idx_product_reviews_order_id ON product_reviews(order_id);

-- 리뷰 답변 테이블 생성
CREATE TABLE review_replies (
	id uuid DEFAULT uuid_generate_v4() NOT NULL,
	review_id uuid NOT NULL REFERENCES product_reviews(id) ON DELETE CASCADE,
	user_id uuid NOT NULL REFERENCES users(id),
	"content" text NOT NULL,
	created_at timestamptz DEFAULT CURRENT_TIMESTAMP NULL,
	updated_at timestamptz DEFAULT CURRENT_TIMESTAMP NULL,
	CONSTRAINT review_replies_pkey PRIMARY KEY (id)
);

-- 답변 인덱스 생성
CREATE INDEX idx_review_replies_review_id ON review_replies(review_id);

-- public.product_tags definition

-- Drop table

-- DROP TABLE product_tags;

CREATE TABLE product_tags (
	id uuid DEFAULT uuid_generate_v4() NOT NULL,
	product_id uuid NULL,
	tag varchar(50) NOT NULL,
	created_at timestamptz DEFAULT CURRENT_TIMESTAMP NULL,
	CONSTRAINT product_tags_pkey PRIMARY KEY (id),
	CONSTRAINT product_tags_product_id_tag_key UNIQUE (product_id, tag),
	CONSTRAINT product_tags_product_id_fkey FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
);


-- public.cart_items definition

-- Drop table

-- DROP TABLE cart_items;

CREATE TABLE cart_items (
	id uuid DEFAULT uuid_generate_v4() NOT NULL,
	cart_id uuid NULL,
	product_id uuid NULL,
	product_option_id uuid NULL,
	quantity int4 DEFAULT 1 NOT NULL,
	created_at timestamptz DEFAULT CURRENT_TIMESTAMP NULL,
	updated_at timestamptz DEFAULT CURRENT_TIMESTAMP NULL,
	CONSTRAINT cart_items_cart_id_product_id_product_option_id_key UNIQUE (cart_id, product_id, product_option_id),
	CONSTRAINT cart_items_pkey PRIMARY KEY (id),
	CONSTRAINT cart_items_cart_id_fkey FOREIGN KEY (cart_id) REFERENCES carts(id) ON DELETE CASCADE,
	CONSTRAINT cart_items_product_id_fkey FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
	CONSTRAINT cart_items_product_option_id_fkey FOREIGN KEY (product_option_id) REFERENCES product_options(id) ON DELETE SET NULL
); 


CREATE TABLE shipping_addresses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  recipient_name VARCHAR(100) NOT NULL,
  phone VARCHAR(20) NOT NULL,
  address VARCHAR(255) NOT NULL,
  detail_address VARCHAR(255),
  is_default BOOLEAN DEFAULT false,
  memo VARCHAR(255),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 인덱스 생성 (조회 속도 향상)
CREATE INDEX idx_shipping_addresses_user_id ON shipping_addresses(user_id);

-- 각 사용자별로 기본 배송지는 하나만 존재하도록 제약조건 추가
CREATE UNIQUE INDEX idx_user_default_address ON shipping_addresses(user_id) WHERE is_default = true;

-- RLS 정책 설정 (Row Level Security)
ALTER TABLE shipping_addresses ENABLE ROW LEVEL SECURITY;

-- 사용자는 자신의 배송지만 확인 가능
CREATE POLICY shipping_addresses_select_policy ON shipping_addresses
  FOR SELECT USING (auth.uid() = user_id);

-- 사용자는 자신의 배송지만 추가 가능
CREATE POLICY shipping_addresses_insert_policy ON shipping_addresses
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- 사용자는 자신의 배송지만 수정 가능
CREATE POLICY shipping_addresses_update_policy ON shipping_addresses
  FOR UPDATE USING (auth.uid() = user_id);

-- 사용자는 자신의 배송지만 삭제 가능
CREATE POLICY shipping_addresses_delete_policy ON shipping_addresses
  FOR DELETE USING (auth.uid() = user_id);

-- 현재 사용자 ID를 반환하는 함수
CREATE OR REPLACE FUNCTION current_user_id()
RETURNS UUID AS $$
BEGIN
  RETURN auth.uid();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 기존 테이블 삭제
DROP TABLE IF EXISTS order_items;
DROP TABLE IF EXISTS orders;

-- orders 테이블 생성
CREATE TABLE orders (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  order_number VARCHAR(14) UNIQUE,  -- 주문번호 컬럼 추가 (YYYYMMDD + 6자리 시퀀스)
  user_id UUID NOT NULL REFERENCES users(id),
  status VARCHAR(20) NOT NULL DEFAULT 'pending',
  shipping_name VARCHAR(100) NOT NULL,
  shipping_phone VARCHAR(20) NOT NULL,
  shipping_address TEXT NOT NULL,
  shipping_detail_address TEXT,
  shipping_memo TEXT,
  payment_method VARCHAR(20) NOT NULL,
  total_amount INTEGER NOT NULL,
  tid VARCHAR(100),  -- 카카오페이 tid 저장을 위한 컬럼 추가
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- order_items 테이블 생성
CREATE TABLE order_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES products(id),
  product_option_id UUID REFERENCES product_options(id),
  quantity INTEGER NOT NULL,
  price INTEGER NOT NULL,
  options JSONB,  -- 옵션 정보를 JSON 형식으로 저장
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- RLS 정책 설정
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;

-- 사용자는 자신의 주문만 확인 가능
CREATE POLICY orders_select_policy ON orders
  FOR SELECT USING (true);  -- 모든 사용자가 모든 주문을 볼 수 있도록 임시로 변경

-- 사용자는 자신의 주문만 추가 가능
CREATE POLICY orders_insert_policy ON orders
  FOR INSERT WITH CHECK (true);  -- 모든 사용자가 주문을 추가할 수 있도록 임시로 변경

-- 사용자는 자신의 주문만 수정 가능
CREATE POLICY orders_update_policy ON orders
  FOR UPDATE USING (true);  -- 모든 사용자가 주문을 수정할 수 있도록 임시로 변경

-- 주문 상품은 주문과 함께 관리
CREATE POLICY order_items_select_policy ON order_items
  FOR SELECT USING (true);  -- 모든 사용자가 모든 주문 상품을 볼 수 있도록 임시로 변경

CREATE POLICY order_items_insert_policy ON order_items
  FOR INSERT WITH CHECK (true);  -- 모든 사용자가 주문 상품을 추가할 수 있도록 임시로 변경

-- 누락된 인덱스 추가
CREATE INDEX idx_orders_user_id ON orders(user_id);
CREATE INDEX idx_order_items_order_id ON order_items(order_id);

-- 주문번호 시퀀스 생성 (날짜별로 1부터 시작)
CREATE SEQUENCE IF NOT EXISTS order_number_seq;

-- 날짜별 시퀀스 초기화 상태를 저장하는 테이블
CREATE TABLE IF NOT EXISTS sequence_state (
  sequence_name VARCHAR(50) PRIMARY KEY,
  last_reset_date DATE NOT NULL,
  last_value BIGINT NOT NULL
);

-- 주문번호 생성 함수 정의
CREATE OR REPLACE FUNCTION generate_order_number()
RETURNS TRIGGER AS $$
DECLARE
  today_date DATE := CURRENT_DATE;
  today_str VARCHAR := TO_CHAR(today_date, 'YYYYMMDD');
  seq_value BIGINT;
  last_reset RECORD;
BEGIN
  -- 시퀀스 상태 조회
  SELECT * INTO last_reset FROM sequence_state WHERE sequence_name = 'order_number_seq';
  
  -- 날짜가 바뀌었거나 처음 사용하는 경우 시퀀스 재설정
  IF last_reset IS NULL OR last_reset.last_reset_date < today_date THEN
    -- 시퀀스 1로 초기화
    PERFORM setval('order_number_seq', 1, false);
    
    -- 시퀀스 상태 업데이트 또는 삽입
    INSERT INTO sequence_state (sequence_name, last_reset_date, last_value)
    VALUES ('order_number_seq', today_date, 1)
    ON CONFLICT (sequence_name) 
    DO UPDATE SET last_reset_date = today_date, last_value = 1;
  END IF;
  
  -- 다음 시퀀스 값 가져오기
  seq_value := nextval('order_number_seq');
  
  -- 주문번호 생성: YYYYMMDD + 6자리 시퀀스 (000001부터)
  NEW.order_number := today_str || LPAD(seq_value::TEXT, 6, '0');
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 트리거 생성
DROP TRIGGER IF EXISTS set_order_number ON orders;
CREATE TRIGGER set_order_number
BEFORE INSERT ON orders
FOR EACH ROW
WHEN (NEW.order_number IS NULL)
EXECUTE FUNCTION generate_order_number();


-- payments 테이블 - 결제 정보 저장용
CREATE TABLE IF NOT EXISTS payments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  payment_key VARCHAR(100) NOT NULL,
  payment_method VARCHAR(50) NOT NULL,
  payment_provider VARCHAR(50) NOT NULL,
  amount INTEGER NOT NULL,
  status VARCHAR(50) NOT NULL,
  payment_details JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 인덱스 생성
CREATE INDEX IF NOT EXISTS idx_payments_order_id ON payments(order_id);
CREATE INDEX IF NOT EXISTS idx_payments_payment_key ON payments(payment_key);

-- RLS 정책 설정
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;

-- 모든 사용자가 결제 정보를 조회할 수 있도록 설정 (임시)
CREATE POLICY payments_select_policy ON payments
  FOR SELECT USING (true);

-- 모든 사용자가 결제 정보를 추가할 수 있도록 설정 (임시)
CREATE POLICY payments_insert_policy ON payments
  FOR INSERT WITH CHECK (true);

-- 모든 사용자가 결제 정보를 수정할 수 있도록 설정 (임시)
CREATE POLICY payments_update_policy ON payments
  FOR UPDATE USING (true); 