'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/router';
import DashboardLayout from '@/components/layout/DashboardLayout';
import ProductForm from '@/components/product/ProductForm';
import ProductTable from '@/components/product/ProductTable';
import ProductSearch, { ProductSearchFilters } from '@/components/product/ProductSearch';
import Modal from '@/components/common/Modal';
import Loading from '@/components/common/Loading';
import { Product } from '@/lib/types';

// useDisclosure钩子
const useDisclosure = () => {
  const [isOpen, setIsOpen] = useState(false);

  const onOpen = useCallback(() => setIsOpen(true), []);
  const onClose = useCallback(() => setIsOpen(false), []);

  return {
    isOpen,
    onOpen,
    onClose
  };
};

interface PaginatedResponse {
  items: Product[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export default function ProductsPage() {
  const router = useRouter();
  const [products, setProducts] = useState<Product[]>([]);
  const { isOpen, onOpen, onClose } = useDisclosure();
  const [editingProduct, setEditingProduct] = useState<Product | undefined>();
  const [searchFilters, setSearchFilters] = useState<ProductSearchFilters>({
    productName: '',
    pinduoduoProductId: '',
    pinduoduoProductName: '',
    merchantId: 'all'
  });
  const [totalItems, setTotalItems] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [isLoading, setIsLoading] = useState(true);
  const [mounted, setMounted] = useState(false);
  const [sortField, setSortField] = useState<string>('createdAt');
  const [sortDirection, setSortDirection] = useState<'ASC' | 'DESC'>('DESC');

  useEffect(() => {
    setMounted(true);

    const isAuthenticated = localStorage.getItem('isAuthenticated');
    if (!isAuthenticated) {
      router.push('/');
      return;
    }

    fetchProducts(currentPage);
  }, [router]);

  // 获取商品列表
  const fetchProducts = async (
    page: number,
    filters?: ProductSearchFilters,
    orderBy?: string,
    orderDirection?: 'ASC' | 'DESC'
  ) => {
    try {
      setIsLoading(true);

      const queryParams = new URLSearchParams({
        page: page.toString(),
        pageSize: pageSize.toString(),
        ...(orderBy && { orderBy }),
        ...(orderDirection && { orderDirection })
      });

      // 添加搜索过滤参数
      if (filters) {
        if (filters.productName) queryParams.append('productName', filters.productName);
        if (filters.pinduoduoProductId) queryParams.append('pinduoduoProductId', filters.pinduoduoProductId);
        if (filters.pinduoduoProductName) queryParams.append('pinduoduoProductName', filters.pinduoduoProductName);
        if (filters.merchantId && filters.merchantId !== 'all') queryParams.append('merchantId', filters.merchantId);
      }

      const response = await fetch(`/api/products?${queryParams}&t=${Date.now()}`);
      if (!response.ok) {
        throw new Error('获取商品数据失败');
      }

      const data: PaginatedResponse = await response.json();

      setProducts(data.items);
      setTotalItems(data.total);
      setTotalPages(data.totalPages);
      setCurrentPage(data.page);
    } catch (error) {
      console.error('获取商品数据错误:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // 处理搜索按钮点击
  const handleSearch = () => {
    setCurrentPage(1);
    fetchProducts(1, searchFilters, sortField, sortDirection);
  };

  // 处理过滤器变化
  const handleFilterChange = (filters: ProductSearchFilters) => {
    setSearchFilters(filters);
  };

  // 处理页码变化
  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    fetchProducts(page, searchFilters, sortField, sortDirection);
  };

  // 处理排序变化
  const handleSort = (field: string) => {
    let newDirection: 'ASC' | 'DESC' = 'DESC';

    // 如果点击的是当前排序字段，切换排序方向
    if (field === sortField) {
      newDirection = sortDirection === 'ASC' ? 'DESC' : 'ASC';
    }

    setSortField(field);
    setSortDirection(newDirection);

    // 重新获取数据
    fetchProducts(currentPage, searchFilters, field, newDirection);
  };

  // 处理每页显示数量变化
  const handlePageSizeChange = (newPageSize: number) => {
    setPageSize(newPageSize);
    setCurrentPage(1); // 重置到第一页
    fetchProductsWithNewPageSize(1, newPageSize, searchFilters);
  };

  // 使用新的 pageSize 获取数据
  const fetchProductsWithNewPageSize = async (page: number, newPageSize: number, filters?: ProductSearchFilters) => {
    try {
      setIsLoading(true);

      const queryParams = new URLSearchParams({
        page: page.toString(),
        pageSize: newPageSize.toString(),
        orderBy: sortField,
        orderDirection: sortDirection
      });

      // 添加搜索过滤参数
      if (filters) {
        if (filters.productName) queryParams.append('productName', filters.productName);
        if (filters.pinduoduoProductId) queryParams.append('pinduoduoProductId', filters.pinduoduoProductId);
        if (filters.pinduoduoProductName) queryParams.append('pinduoduoProductName', filters.pinduoduoProductName);
        if (filters.merchantId && filters.merchantId !== 'all') queryParams.append('merchantId', filters.merchantId);
      }

      const response = await fetch(`/api/products?${queryParams}&t=${Date.now()}`);
      if (!response.ok) {
        throw new Error('获取商品数据失败');
      }

      const data: PaginatedResponse = await response.json();

      setProducts(data.items);
      setTotalItems(data.total);
      setTotalPages(data.totalPages);
      setCurrentPage(data.page);
    } catch (error) {
      console.error('获取商品数据错误:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm('确定要删除该商品吗?')) {
      try {
        await fetch(`/api/products?id=${id}&t=${Date.now()}`, { method: 'DELETE' });
        fetchProducts(currentPage, searchFilters, sortField, sortDirection);
      } catch (error) {
        console.error('删除商品错误:', error);
      }
    }
  };

  const handleEdit = (product: Product) => {
    setEditingProduct(product);
    onOpen();
  };

  const handleAdd = () => {
    setEditingProduct(undefined);
    onOpen();
  };

  const handleFormSubmit = async (formData: Partial<Product>) => {
    try {
      const url = editingProduct
        ? `/api/products?id=${editingProduct.id}`
        : '/api/products';

      const method = editingProduct ? 'PUT' : 'POST';

      // 准备提交的数据
      const submitData = editingProduct
        ? {
            ...formData,
            id: editingProduct.id,
            createdAt: editingProduct.createdAt
          }
        : {
            ...formData,
            id: Date.now().toString(),
            createdAt: new Date().toISOString()
          };

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(submitData),
      });

      if (!response.ok) {
        throw new Error('保存商品数据失败');
      }

      // 重新获取商品列表
      await fetchProducts(currentPage, searchFilters, sortField, sortDirection);
      onClose();
      setEditingProduct(undefined);
    } catch (error) {
      console.error('保存商品数据错误:', error);
    }
  };

  if (!mounted) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loading />
      </div>
    );
  }

  return (
    <DashboardLayout>
      <ProductSearch
        filters={searchFilters}
        onFilterChange={handleFilterChange}
        onSearch={handleSearch}
        onAdd={handleAdd}
      />

      <ProductTable
        products={products}
        isLoading={isLoading}
        currentPage={currentPage}
        totalPages={totalPages}
        pageSize={pageSize}
        totalItems={totalItems}
        sortField={sortField}
        sortDirection={sortDirection}
        onPageChange={handlePageChange}
        onPageSizeChange={handlePageSizeChange}
        onSort={handleSort}
        onEdit={handleEdit}
        onDelete={handleDelete}
      />

      {isOpen && (
        <Modal
          isOpen={isOpen}
          onClose={() => {
            onClose();
            setEditingProduct(undefined);
          }}
          title={editingProduct ? '编辑商品' : '添加商品'}
        >
          <ProductForm
            product={editingProduct}
            onSubmit={handleFormSubmit}
            onCancel={() => {
              onClose();
              setEditingProduct(undefined);
            }}
          />
        </Modal>
      )}
    </DashboardLayout>
  );
}
