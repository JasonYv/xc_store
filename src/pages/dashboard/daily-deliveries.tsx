'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { Button } from "@/components/ui/button";
import { Package, Calendar, Upload, X, MoreHorizontal, Edit, Trash2, RefreshCw, RotateCcw, AlertTriangle } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import DashboardLayout from '@/components/layout/DashboardLayout';
import Modal from '@/components/common/Modal';
import { DailyDelivery, DailyDeliveryFormData } from '@/lib/types';
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

export default function DailyDeliveriesPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [deliveries, setDeliveries] = useState<DailyDelivery[]>([]);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedDelivery, setSelectedDelivery] = useState<DailyDelivery | undefined>(undefined);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isClearingToday, setIsClearingToday] = useState(false);

  // 批量导入相关
  const [isBatchModalOpen, setIsBatchModalOpen] = useState(false);
  const [pasteData, setPasteData] = useState('');
  const [parsedData, setParsedData] = useState<DailyDeliveryFormData[]>([]);
  const [isBatchImporting, setIsBatchImporting] = useState(false);
  const [importStep, setImportStep] = useState<'paste' | 'preview'>('paste'); // 导入步骤
  const [duplicateKeys, setDuplicateKeys] = useState<Set<string>>(new Set()); // 重复记录的键

  // 筛选条件
  const [filters, setFilters] = useState({
    merchantName: '',
    productName: '',
    deliveryDate: '',
    distributionStatus: 'all',
    warehousingStatus: 'all'
  });

  // 分页状态
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(20);
  const [totalItems, setTotalItems] = useState(0);
  const totalPages = Math.ceil(totalItems / pageSize);

  // 检查用户是否已登录
  useEffect(() => {
    const auth = localStorage.getItem('isAuthenticated');
    if (!auth) {
      router.push('/');
    } else {
      setIsAuthenticated(true);
      // 检查是否是admin账号
      const username = localStorage.getItem('username');
      setIsAdmin(username === 'admin');
      fetchDeliveries();
    }
  }, [router]);

  // 获取送货记录
  const fetchDeliveries = async (page: number = currentPage) => {
    try {
      setIsLoading(true);
      const params = new URLSearchParams();
      params.append('t', Date.now().toString());
      params.append('page', page.toString());
      params.append('pageSize', pageSize.toString());
      if (filters.merchantName) params.append('merchantName', filters.merchantName);
      if (filters.productName) params.append('productName', filters.productName);
      if (filters.deliveryDate) params.append('deliveryDate', filters.deliveryDate);
      if (filters.distributionStatus && filters.distributionStatus !== 'all') params.append('distributionStatus', filters.distributionStatus);
      if (filters.warehousingStatus && filters.warehousingStatus !== 'all') params.append('warehousingStatus', filters.warehousingStatus);

      const response = await fetch(`/api/daily-deliveries?${params.toString()}`);
      const data = await response.json();
      if (data.success) {
        setDeliveries(data.data.items || []);
        setTotalItems(data.data.total || 0);
        setCurrentPage(page);
      }
    } catch (error) {
      console.error('获取送货记录失败:', error);
      toast({
        title: "出错了",
        description: "获取送货记录失败，请稍后再试",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // 搜索时重置到第一页
  const handleSearch = () => {
    setCurrentPage(1);
    fetchDeliveries(1);
  };

  // 分页切换
  const handlePageChange = (page: number) => {
    fetchDeliveries(page);
  };

  // 打开编辑模态框
  const handleEditClick = (delivery: DailyDelivery) => {
    setSelectedDelivery(delivery);
    setIsEditModalOpen(true);
  };

  // 处理删除
  const handleDeleteClick = async (id: string) => {
    if (!confirm('确定要删除此送货记录吗？')) {
      return;
    }

    try {
      const response = await fetch(`/api/daily-deliveries?id=${id}&t=${Date.now()}`, {
        method: 'DELETE'
      });
      const data = await response.json();

      if (data.success) {
        toast({
          title: "删除成功",
          description: "送货记录已成功删除",
        });
        fetchDeliveries();
      } else {
        throw new Error(data.error || '删除失败');
      }
    } catch (error: any) {
      toast({
        title: "删除失败",
        description: error.message || '删除送货记录失败，请稍后再试',
        variant: "destructive",
      });
    }
  };

  // 处理改配（将已配货改为改配状态）
  const handleChangeDistribution = async (delivery: DailyDelivery) => {
    if (!confirm('确定要将此记录设为改配状态吗？')) {
      return;
    }

    // 获取当前操作人信息
    const currentUser = localStorage.getItem('username') || '系统';

    try {
      const response = await fetch(`/api/daily-deliveries?id=${delivery.id}&t=${Date.now()}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          distributionStatus: 3, // 改配状态
          warehousingStatus: 0,  // 重置入库状态为未入库
          _operatorType: 'admin',
          _operatorId: currentUser,
          _operatorName: currentUser,
          _isStatusChange: true,
        })
      });
      const data = await response.json();

      if (data.success) {
        toast({
          title: "操作成功",
          description: "已将记录设为改配状态",
        });
        fetchDeliveries();
      } else {
        throw new Error(data.error || '操作失败');
      }
    } catch (error: any) {
      toast({
        title: "操作失败",
        description: error.message || '设置改配状态失败，请稍后再试',
        variant: "destructive",
      });
    }
  };

  // 处理重新入库（将已入库改为未入库状态）
  const handleResetWarehousing = async (delivery: DailyDelivery) => {
    if (!confirm('确定要将此记录重置为未入库状态吗？')) {
      return;
    }

    // 获取当前操作人信息
    const currentUser = localStorage.getItem('username') || '系统';

    try {
      const response = await fetch(`/api/daily-deliveries?id=${delivery.id}&t=${Date.now()}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          warehousingStatus: 0, // 重置为未入库
          _operatorType: 'admin',
          _operatorId: currentUser,
          _operatorName: currentUser,
          _isStatusChange: true,
        })
      });
      const data = await response.json();

      if (data.success) {
        toast({
          title: "操作成功",
          description: "已重置为未入库状态",
        });
        fetchDeliveries();
      } else {
        throw new Error(data.error || '操作失败');
      }
    } catch (error: any) {
      toast({
        title: "操作失败",
        description: error.message || '重置入库状态失败，请稍后再试',
        variant: "destructive",
      });
    }
  };

  // 解析粘贴的 Excel 数据
  const handleParsePasteData = async () => {
    if (!pasteData.trim()) {
      toast({
        title: "数据为空",
        description: "请粘贴 Excel 数据",
        variant: "destructive",
      });
      return;
    }

    try {
      const lines = pasteData.trim().split('\n');
      const parsed: DailyDeliveryFormData[] = [];
      const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
      const currentUser = localStorage.getItem('username') || '系统';

      // 跳过表头,从第二行开始解析
      for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;

        const cells = line.split('\t');

        // 至少需要前3列: 商家名称、商品名称、单位
        if (cells.length >= 3) {
          // Excel 格式: 商家名称 | 商品名称 | 单位 | 派单数量 | 预估销售 | ... | 昨日余货(最后一列)
          const dispatchQuantity = cells.length > 3 ? parseInt(cells[3]?.trim()) || 0 : 0;
          const estimatedSales = cells.length > 4 ? parseInt(cells[4]?.trim()) || 0 : 0;
          const surplusQuantity = cells.length > 3 ? parseInt(cells[cells.length - 1]?.trim()) || 0 : 0;

          parsed.push({
            merchantName: cells[0]?.trim() || '',
            productName: cells[1]?.trim() || '',
            unit: cells[2]?.trim() || '',
            dispatchQuantity: dispatchQuantity,   // 从第4列读取
            estimatedSales: estimatedSales,       // 从第5列读取
            surplusQuantity: surplusQuantity,     // 从最后一列读取昨日余货
            distributionStatus: 0,  // 默认未配货
            warehousingStatus: 0,   // 默认未入库
            entryUser: currentUser,
            deliveryDate: today,
          });
        }
      }

      if (parsed.length === 0) {
        toast({
          title: "解析失败",
          description: "未能解析到有效数据,至少需要:商家名称、商品名称、单位",
          variant: "destructive",
        });
        return;
      }

      // 检查重复记录
      try {
        const response = await fetch(`/api/daily-deliveries/check-duplicates?t=${Date.now()}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            items: parsed.map(item => ({
              merchantName: item.merchantName,
              productName: item.productName,
              deliveryDate: item.deliveryDate
            }))
          })
        });

        const data = await response.json();
        if (data.success && data.data.duplicateKeys) {
          setDuplicateKeys(new Set(data.data.duplicateKeys));
          const duplicateCount = data.data.duplicateKeys.length;
          const newCount = parsed.length - duplicateCount;

          if (duplicateCount > 0) {
            toast({
              title: "检测到重复记录",
              description: `共 ${parsed.length} 条数据，其中 ${duplicateCount} 条已存在将被跳过，实际可导入 ${newCount} 条`,
              variant: "default",
            });
          } else {
            toast({
              title: "解析成功",
              description: `成功解析 ${parsed.length} 条记录(自动填充了缺失字段)`,
            });
          }
        } else {
          setDuplicateKeys(new Set());
          toast({
            title: "解析成功",
            description: `成功解析 ${parsed.length} 条记录(自动填充了缺失字段)`,
          });
        }
      } catch (error) {
        // 检查重复失败不影响导入流程
        setDuplicateKeys(new Set());
        toast({
          title: "解析成功",
          description: `成功解析 ${parsed.length} 条记录(自动填充了缺失字段)`,
        });
      }

      setParsedData(parsed);
      setImportStep('preview'); // 切换到预览步骤
    } catch (error) {
      toast({
        title: "解析失败",
        description: "数据格式不正确,请检查后重试",
        variant: "destructive",
      });
    }
  };

  // 返回上一步
  const handleBackToPaste = () => {
    setImportStep('paste');
  };

  // 批量导入
  const handleBatchImport = async () => {
    if (parsedData.length === 0) {
      toast({
        title: "没有数据",
        description: "请先解析数据",
        variant: "destructive",
      });
      return;
    }

    // 过滤掉重复的记录
    const itemsToImport = parsedData.filter(item => {
      const key = `${item.merchantName}|${item.productName}|${item.deliveryDate}`;
      return !duplicateKeys.has(key);
    });

    if (itemsToImport.length === 0) {
      toast({
        title: "没有可导入的数据",
        description: "所有数据都已存在，无需重复导入",
        variant: "destructive",
      });
      return;
    }

    setIsBatchImporting(true);
    let successCount = 0;
    let failCount = 0;
    const skippedCount = parsedData.length - itemsToImport.length;

    try {
      for (const item of itemsToImport) {
        try {
          const response = await fetch(`/api/daily-deliveries?t=${Date.now()}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(item)
          });

          const data = await response.json();
          if (data.success) {
            successCount++;
          } else {
            failCount++;
          }
        } catch (error) {
          failCount++;
        }
      }

      const message = skippedCount > 0
        ? `成功导入 ${successCount} 条，失败 ${failCount} 条，跳过重复 ${skippedCount} 条`
        : `成功导入 ${successCount} 条，失败 ${failCount} 条`;

      toast({
        title: "导入完成",
        description: message,
        variant: successCount > 0 ? "default" : "destructive",
      });

      if (successCount > 0) {
        setIsBatchModalOpen(false);
        setPasteData('');
        setParsedData([]);
        setDuplicateKeys(new Set());
        setImportStep('paste');
        fetchDeliveries();
      }
    } catch (error) {
      toast({
        title: "导入失败",
        description: "批量导入过程中出错",
        variant: "destructive",
      });
    } finally {
      setIsBatchImporting(false);
    }
  };

  // 提交编辑表单
  const handleEditSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!selectedDelivery) return;

    setIsSubmitting(true);

    const formData = new FormData(e.currentTarget);
    const deliveryData: Partial<DailyDeliveryFormData> = {
      merchantName: formData.get('merchantName') as string,
      productName: formData.get('productName') as string,
      unit: formData.get('unit') as string,
      dispatchQuantity: parseInt(formData.get('dispatchQuantity') as string) || 0,
      estimatedSales: parseInt(formData.get('estimatedSales') as string) || 0,
      surplusQuantity: parseInt(formData.get('surplusQuantity') as string) || 0,
      distributionStatus: parseInt(formData.get('distributionStatus') as string) || 0,
      warehousingStatus: parseInt(formData.get('warehousingStatus') as string) || 0,
      entryUser: formData.get('entryUser') as string,
      deliveryDate: formData.get('deliveryDate') as string,
    };

    try {
      const response = await fetch(`/api/daily-deliveries?id=${selectedDelivery.id}&t=${Date.now()}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(deliveryData)
      });

      const data = await response.json();

      if (data.success) {
        toast({
          title: "更新成功",
          description: "送货记录已成功更新",
        });
        setIsEditModalOpen(false);
        fetchDeliveries();
      } else {
        throw new Error(data.error || '操作失败');
      }
    } catch (error: any) {
      toast({
        title: "操作失败",
        description: error.message || '请稍后再试',
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // 清空当日数据 (仅admin可用)
  const handleClearTodayData = async () => {
    const today = new Date().toISOString().split('T')[0];
    if (!confirm(`确定要清空今天 (${today}) 的所有送货数据吗？此操作不可恢复！`)) {
      return;
    }
    // 二次确认
    if (!confirm('再次确认：清空后数据将无法恢复，是否继续？')) {
      return;
    }

    setIsClearingToday(true);
    try {
      const response = await fetch(`/api/daily-deliveries?clearDate=${today}&t=${Date.now()}`, {
        method: 'DELETE'
      });
      const data = await response.json();

      if (data.success) {
        toast({
          title: "清空成功",
          description: `已清空 ${today} 的 ${data.data.deletedCount || 0} 条送货记录`,
        });
        fetchDeliveries();
      } else {
        throw new Error(data.error || '清空失败');
      }
    } catch (error: any) {
      toast({
        title: "清空失败",
        description: error.message || '清空当日数据失败，请稍后再试',
        variant: "destructive",
      });
    } finally {
      setIsClearingToday(false);
    }
  };

  if (!isAuthenticated) {
    return null;
  }

  const getStatusText = (status: number, type: 'distribution' | 'warehousing') => {
    if (type === 'distribution') {
      return status === 0 ? '未配货' : status === 1 ? '已配货' : '改配';
    }
    return status === 0 ? '未入库' : '已入库';
  };

  const getStatusColor = (status: number, type: 'distribution' | 'warehousing') => {
    if (type === 'distribution') {
      return status === 0 ? 'text-orange-600' : status === 1 ? 'text-green-600' : 'text-blue-600';
    }
    return status === 0 ? 'text-orange-600' : 'text-green-600';
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* 页面标题 */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
              <Package className="w-8 h-8" />
              当日送货管理
            </h1>
            <p className="text-muted-foreground mt-2">
              管理每日派送和入库信息
            </p>
          </div>
          <div className="flex gap-2">
            {isAdmin && (
              <Button
                variant="destructive"
                onClick={handleClearTodayData}
                disabled={isClearingToday}
              >
                <AlertTriangle className="mr-2 h-4 w-4" />
                {isClearingToday ? '清空中...' : '清空当日数据'}
              </Button>
            )}
            <Button variant="outline" onClick={() => setIsBatchModalOpen(true)}>
              <Upload className="mr-2 h-4 w-4" /> 批量导入
            </Button>
          </div>
        </div>

        {/* 筛选条件 */}
        <div className="bg-white p-4 rounded-lg border space-y-4">
          <h3 className="font-semibold flex items-center gap-2">
            <Calendar className="w-4 h-4" />
            筛选条件
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <div>
              <Label>商家名称</Label>
              <Input
                placeholder="搜索商家"
                value={filters.merchantName}
                onChange={(e) => setFilters({...filters, merchantName: e.target.value})}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              />
            </div>
            <div>
              <Label>商品名称</Label>
              <Input
                placeholder="搜索商品"
                value={filters.productName}
                onChange={(e) => setFilters({...filters, productName: e.target.value})}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              />
            </div>
            <div>
              <Label>送货日期</Label>
              <Input
                type="date"
                value={filters.deliveryDate}
                onChange={(e) => setFilters({...filters, deliveryDate: e.target.value})}
              />
            </div>
            <div>
              <Label>配货状态</Label>
              <Select value={filters.distributionStatus} onValueChange={(v) => setFilters({...filters, distributionStatus: v})}>
                <SelectTrigger>
                  <SelectValue placeholder="全部" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">全部</SelectItem>
                  <SelectItem value="0">未配货</SelectItem>
                  <SelectItem value="1">已配货</SelectItem>
                  <SelectItem value="3">改配</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>入库状态</Label>
              <Select value={filters.warehousingStatus} onValueChange={(v) => setFilters({...filters, warehousingStatus: v})}>
                <SelectTrigger>
                  <SelectValue placeholder="全部" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">全部</SelectItem>
                  <SelectItem value="0">未入库</SelectItem>
                  <SelectItem value="1">已入库</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <Button onClick={handleSearch} className="w-full md:w-auto">
            搜索
          </Button>
        </div>

        {/* 数据表格 */}
        <div className="bg-white rounded-lg border">
          {isLoading ? (
            <div className="p-8 text-center text-gray-500">加载中...</div>
          ) : deliveries.length === 0 ? (
            <div className="p-8 text-center text-gray-500">暂无数据</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>商家名称</TableHead>
                  <TableHead>商品名称</TableHead>
                  <TableHead>单位</TableHead>
                  <TableHead>派单数量</TableHead>
                  <TableHead>预估销售</TableHead>
                  <TableHead>昨日余货</TableHead>
                  <TableHead>配货状态</TableHead>
                  <TableHead>入库状态</TableHead>
                  <TableHead>录入人</TableHead>
                  <TableHead>日期</TableHead>
                  <TableHead>操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {deliveries.map((delivery) => (
                  <TableRow key={delivery.id}>
                    <TableCell className="font-medium">{delivery.merchantName}</TableCell>
                    <TableCell>{delivery.productName}</TableCell>
                    <TableCell>{delivery.unit}</TableCell>
                    <TableCell>{delivery.dispatchQuantity}</TableCell>
                    <TableCell>{delivery.estimatedSales}</TableCell>
                    <TableCell>{delivery.surplusQuantity || 0}</TableCell>
                    <TableCell className={getStatusColor(delivery.distributionStatus, 'distribution')}>
                      {getStatusText(delivery.distributionStatus, 'distribution')}
                    </TableCell>
                    <TableCell className={getStatusColor(delivery.warehousingStatus, 'warehousing')}>
                      {getStatusText(delivery.warehousingStatus, 'warehousing')}
                    </TableCell>
                    <TableCell>{delivery.entryUser}</TableCell>
                    <TableCell>{delivery.deliveryDate}</TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleEditClick(delivery)}>
                            <Edit className="mr-2 h-4 w-4" />
                            编辑
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          {/* 只有已配货状态才显示改配选项 */}
                          {delivery.distributionStatus === 1 && (
                            <DropdownMenuItem onClick={() => handleChangeDistribution(delivery)}>
                              <RefreshCw className="mr-2 h-4 w-4" />
                              改配
                            </DropdownMenuItem>
                          )}
                          {/* 只有已入库状态才显示重新入库选项 */}
                          {delivery.warehousingStatus === 1 && (
                            <DropdownMenuItem onClick={() => handleResetWarehousing(delivery)}>
                              <RotateCcw className="mr-2 h-4 w-4" />
                              重新入库
                            </DropdownMenuItem>
                          )}
                          {(delivery.distributionStatus === 1 || delivery.warehousingStatus === 1) && (
                            <DropdownMenuSeparator />
                          )}
                          <DropdownMenuItem
                            onClick={() => handleDeleteClick(delivery.id)}
                            className="text-red-600 focus:text-red-600"
                          >
                            <Trash2 className="mr-2 h-4 w-4" />
                            删除
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}

          {/* 分页 */}
          {!isLoading && totalItems > 0 && (
            <div className="flex items-center justify-between px-4 py-3 border-t">
              <div className="text-sm text-muted-foreground">
                共 {totalItems} 条记录，第 {currentPage}/{totalPages} 页
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handlePageChange(1)}
                  disabled={currentPage === 1}
                >
                  首页
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handlePageChange(currentPage - 1)}
                  disabled={currentPage === 1}
                >
                  上一页
                </Button>
                <span className="px-3 py-1 text-sm">
                  {currentPage} / {totalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handlePageChange(currentPage + 1)}
                  disabled={currentPage >= totalPages}
                >
                  下一页
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handlePageChange(totalPages)}
                  disabled={currentPage >= totalPages}
                >
                  末页
                </Button>
              </div>
            </div>
          )}
        </div>

        {/* 批量导入全屏界面 */}
        {isBatchModalOpen && (
          <div className="fixed inset-0 bg-white z-50 overflow-auto">
            <div className="max-w-7xl mx-auto p-6 space-y-6">
              {/* 标题栏 */}
              <div className="flex items-center justify-between border-b pb-4">
                <h2 className="text-2xl font-bold">
                  {importStep === 'paste' ? '步骤1: 粘贴 Excel 数据' : '步骤2: 预览并导入'}
                </h2>
                <Button
                  variant="ghost"
                  onClick={() => {
                    setIsBatchModalOpen(false);
                    setPasteData('');
                    setParsedData([]);
                    setDuplicateKeys(new Set());
                    setImportStep('paste');
                  }}
                >
                  <X className="h-5 w-5" />
                </Button>
              </div>

              {importStep === 'paste' ? (
            // ========== 步骤1: 粘贴数据 ==========
            <>
            {/* 使用说明 */}
            <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
              <h4 className="font-semibold text-blue-900 mb-2">使用说明:</h4>
              <ol className="text-sm text-blue-800 space-y-1 list-decimal list-inside">
                <li>在 Excel 中选择数据(包含表头)</li>
                <li>复制数据 (Ctrl+C 或 Cmd+C)</li>
                <li>粘贴到下方文本框 (Ctrl+V 或 Cmd+V)</li>
                <li>点击"下一步: 预览数据"</li>
                <li>确认无误后点击"确认导入"</li>
              </ol>
              <div className="mt-3 text-xs text-blue-700 bg-blue-100 p-2 rounded space-y-1">
                <div><strong>必填字段:</strong> 商家名称 | 商品名称 | 单位</div>
                <div><strong>完整格式:</strong> 商家名称 | 商品名称 | 单位 | <strong>派单数量</strong> | <strong>预估销售</strong> | ... | <strong>昨日余货(最后一列)</strong></div>
                <div className="text-blue-600">💡 提示: 派单数量从第4列读取，预估销售从第5列读取，昨日余货从最后一列读取</div>
              </div>
            </div>

            {/* 粘贴区域 */}
            <div>
              <Label>粘贴 Excel 数据</Label>
              <textarea
                className="w-full h-64 p-3 border rounded-md font-mono text-sm"
                placeholder="在 Excel 中选中数据并复制,然后粘贴到这里 (Ctrl+V)...&#10;&#10;格式: 商家名称 | 商品名称 | 单位 | 派单数量 | 预估销售 | ... | 昨日余货(最后一列)"
                value={pasteData}
                onChange={(e) => setPasteData(e.target.value)}
              />
            </div>
            <div className="flex justify-end gap-2 mt-4 pt-4 border-t">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setIsBatchModalOpen(false);
                  setPasteData('');
                  setParsedData([]);
                  setDuplicateKeys(new Set());
                  setImportStep('paste');
                }}
              >
                取消
              </Button>
              <Button onClick={handleParsePasteData} disabled={!pasteData.trim()}>
                下一步: 预览数据
              </Button>
            </div>
            </>
          ) : (
            // ========== 步骤2: 预览数据 ==========
            <>
            {/* Excel 表格预览 */}
            <div className="border rounded-lg p-4 bg-white">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="font-semibold text-green-700">✓ Excel 数据预览 (共 {parsedData.length} 条)</h4>
                  <div className="flex items-center gap-4">
                    {duplicateKeys.size > 0 && (
                      <span className="text-sm text-orange-600 bg-orange-50 px-2 py-1 rounded">
                        ⚠️ {duplicateKeys.size} 条重复将被跳过
                      </span>
                    )}
                    <span className="text-xs text-gray-500">
                      下方为导入后的效果
                    </span>
                  </div>
                </div>
                <div className="max-h-[600px] overflow-auto border rounded">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-gray-100 sticky top-0 z-10">
                        <TableHead className="text-center font-semibold bg-gray-100">#</TableHead>
                        <TableHead className="font-semibold bg-gray-100">商家名称</TableHead>
                        <TableHead className="font-semibold bg-gray-100">商品名称</TableHead>
                        <TableHead className="font-semibold bg-gray-100">单位</TableHead>
                        <TableHead className="text-center font-semibold bg-gray-100">派单数量</TableHead>
                        <TableHead className="text-center font-semibold bg-gray-100">预估销售</TableHead>
                        <TableHead className="text-center font-semibold bg-gray-100">昨日余货</TableHead>
                        <TableHead className="text-center font-semibold bg-gray-100">配货状态</TableHead>
                        <TableHead className="text-center font-semibold bg-gray-100">入库状态</TableHead>
                        <TableHead className="font-semibold bg-gray-100">录入人</TableHead>
                        <TableHead className="font-semibold bg-gray-100">送货日期</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {parsedData.map((item, index) => {
                        const key = `${item.merchantName}|${item.productName}|${item.deliveryDate}`;
                        const isDuplicate = duplicateKeys.has(key);
                        return (
                          <TableRow
                            key={index}
                            className={isDuplicate ? 'bg-gray-100 opacity-60' : 'hover:bg-gray-50'}
                          >
                            <TableCell className="text-center text-gray-600">
                              {isDuplicate ? (
                                <span className="text-red-500" title="重复记录，将被跳过">✕</span>
                              ) : (
                                index + 1
                              )}
                            </TableCell>
                            <TableCell className={`font-medium ${isDuplicate ? 'line-through text-gray-400' : ''}`}>
                              {item.merchantName}
                              {isDuplicate && <span className="ml-2 text-xs text-red-500 no-underline">(已存在)</span>}
                            </TableCell>
                            <TableCell className={isDuplicate ? 'line-through text-gray-400' : ''}>{item.productName}</TableCell>
                            <TableCell className={`text-center ${isDuplicate ? 'line-through text-gray-400' : ''}`}>{item.unit}</TableCell>
                            <TableCell className={`text-center ${isDuplicate ? 'line-through text-gray-400' : ''}`}>{item.dispatchQuantity}</TableCell>
                            <TableCell className={`text-center ${isDuplicate ? 'line-through text-gray-400' : ''}`}>{item.estimatedSales}</TableCell>
                            <TableCell className={`text-center ${isDuplicate ? 'line-through text-gray-400' : ''}`}>{item.surplusQuantity || 0}</TableCell>
                            <TableCell className="text-center">
                              <span className={`px-2 py-1 rounded text-xs whitespace-nowrap ${
                                isDuplicate ? 'bg-gray-200 text-gray-400' :
                                item.distributionStatus === 0 ? 'bg-orange-100 text-orange-700' :
                                item.distributionStatus === 1 ? 'bg-green-100 text-green-700' :
                                'bg-blue-100 text-blue-700'
                              }`}>
                                {item.distributionStatus === 0 ? '未配货' :
                                 item.distributionStatus === 1 ? '已配货' : '改配'}
                              </span>
                            </TableCell>
                            <TableCell className="text-center">
                              <span className={`px-2 py-1 rounded text-xs whitespace-nowrap ${
                                isDuplicate ? 'bg-gray-200 text-gray-400' :
                                item.warehousingStatus === 0 ? 'bg-orange-100 text-orange-700' :
                                'bg-green-100 text-green-700'
                              }`}>
                                {item.warehousingStatus === 0 ? '未入库' : '已入库'}
                              </span>
                            </TableCell>
                            <TableCell className={isDuplicate ? 'text-gray-400' : ''}>{item.entryUser}</TableCell>
                            <TableCell className={isDuplicate ? 'text-gray-400' : ''}>{item.deliveryDate}</TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
                {parsedData.length > 10 && (
                  <div className="mt-2 text-center text-xs text-gray-500 bg-yellow-50 p-2 rounded">
                    ⚠️ 数据较多,仅预览前10条。点击"开始导入"将导入全部 {parsedData.length} 条数据
                  </div>
                )}
              </div>

            {/* 操作按钮 */}
            <div className="flex justify-between pt-4 border-t">
              <Button
                type="button"
                variant="ghost"
                onClick={handleBackToPaste}
              >
                ← 返回上一步
              </Button>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setIsBatchModalOpen(false);
                    setPasteData('');
                    setParsedData([]);
                    setDuplicateKeys(new Set());
                    setImportStep('paste');
                  }}
                >
                  取消
                </Button>
                <Button
                  onClick={handleBatchImport}
                  disabled={isBatchImporting || parsedData.length === 0 || parsedData.length === duplicateKeys.size}
                >
                  {isBatchImporting ? '导入中...' : `确认导入 (${parsedData.length - duplicateKeys.size} 条)`}
                </Button>
              </div>
            </div>
            </>
              )}
            </div>
          </div>
        )}

        {/* 编辑模态框 */}
        <Modal
          isOpen={isEditModalOpen}
          onClose={() => setIsEditModalOpen(false)}
          title="编辑送货记录"
        >
          <form onSubmit={handleEditSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="merchantName">商家名称 *</Label>
                <Input
                  id="merchantName"
                  name="merchantName"
                  defaultValue={selectedDelivery?.merchantName}
                  required
                />
              </div>
              <div>
                <Label htmlFor="productName">商品名称 *</Label>
                <Input
                  id="productName"
                  name="productName"
                  defaultValue={selectedDelivery?.productName}
                  required
                />
              </div>
            </div>
            <div className="grid grid-cols-4 gap-4">
              <div>
                <Label htmlFor="unit">单位 *</Label>
                <Input
                  id="unit"
                  name="unit"
                  defaultValue={selectedDelivery?.unit}
                  required
                />
              </div>
              <div>
                <Label htmlFor="dispatchQuantity">派单数量</Label>
                <Input
                  id="dispatchQuantity"
                  name="dispatchQuantity"
                  type="number"
                  defaultValue={selectedDelivery?.dispatchQuantity || 0}
                />
              </div>
              <div>
                <Label htmlFor="estimatedSales">预估销售</Label>
                <Input
                  id="estimatedSales"
                  name="estimatedSales"
                  type="number"
                  defaultValue={selectedDelivery?.estimatedSales || 0}
                />
              </div>
              <div>
                <Label htmlFor="surplusQuantity">昨日余货</Label>
                <Input
                  id="surplusQuantity"
                  name="surplusQuantity"
                  type="number"
                  defaultValue={selectedDelivery?.surplusQuantity || 0}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="distributionStatus">配货状态</Label>
                <Select name="distributionStatus" defaultValue={selectedDelivery?.distributionStatus?.toString() || '0'}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="0">未配货</SelectItem>
                    <SelectItem value="1">已配货</SelectItem>
                    <SelectItem value="3">改配</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="warehousingStatus">入库状态</Label>
                <Select name="warehousingStatus" defaultValue={selectedDelivery?.warehousingStatus?.toString() || '0'}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="0">未入库</SelectItem>
                    <SelectItem value="1">已入库</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="entryUser">录入人 *</Label>
                <Input
                  id="entryUser"
                  name="entryUser"
                  defaultValue={selectedDelivery?.entryUser}
                  required
                />
              </div>
              <div>
                <Label htmlFor="deliveryDate">送货日期 *</Label>
                <Input
                  id="deliveryDate"
                  name="deliveryDate"
                  type="date"
                  defaultValue={selectedDelivery?.deliveryDate}
                  required
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-4">
              <Button type="button" variant="outline" onClick={() => setIsEditModalOpen(false)}>
                取消
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? '提交中...' : '更新'}
              </Button>
            </div>
          </form>
        </Modal>
      </div>
    </DashboardLayout>
  );
}
