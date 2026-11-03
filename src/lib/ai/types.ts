export interface CatalogProduct {
  id: string;
  name: string;
  category?: string;
  unit?: string;
  price: number;
  status?: string;
}

export interface CatalogItem {
  id: string;
  name: string;
  price: number;
}

export interface TableInfo {
  id: string;
  name: string;
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

export interface DisambiguationItem {
  id: string;
  name: string;
  price: number;
  category?: string;
}

export interface CartDiffItem {
  productId: string;
  productName: string;
  beforeQty: number;
  afterQty: number;
  delta: number;
  unitPrice?: number;
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
