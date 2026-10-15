export interface CatalogProduct {
  id: string;
  name: string;
  category: string;
  unit: string;
  price: number;
  status: string;
}

export interface OrderItemRequest {
  productQuery: string;
  quantity: number;
  size?: string;
  sugar?: string;
  ice?: string;
  toppings?: Array<{
    name: string;
    quantity?: number;
  }>;
  note?: string;
}

export interface ProductMatch {
  product: CatalogProduct;
  score: number;
  exact: boolean;
}

export type ProductResolution =
  | {
      status: 'resolved';
      product: CatalogProduct;
      score: number;
    }
  | {
      status: 'ambiguous';
      candidates: ProductMatch[];
    }
  | {
      status: 'not_found';
      candidates: ProductMatch[];
    };
