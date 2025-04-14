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
	id uuid DEFAULT uuid_generate_v4() NOT NULL,
	"name" varchar(200) NOT NULL,
	description text NULL,
	price int4 NOT NULL,
	discount_price int4 NULL,
	stock int4 DEFAULT 0 NOT NULL,
	status varchar(20) DEFAULT 'active'::character varying NULL,
	category_id uuid NULL,
	seller_id uuid NULL,
	thumbnail_url text NULL,
	origin varchar(100) NULL,
	harvest_date date NULL,
	storage_method text NULL,
	is_organic bool DEFAULT false NULL,
	created_at timestamptz DEFAULT CURRENT_TIMESTAMP NULL,
	updated_at timestamptz DEFAULT CURRENT_TIMESTAMP NULL,
	CONSTRAINT products_pkey PRIMARY KEY (id),
	CONSTRAINT products_category_id_fkey FOREIGN KEY (category_id) REFERENCES categories(id),
	CONSTRAINT products_seller_id_fkey FOREIGN KEY (seller_id) REFERENCES users(id)
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

CREATE TABLE product_reviews (
	id uuid DEFAULT uuid_generate_v4() NOT NULL,
	product_id uuid NULL,
	user_id uuid NULL,
	rating int4 NOT NULL,
	"content" text NULL,
	images _text NULL,
	created_at timestamptz DEFAULT CURRENT_TIMESTAMP NULL,
	updated_at timestamptz DEFAULT CURRENT_TIMESTAMP NULL,
	CONSTRAINT product_reviews_pkey PRIMARY KEY (id),
	CONSTRAINT product_reviews_rating_check CHECK (((rating >= 1) AND (rating <= 5))),
	CONSTRAINT product_reviews_product_id_fkey FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
	CONSTRAINT product_reviews_user_id_fkey FOREIGN KEY (user_id) REFERENCES users(id)
);


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