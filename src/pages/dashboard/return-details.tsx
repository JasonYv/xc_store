'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { Button } from "@/components/ui/button";
import { Plus, PackageX, Calendar, Upload, X, AlertTriangle } from "lucide-react";
import DashboardLayout from '@/components/layout/DashboardLayout';
import Modal from '@/components/common/Modal';
import { ReturnDetail, ReturnDetailFormData, DataTypes } from '@/lib/types';
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

export default function ReturnDetailsPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [returnDetails, setReturnDetails] = useState<ReturnDetail[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedReturn, setSelectedReturn] = useState<ReturnDetail | undefined>(undefined);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isClearingToday, setIsClearingToday] = useState(false);

  // 批量导入相关
  const [isBatchModalOpen, setIsBatchModalOpen] = useState(false);
  const [importType, setImportType] = useState<'surplus' | 'return'>('surplus');
  const [pasteData, setPasteData] = useState('');
  const [parsedData, setParsedData] = useState<ReturnDetailFormData[]>([]);
  const [isBatchImporting, setIsBatchImporting] = useState(false);
  const [importStep, setImportStep] = useState<'paste' | 'preview'>('paste');

  // 分页
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(20);
  const [totalItems, setTotalItems] = useState(0);
  const totalPages = Math.ceil(totalItems / pageSize);

  // 筛选条件
  const [filters, setFilters] = useState({
    merchantName: '',
    productName: '',
    returnDate: '',
    retrievalStatus: 'all',
    dataType: 'all'
  });

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
      fetchReturnDetails();
    }
  }, [router]);

  // 获取退货记录
  const fetchReturnDetails = async (page: number = currentPage) => {
    try {
      setIsLoading(true);
      const params = new URLSearchParams();
      params.append('t', Date.now().toString());
      params.append('page', page.toString());
      params.append('pageSize', pageSize.toString());
      if (filters.merchantName) params.append('merchantName', filters.merchantName);
      if (filters.productName) params.append('productName', filters.productName);
      if (filters.returnDate) params.append('returnDate', filters.returnDate);
      if (filters.retrievalStatus && filters.retrievalStatus !== 'all') params.append('retrievalStatus', filters.retrievalStatus);
      if (filters.dataType && filters.dataType !== 'all') params.append('dataType', filters.dataType);

      const response = await fetch(`/api/return-details?${params.toString()}`);
      const data = await response.json();
      if (data.success) {
        setReturnDetails(data.data.items || []);
        setTotalItems(data.data.total || 0);
        setCurrentPage(page);
      }
    } catch (error) {
      console.error('获取退货记录失败:', error);
      toast({
        title: "出错了",
        description: "获取退货记录失败，请稍后再试",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // 搜索时重置到第一页
  const handleSearch = () => {
    setCurrentPage(1);
    fetchReturnDetails(1);
  };

  // 分页切换
  const handlePageChange = (page: number) => {
    fetchReturnDetails(page);
  };

  // 打开新增模态框
  const handleAddClick = () => {
    setSelectedReturn(undefined);
    setIsModalOpen(true);
  };

  // 打开编辑模态框
  const handleEditClick = (returnDetail: ReturnDetail) => {
    setSelectedReturn(returnDetail);
    setIsModalOpen(true);
  };

  // 处理删除
  const handleDeleteClick = async (id: string) => {
    if (!confirm('确定要删除此退货记录吗？')) {
      return;
    }

    try {
      const response = await fetch(`/api/return-details?id=${id}&t=${Date.now()}`, {
        method: 'DELETE'
      });
      const data = await response.json();

      if (data.success) {
        toast({
          title: "删除成功",
          description: "退货记录已成功删除",
        });
        fetchReturnDetails();
      } else {
        throw new Error(data.error || '删除失败');
      }
    } catch (error: any) {
      toast({
        title: "删除失败",
        description: error.message || '删除退货记录失败，请稍后再试',
        variant: "destructive",
      });
    }
  };

  // 解析粘贴的 Excel 数据
  const handleParsePasteData = () => {
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
      const parsed: ReturnDetailFormData[] = [];
      const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
      const currentUser = localStorage.getItem('username') || '系统';

      // 跳过表头,从第二行开始解析
      for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;

        const cells = line.split('\t');

        if (importType === 'surplus') {
          // 余货格式: 商家名称 | 商品名称 | 单位 | 实际退库 | 昨日入库 | 昨日销量 | 昨日余货
          // 关键数据：昨日余货（最后一列）
          if (cells.length >= 4) {
            // 昨日余货取最后一列
            const surplusQty = parseInt(cells[cells.length - 1]?.trim()) || 0;
            parsed.push({
              merchantName: cells[0]?.trim() || '',
              productName: cells[1]?.trim() || '',
              unit: cells[2]?.trim() || '',
              actualReturnQuantity: surplusQty,
              goodQuantity: 0,
              defectiveQuantity: 0,
              retrievalStatus: 0,
              retrievedGoodQuantity: 0,
              retrievedDefectiveQuantity: 0,
              dataType: DataTypes.SURPLUS,
              entryUser: currentUser,
              returnDate: today,
            });
          }
        } else {
          // 客退格式: 店铺 | 名称 | 单位 | 正品数量 | 残品数量
          // 至少需要前3列: 店铺、名称、单位
          if (cells.length >= 3) {
            const goodQty = parseInt(cells[3]?.trim()) || 0;
            const defectiveQty = parseInt(cells[4]?.trim()) || 0;
            parsed.push({
              merchantName: cells[0]?.trim() || '',
              productName: cells[1]?.trim() || '',
              unit: cells[2]?.trim() || '',
              actualReturnQuantity: goodQty + defectiveQty,
              goodQuantity: goodQty,
              defectiveQuantity: defectiveQty,
              retrievalStatus: 0,
              retrievedGoodQuantity: 0,
              retrievedDefectiveQuantity: 0,
              dataType: DataTypes.RETURN,
              entryUser: currentUser,
              returnDate: today,
            });
          }
        }
      }

      if (parsed.length === 0) {
        const formatHint = importType === 'surplus'
          ? '至少需要:商家名称、商品名称、单位、实际退库'
          : '至少需要:店铺、名称、单位';
        toast({
          title: "解析失败",
          description: `未能解析到有效数据,${formatHint}`,
          variant: "destructive",
        });
        return;
      }

      setParsedData(parsed);
      setImportStep('preview');
      toast({
        title: "解析成功",
        description: `成功解析 ${parsed.length} 条${importType === 'surplus' ? '余货' : '客退'}记录`,
      });
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

    setIsBatchImporting(true);
    let successCount = 0;
    let failCount = 0;

    try {
      for (const item of parsedData) {
        try {
          const response = await fetch(`/api/return-details?t=${Date.now()}`, {
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

      toast({
        title: "导入完成",
        description: `成功导入 ${successCount} 条,失败 ${failCount} 条`,
        variant: successCount > 0 ? "default" : "destructive",
      });

      if (successCount > 0) {
        setIsBatchModalOpen(false);
        setPasteData('');
        setParsedData([]);
        setImportStep('paste');
        fetchReturnDetails();
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

  // 提交表单
  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSubmitting(true);

    const formData = new FormData(e.currentTarget);
    const returnData: ReturnDetailFormData = {
      merchantName: formData.get('merchantName') as string,
      productName: formData.get('productName') as string,
      unit: formData.get('unit') as string,
      actualReturnQuantity: parseInt(formData.get('actualReturnQuantity') as string) || 0,
      goodQuantity: parseInt(formData.get('goodQuantity') as string) || 0,
      defectiveQuantity: parseInt(formData.get('defectiveQuantity') as string) || 0,
      retrievalStatus: parseInt(formData.get('retrievalStatus') as string) || 0,
      retrievedGoodQuantity: parseInt(formData.get('retrievedGoodQuantity') as string) || 0,
      retrievedDefectiveQuantity: parseInt(formData.get('retrievedDefectiveQuantity') as string) || 0,
      dataType: parseInt(formData.get('dataType') as string) || 0,
      entryUser: formData.get('entryUser') as string,
      returnDate: formData.get('returnDate') as string,
    };

    try {
      const url = selectedReturn
        ? `/api/return-details?id=${selectedReturn.id}&t=${Date.now()}`
        : `/api/return-details?t=${Date.now()}`;

      const response = await fetch(url, {
        method: selectedReturn ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(returnData)
      });

      const data = await response.json();

      if (data.success) {
        toast({
          title: selectedReturn ? "更新成功" : "创建成功",
          description: `退货记录已成功${selectedReturn ? '更新' : '创建'}`,
        });
        setIsModalOpen(false);
        fetchReturnDetails();
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
    if (!confirm(`确定要清空今天 (${today}) 的所有余货/客退数据吗？此操作不可恢复！`)) {
      return;
    }
    // 二次确认
    if (!confirm('再次确认：清空后数据将无法恢复，是否继续？')) {
      return;
    }

    setIsClearingToday(true);
    try {
      const response = await fetch(`/api/return-details?clearDate=${today}&t=${Date.now()}`, {
        method: 'DELETE'
      });
      const data = await response.json();

      if (data.success) {
        toast({
          title: "清空成功",
          description: `已清空 ${today} 的 ${data.data.deletedCount || 0} 条余货/客退记录`,
        });
        fetchReturnDetails();
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

  const getRetrievalStatusText = (status: number) => status === 0 ? '未取回' : '已取回';
  const getRetrievalStatusColor = (status: number) => status === 0 ? 'text-orange-600' : 'text-green-600';

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* 页面标题 */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
              <PackageX className="w-8 h-8" />
              余货/客退明细管理
            </h1>
            <p className="text-muted-foreground mt-2">
              管理余货和客户退货详细信息
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
            <Button variant="outline" onClick={() => { setImportType('surplus'); setIsBatchModalOpen(true); }}>
              <Upload className="mr-2 h-4 w-4" /> 导入余货记录
            </Button>
            <Button variant="outline" onClick={() => { setImportType('return'); setIsBatchModalOpen(true); }}>
              <Upload className="mr-2 h-4 w-4" /> 导入退货记录
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
              <Label>退货日期</Label>
              <Input
                type="date"
                value={filters.returnDate}
                onChange={(e) => setFilters({...filters, returnDate: e.target.value})}
              />
            </div>
            <div>
              <Label>数据类型</Label>
              <Select value={filters.dataType} onValueChange={(v) => setFilters({...filters, dataType: v})}>
                <SelectTrigger>
                  <SelectValue placeholder="全部" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">全部</SelectItem>
                  <SelectItem value="0">余货</SelectItem>
                  <SelectItem value="1">客退</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>取回状态</Label>
              <Select value={filters.retrievalStatus} onValueChange={(v) => setFilters({...filters, retrievalStatus: v})}>
                <SelectTrigger>
                  <SelectValue placeholder="全部" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">全部</SelectItem>
                  <SelectItem value="0">未取回</SelectItem>
                  <SelectItem value="1">已取回</SelectItem>
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
          ) : returnDetails.length === 0 ? (
            <div className="p-8 text-center text-gray-500">暂无数据</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>商家名称</TableHead>
                  <TableHead>商品名称</TableHead>
                  <TableHead>单位</TableHead>
                  <TableHead>数据类型</TableHead>
                  <TableHead>实际退库</TableHead>
                  <TableHead>正品数</TableHead>
                  <TableHead>残品数</TableHead>
                  <TableHead>取回状态</TableHead>
                  <TableHead>取回正品</TableHead>
                  <TableHead>取回残品</TableHead>
                  <TableHead>录入人</TableHead>
                  <TableHead>日期</TableHead>
                  <TableHead>操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {returnDetails.map((detail) => (
                  <TableRow key={detail.id}>
                    <TableCell className="font-medium">{detail.merchantName}</TableCell>
                    <TableCell>{detail.productName}</TableCell>
                    <TableCell>{detail.unit}</TableCell>
                    <TableCell>
                      <span className={`px-2 py-1 rounded text-xs ${
                        detail.dataType === DataTypes.RETURN
                          ? 'bg-orange-100 text-orange-700'
                          : 'bg-green-100 text-green-700'
                      }`}>
                        {detail.dataType === DataTypes.RETURN ? '客退' : '余货'}
                      </span>
                    </TableCell>
                    <TableCell>{detail.actualReturnQuantity}</TableCell>
                    <TableCell className="text-green-600">{detail.goodQuantity}</TableCell>
                    <TableCell className="text-red-600">{detail.defectiveQuantity}</TableCell>
                    <TableCell className={getRetrievalStatusColor(detail.retrievalStatus)}>
                      {getRetrievalStatusText(detail.retrievalStatus)}
                    </TableCell>
                    <TableCell>{detail.retrievedGoodQuantity}</TableCell>
                    <TableCell>{detail.retrievedDefectiveQuantity}</TableCell>
                    <TableCell>{detail.entryUser}</TableCell>
                    <TableCell>{detail.returnDate}</TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button variant="outline" size="sm" onClick={() => handleEditClick(detail)}>
                          编辑
                        </Button>
                        <Button variant="destructive" size="sm" onClick={() => handleDeleteClick(detail.id)}>
                          删除
                        </Button>
                      </div>
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
                  {importType === 'surplus' ? '导入余货记录' : '导入退货记录'} - {importStep === 'paste' ? '步骤1: 粘贴 Excel 数据' : '步骤2: 预览并导入'}
                </h2>
                <Button
                  variant="ghost"
                  onClick={() => {
                    setIsBatchModalOpen(false);
                    setPasteData('');
                    setParsedData([]);
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
                    <div className="mt-3 text-xs text-blue-700 bg-blue-100 p-2 rounded">
                      {importType === 'surplus' ? (
                        <>
                          <div><strong>余货格式(7列):</strong> 商家名称 | 商品名称 | 单位 | 实际退库 | 昨日入库 | 昨日销量 | <strong>昨日余货(最后一列)</strong></div>
                          <div className="text-blue-600 mt-1">提示: 昨日余货从最后一列读取，其他字段自动填充默认值</div>
                        </>
                      ) : (
                        <>
                          <div><strong>客退格式(5列):</strong> 店铺 | 名称 | 单位 | <strong>正品数量</strong> | <strong>残品数量</strong></div>
                          <div className="text-blue-600 mt-1">提示: 实际退库 = 正品数量 + 残品数量（自动计算）</div>
                        </>
                      )}
                    </div>
                  </div>

                  {/* 粘贴区域 */}
                  <div>
                    <Label>粘贴 Excel 数据</Label>
                    <textarea
                      className="w-full h-64 p-3 border rounded-md font-mono text-sm"
                      placeholder={importType === 'surplus'
                        ? "在 Excel 中选中数据并复制,然后粘贴到这里 (Ctrl+V)...\n\n格式: 商家名称 | 商品名称 | 单位 | 实际退库 | 昨日入库 | 昨日销量 | 昨日余货"
                        : "在 Excel 中选中数据并复制,然后粘贴到这里 (Ctrl+V)...\n\n格式: 店铺 | 名称 | 单位 | 正品数量 | 残品数量"
                      }
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
                      <h4 className="font-semibold text-green-700">✓ {importType === 'surplus' ? '余货' : '客退'}数据预览 (共 {parsedData.length} 条)</h4>
                      <span className="text-xs text-gray-500">下方为导入后的效果</span>
                    </div>
                    <div className="max-h-[600px] overflow-auto border rounded">
                      <Table>
                        <TableHeader>
                          <TableRow className="bg-gray-100 sticky top-0 z-10">
                            <TableHead className="text-center font-semibold bg-gray-100">#</TableHead>
                            <TableHead className="font-semibold bg-gray-100">商家名称</TableHead>
                            <TableHead className="font-semibold bg-gray-100">商品名称</TableHead>
                            <TableHead className="font-semibold bg-gray-100">单位</TableHead>
                            <TableHead className="text-center font-semibold bg-gray-100">{importType === 'surplus' ? '昨日余货' : '实际退库'}</TableHead>
                            {importType === 'return' && (
                              <>
                                <TableHead className="text-center font-semibold bg-gray-100">正品数</TableHead>
                                <TableHead className="text-center font-semibold bg-gray-100">残品数</TableHead>
                              </>
                            )}
                            <TableHead className="text-center font-semibold bg-gray-100">取回状态</TableHead>
                            <TableHead className="font-semibold bg-gray-100">录入人</TableHead>
                            <TableHead className="font-semibold bg-gray-100">日期</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {parsedData.map((item, index) => (
                            <TableRow key={index} className="hover:bg-gray-50">
                              <TableCell className="text-center text-gray-600">{index + 1}</TableCell>
                              <TableCell className="font-medium">{item.merchantName}</TableCell>
                              <TableCell>{item.productName}</TableCell>
                              <TableCell className="text-center">{item.unit}</TableCell>
                              <TableCell className="text-center">{item.actualReturnQuantity}</TableCell>
                              {importType === 'return' && (
                                <>
                                  <TableCell className="text-center">{item.goodQuantity}</TableCell>
                                  <TableCell className="text-center">{item.defectiveQuantity}</TableCell>
                                </>
                              )}
                              <TableCell className="text-center">
                                <span className="px-2 py-1 rounded text-xs bg-orange-100 text-orange-700">
                                  未取回
                                </span>
                              </TableCell>
                              <TableCell>{item.entryUser}</TableCell>
                              <TableCell>{item.returnDate}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
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
                          setImportStep('paste');
                        }}
                      >
                        取消
                      </Button>
                      <Button
                        onClick={handleBatchImport}
                        disabled={isBatchImporting || parsedData.length === 0}
                      >
                        {isBatchImporting ? '导入中...' : `确认导入 (${parsedData.length} 条)`}
                      </Button>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        )}

        {/* 单条添加/编辑模态框 */}
        <Modal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          title={selectedReturn ? "编辑退货记录" : "添加退货记录"}
        >
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="merchantName">商家名称 *</Label>
                <Input
                  id="merchantName"
                  name="merchantName"
                  defaultValue={selectedReturn?.merchantName}
                  required
                />
              </div>
              <div>
                <Label htmlFor="productName">商品名称 *</Label>
                <Input
                  id="productName"
                  name="productName"
                  defaultValue={selectedReturn?.productName}
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
                  defaultValue={selectedReturn?.unit}
                  required
                />
              </div>
              <div>
                <Label htmlFor="dataType">数据类型</Label>
                <Select name="dataType" defaultValue={selectedReturn?.dataType?.toString() || '0'}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="0">余货</SelectItem>
                    <SelectItem value="1">客退</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="actualReturnQuantity">实际退库数量</Label>
                <Input
                  id="actualReturnQuantity"
                  name="actualReturnQuantity"
                  type="number"
                  defaultValue={selectedReturn?.actualReturnQuantity || 0}
                />
              </div>
              <div>
                <Label htmlFor="retrievalStatus">取回状态</Label>
                <Select name="retrievalStatus" defaultValue={selectedReturn?.retrievalStatus?.toString() || '0'}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="0">未取回</SelectItem>
                    <SelectItem value="1">已取回</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="goodQuantity">正品数量</Label>
                <Input
                  id="goodQuantity"
                  name="goodQuantity"
                  type="number"
                  defaultValue={selectedReturn?.goodQuantity || 0}
                />
              </div>
              <div>
                <Label htmlFor="defectiveQuantity">残品数量</Label>
                <Input
                  id="defectiveQuantity"
                  name="defectiveQuantity"
                  type="number"
                  defaultValue={selectedReturn?.defectiveQuantity || 0}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="retrievedGoodQuantity">取回正品数</Label>
                <Input
                  id="retrievedGoodQuantity"
                  name="retrievedGoodQuantity"
                  type="number"
                  defaultValue={selectedReturn?.retrievedGoodQuantity || 0}
                />
              </div>
              <div>
                <Label htmlFor="retrievedDefectiveQuantity">取回残品数</Label>
                <Input
                  id="retrievedDefectiveQuantity"
                  name="retrievedDefectiveQuantity"
                  type="number"
                  defaultValue={selectedReturn?.retrievedDefectiveQuantity || 0}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="entryUser">录入人 *</Label>
                <Input
                  id="entryUser"
                  name="entryUser"
                  defaultValue={selectedReturn?.entryUser}
                  required
                />
              </div>
              <div>
                <Label htmlFor="returnDate">退货日期 *</Label>
                <Input
                  id="returnDate"
                  name="returnDate"
                  type="date"
                  defaultValue={selectedReturn?.returnDate}
                  required
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-4">
              <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>
                取消
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? '提交中...' : selectedReturn ? '更新' : '创建'}
              </Button>
            </div>
          </form>
        </Modal>
      </div>
    </DashboardLayout>
  );
}
