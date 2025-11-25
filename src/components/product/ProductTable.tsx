import { Button } from "@/components/ui/button";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell
} from "@/components/ui/table";
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ArrowDown, ArrowUp, ArrowUpDown, MoreVertical, Edit, Trash2 } from "lucide-react";
import { Product } from '@/lib/types';
import { useEffect, useState } from 'react';

interface ProductTableProps {
  products: Product[];
  isLoading: boolean;
  currentPage: number;
  totalPages: number;
  pageSize: number;
  totalItems: number;
  sortField: string;
  sortDirection: 'ASC' | 'DESC';
  onPageChange: (page: number) => void;
  onPageSizeChange: (pageSize: number) => void;
  onSort: (field: string) => void;
  onEdit: (product: Product) => void;
  onDelete: (id: string) => void;
}

export default function ProductTable({
  products,
  isLoading,
  currentPage,
  totalPages,
  pageSize,
  totalItems,
  sortField,
  sortDirection,
  onPageChange,
  onPageSizeChange,
  onSort,
  onEdit,
  onDelete
}: ProductTableProps) {
  const [merchantMap, setMerchantMap] = useState<Record<string, string>>({});

  // 获取商家名称映射
  useEffect(() => {
    const fetchMerchants = async () => {
      try {
        const response = await fetch(`/api/merchants?pageSize=1000&t=${Date.now()}`);
        const data = await response.json();
        const map: Record<string, string> = {};
        if (data.items) {
          data.items.forEach((merchant: any) => {
            map[merchant.id] = merchant.name;
          });
        }
        setMerchantMap(map);
      } catch (error) {
        console.error('获取商家列表失败:', error);
      }
    };
    fetchMerchants();
  }, []);

  // 返回排序图标
  const getSortIcon = (field: string) => {
    if (sortField !== field) {
      return <ArrowUpDown className="ml-1 h-3 w-3 text-muted-foreground" />;
    }
    return sortDirection === 'ASC'
      ? <ArrowUp className="ml-1 h-3 w-3 text-primary" />
      : <ArrowDown className="ml-1 h-3 w-3 text-primary" />;
  };

  return (
    <div className="space-y-2">
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50">
              <TableHead className="font-medium h-9 py-1 px-2 w-[80px]">商品图片</TableHead>
              <TableHead className="font-medium h-9 py-1 px-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onSort("productName")}
                  className={`h-6 px-1 font-medium -ml-1 hover:bg-transparent ${sortField === "productName" ? "text-primary" : ""}`}
                >
                  云仓商品名称
                  {getSortIcon("productName")}
                </Button>
              </TableHead>
              <TableHead className="font-medium h-9 py-1 px-2">多多买菜商品ID</TableHead>
              <TableHead className="font-medium h-9 py-1 px-2">多多买菜商品名称</TableHead>
              <TableHead className="font-medium h-9 py-1 px-2">所属商家</TableHead>
              <TableHead className="font-medium h-9 py-1 px-2 w-[90px] text-right">操作</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={6} className="h-24 text-center">
                  加载中...
                </TableCell>
              </TableRow>
            ) : products.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="h-24 text-center">
                  没有找到商品数据
                </TableCell>
              </TableRow>
            ) : (
              products.map((product: Product) => (
                <TableRow key={product.id} className="hover:bg-muted/50">
                  <TableCell className="py-1.5 px-2">
                    {product.pinduoduoProductImage ? (
                      <img
                        src={product.pinduoduoProductImage}
                        alt={product.productName}
                        className="w-16 h-16 object-cover rounded border"
                        onError={(e) => {
                          (e.target as HTMLImageElement).src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjQiIGhlaWdodD0iNjQiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PHJlY3Qgd2lkdGg9IjY0IiBoZWlnaHQ9IjY0IiBmaWxsPSIjZjNmNGY2Ii8+PHRleHQgeD0iNTAlIiB5PSI1MCUiIGZvbnQtc2l6ZT0iMTIiIGZpbGw9IiM5Y2EzYWYiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGR5PSIuM2VtIj7ml6Dlm77niYc8L3RleHQ+PC9zdmc+';
                        }}
                      />
                    ) : (
                      <div className="w-16 h-16 bg-muted rounded border flex items-center justify-center">
                        <span className="text-xs text-muted-foreground">无图片</span>
                      </div>
                    )}
                  </TableCell>
                  <TableCell className="font-medium py-1.5 px-2">{product.productName}</TableCell>
                  <TableCell className="py-1.5 px-2 text-muted-foreground text-sm">{product.pinduoduoProductId || '-'}</TableCell>
                  <TableCell className="py-1.5 px-2">{product.pinduoduoProductName || '-'}</TableCell>
                  <TableCell className="py-1.5 px-2">
                    {merchantMap[product.merchantId] || <span className="text-muted-foreground text-sm">-</span>}
                  </TableCell>
                  <TableCell className="py-1.5 px-2 text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0"
                        >
                          <MoreVertical className="h-4 w-4" />
                          <span className="sr-only">打开菜单</span>
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-28">
                        <DropdownMenuItem onClick={() => onEdit(product)}>
                          <Edit className="mr-2 h-4 w-4" />
                          编辑
                        </DropdownMenuItem>

                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          onClick={() => onDelete(product.id)}
                          className="text-destructive focus:text-destructive"
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          删除
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {!isLoading && totalPages > 0 && (
        <div className="flex items-center justify-between pt-1">
          <div className="flex items-center gap-1.5 text-sm text-muted-foreground whitespace-nowrap">
            <span>每页</span>
            <Select
              value={pageSize.toString()}
              onValueChange={(value) => onPageSizeChange(Number(value))}
            >
              <SelectTrigger className="h-8 w-[4.5rem]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent side="top">
                {[10, 20, 30, 50, 100].map((size) => (
                  <SelectItem key={size} value={size.toString()}>
                    {size}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <span>条,共 {totalItems} 条</span>
          </div>

          <Pagination>
            <PaginationContent>
              <PaginationItem>
                <PaginationPrevious
                  onClick={() => currentPage > 1 && onPageChange(currentPage - 1)}
                  className={currentPage <= 1 ? "pointer-events-none opacity-50" : "cursor-pointer"}
                />
              </PaginationItem>

              {(() => {
                const pages = [];
                const showEllipsisStart = currentPage > 3;
                const showEllipsisEnd = currentPage < totalPages - 2;

                // 始终显示第一页
                pages.push(
                  <PaginationItem key={1}>
                    <PaginationLink
                      onClick={() => onPageChange(1)}
                      isActive={currentPage === 1}
                    >
                      1
                    </PaginationLink>
                  </PaginationItem>
                );

                // 左侧省略号
                if (showEllipsisStart) {
                  pages.push(
                    <PaginationItem key="ellipsis-start">
                      <PaginationEllipsis />
                    </PaginationItem>
                  );
                }

                // 显示当前页前后的页码
                const startPage = Math.max(2, currentPage - 1);
                const endPage = Math.min(totalPages - 1, currentPage + 1);

                for (let i = startPage; i <= endPage; i++) {
                  pages.push(
                    <PaginationItem key={i}>
                      <PaginationLink
                        onClick={() => onPageChange(i)}
                        isActive={currentPage === i}
                      >
                        {i}
                      </PaginationLink>
                    </PaginationItem>
                  );
                }

                // 右侧省略号
                if (showEllipsisEnd) {
                  pages.push(
                    <PaginationItem key="ellipsis-end">
                      <PaginationEllipsis />
                    </PaginationItem>
                  );
                }

                // 始终显示最后一页
                if (totalPages > 1) {
                  pages.push(
                    <PaginationItem key={totalPages}>
                      <PaginationLink
                        onClick={() => onPageChange(totalPages)}
                        isActive={currentPage === totalPages}
                      >
                        {totalPages}
                      </PaginationLink>
                    </PaginationItem>
                  );
                }

                return pages;
              })()}

              <PaginationItem>
                <PaginationNext
                  onClick={() => currentPage < totalPages && onPageChange(currentPage + 1)}
                  className={currentPage >= totalPages ? "pointer-events-none opacity-50" : "cursor-pointer"}
                />
              </PaginationItem>
            </PaginationContent>
          </Pagination>
        </div>
      )}
    </div>
  );
}
