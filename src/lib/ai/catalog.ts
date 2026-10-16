import type { CatalogProduct, ProductMatch, ProductResolution } from './types';

interface RawProduct {
  IDSP?: unknown;
  'Tên sản phẩm'?: unknown;
  'Loại sản phẩm'?: unknown;
  'Đơn vị tính'?: unknown;
  'Đơn giá'?: unknown;
  'Trạng thái'?: unknown;
}

const MATCH_THRESHOLD = 0.6;
const AMBIGUITY_MARGIN = 0.12;

export function normalizeSearchText(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLocaleLowerCase('vi')
    .replace(/đ/g, 'd')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
    .replace(/\s+/g, ' ');
}

export function toCatalogProduct(raw: RawProduct): CatalogProduct | null {
  const id = String(raw.IDSP || '').trim();
  const name = String(raw['Tên sản phẩm'] || '').trim();
  const price = Number(raw['Đơn giá']);

  if (!id || !name || !Number.isFinite(price)) {
    return null;
  }

  return {
    id,
    name,
    category: String(raw['Loại sản phẩm'] || 'Khác').trim(),
    unit: String(raw['Đơn vị tính'] || 'Cái').trim(),
    price,
    status: String(raw['Trạng thái'] || '').trim(),
  };
}

export function toActiveCatalog(products: RawProduct[]): CatalogProduct[] {
  return products
    .map(toCatalogProduct)
    .filter((product): product is CatalogProduct => Boolean(product))
    .filter((product) => product.status === 'Hoạt động');
}

export const COMMON_ALIASES: Record<string, string> = {
  'ts': 'tra sua',
  'cf': 'ca phe',
  'cafe': 'ca phe',
  'dcs': 'tra dao cam sa',
  'bx': 'bac xiu',
  'tt': 'truyen thong',
  'tc': 'tran chau',
  'olong': 'tra o long',
};

export function expandAliases(text: string): string {
  const normalized = normalizeSearchText(text);
  const words = normalized.split(' ');
  const replaced = words.map((w) => COMMON_ALIASES[w] || w);
  return replaced.join(' ');
}

function scoreProduct(query: string, product: CatalogProduct): ProductMatch {
  const normalizedQuery = normalizeSearchText(query);
  const expandedQuery = expandAliases(query);
  const normalizedName = normalizeSearchText(product.name);

  if (normalizedQuery === normalizedName || expandedQuery === normalizedName) {
    return { product, score: 1, exact: true };
  }

  if (normalizedName.includes(normalizedQuery) || normalizedName.includes(expandedQuery)) {
    return { product, score: 0.92, exact: false };
  }

  const queryTokens = new Set([...normalizedQuery.split(' '), ...expandedQuery.split(' ')].filter(Boolean));
  const nameTokens = new Set(normalizedName.split(' ').filter(Boolean));
  const matchedTokens = [...queryTokens].filter((token) => nameTokens.has(token)).length;
  const score = queryTokens.size === 0 ? 0 : matchedTokens / queryTokens.size;

  return { product, score, exact: false };
}

export function resolveProduct(
  query: string,
  products: CatalogProduct[],
): ProductResolution {
  const matches = products
    .map((product) => scoreProduct(query, product))
    .filter((match) => match.score >= MATCH_THRESHOLD)
    .sort((left, right) => right.score - left.score);

  if (matches.length === 0) {
    return { status: 'not_found', candidates: [] };
  }

  const [best, second] = matches;
  if (best.exact || !second || best.score - second.score >= AMBIGUITY_MARGIN) {
    return { status: 'resolved', product: best.product, score: best.score };
  }

  return { status: 'ambiguous', candidates: matches.slice(0, 5) };
}
