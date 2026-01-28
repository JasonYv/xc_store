'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { Button } from "@/components/ui/button";
import { FileText, Calendar, Search, ChevronLeft, ChevronRight } from "lucide-react";
import DashboardLayout from '@/components/layout/DashboardLayout';
import { OperationLog } from '@/lib/types';
import { useToast } from "@/hooks/use-toast";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export default function OperationLogsPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [logs, setLogs] = useState<OperationLog[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(20);
  const [totalPages, setTotalPages] = useState(0);

  // 筛选条件
  const [filters, setFilters] = useState({
    targetTable: 'all',
    action: 'all',
    operatorType: 'all',
    operatorName: '',
    startDate: '',
    endDate: ''
  });

  // 检查用户是否已登录
  useEffect(() => {
    const auth = localStorage.getItem('isAuthenticated');
    if (!auth) {
      router.push('/');
    } else {
      setIsAuthenticated(true);
      fetchLogs();
    }
  }, [router]);

  // 获取日志列表
  const fetchLogs = async (pageNum?: number) => {
    try {
      setIsLoading(true);
      const params = new URLSearchParams();
      params.append('t', Date.now().toString());
      params.append('page', String(pageNum || page));
      params.append('pageSize', String(pageSize));

      if (filters.targetTable && filters.targetTable !== 'all') {
        params.append('targetTable', filters.targetTable);
      }
      if (filters.action && filters.action !== 'all') {
        params.append('action', filters.action);
      }
      if (filters.operatorType && filters.operatorType !== 'all') {
        params.append('operatorType', filters.operatorType);
      }
      if (filters.operatorName) {
        params.append('operatorName', filters.operatorName);
      }
      if (filters.startDate) {
        params.append('startDate', filters.startDate);
      }
      if (filters.endDate) {
        params.append('endDate', filters.endDate);
      }

      const response = await fetch(`/api/operation-logs?${params.toString()}`);
      const data = await response.json();
      if (data.success) {
        setLogs(data.data.items || []);
        setTotal(data.data.total || 0);
        setTotalPages(data.data.totalPages || 0);
      }
    } catch (error) {
      console.error('获取日志失败:', error);
      toast({
        title: "出错了",
        description: "获取操作日志失败，请稍后再试",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // 应用筛选
  const handleSearch = () => {
    setPage(1);
    fetchLogs(1);
  };

  // 翻页
  const handlePageChange = (newPage: number) => {
    setPage(newPage);
    fetchLogs(newPage);
  };

  if (!isAuthenticated) {
    return null;
  }

  // 表名显示
  const getTableName = (table: string) => {
    const tableNames: Record<string, string> = {
      'daily_deliveries': '当日送货',
      'return_details': '余货/客退'
    };
    return tableNames[table] || table;
  };

  // 操作类型显示
  const getActionName = (action: string) => {
    const actionNames: Record<string, string> = {
      'create': '新增',
      'update': '修改',
      'delete': '删除',
      'batch_import': '批量导入',
      'status_change': '状态变更'
    };
    return actionNames[action] || action;
  };

  // 操作类型颜色
  const getActionColor = (action: string) => {
    const colors: Record<string, string> = {
      'create': 'bg-green-100 text-green-700',
      'update': 'bg-blue-100 text-blue-700',
      'delete': 'bg-red-100 text-red-700',
      'batch_import': 'bg-purple-100 text-purple-700',
      'status_change': 'bg-orange-100 text-orange-700'
    };
    return colors[action] || 'bg-gray-100 text-gray-700';
  };

  // 操作人类型显示
  const getOperatorTypeName = (type: string) => {
    const typeNames: Record<string, string> = {
      'admin': '管理员',
      'employee': '仓内员工'
    };
    return typeNames[type] || type;
  };

  // 格式化日期时间
  const formatDateTime = (dateStr: string) => {
    try {
      const date = new Date(dateStr);
      return date.toLocaleString('zh-CN', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
      });
    } catch {
      return dateStr;
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* 页面标题 */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
              <FileText className="w-8 h-8" />
              操作日志
            </h1>
            <p className="text-muted-foreground mt-2">
              查看仓储管理相关的操作记录
            </p>
          </div>
        </div>

        {/* 筛选条件 */}
        <div className="bg-white p-4 rounded-lg border space-y-4">
          <h3 className="font-semibold flex items-center gap-2">
            <Search className="w-4 h-4" />
            筛选条件
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
            <div>
              <Label>目标模块</Label>
              <Select value={filters.targetTable} onValueChange={(v) => setFilters({...filters, targetTable: v})}>
                <SelectTrigger>
                  <SelectValue placeholder="全部" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">全部</SelectItem>
                  <SelectItem value="daily_deliveries">当日送货</SelectItem>
                  <SelectItem value="return_details">余货/客退</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>操作类型</Label>
              <Select value={filters.action} onValueChange={(v) => setFilters({...filters, action: v})}>
                <SelectTrigger>
                  <SelectValue placeholder="全部" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">全部</SelectItem>
                  <SelectItem value="create">新增</SelectItem>
                  <SelectItem value="update">修改</SelectItem>
                  <SelectItem value="delete">删除</SelectItem>
                  <SelectItem value="batch_import">批量导入</SelectItem>
                  <SelectItem value="status_change">状态变更</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>操作人类型</Label>
              <Select value={filters.operatorType} onValueChange={(v) => setFilters({...filters, operatorType: v})}>
                <SelectTrigger>
                  <SelectValue placeholder="全部" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">全部</SelectItem>
                  <SelectItem value="admin">管理员</SelectItem>
                  <SelectItem value="employee">仓内员工</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>操作人</Label>
              <Input
                placeholder="搜索操作人"
                value={filters.operatorName}
                onChange={(e) => setFilters({...filters, operatorName: e.target.value})}
              />
            </div>
            <div>
              <Label>开始日期</Label>
              <Input
                type="date"
                value={filters.startDate}
                onChange={(e) => setFilters({...filters, startDate: e.target.value})}
              />
            </div>
            <div>
              <Label>结束日期</Label>
              <Input
                type="date"
                value={filters.endDate}
                onChange={(e) => setFilters({...filters, endDate: e.target.value})}
              />
            </div>
          </div>
          <Button onClick={handleSearch} className="w-full md:w-auto">
            <Search className="mr-2 h-4 w-4" /> 查询
          </Button>
        </div>

        {/* 数据表格 */}
        <div className="bg-white rounded-lg border">
          {isLoading ? (
            <div className="p-8 text-center text-gray-500">加载中...</div>
          ) : logs.length === 0 ? (
            <div className="p-8 text-center text-gray-500">暂无数据</div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>操作时间</TableHead>
                    <TableHead>目标模块</TableHead>
                    <TableHead>操作类型</TableHead>
                    <TableHead>操作人类型</TableHead>
                    <TableHead>操作人</TableHead>
                    <TableHead>备注</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {logs.map((log) => (
                    <TableRow key={log.id}>
                      <TableCell className="whitespace-nowrap">
                        {formatDateTime(log.createdAt)}
                      </TableCell>
                      <TableCell>
                        <span className="px-2 py-1 rounded text-xs bg-gray-100 text-gray-700">
                          {getTableName(log.targetTable)}
                        </span>
                      </TableCell>
                      <TableCell>
                        <span className={`px-2 py-1 rounded text-xs ${getActionColor(log.action)}`}>
                          {getActionName(log.action)}
                        </span>
                      </TableCell>
                      <TableCell>
                        <span className={`px-2 py-1 rounded text-xs ${log.operatorType === 'admin' ? 'bg-blue-100 text-blue-700' : 'bg-yellow-100 text-yellow-700'}`}>
                          {getOperatorTypeName(log.operatorType)}
                        </span>
                      </TableCell>
                      <TableCell className="font-medium">{log.operatorName}</TableCell>
                      <TableCell className="max-w-xs truncate" title={log.remark}>
                        {log.remark || '-'}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              {/* 分页 */}
              <div className="flex items-center justify-between px-4 py-3 border-t">
                <div className="text-sm text-gray-500">
                  共 {total} 条记录，第 {page} / {totalPages} 页
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handlePageChange(page - 1)}
                    disabled={page <= 1}
                  >
                    <ChevronLeft className="h-4 w-4" />
                    上一页
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handlePageChange(page + 1)}
                    disabled={page >= totalPages}
                  >
                    下一页
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
