'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/router';
import DashboardLayout from '@/components/layout/DashboardLayout';
import MerchantForm from '@/components/merchant/MerchantForm';
import MerchantTable from '@/components/merchant/MerchantTable';
import MerchantSearch, { SearchFilters } from '@/components/merchant/MerchantSearch';
import SendMessageDialog from '@/components/merchant/SendMessageDialog';
import Modal from '@/components/common/Modal';
import Loading from '@/components/common/Loading';
import { Merchant } from '@/lib/types';

// 保留useDisclosure钩子
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
  items: Merchant[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export default function MerchantsPage() {
  const router = useRouter();
  const [merchants, setMerchants] = useState<Merchant[]>([]);
  const { isOpen, onOpen, onClose } = useDisclosure();
  const [editingMerchant, setEditingMerchant] = useState<Merchant | undefined>();
  const [sendMessageMerchant, setSendMessageMerchant] = useState<Merchant | null>(null);
  const [searchFilters, setSearchFilters] = useState<SearchFilters>({
    name: '',
    merchantId: '',
    pinduoduoName: '',
    warehouse1: '',
    groupName: '',
    sendMessage: 'all'
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
    
    fetchMerchants(currentPage);
  }, [router]);

  // 获取商家列表
  const fetchMerchants = async (
    page: number,
    filters?: SearchFilters,
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
        if (filters.name) queryParams.append('name', filters.name);
        if (filters.merchantId) queryParams.append('merchantId', filters.merchantId);
        if (filters.pinduoduoName) queryParams.append('pinduoduoName', filters.pinduoduoName);
        if (filters.warehouse1) queryParams.append('warehouse1', filters.warehouse1);
        if (filters.groupName) queryParams.append('groupName', filters.groupName);
        if (filters.sendMessage !== 'all') queryParams.append('sendMessage', filters.sendMessage);
      }

      const response = await fetch(`/api/merchants?${queryParams}&t=${Date.now()}`);
      if (!response.ok) {
        throw new Error('获取商家数据失败');
      }

      const data: PaginatedResponse = await response.json();

      setMerchants(data.items);
      setTotalItems(data.total);
      setTotalPages(data.totalPages);
      setCurrentPage(data.page);
    } catch (error) {
      console.error('获取商家数据错误:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // 处理搜索按钮点击
  const handleSearch = () => {
    setCurrentPage(1);
    fetchMerchants(1, searchFilters, sortField, sortDirection);
  };

  // 处理过滤器变化
  const handleFilterChange = (filters: SearchFilters) => {
    setSearchFilters(filters);
  };

  // 处理页码变化
  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    fetchMerchants(page, searchFilters, sortField, sortDirection);
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
    fetchMerchants(currentPage, searchFilters, field, newDirection);
  };

  // 处理每页显示数量变化
  const handlePageSizeChange = (newPageSize: number) => {
    setPageSize(newPageSize);
    setCurrentPage(1); // 重置到第一页
    fetchMerchantsWithNewPageSize(1, newPageSize, searchFilters);
  };

  // 使用新的 pageSize 获取数据
  const fetchMerchantsWithNewPageSize = async (page: number, newPageSize: number, filters?: SearchFilters) => {
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
        if (filters.name) queryParams.append('name', filters.name);
        if (filters.merchantId) queryParams.append('merchantId', filters.merchantId);
        if (filters.pinduoduoName) queryParams.append('pinduoduoName', filters.pinduoduoName);
        if (filters.warehouse1) queryParams.append('warehouse1', filters.warehouse1);
        if (filters.groupName) queryParams.append('groupName', filters.groupName);
        if (filters.sendMessage !== 'all') queryParams.append('sendMessage', filters.sendMessage);
      }

      const response = await fetch(`/api/merchants?${queryParams}&t=${Date.now()}`);
      if (!response.ok) {
        throw new Error('获取商家数据失败');
      }

      const data: PaginatedResponse = await response.json();

      setMerchants(data.items);
      setTotalItems(data.total);
      setTotalPages(data.totalPages);
      setCurrentPage(data.page);
    } catch (error) {
      console.error('获取商家数据错误:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm('确定要删除该商家吗？')) {
      try {
        await fetch(`/api/merchants?id=${id}&t=${Date.now()}`, { method: 'DELETE' });
        fetchMerchants(currentPage, searchFilters, sortField, sortDirection);
      } catch (error) {
        console.error('删除商家错误:', error);
      }
    }
  };

  const handleEdit = (merchant: Merchant) => {
    setEditingMerchant(merchant);
    onOpen();
  };

  const handleAdd = () => {
    setEditingMerchant(undefined);
    onOpen();
  };

  const handleFormSubmit = async (formData: Partial<Merchant>) => {
    try {
      const url = editingMerchant
        ? `/api/merchants?id=${editingMerchant.id}`
        : '/api/merchants';

      const method = editingMerchant ? 'PUT' : 'POST';

      // 准备提交的数据
      const submitData = editingMerchant
        ? {
            ...formData,
            id: editingMerchant.id,
            createdAt: editingMerchant.createdAt
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
        throw new Error('保存商家数据失败');
      }

      // 重新获取商家列表
      await fetchMerchants(currentPage, searchFilters, sortField, sortDirection);
      onClose();
      setEditingMerchant(undefined);
    } catch (error) {
      console.error('保存商家数据错误:', error);
    }
  };

  const handleSendMessage = useCallback((merchant: Merchant) => {
    setSendMessageMerchant(merchant);
  }, []);

  const handleCloseSendMessage = useCallback(() => {
    setSendMessageMerchant(null);
  }, []);
  
  if (!mounted) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loading />
      </div>
    );
  }

  return (
    <DashboardLayout>
      <MerchantSearch
        filters={searchFilters}
        onFilterChange={handleFilterChange}
        onSearch={handleSearch}
        onAdd={handleAdd}
      />
      
      <MerchantTable
        merchants={merchants}
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
        onSendMessage={handleSendMessage}
      />
      
      {isOpen && (
        <Modal
          isOpen={isOpen}
          onClose={() => {
            onClose();
            setEditingMerchant(undefined);
          }}
          title={editingMerchant ? '编辑商家' : '添加商家'}
        >
          <MerchantForm
            merchant={editingMerchant}
            onSubmit={handleFormSubmit}
            onCancel={() => {
              onClose();
              setEditingMerchant(undefined);
            }}
          />
        </Modal>
      )}

      <SendMessageDialog
        open={!!sendMessageMerchant}
        onClose={handleCloseSendMessage}
        merchant={sendMessageMerchant}
      />
    </DashboardLayout>
  );
} 