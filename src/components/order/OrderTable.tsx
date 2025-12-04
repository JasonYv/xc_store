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
import { Eye, AlertTriangle, AlertCircle } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface OrderTableProps {
  orders: ProductSalesOrder[];
  onViewDetail: (order: ProductSalesOrder) => void;
}

export default function OrderTable({ orders, onViewDetail }: OrderTableProps) {
  // 判断库存状态
  const getStockStatus = (order: ProductSalesOrder) => {
    if (order.totalStock < order.salesQuantity) {
      return 'critical'; // 库存不足 - 红色警告
    } else if (order.totalStock < order.estimatedSales) {
      return 'warning'; // 库存偏低 - 黄色提示
    }
    return 'normal'; // 正常
  };

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
            <TableHead>区域-仓库</TableHead>
            <TableHead>销售日期</TableHead>
            <TableHead className="text-right">预估销量</TableHead>
            <TableHead className="text-right">销售数量</TableHead>
            <TableHead className="text-right">总库存</TableHead>
            <TableHead>更新时间</TableHead>
            <TableHead className="w-[100px] text-center">操作</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {orders.map((order) => (
            <TableRow key={order.id}>
              <TableCell className="font-medium text-sm">{order.id}</TableCell>
              <TableCell className="text-sm">{order.shopName}</TableCell>
              <TableCell className="text-sm max-w-[300px] truncate" title={order.productName}>
                {order.productName}
              </TableCell>
              <TableCell className="text-sm">
                {order.salesArea} - {order.warehouseInfo}
              </TableCell>
              <TableCell className="text-sm">{order.salesDate}</TableCell>
              <TableCell className="text-right text-sm text-blue-600">
                {order.estimatedSales}
              </TableCell>
              <TableCell className="text-right text-sm font-medium">
                {order.salesQuantity}
              </TableCell>
              <TableCell className="text-right text-sm">
                <TooltipProvider>
                  <div className="flex items-center justify-end gap-1">
                    {(() => {
                      const status = getStockStatus(order);
                      if (status === 'critical') {
                        return (
                          <>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <AlertCircle className="h-4 w-4 text-red-500" />
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>库存不足: 总库存({order.totalStock}) &lt; 销售数量({order.salesQuantity})</p>
                              </TooltipContent>
                            </Tooltip>
                            <span className="font-medium text-red-600">{order.totalStock}</span>
                          </>
                        );
                      } else if (status === 'warning') {
                        return (
                          <>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <AlertTriangle className="h-4 w-4 text-orange-500" />
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>库存偏低: 总库存({order.totalStock}) &lt; 预估销量({order.estimatedSales})</p>
                              </TooltipContent>
                            </Tooltip>
                            <span className="text-orange-600">{order.totalStock}</span>
                          </>
                        );
                      }
                      return <span>{order.totalStock}</span>;
                    })()}
                  </div>
                </TooltipProvider>
              </TableCell>
              <TableCell className="text-sm text-gray-500">
                {new Date(order.updatedAt).toLocaleString('zh-CN', {
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
