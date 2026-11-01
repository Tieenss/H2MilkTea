'use client';

import { useState, useCallback, useEffect, useMemo } from 'react';
import type { Product } from '../types/pos';
import authUtils from '@/utils/authUtils';

/**
 * Tầng 1: Chuẩn hóa tiếng Việt không dấu
 * Chuyển chữ thường, bỏ dấu thanh NFD ([\u0300-\u036f]), đổi đ -> d, loại bỏ ký tự đặc biệt
 */
export const normalizeVN = (str?: string): string => {
  if (!str) return '';
  return str
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
};

/**
 * Tầng 2: Từ điển viết tắt & lỗi gõ phổ biến của ngành đồ uống
 */
const BEVERAGE_ALIAS_DICTIONARY: Record<string, string[]> = {
  ts: ['tra sua'],
  cf: ['ca phe', 'cafe', 'coffee'],
  cafe: ['ca phe', 'coffee'],
  cp: ['ca phe'],
  cfd: ['ca phe den', 'ca phe da'],
  cpd: ['ca phe den', 'ca phe da'],
  cfs: ['ca phe sua'],
  cps: ['ca phe sua'],
  cfsd: ['ca phe sua da'],
  cpsd: ['ca phe sua da'],
  tc: ['tran chau'],
  tranchau: ['tran chau'],
  chantrau: ['tran chau'],
  tanchau: ['tran chau'],
  dd: ['duong den'],
  tct: ['tran chau trang'],
  tcd: ['tran chau den'],
  tcdd: ['tran chau duong den'],
  dcs: ['tra dao cam sa', 'dao cam sa'],
  td: ['tra dao', 'tra dao cam sa'],
  tdcs: ['tra dao cam sa'],
  bx: ['bac xiu'],
  bxd: ['bac xiu da'],
  st: ['sua tuoi', 'sinh to'],
  kc: ['kem cheese'],
  cheese: ['kem cheese', 'macchiato'],
  machiato: ['macchiato'],
  maciato: ['macchiato'],
  ht: ['hong tra'],
  ol: ['o long', 'earl grey'],
  olong: ['o long', 'earl grey'],
  ne: ['nuoc ep'],
  ep: ['nuoc ep'],
  sttc: ['sua tuoi tran chau', 'tra sua tran chau', 'tra sua tran chau duong den'],
  sttcdd: ['sua tuoi tran chau duong den', 'tra sua tran chau duong den'],
  tstc: ['tra sua tran chau'],
  tstcdd: ['tra sua tran chau duong den'],
  tx: ['tra xanh', 'matcha'],
  mc: ['matcha', 'macchiato'],
  sc: ['sua chua'],
  tv: ['tra vai'],
  cc: ['ca cao'],
};

/**
 * Thay thế các cụm từ lỗi gõ phổ biến có khoảng trắng trước khi tách token
 */
const PHRASE_REPLACEMENTS: Array<[RegExp, string]> = [
  [/\btan chau\b/g, 'tran chau'],
  [/\bchan trau\b/g, 'tran chau'],
  [/\bchan chau\b/g, 'tran chau'],
  [/\btran trau\b/g, 'tran chau'],
  [/\bduong den\b/g, 'duong den'],
  [/\btra xua\b/g, 'tra sua'],
];

/**
 * Tạo chữ cái đầu (acronym) từ chuỗi đã chuẩn hóa không dấu
 * Ví dụ: "tra sua tran chau duong den" -> "tstcdd"
 */
const buildAcronyms = (normStr: string): string[] => {
  if (!normStr) return [];
  const words = normStr.split(' ').filter(Boolean);
  if (words.length === 0) return [];

  const mainAcronym = words.map(w => w[0]).join('');
  const acronyms = new Set<string>([mainAcronym]);

  // Nếu có "ca phe" (cp), tự động thêm biến thể viết tắt với "cf" (ví dụ "cpsd" -> "cfsd")
  if (normStr.includes('ca phe')) {
    const cfWords = normStr.replace(/\bca phe\b/g, 'cf').split(' ').filter(Boolean);
    acronyms.add(cfWords.map(w => (w === 'cf' ? 'cf' : w[0])).join(''));
  }

  // Nếu có "o long", thêm biến thể "ol"
  if (normStr.includes('o long')) {
    acronyms.add(mainAcronym);
  }

  return Array.from(acronyms);
};

/**
 * Kiểm tra token có khớp chữ cái đầu liên tiếp hoặc subsequence đầu các từ không
 * Ví dụ: token="tstc" khớp với words=["tra", "sua", "tran", "chau", "duong", "den"]
 */
const isSubsequenceAcronymMatch = (token: string, words: string[]): boolean => {
  if (token.length < 2 || words.length === 0) return false;
  const initials = words.map(w => w[0]).join('');
  if (initials.includes(token)) return true;

  // Kiểm tra subsequence theo thứ tự chữ cái đầu của các từ
  let tIdx = 0;
  for (let i = 0; i < words.length && tIdx < token.length; i++) {
    if (words[i][0] === token[tIdx]) {
      tIdx++;
    }
  }
  return tIdx === token.length;
};

/**
 * Tầng 3: Tính khoảng cách chỉnh sửa Levenshtein giữa 2 từ
 */
const levenshteinDistance = (a: string, b: string): number => {
  if (a === b) return 0;
  const lenA = a.length;
  const lenB = b.length;
  if (lenA === 0) return lenB;
  if (lenB === 0) return lenA;
  if (Math.abs(lenA - lenB) > 2) return 3; // Cắt nhánh sớm nếu lệch quá 2 ký tự

  const prev = new Array(lenB + 1);
  const curr = new Array(lenB + 1);

  for (let j = 0; j <= lenB; j++) prev[j] = j;

  for (let i = 1; i <= lenA; i++) {
    curr[0] = i;
    for (let j = 1; j <= lenB; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      curr[j] = Math.min(
        prev[j] + 1,      // xóa
        curr[j - 1] + 1,  // chèn
        prev[j - 1] + cost // thay thế
      );
    }
    for (let j = 0; j <= lenB; j++) prev[j] = curr[j];
  }

  return prev[lenB];
};

interface ProductSearchIndex {
  product: Product;
  rawNameLower: string;
  normName: string;
  normWords: string[];
  normJoined: string;
  normCategory: string;
  acronyms: string[];
  aliasCorpus: string;
}

/**
 * Xây dựng chỉ mục tìm kiếm cho 1 sản phẩm
 */
export const createProductSearchIndex = (product: Product): ProductSearchIndex => {
  const rawName = product['Tên sản phẩm'] || '';
  const rawCategory = product['Loại sản phẩm'] || '';
  const normName = normalizeVN(rawName);
  const normCategory = normalizeVN(rawCategory);
  const normWords = normName.split(' ').filter(Boolean);
  const normJoined = normWords.join('');
  const acronyms = buildAcronyms(normName);

  // Mở rộng thêm các từ khóa tương đương dựa trên tên món
  const extraAliases: string[] = [...acronyms];
  if (normName.includes('ca phe') || normName.includes('cafe')) {
    extraAliases.push('cf cafe coffee cp');
  }
  if (normName.includes('tran chau')) {
    extraAliases.push('tc tranchau chantrau tanchau tan chau');
  }
  if (normName.includes('tra sua')) {
    extraAliases.push('ts trasua');
  }
  if (normName.includes('duong den')) {
    extraAliases.push('dd duongden');
  }
  if (normName.includes('o long') || normName.includes('olong') || normName.includes('earl grey')) {
    extraAliases.push('ol olong o long earl grey');
  }
  if (normName.includes('kem cheese') || normName.includes('macchiato')) {
    extraAliases.push('kc cheese kem cheese macchiato machiato');
  }

  return {
    product,
    rawNameLower: rawName.toLowerCase().trim(),
    normName,
    normWords,
    normJoined,
    normCategory,
    acronyms,
    aliasCorpus: `${normName} ${normCategory} ${normJoined} ${extraAliases.join(' ')}`.trim(),
  };
};

/**
 * Tầng 4: Chấm điểm độ khớp (Relevance Scoring) giữa từ khóa và sản phẩm
 * Trả về 0 nếu không khớp, trả về số dương càng lớn nếu độ ưu tiên càng cao.
 */
export const scoreProductMatch = (index: ProductSearchIndex, rawQuery: string): number => {
  const trimmedRaw = rawQuery.trim().toLowerCase();
  if (!trimmedRaw) return 1;

  const normQueryRaw = normalizeVN(rawQuery);
  if (!normQueryRaw) return 1;

  // Áp dụng sửa cụm lỗi gõ phổ biến (vd "tan chau" -> "tran chau")
  let normQuery = normQueryRaw;
  for (const [pattern, replacement] of PHRASE_REPLACEMENTS) {
    normQuery = normQuery.replace(pattern, replacement);
  }

  // 1. Khớp chính xác có dấu (Ưu tiên cao nhất: 1000 - 1100 điểm)
  if (index.rawNameLower === trimmedRaw) return 1100;
  if (index.rawNameLower.startsWith(trimmedRaw)) return 1050;
  if (index.rawNameLower.includes(trimmedRaw)) return 1000;

  // 2. Khớp nguyên cụm không dấu (900 - 980 điểm)
  if (index.normName === normQueryRaw || index.normName === normQuery) return 980;
  if (index.normName.startsWith(normQueryRaw) || index.normName.startsWith(normQuery)) return 950;
  if (index.normName.includes(normQueryRaw)) return 920;
  if (index.normName.includes(normQuery)) return 900;

  // 3. Khớp trực tiếp mã viết tắt chữ cái đầu (Acronym) hoặc viết tắt toàn cục (800 - 880 điểm)
  const compactQuery = normQueryRaw.replace(/\s+/g, '');
  if (index.acronyms.some(acr => acr === compactQuery)) return 880;
  if (index.acronyms.some(acr => acr.startsWith(compactQuery))) return 850;
  if (index.acronyms.some(acr => acr.includes(compactQuery))) return 820;
  if (isSubsequenceAcronymMatch(compactQuery, index.normWords)) return 800;

  // Kiểm tra nếu toàn bộ câu tìm kiếm là 1 từ viết tắt trong từ điển (vd "tstcdd", "dcs", "bx")
  const globalExpansions = BEVERAGE_ALIAS_DICTIONARY[compactQuery];
  if (globalExpansions) {
    for (const exp of globalExpansions) {
      if (index.normName.includes(exp) || index.aliasCorpus.includes(exp)) {
        return 840;
      }
    }
  }

  // 4. Đánh giá theo từng Token (Hỗ trợ kết hợp viết tắt + không dấu + sai số gõ phím Fuzzy Levenshtein)
  const queryTokens = normQueryRaw.split(' ').filter(Boolean);
  if (queryTokens.length === 0) return 1;

  let totalScore = 600;
  let totalFuzzyPenalty = 0;

  for (const token of queryTokens) {
    let tokenMatched = false;
    let bestTokenPenalty = 0;

    // 4a. Khớp trực tiếp từ trong tên món hoặc danh mục hoặc chuỗi viết liền
    if (index.normWords.some(w => w === token)) {
      tokenMatched = true;
      totalScore += 30;
    } else if (index.normWords.some(w => w.startsWith(token))) {
      tokenMatched = true;
      totalScore += 20;
    } else if (
      index.normName.includes(token) ||
      index.normCategory.includes(token) ||
      index.normJoined.includes(token)
    ) {
      tokenMatched = true;
      totalScore += 10;
    }

    // 4b. Khớp qua từ điển viết tắt đồ uống (vd token = "ts", "cf", "tc", "dd", "tanchau"...)
    if (!tokenMatched) {
      const expansions = BEVERAGE_ALIAS_DICTIONARY[token];
      if (expansions && expansions.some(exp => index.normName.includes(exp) || index.aliasCorpus.includes(exp))) {
        tokenMatched = true;
        totalScore += 15;
      }
    }

    // 4c. Khớp subsequence chữ cái đầu của các từ (vd token = "tstc" hoặc "tcdd")
    if (!tokenMatched && token.length >= 2) {
      if (
        index.acronyms.some(acr => acr.includes(token)) ||
        isSubsequenceAcronymMatch(token, index.normWords)
      ) {
        tokenMatched = true;
        totalScore += 12;
      }
    }

    // 4d. Khớp na ná / Sai số gõ phím (Fuzzy Levenshtein Distance)
    // Token dài 3-5 ký tự cho phép sai số <= 1 (vd "tan" vs "tran", "xao" vs "xoai", "xua" vs "sua")
    // Token dài >= 6 ký tự cho phép sai số <= 2
    if (!tokenMatched && token.length >= 3) {
      const maxAllowedDist = token.length >= 6 ? 2 : 1;
      let minDistance = Infinity;

      for (const word of index.normWords) {
        if (word.length < 2) continue;
        const dist = levenshteinDistance(token, word);
        if (dist < minDistance) {
          minDistance = dist;
        }
        // Hỗ trợ so sánh với prefix của từ dài hơn (vd gõ 4 ký tự đầu hơi lệch)
        if (word.length > token.length + 1 && token.length >= 4) {
          const prefixDist = levenshteinDistance(token, word.slice(0, token.length));
          if (prefixDist < minDistance) {
            minDistance = prefixDist;
          }
        }
      }

      if (minDistance <= maxAllowedDist) {
        tokenMatched = true;
        bestTokenPenalty = minDistance * 60; // Phạt điểm để ưu tiên khớp chính xác lên trên
      }
    }

    // Nếu có bất kỳ token nào không khớp ở cả 4 bước -> loại sản phẩm này
    if (!tokenMatched) {
      return 0;
    }

    totalFuzzyPenalty += bestTokenPenalty;
  }

  return Math.max(10, totalScore - totalFuzzyPenalty);
};

export const useProducts = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [priceFilter, setPriceFilter] = useState('all');

  // Extract categories from products
  const categories = useMemo(() => {
    const categoryCounts = products.reduce((acc, product) => {
      const category = product['Loại sản phẩm'] || 'Khác';
      acc[category] = (acc[category] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return Object.keys(categoryCounts)
      .sort()
      .map(category => ({
        name: category,
        count: categoryCounts[category]
      }));
  }, [products]);

  // Xây dựng chỉ mục tìm kiếm thông minh cho toàn bộ sản phẩm
  const productSearchIndices = useMemo(() => {
    return products.map(product => createProductSearchIndex(product));
  }, [products]);

  // Fetch products from API
  const fetchProducts = useCallback(async () => {
    try {
      setIsLoading(true);
      // Sử dụng DMHH thay vì 'Sản phẩm'
      const response = await authUtils.apiRequest('DMHH', 'getall', {});
      
      const productList = Array.isArray(response) ? response : [];
      
      // Chỉ lấy sản phẩm có trạng thái hoạt động
      const activeProducts = productList.filter(product => 
        product['Trạng thái'] === 'Hoạt động'
      );
      
      setProducts(activeProducts);
      return activeProducts;
    } catch (error) {
      console.error('Error fetching products:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Check price range
  const checkPriceRange = useCallback((price: number, range: string) => {
    if (range === 'all') return true;

    const numPrice = Number(price);
    const [min, max] = range.split('-').map(Number);

    if (max) {
      return numPrice >= min && numPrice < max;
    }
    return numPrice >= min;
  }, []);

  // Filter products based on smart 4-layer search and filters
  const filterProducts = useCallback(() => {
    const hasSearch = searchTerm.trim().length > 0;

    const scoredResults: Array<{ product: Product; score: number }> = [];

    for (const index of productSearchIndices) {
      const { product } = index;

      const matchesCategory =
        categoryFilter === 'all' || product['Loại sản phẩm'] === categoryFilter;
      if (!matchesCategory) continue;

      const matchesPrice = checkPriceRange(Number(product['Đơn giá']), priceFilter);
      if (!matchesPrice) continue;

      if (!hasSearch) {
        scoredResults.push({ product, score: 1 });
        continue;
      }

      const matchScore = scoreProductMatch(index, searchTerm);
      if (matchScore > 0) {
        scoredResults.push({ product, score: matchScore });
      }
    }

    if (hasSearch) {
      scoredResults.sort((a, b) => b.score - a.score);
    }

    setFilteredProducts(scoredResults.map(item => item.product));
  }, [productSearchIndices, searchTerm, categoryFilter, priceFilter, checkPriceRange]);

  // Reset all filters
  const resetFilters = useCallback(() => {
    setSearchTerm('');
    setCategoryFilter('all');
    setPriceFilter('all');
  }, []);

  // Apply filters when dependencies change
  useEffect(() => {
    filterProducts();
  }, [filterProducts]);

  // Set filtered products to all products when products change
  useEffect(() => {
    if (products.length > 0 && filteredProducts.length === 0 && 
        searchTerm === '' && categoryFilter === 'all' && priceFilter === 'all') {
      setFilteredProducts(products);
    }
  }, [products, filteredProducts.length, searchTerm, categoryFilter, priceFilter]);

  return {
    products,
    filteredProducts,
    categories,
    searchTerm,
    categoryFilter,
    priceFilter,
    isLoading,
    setSearchTerm,
    setCategoryFilter,
    setPriceFilter,
    fetchProducts,
    filterProducts,
    resetFilters
  };
};
