'use client';

import { useState, useEffect, useCallback } from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import OrderSearch from '@/components/order/OrderSearch';
import OrderTable from '@/components/order/OrderTable';
import OrderDetailDialog from '@/components/order/OrderDetailDialog';
import Pagination from '@/components/common/Pagination';
import { ProductSalesOrder } from '@/lib/types';
import { useToast } from "@/hooks/use-toast";
import { Package } from 'lucide-react';

export default function OrdersPage() {
  const [orders, setOrders] = useState<ProductSalesOrder[]>([]);
  const [selectedOrder, setSelectedOrder] = useState<ProductSalesOrder | null>(null);
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [searchFilters, setSearchFilters] = useState<any>({});
  const { toast } = useToast();

  const pageSize = 10;

  const fetchOrders = useCallback(async (page: number, filters: any = {}) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        pageSize: pageSize.toString(),
        t: Date.now().toString(),
        ...filters
      });

      const response = await fetch(`/api/orders?${params.toString()}`);
      const data = await response.json();

      if (response.ok) {
        setOrders(data.items || []);
        setTotalPages(data.totalPages || 1);
        setTotal(data.total || 0);
        setCurrentPage(page);
      } else {
        throw new Error(data.message || '获取订单列表失败');
      }
    } catch (error) {
      console.error('获取订单列表失败:', error);
      toast({
        variant: "destructive",
        title: "错误",
        description: error instanceof Error ? error.message : '获取订单列表失败',
      });
      setOrders([]);
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchOrders(1);
  }, [fetchOrders]);

  const handleSearch = (filters: any) => {
    setSearchFilters(filters);
    fetchOrders(1, filters);
  };

  const handlePageChange = (page: number) => {
    fetchOrders(page, searchFilters);
  };

  const handleViewDetail = (order: ProductSalesOrder) => {
    setSelectedOrder(order);
    setDetailDialogOpen(true);
  };

  const handleCloseDetailDialog = () => {
    setDetailDialogOpen(false);
    setSelectedOrder(null);
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* 页面标题 */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Package className="h-6 w-6 text-blue-600" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">订单管理</h1>
              <p className="text-sm text-gray-500">查看和搜索商品销售订单</p>
            </div>
          </div>
          <div className="text-sm text-gray-500">
            共 <span className="font-semibold text-gray-900">{total}</span> 条订单
          </div>
        </div>

        {/* 搜索区域 */}
        <OrderSearch onSearch={handleSearch} />

        {/* 订单列表 */}
        {loading ? (
          <div className="text-center py-12 bg-white rounded-lg border">
            <p className="text-gray-500 text-sm">加载中...</p>
          </div>
        ) : (
          <>
            <OrderTable orders={orders} onViewDetail={handleViewDetail} />

            {/* 分页 */}
            {totalPages > 1 && (
              <Pagination
                total={total}
                pageSize={pageSize}
                current={currentPage}
                onChange={handlePageChange}
                onPageSizeChange={() => {}}
              />
            )}
          </>
        )}

        {/* 订单详情对话框 */}
        <OrderDetailDialog
          order={selectedOrder}
          open={detailDialogOpen}
          onClose={handleCloseDetailDialog}
        />
      </div>
    </DashboardLayout>
  );
}
