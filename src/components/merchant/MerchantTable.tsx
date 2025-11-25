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
import { ArrowDown, ArrowUp, ArrowUpDown, CheckCircle2, XCircle, MoreVertical, Edit, Trash2, MessageSquare } from "lucide-react";
import { Merchant } from '@/lib/types';

interface MerchantTableProps {
  merchants: Merchant[];
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
  onEdit: (merchant: Merchant) => void;
  onDelete: (id: string) => void;
  onSendMessage: (merchant: Merchant) => void;
}

export default function MerchantTable({
  merchants,
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
  onDelete,
  onSendMessage
}: MerchantTableProps) {
  // 返回排序图标
  const getSortIcon = (field: string) => {
    if (sortField !== field) {
      return <ArrowUpDown className="ml-1 h-3 w-3 text-muted-foreground" />;
    }
    return sortDirection === 'ASC'
      ? <ArrowUp className="ml-1 h-3 w-3 text-primary" />
      : <ArrowDown className="ml-1 h-3 w-3 text-primary" />;
  };

  // 为每个名称生成一致的随机颜色
  const getColorForName = (name: string) => {
    const colors = [
      'bg-blue-100 text-blue-700',
      'bg-green-100 text-green-700',
      'bg-purple-100 text-purple-700',
      'bg-pink-100 text-pink-700',
      'bg-yellow-100 text-yellow-700',
      'bg-indigo-100 text-indigo-700',
      'bg-red-100 text-red-700',
      'bg-orange-100 text-orange-700',
      'bg-teal-100 text-teal-700',
      'bg-cyan-100 text-cyan-700'
    ];

    // 使用名称的字符码总和来确定颜色索引
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
      hash += name.charCodeAt(i);
    }

    return colors[hash % colors.length];
  };

  return (
    <div className="space-y-2">
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50">
              <TableHead className="font-medium h-9 py-1 px-2">ID</TableHead>
              <TableHead className="font-medium h-9 py-1 px-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onSort("name")}
                  className={`h-6 px-1 font-medium -ml-1 hover:bg-transparent ${sortField === "name" ? "text-primary" : ""}`}
                >
                  商家名称
                  {getSortIcon("name")}
                </Button>
              </TableHead>
              <TableHead className="font-medium h-9 py-1 px-2">拼多多店铺ID</TableHead>
              <TableHead className="font-medium h-9 py-1 px-2">拼多多店铺名称</TableHead>
              <TableHead className="font-medium h-9 py-1 px-2">子账号</TableHead>
              <TableHead className="font-medium h-9 py-1 px-2">多多密码</TableHead>
              <TableHead className="font-medium h-9 py-1 px-2">仓库名称</TableHead>
              <TableHead className="font-medium h-9 py-1 px-2">微信群名称</TableHead>
              <TableHead className="font-medium h-9 py-1 px-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onSort("sendMessage")}
                  className={`h-6 px-1 font-medium -ml-1 hover:bg-transparent ${sortField === "sendMessage" ? "text-primary" : ""}`}
                >
                  发送消息
                  {getSortIcon("sendMessage")}
                </Button>
              </TableHead>
              <TableHead className="font-medium h-9 py-1 px-2">发送截图</TableHead>
              <TableHead className="font-medium h-9 py-1 px-2 min-w-[150px]">艾特对象</TableHead>
              <TableHead className="font-medium h-9 py-1 px-2 w-[90px] text-right">操作</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={12} className="h-24 text-center">
                  加载中...
                </TableCell>
              </TableRow>
            ) : merchants.length === 0 ? (
              <TableRow>
                <TableCell colSpan={12} className="h-24 text-center">
                  没有找到商家数据
                </TableCell>
              </TableRow>
            ) : (
              merchants.map((merchant: Merchant) => (
                <TableRow key={merchant.id} className="hover:bg-muted/50">
                  <TableCell className="py-1.5 px-2 text-muted-foreground text-xs font-mono">{merchant.id}</TableCell>
                  <TableCell className="font-medium py-1.5 px-2">{merchant.name}</TableCell>
                  <TableCell className="py-1.5 px-2 text-muted-foreground text-sm">{merchant.pinduoduoShopId || '-'}</TableCell>
                  <TableCell className="py-1.5 px-2">{merchant.pinduoduoName || '-'}</TableCell>
                  <TableCell className="py-1.5 px-2">{merchant.subAccount || '-'}</TableCell>
                  <TableCell className="py-1.5 px-2">
                    {merchant.pinduoduoPassword || '-'}
                  </TableCell>
                  <TableCell className="py-1.5 px-2">{merchant.warehouse1}</TableCell>
                  <TableCell className="py-1.5 px-2">{merchant.groupName}</TableCell>
                  <TableCell className="py-1.5 px-2">
                    <div className="flex items-center">
                      {merchant.sendMessage ? (
                        <div className="flex items-center text-green-600">
                          <CheckCircle2 className="h-4 w-4 mr-1" />
                          <span className="text-xs font-medium">是</span>
                        </div>
                      ) : (
                        <div className="flex items-center text-red-500">
                          <XCircle className="h-4 w-4 mr-1" />
                          <span className="text-xs font-medium">否</span>
                        </div>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="py-1.5 px-2">
                    <div className="flex items-center">
                      {merchant.sendOrderScreenshot ? (
                        <div className="flex items-center text-green-600">
                          <CheckCircle2 className="h-4 w-4 mr-1" />
                          <span className="text-xs font-medium">是</span>
                        </div>
                      ) : (
                        <div className="flex items-center text-red-500">
                          <XCircle className="h-4 w-4 mr-1" />
                          <span className="text-xs font-medium">否</span>
                        </div>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="py-1.5 px-2">
                    <div className="flex flex-wrap gap-1">
                      {merchant.mentionList && merchant.mentionList.length > 0 ? (
                        merchant.mentionList.map((mention, index) => (
                          <span
                            key={index}
                            className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${getColorForName(mention)}`}
                          >
                            @{mention}
                          </span>
                        ))
                      ) : (
                        <span className="text-xs text-muted-foreground">-</span>
                      )}
                    </div>
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
                      <DropdownMenuContent align="end" className="w-36">
                        <DropdownMenuItem onClick={() => onEdit(merchant)}>
                          <Edit className="mr-2 h-4 w-4" />
                          编辑
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => onSendMessage(merchant)}>
                          <MessageSquare className="mr-2 h-4 w-4" />
                          发送消息
                        </DropdownMenuItem>

                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          onClick={() => onDelete(merchant.id)}
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
            <span>条，共 {totalItems} 条</span>
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