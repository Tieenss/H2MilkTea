'use client';

import { useState, useCallback, useEffect, useMemo } from 'react';
import type { Product, Category } from '../types/pos';
import authUtils from '@/utils/authUtils';

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

  // Filter products based on search and filters
  const filterProducts = useCallback(() => {
    const filtered = products.filter(product => {
      const matchesSearch = product['Tên sản phẩm']
        .toLowerCase()
        .includes(searchTerm.toLowerCase());
      
      const matchesCategory = categoryFilter === 'all' || 
        product['Loại sản phẩm'] === categoryFilter;
      
      const matchesPrice = checkPriceRange(Number(product['Đơn giá']), priceFilter);

      return matchesSearch && matchesCategory && matchesPrice;
    });

    setFilteredProducts(filtered);
  }, [products, searchTerm, categoryFilter, priceFilter, checkPriceRange]);

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