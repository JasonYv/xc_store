'use client';

import { ProductSalesOrder } from '@/lib/types';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface OrderDetailDialogProps {
  order: ProductSalesOrder | null;
  open: boolean;
  onClose: () => void;
}

export default function OrderDetailDialog({ order, open, onClose }: OrderDetailDialogProps) {
  if (!order) return null;

  const infoItems = [
    { label: '订单ID', value: order.id },
    { label: '店铺名称', value: order.shopName },
    { label: '店铺ID', value: order.shopId },
    { label: '商品ID', value: order.productId },
    { label: '商品名称', value: order.productName },
    { label: '销售区域', value: order.salesArea },
    { label: '仓库信息', value: order.warehouseInfo },
    { label: '销售日期', value: order.salesDate },
    { label: '销售规格', value: order.salesSpec },
    { label: '仓库总库存', value: order.totalStock.toLocaleString() },
    { label: '仓库预估总销售数', value: order.estimatedSales.toLocaleString() },
    { label: '仓库总销售数', value: order.totalSales.toLocaleString() },
    { label: '销售数量(份)', value: order.salesQuantity.toLocaleString() },
    {
      label: '创建时间',
      value: new Date(order.createdAt).toLocaleString('zh-CN', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
      })
    },
  ];

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>订单详情</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* 商品图片 */}
          {order.productImage && (
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">商品图片</label>
              <div className="border rounded-lg p-3 bg-muted/30">
                <img
                  src={order.productImage}
                  alt={order.productName}
                  className="w-48 h-48 object-cover rounded-lg"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTkyIiBoZWlnaHQ9IjE5MiIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTkyIiBoZWlnaHQ9IjE5MiIgZmlsbD0iI2YzZjRmNiIvPjx0ZXh0IHg9IjUwJSIgeT0iNTAlIiBmb250LXNpemU9IjE2IiBmaWxsPSIjOWNhM2FmIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBkeT0iLjNlbSI+5Zu+54mH5Yqg6L296ZSZ6K+vPC90ZXh0Pjwvc3ZnPg==';
                  }}
                />
              </div>
            </div>
          )}

          {/* 订单信息 */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {infoItems.map((item, index) => (
              <div key={index} className="space-y-1">
                <label className="text-xs font-medium text-gray-500">{item.label}</label>
                <div className="text-sm font-medium text-gray-900 bg-muted/30 rounded px-3 py-2">
                  {item.value}
                </div>
              </div>
            ))}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
