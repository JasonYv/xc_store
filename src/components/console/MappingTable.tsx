'use client';

import { Pencil, Trash2 } from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from '@/components/ui/pagination';
import type { ProductMapping } from '@/lib/types';

// 映射表列表。骨架照 components/merchant/MerchantTable：
// 圆角边框的 shadcn Table + 底部分页，空态和加载态各占一行。

interface MappingTableProps {
  rows: ProductMapping[];
  isLoading: boolean;
  currentPage: number;
  totalPages: number;
  pageSize: number;
  totalItems: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: number) => void;
  onEdit: (row: ProductMapping) => void;
  onDelete: (row: ProductMapping) => void;
}

/** 空值统一显示成一个淡淡的占位，别留一片白让人以为渲染坏了 */
function Cell({ value, mono = false }: { value: string; mono?: boolean }) {
  if (!value) return <span className="text-muted-foreground/50">—</span>;
  return <span className={mono ? 'font-mono text-xs' : undefined}>{value}</span>;
}

export default function MappingTable({
  rows,
  isLoading,
  currentPage,
  totalPages,
  pageSize,
  totalItems,
  onPageChange,
  onPageSizeChange,
  onEdit,
  onDelete,
}: MappingTableProps) {
  // 中间那几个页码：当前页 ±1，掐掉首尾（1 和最后一页单独pin住）
  const middlePages: number[] = [];
  const startPage = Math.max(2, currentPage - 1);
  const endPage = Math.min(totalPages - 1, currentPage + 1);
  for (let page = startPage; page <= endPage; page += 1) {
    middlePages.push(page);
  }

  return (
    <div className="space-y-2">
      <div className="rounded-md border bg-white">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50">
              <TableHead className="h-9 whitespace-nowrap px-2 py-1 font-medium">派单表商品名称</TableHead>
              <TableHead className="h-9 whitespace-nowrap px-2 py-1 font-medium">多多商品名称</TableHead>
              <TableHead className="h-9 whitespace-nowrap px-2 py-1 font-medium">商品码</TableHead>
              <TableHead className="h-9 whitespace-nowrap px-2 py-1 font-medium">规格</TableHead>
              <TableHead className="h-9 whitespace-nowrap px-2 py-1 font-medium">金蝶代码</TableHead>
              <TableHead className="h-9 whitespace-nowrap px-2 py-1 font-medium">箱规</TableHead>
              <TableHead className="h-9 whitespace-nowrap px-2 py-1 font-medium">商品大类</TableHead>
              <TableHead className="h-9 w-[110px] px-2 py-1 text-right font-medium">操作</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={8} className="h-24 text-center text-muted-foreground">
                  加载中…
                </TableCell>
              </TableRow>
            ) : rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="h-24 text-center text-muted-foreground">
                  没有数据。可以「新增一行」手工建，或者「导入 xlsx」把现有的商品清单传上来。
                </TableCell>
              </TableRow>
            ) : (
              rows.map(row => (
                <TableRow key={row.id}>
                  <TableCell className="px-2 py-1.5">
                    <Cell value={row.dispatchName} />
                  </TableCell>
                  <TableCell className="px-2 py-1.5">
                    <Cell value={row.pddName} />
                  </TableCell>
                  <TableCell className="px-2 py-1.5">
                    <Cell value={row.productId} mono />
                  </TableCell>
                  <TableCell className="px-2 py-1.5">
                    <Cell value={row.spec} />
                  </TableCell>
                  <TableCell className="px-2 py-1.5">
                    <Cell value={row.listCode} mono />
                  </TableCell>
                  <TableCell className="px-2 py-1.5">
                    <Cell value={row.boxSpec} />
                  </TableCell>
                  <TableCell className="px-2 py-1.5">
                    <Cell value={row.category} />
                  </TableCell>
                  <TableCell className="px-2 py-1.5 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onEdit(row)}
                        className="h-7 px-2 text-xs"
                      >
                        <Pencil className="h-3 w-3" />
                        <span className="sr-only">编辑</span>
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onDelete(row)}
                        className="h-7 px-2 text-xs text-destructive hover:text-destructive"
                      >
                        <Trash2 className="h-3 w-3" />
                        <span className="sr-only">删除</span>
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {totalItems > 0 && (
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span>每页</span>
            <select
              className="h-7 rounded-md border bg-white px-2 text-xs"
              value={pageSize}
              onChange={event => onPageSizeChange(Number(event.target.value))}
            >
              {[20, 50, 100].map(size => (
                <option key={size} value={size}>
                  {size}
                </option>
              ))}
            </select>
            <span>行，共 {totalItems} 行</span>
          </div>

          {totalPages > 1 && (
            <Pagination className="mx-0 w-auto justify-end">
              <PaginationContent>
                <PaginationItem>
                  <PaginationPrevious
                    onClick={() => currentPage > 1 && onPageChange(currentPage - 1)}
                    className={currentPage <= 1 ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
                  />
                </PaginationItem>

                <PaginationItem>
                  <PaginationLink
                    onClick={() => onPageChange(1)}
                    isActive={currentPage === 1}
                    className="cursor-pointer"
                  >
                    1
                  </PaginationLink>
                </PaginationItem>

                {currentPage > 3 && (
                  <PaginationItem>
                    <PaginationEllipsis />
                  </PaginationItem>
                )}

                {middlePages.map(page => (
                  <PaginationItem key={page}>
                    <PaginationLink
                      onClick={() => onPageChange(page)}
                      isActive={currentPage === page}
                      className="cursor-pointer"
                    >
                      {page}
                    </PaginationLink>
                  </PaginationItem>
                ))}

                {currentPage < totalPages - 2 && (
                  <PaginationItem>
                    <PaginationEllipsis />
                  </PaginationItem>
                )}

                {totalPages > 1 && (
                  <PaginationItem>
                    <PaginationLink
                      onClick={() => onPageChange(totalPages)}
                      isActive={currentPage === totalPages}
                      className="cursor-pointer"
                    >
                      {totalPages}
                    </PaginationLink>
                  </PaginationItem>
                )}

                <PaginationItem>
                  <PaginationNext
                    onClick={() => currentPage < totalPages && onPageChange(currentPage + 1)}
                    className={
                      currentPage >= totalPages ? 'pointer-events-none opacity-50' : 'cursor-pointer'
                    }
                  />
                </PaginationItem>
              </PaginationContent>
            </Pagination>
          )}
        </div>
      )}
    </div>
  );
}
