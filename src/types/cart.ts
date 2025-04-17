export interface LocalCartItem {
  id: string;
  product_id: string;
  product_option_id?: string | null;
  quantity: number;
}

export interface CartItem extends LocalCartItem {
  product: {
    id: string;
    name: string;
    price: number;
    discount_price?: number;
    thumbnail_url?: string;
    stock: number;
  };
  product_option?: {
    id: string;
    option_name: string;
    option_value: string;
    additional_price: number;
    stock: number;
  };
}

export interface GroupedCartItem {
  product_id: string;
  product: {
    id: string;
    name: string;
    price: number;
    discount_price?: number;
    thumbnail_url?: string;
    stock: number;
  };
  options: {
    id: string;
    cart_item_id: string;
    option_name: string;
    option_value: string;
    additional_price: number;
    quantity: number;
    stock: number;
  }[];
  totalQuantity: number;
  totalPrice: number;
}

export interface EditableOption {
  cart_item_id: string;
  option_name: string;
  option_value: string;
  additional_price: number;
  quantity: number;
  stock: number;
} 