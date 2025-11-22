'use client';

import { ProductSalesOrder } from '@/lib/types';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Eye } from "lucide-react";

interface OrderTableProps {
  orders: ProductSalesOrder[];
  onViewDetail: (order: ProductSalesOrder) => void;
}

export default function OrderTable({ orders, onViewDetail }: OrderTableProps) {
  if (orders.length === 0) {
    return (
      <div className="text-center py-12 bg-white rounded-lg border">
        <p className="text-gray-500 text-sm">暂无订单数据</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[80px]">订单ID</TableHead>
            <TableHead>店铺名称</TableHead>
            <TableHead>商品名称</TableHead>
            <TableHead>销售区域</TableHead>
            <TableHead>仓库信息</TableHead>
            <TableHead>销售日期</TableHead>
            <TableHead className="text-right">销售数量</TableHead>
            <TableHead className="text-right">总库存</TableHead>
            <TableHead>创建时间</TableHead>
            <TableHead className="w-[100px] text-center">操作</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {orders.map((order) => (
            <TableRow key={order.id}>
              <TableCell className="font-medium text-sm">{order.id}</TableCell>
              <TableCell className="text-sm">{order.shopName}</TableCell>
              <TableCell className="text-sm max-w-[200px] truncate" title={order.productName}>
                {order.productName}
              </TableCell>
              <TableCell className="text-sm">{order.salesArea}</TableCell>
              <TableCell className="text-sm">{order.warehouseInfo}</TableCell>
              <TableCell className="text-sm">{order.salesDate}</TableCell>
              <TableCell className="text-right text-sm font-medium">
                {order.salesQuantity}
              </TableCell>
              <TableCell className="text-right text-sm">
                {order.totalStock}
              </TableCell>
              <TableCell className="text-sm text-gray-500">
                {new Date(order.createdAt).toLocaleString('zh-CN', {
                  year: 'numeric',
                  month: '2-digit',
                  day: '2-digit',
                  hour: '2-digit',
                  minute: '2-digit'
                })}
              </TableCell>
              <TableCell className="text-center">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onViewDetail(order)}
                  className="h-7 px-2"
                >
                  <Eye className="h-3.5 w-3.5 mr-1" />
                  查看
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
