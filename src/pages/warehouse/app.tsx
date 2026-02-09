import { useState, useEffect, useCallback, useRef } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import {
  ArrowRight,
  CheckCircle2,
  AlertCircle,
  PackageCheck,
  PackagePlus,
  ArrowDownCircle,
  Search,
  Store,
  User,
  RotateCcw,
  LogOut,
  Phone,
  KeyRound,
  Loader2,
  RefreshCw,
  Calculator,
  X,
  Equal
} from 'lucide-react';
import { DailyDelivery, ReturnDetail, DataTypes } from '@/lib/types';

// Cookie 操作工具函数
function getCookie(name: string): string | null {
  if (typeof document === 'undefined') return null;
  const match = document.cookie.match(new RegExp('(^| )' + name + '=([^;]+)'));
  return match ? decodeURIComponent(match[2]) : null;
}

function setCookie(name: string, value: string, days: number) {
  const expires = new Date(Date.now() + days * 24 * 60 * 60 * 1000).toUTCString();
  document.cookie = `${name}=${encodeURIComponent(value)}; expires=${expires}; path=/; SameSite=Lax`;
}

function deleteCookie(name: string) {
  document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/`;
}

// 带商品图片的送货记录类型
interface DailyDeliveryWithImage extends DailyDelivery {
  productImage?: string;
}

// 员工类型
interface Employee {
  id: string;
  employeeNumber: string;
  name: string;
  realName: string;
  phone: string;
  loginCode: string;
  lastLoginTime?: string;
}

// 列表数据响应类型
interface ListResponse {
  date: string;
  list: DailyDeliveryWithImage[];
  total: number;
}

export default function WarehouseApp() {
  const router = useRouter();
  const [employee, setEmployee] = useState<Employee | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'pick' | 'stock' | 'return' | 'profile'>('pick');
  const [status, setStatus] = useState<'on_duty' | 'resting'>('on_duty');

  // 分拣列表（未配货）
  const [pickList, setPickList] = useState<DailyDeliveryWithImage[]>([]);
  const [pickLoading, setPickLoading] = useState(false);

  // 入库列表（已配货的记录，包含已入库和未入库）
  const [stockList, setStockList] = useState<DailyDeliveryWithImage[]>([]);
  const [stockLoading, setStockLoading] = useState(false);

  // 客退列表
  const [returnList, setReturnList] = useState<ReturnDetail[]>([]);
  const [returnLoading, setReturnLoading] = useState(false);

  // 客退录入弹窗
  const [returnModalItem, setReturnModalItem] = useState<ReturnDetail | null>(null);
  const [returnGoodQty, setReturnGoodQty] = useState('');
  const [returnDefectiveQty, setReturnDefectiveQty] = useState('');
  const [returnSubmitting, setReturnSubmitting] = useState(false);

  // 统计数据（来自API）
  const [stats, setStats] = useState({
    pendingPickCount: 0,
    pendingStockCount: 0,
    pendingReturnCount: 0
  });

  // 搜索关键词
  const [searchKeyword, setSearchKeyword] = useState('');

  // 计算器状态
  const [showCalculator, setShowCalculator] = useState(false);
  const [calcPieces, setCalcPieces] = useState<string>(''); // 件数
  const [calcPerBox, setCalcPerBox] = useState<string>(''); // 箱归
  const [calcRemainder, setCalcRemainder] = useState<string>(''); // 尾数

  // 输入框引用，用于快速跳转
  const piecesInputRef = useRef<HTMLInputElement>(null);
  const perBoxInputRef = useRef<HTMLInputElement>(null);
  const remainderInputRef = useRef<HTMLInputElement>(null);

  // 计算总数量
  const calcTotal = () => {
    const pieces = parseFloat(calcPieces) || 0;
    const perBox = parseFloat(calcPerBox) || 0;
    const remainder = parseFloat(calcRemainder) || 0;
    return pieces * perBox + remainder;
  };

  // 重置计算器
  const resetCalculator = () => {
    setCalcPieces('');
    setCalcPerBox('');
    setCalcRemainder('');
    // 重置后聚焦到第一个输入框
    setTimeout(() => piecesInputRef.current?.focus(), 100);
  };

  // 搜索过滤函数：商品名称模糊匹配
  const filterBySearch = useCallback((list: DailyDeliveryWithImage[], keyword: string): DailyDeliveryWithImage[] => {
    if (!keyword.trim()) return list;

    const searchTerm = keyword.trim().toLowerCase();

    return list.filter(item => {
      return item.productName.toLowerCase().includes(searchTerm);
    });
  }, []);

  // 客退列表搜索过滤
  const filterReturnBySearch = useCallback((list: ReturnDetail[], keyword: string): ReturnDetail[] => {
    if (!keyword.trim()) return list;
    const searchTerm = keyword.trim().toLowerCase();
    return list.filter(item =>
      item.productName.toLowerCase().includes(searchTerm) ||
      item.merchantName.toLowerCase().includes(searchTerm)
    );
  }, []);

  // 计算器打开时自动聚焦第一个输入框
  useEffect(() => {
    if (showCalculator) {
      setTimeout(() => piecesInputRef.current?.focus(), 300);
    }
  }, [showCalculator]);

  // 检查登录状态（优先 Cookie，然后 localStorage）
  useEffect(() => {
    const checkAuth = () => {
      // 先检查 Cookie
      const cookieData = getCookie('warehouseEmployee');
      if (cookieData) {
        try {
          const parsed = JSON.parse(cookieData);
          if (parsed && parsed.id) {
            // 同步到 localStorage
            localStorage.setItem('warehouseEmployee', cookieData);
            setEmployee(parsed);
            setIsLoading(false);
            return;
          }
        } catch (e) {
          // Cookie 数据无效
        }
      }

      // 再检查 localStorage
      const localData = localStorage.getItem('warehouseEmployee');
      if (localData) {
        try {
          const parsed = JSON.parse(localData);
          if (parsed && parsed.id) {
            // 同步到 Cookie（续期30天）
            setCookie('warehouseEmployee', localData, 30);
            setEmployee(parsed);
            setIsLoading(false);
            return;
          }
        } catch (e) {
          // localStorage 数据无效
        }
      }

      // 都没有有效数据，跳转登录
      localStorage.removeItem('warehouseEmployee');
      deleteCookie('warehouseEmployee');
      router.replace('/warehouse');
    };

    checkAuth();
  }, [router]);

  // 获取未配货列表（分拣）
  const fetchPickList = useCallback(async () => {
    if (!employee) return;

    setPickLoading(true);
    try {
      const res = await fetch(`/api/warehouse/undelivered?t=${Date.now()}`, {
        headers: {
          'X-Employee-Id': employee.id
        }
      });
      const data = await res.json();
      if (data.success) {
        setPickList(data.data.list);
      }
    } catch (err) {
      console.error('获取分拣列表失败:', err);
    } finally {
      setPickLoading(false);
    }
  }, [employee]);

  // 获取未入库列表
  const fetchStockList = useCallback(async () => {
    if (!employee) return;

    setStockLoading(true);
    try {
      const res = await fetch(`/api/warehouse/unstocked?t=${Date.now()}`, {
        headers: {
          'X-Employee-Id': employee.id
        }
      });
      const data = await res.json();
      if (data.success) {
        setStockList(data.data.list);
      }
    } catch (err) {
      console.error('获取入库列表失败:', err);
    } finally {
      setStockLoading(false);
    }
  }, [employee]);

  // 获取客退列表（今日的余货和客退记录，未取回的）
  const fetchReturnList = useCallback(async () => {
    setReturnLoading(true);
    try {
      const today = new Date().toISOString().split('T')[0];
      const res = await fetch(`/api/return-details?returnDate=${today}&pageSize=200&t=${Date.now()}`);
      const data = await res.json();
      if (data.success) {
        setReturnList(data.data.items || []);
      }
    } catch (err) {
      console.error('获取客退列表失败:', err);
    } finally {
      setReturnLoading(false);
    }
  }, []);

  // 获取统计数据
  const fetchStats = useCallback(async () => {
    try {
      const res = await fetch(`/api/warehouse/stats?t=${Date.now()}`);
      const data = await res.json();
      if (data.success) {
        setStats(data.data);
      }
    } catch (err) {
      console.error('获取统计数据失败:', err);
    }
  }, []);

  // 初始化加载数据
  useEffect(() => {
    if (employee) {
      fetchPickList();
      fetchStockList();
      fetchReturnList();
      fetchStats();
    }
  }, [employee, fetchPickList, fetchStockList, fetchReturnList, fetchStats]);

  // 定时轮询统计数据（每30秒）
  useEffect(() => {
    if (!employee || status === 'resting') return;

    const interval = setInterval(() => {
      fetchStats();
    }, 30000);

    return () => clearInterval(interval);
  }, [employee, status, fetchStats]);

  // 切换tab时刷新数据
  useEffect(() => {
    if (!employee) return;
    if (activeTab === 'pick') {
      fetchPickList();
    } else if (activeTab === 'stock') {
      fetchStockList();
    } else if (activeTab === 'return') {
      fetchReturnList();
    }
  }, [activeTab, employee, fetchPickList, fetchStockList, fetchReturnList]);

  // 登出
  const handleLogout = () => {
    if (confirm('确定要退出登录吗？')) {
      localStorage.removeItem('warehouseEmployee');
      deleteCookie('warehouseEmployee');
      router.replace('/warehouse');
    }
  };

  // 正在处理中的项目ID集合
  const [processingIds, setProcessingIds] = useState<Set<string>>(new Set());

  // 分拣确认 - 调用确认配货接口
  const handlePickConfirm = async (item: DailyDeliveryWithImage): Promise<boolean> => {
    if (!employee) return false;

    setProcessingIds(prev => new Set(prev).add(item.id));

    try {
      const res = await fetch(`/api/warehouse/confirm-pick?t=${Date.now()}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Employee-Id': employee.id
        },
        body: JSON.stringify({ id: item.id })
      });

      const data = await res.json();
      if (data.success) {
        // 延迟移除，让用户看到成功状态
        setTimeout(() => {
          setPickList(prev => prev.filter(p => p.id !== item.id));
        }, 600);
        // 刷新统计数据
        fetchStats();
        return true;
      } else {
        alert(data.error || '操作失败');
        return false;
      }
    } catch (err) {
      console.error('分拣确认失败:', err);
      alert('操作失败，请重试');
      return false;
    } finally {
      setProcessingIds(prev => {
        const next = new Set(prev);
        next.delete(item.id);
        return next;
      });
    }
  };

  // 入库确认 - 调用确认入库接口
  const handleStockInConfirm = async (item: DailyDeliveryWithImage): Promise<boolean> => {
    if (!employee) return false;

    setProcessingIds(prev => new Set(prev).add(item.id));

    try {
      const res = await fetch(`/api/warehouse/confirm-stock?t=${Date.now()}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Employee-Id': employee.id
        },
        body: JSON.stringify({ id: item.id })
      });

      const data = await res.json();
      if (data.success) {
        // 更新列表中该项的入库状态
        setStockList(prev => prev.map(p =>
          p.id === item.id ? { ...p, warehousingStatus: 1 } : p
        ));
        // 刷新统计数据
        fetchStats();
        return true;
      } else {
        alert(data.error || '操作失败');
        return false;
      }
    } catch (err) {
      console.error('入库确认失败:', err);
      alert('操作失败，请重试');
      return false;
    } finally {
      setProcessingIds(prev => {
        const next = new Set(prev);
        next.delete(item.id);
        return next;
      });
    }
  };

  // 打开确认取回弹窗
  const openReturnModal = (item: ReturnDetail) => {
    setReturnModalItem(item);
    setReturnGoodQty((item.retrievedGoodQuantity || 0) > 0 ? String(item.retrievedGoodQuantity) : '');
    setReturnDefectiveQty((item.retrievedDefectiveQuantity || 0) > 0 ? String(item.retrievedDefectiveQuantity) : '');
  };

  // 关闭客退录入弹窗
  const closeReturnModal = () => {
    setReturnModalItem(null);
    setReturnGoodQty('');
    setReturnDefectiveQty('');
  };

  // 提交确认取回
  const handleReturnSubmit = async () => {
    if (!returnModalItem || !employee) return;

    const goodQty = parseInt(returnGoodQty) || 0;
    const defectiveQty = parseInt(returnDefectiveQty) || 0;
    const maxQty = returnModalItem.actualReturnQuantity;

    if (goodQty < 0 || defectiveQty < 0) {
      alert('数量不能为负数');
      return;
    }

    if (goodQty + defectiveQty > maxQty) {
      alert(`取回正品(${goodQty}) + 取回残品(${defectiveQty}) = ${goodQty + defectiveQty}，超过实退数量(${maxQty})`);
      return;
    }

    setReturnSubmitting(true);
    try {
      const res = await fetch(`/api/return-details?id=${returnModalItem.id}&t=${Date.now()}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          retrievedGoodQuantity: goodQty,
          retrievedDefectiveQuantity: defectiveQty,
          retrievalStatus: 1,
          _operatorType: 'employee',
          _operatorId: employee.id,
          _operatorName: employee.realName || employee.name,
          _isStatusChange: true,
        })
      });

      const data = await res.json();
      if (data.success) {
        // 更新本地列表
        setReturnList(prev => prev.map(item =>
          item.id === returnModalItem.id
            ? { ...item, retrievedGoodQuantity: goodQty, retrievedDefectiveQuantity: defectiveQty, retrievalStatus: 1 }
            : item
        ));
        closeReturnModal();
        // 刷新统计数据
        fetchStats();
      } else {
        alert(data.error || '保存失败');
      }
    } catch (err) {
      console.error('确认取回失败:', err);
      alert('保存失败，请重试');
    } finally {
      setReturnSubmitting(false);
    }
  };

  // 加载中
  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-100 flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
      </div>
    );
  }

  // 未登录
  if (!employee) {
    return null;
  }

  // 获取当前显示的列表
  // 入库列表需要排序：未入库的在前，已入库的在后
  const sortedStockList = [...stockList].sort((a, b) => {
    const aCompleted = a.warehousingStatus === 1;
    const bCompleted = b.warehousingStatus === 1;
    if (aCompleted && !bCompleted) return 1;
    if (!aCompleted && bCompleted) return -1;
    return 0;
  });

  // 客退列表排序：未取回在前，已取回在后；同组内余货(dataType=0)在前，客退(dataType=1)在后
  const sortedReturnList = [...returnList].sort((a, b) => {
    const aRetrieved = a.retrievalStatus === 1 ? 1 : 0;
    const bRetrieved = b.retrievalStatus === 1 ? 1 : 0;
    if (aRetrieved !== bRetrieved) return aRetrieved - bRetrieved;
    return (a.dataType || 0) - (b.dataType || 0);
  });

  // 应用搜索过滤
  const filteredPickList = filterBySearch(pickList, searchKeyword);
  const filteredStockList = filterBySearch(sortedStockList, searchKeyword);
  const filteredReturnList = filterReturnBySearch(sortedReturnList, searchKeyword);

  const currentList = activeTab === 'pick' ? filteredPickList : activeTab === 'stock' ? filteredStockList : pickList;
  const currentLoading = activeTab === 'pick' ? pickLoading : activeTab === 'stock' ? stockLoading : false;

  // 原始总数（用于导航栏徽章）
  const totalPickCount = pickList.length;
  const totalPendingStockCount = stockList.filter(item => item.warehousingStatus !== 1).length;
  const totalCompletedStockCount = stockList.filter(item => item.warehousingStatus === 1).length;

  // 搜索过滤后的统计
  const filteredPendingStockCount = filteredStockList.filter(item => item.warehousingStatus !== 1).length;
  const filteredCompletedStockCount = filteredStockList.filter(item => item.warehousingStatus === 1).length;

  // 客退列表统计
  const totalReturnCount = returnList.length;
  const surplusCount = filteredReturnList.filter(item => (item.dataType || 0) === DataTypes.SURPLUS).length;
  const returnCount = filteredReturnList.filter(item => item.dataType === DataTypes.RETURN).length;

  return (
    <div className="min-h-screen bg-slate-100 pb-24 font-sans">
      <Head>
        <title>仓库作业系统</title>
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=0" />
      </Head>

      {/* Top Header */}
      <div className={`bg-blue-600 text-white p-4 sticky top-0 z-50 transition-colors ${status === 'resting' ? 'grayscale' : ''}`}>
        <div className="flex justify-between items-center mb-2">
          <h1 className="text-xl font-bold">仓库作业系统</h1>
          <div className="text-blue-100 text-sm flex items-center gap-2">
            操作员: {employee.employeeNumber}
            {status === 'on_duty' && <span className="inline-block w-2 h-2 rounded-full bg-green-400 shadow-[0_0_8px_rgba(74,222,128,0.8)]"></span>}
          </div>
        </div>

        {/* Search Bar - 只在分拣、入库、客退页面显示 */}
        {activeTab !== 'profile' && (
        <div className="relative">
          <input
            type="text"
            placeholder="搜索商品名称..."
            disabled={status === 'resting'}
            value={searchKeyword}
            onChange={(e) => setSearchKeyword(e.target.value)}
            className="w-full h-10 pl-10 pr-10 rounded-lg bg-blue-700 border-none text-white placeholder-blue-300 focus:outline-none focus:ring-2 focus:ring-blue-400 disabled:opacity-50"
          />
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-blue-300 w-5 h-5" />
          {searchKeyword && (
            <button
              onClick={() => setSearchKeyword('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-blue-300 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>
        )}
      </div>

      {/* Main Content Area */}
      <div className="p-3 space-y-3 relative">
        {/* 刷新按钮 */}
        {activeTab !== 'profile' && (
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm text-slate-500">
              {activeTab === 'pick'
                ? searchKeyword
                  ? `筛选: ${filteredPickList.length} / 共 ${totalPickCount} 条`
                  : `待分拣: ${totalPickCount} 条`
                : activeTab === 'stock'
                  ? searchKeyword
                    ? `筛选: ${filteredPendingStockCount} 待入库${filteredCompletedStockCount > 0 ? ` / ${filteredCompletedStockCount} 已入库` : ''} / 共 ${stockList.length} 条`
                    : `待入库: ${totalPendingStockCount} 条${totalCompletedStockCount > 0 ? ` / 已入库: ${totalCompletedStockCount} 条` : ''}`
                  : searchKeyword
                    ? `筛选: ${filteredReturnList.length} / 共 ${totalReturnCount} 条`
                    : `余货: ${surplusCount} 条 / 客退: ${returnCount} 条`}
            </span>
            <button
              onClick={() => {
                if (activeTab === 'pick') fetchPickList();
                else if (activeTab === 'stock') fetchStockList();
                else if (activeTab === 'return') fetchReturnList();
              }}
              disabled={activeTab === 'return' ? returnLoading : currentLoading}
              className="flex items-center gap-1 text-blue-600 text-sm font-medium active:text-blue-700"
            >
              <RefreshCw className={`w-4 h-4 ${(activeTab === 'return' ? returnLoading : currentLoading) ? 'animate-spin' : ''}`} />
              刷新
            </button>
          </div>
        )}

        {/* 客退列表 */}
        {activeTab === 'return' && returnLoading && (
          <div className="flex justify-center py-8">
            <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
          </div>
        )}

        {activeTab === 'return' && !returnLoading && filteredReturnList.length === 0 && (
          <div className="bg-white rounded-xl p-8 text-center">
            <div className="text-slate-400 mb-2">
              <ArrowDownCircle className="w-12 h-12 mx-auto mb-2" />
            </div>
            <p className="text-slate-500">暂无待处理的余货/客退记录</p>
          </div>
        )}

        {activeTab === 'return' && !returnLoading && filteredReturnList.length > 0 && (
          <div className={`transition-all duration-300 ${status === 'resting' ? 'grayscale opacity-60 pointer-events-none select-none' : ''}`}>
            {filteredReturnList.map((item, index) => {
              const isSurplus = (item.dataType || 0) === DataTypes.SURPLUS;
              // 检查是否是分组的第一条（余货/客退分界线）
              const prevItem = index > 0 ? filteredReturnList[index - 1] : null;
              const showGroupHeader = index === 0 || (prevItem && (prevItem.dataType || 0) !== (item.dataType || 0));

              return (
                <div key={item.id}>
                  {showGroupHeader && (
                    <div className={`flex items-center gap-2 mb-2 ${index > 0 ? 'mt-4' : ''}`}>
                      <div className={`h-px flex-1 ${isSurplus ? 'bg-green-200' : 'bg-orange-200'}`} />
                      <span className={`text-xs font-bold px-3 py-1 rounded-full ${
                        isSurplus ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700'
                      }`}>
                        {isSurplus ? '余货' : '客退'}
                      </span>
                      <div className={`h-px flex-1 ${isSurplus ? 'bg-green-200' : 'bg-orange-200'}`} />
                    </div>
                  )}
                  <div
                    className={`rounded-xl p-4 shadow-sm border mb-3 transition-colors ${
                      item.retrievalStatus === 1
                        ? 'bg-slate-50 border-slate-200 opacity-70'
                        : 'bg-white border-slate-100 active:bg-slate-50 cursor-pointer'
                    }`}
                    onClick={() => item.retrievalStatus !== 1 && openReturnModal(item)}
                  >
                    {/* 商家名称 + 类型标记 */}
                    <div className="flex justify-between items-center mb-2">
                      <div className="flex items-center gap-1.5 text-sm font-semibold px-3 py-1.5 rounded text-blue-600 bg-blue-50">
                        <Store className="w-4 h-4" />
                        {item.merchantName}
                      </div>
                      <span className={`text-xs font-bold px-3 py-1.5 rounded-full ${
                        isSurplus ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700'
                      }`}>
                        {isSurplus ? '余货' : '客退'}
                      </span>
                    </div>

                    {/* 商品名称 */}
                    <h2 className="text-lg font-bold leading-snug mb-3 text-slate-900">
                      {item.productName}
                    </h2>

                    {/* 理论数据 */}
                    <div className="flex flex-wrap items-center gap-3 text-sm text-slate-600 mb-1.5">
                      <span>单位: <span className="font-semibold text-slate-900">{item.unit}</span></span>
                      <span className="text-slate-300">|</span>
                      <span>实退: <span className="font-semibold text-slate-900">{item.actualReturnQuantity}</span></span>
                      <span className="text-slate-300">|</span>
                      <span>正品: <span className={`font-semibold ${item.goodQuantity > 0 ? 'text-green-600' : 'text-slate-400'}`}>{item.goodQuantity}</span></span>
                      <span className="text-slate-300">|</span>
                      <span>残品: <span className={`font-semibold ${item.defectiveQuantity > 0 ? 'text-red-600' : 'text-slate-400'}`}>{item.defectiveQuantity}</span></span>
                    </div>

                    {/* 取回数据 */}
                    <div className={`flex flex-wrap items-center gap-3 text-sm rounded-lg px-3 py-2 ${
                      item.retrievalStatus === 1 ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-50 text-slate-500'
                    }`}>
                      <span className="font-semibold">{item.retrievalStatus === 1 ? '已取回' : '未取回'}</span>
                      <span className="text-slate-300">|</span>
                      <span>取回正品: <span className={`font-semibold ${(item.retrievedGoodQuantity || 0) > 0 ? 'text-green-600' : ''}`}>{item.retrievedGoodQuantity || 0}</span></span>
                      <span className="text-slate-300">|</span>
                      <span>取回残品: <span className={`font-semibold ${(item.retrievedDefectiveQuantity || 0) > 0 ? 'text-red-600' : ''}`}>{item.retrievedDefectiveQuantity || 0}</span></span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* 加载状态 */}
        {currentLoading && activeTab !== 'profile' && activeTab !== 'return' && (
          <div className="flex justify-center py-8">
            <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
          </div>
        )}

        {/* 空状态 */}
        {!currentLoading && currentList.length === 0 && activeTab !== 'profile' && activeTab !== 'return' && (
          <div className="bg-white rounded-xl p-8 text-center">
            <div className="text-slate-400 mb-2">
              {activeTab === 'pick' ? (
                <PackageCheck className="w-12 h-12 mx-auto mb-2" />
              ) : (
                <PackagePlus className="w-12 h-12 mx-auto mb-2" />
              )}
            </div>
            <p className="text-slate-500">暂无{activeTab === 'pick' ? '待分拣' : '待入库'}任务</p>
          </div>
        )}

        {/* Resting Overlay */}
        <div className={`transition-all duration-300 ${status === 'resting' ? 'grayscale opacity-60 pointer-events-none select-none' : ''}`}>
          {!currentLoading && activeTab !== 'profile' && activeTab !== 'return' && currentList.map((item) => {
            const isRepick = item.distributionStatus === 3; // 改配状态
            const isStockCompleted = activeTab === 'stock' && item.warehousingStatus === 1;

            return (
              <div
                key={item.id}
                className={`rounded-xl p-4 shadow-sm border transition-all mb-3 ${
                  isStockCompleted
                    ? 'bg-slate-50 border-slate-200 opacity-70'
                    : 'bg-white border-slate-100'
                }`}
              >
                {/* Product Info Row */}
                <div className={isStockCompleted ? 'mb-2' : 'mb-4'}>
                  {/* 顶部：商家名称 + 改配标记/已入库标记 */}
                  <div className="flex justify-between items-center mb-2">
                    <div className={`flex items-center gap-1.5 text-sm font-semibold px-3 py-1.5 rounded ${
                      isStockCompleted
                        ? 'text-slate-500 bg-slate-100'
                        : 'text-blue-600 bg-blue-50'
                    }`}>
                      <Store className="w-4 h-4" />
                      {item.merchantName}
                    </div>
                    {activeTab === 'pick' && isRepick && (
                      <div className="flex items-center gap-1 bg-amber-100 text-amber-700 px-3 py-1.5 rounded-full shadow-sm">
                        <RotateCcw className="w-4 h-4 stroke-[3]" />
                        <span className="text-sm font-black leading-none">改配</span>
                      </div>
                    )}
                    {isStockCompleted && (
                      <div className="flex items-center gap-1 bg-emerald-100 text-emerald-700 px-3 py-1.5 rounded-full">
                        <CheckCircle2 className="w-4 h-4" />
                        <span className="text-sm font-bold leading-none">已入库</span>
                      </div>
                    )}
                  </div>

                  {/* 商品名称 */}
                  <h2 className={`text-lg font-bold leading-snug mb-3 ${
                    isStockCompleted ? 'text-slate-500' : 'text-slate-900'
                  }`}>
                    {item.productName}
                  </h2>

                  {/* Unit and Quantities */}
                  <div className={`flex flex-wrap items-center gap-3 text-base ${
                    isStockCompleted ? 'text-slate-400' : 'text-slate-600'
                  }`}>
                    <span>单位: <span className={`font-semibold ${isStockCompleted ? 'text-slate-500' : 'text-slate-900'}`}>{item.unit}</span></span>
                    <span className="text-slate-300">|</span>
                    <span>派单: <span className={`font-semibold ${isStockCompleted ? 'text-slate-500' : 'text-slate-900'}`}>{item.dispatchQuantity}</span></span>
                    <span className="text-slate-300">|</span>
                    <span>预估: <span className={`font-semibold ${isStockCompleted ? 'text-slate-500' : 'text-slate-900'}`}>{item.estimatedSales}</span></span>
                    {(item.surplusQuantity || 0) > 0 && (
                      <>
                        <span className="text-slate-300">|</span>
                        <span>余货: <span className={`font-semibold ${isStockCompleted ? 'text-slate-500' : 'text-orange-600'}`}>{item.surplusQuantity}</span></span>
                      </>
                    )}
                  </div>
                </div>

                {/* Dynamic Action Area */}
                <div>
                  {/* 分拣TAB - 显示派单数量 */}
                  {activeTab === 'pick' && (
                    <TripleClickButton
                      count={item.dispatchQuantity}
                      type="pick"
                      disabled={status === 'resting'}
                      isLoading={processingIds.has(item.id)}
                      onConfirmed={() => handlePickConfirm(item)}
                    />
                  )}

                  {/* 入库TAB - 显示预估销售 */}
                  {activeTab === 'stock' && !isStockCompleted && (
                    <TripleClickButton
                      count={item.estimatedSales}
                      type="stock"
                      disabled={status === 'resting'}
                      isLoading={processingIds.has(item.id)}
                      onConfirmed={() => handleStockInConfirm(item)}
                    />
                  )}

                </div>
              </div>
            );
          })}
        </div>

        {/* Profile Tab Content */}
        {activeTab === 'profile' && (
          <div className="bg-white rounded-2xl shadow-sm p-6">
            {/* Avatar & Info */}
            <div className="flex flex-col items-center mb-6">
              <div className={`relative w-20 h-20 bg-blue-100 rounded-full mb-3 flex items-center justify-center transition-all ${status === 'on_duty' ? 'ring-4 ring-emerald-400 ring-offset-2' : ''}`}>
                <User className="w-10 h-10 text-blue-500" />
                {status === 'on_duty' && <div className="absolute bottom-0 right-0 w-5 h-5 bg-emerald-500 border-3 border-white rounded-full"></div>}
              </div>

              <h2 className="text-xl font-black text-slate-900 mb-1">{employee.realName || employee.name}</h2>

              {/* 紧凑信息行 */}
              <div className="flex items-center gap-2 text-sm text-slate-500 mb-1">
                <span className="font-mono font-semibold text-slate-700">{employee.employeeNumber}</span>
                <span className="text-slate-300">|</span>
                <span className="font-mono tracking-wide text-indigo-600">{employee.loginCode}</span>
              </div>
              {employee.phone && (
                <div className="flex items-center gap-1 text-sm text-slate-500">
                  <Phone className="w-3.5 h-3.5" />
                  <span>{employee.phone}</span>
                </div>
              )}
            </div>

            {/* Status Toggle */}
            <div className="grid grid-cols-2 gap-4 mb-6">
              <button
                onClick={() => setStatus('on_duty')}
                className={`flex flex-col items-center justify-center h-28 rounded-xl transition-all active:scale-95 ${
                  status === 'on_duty'
                    ? 'bg-blue-600 text-white shadow-blue-200 shadow-lg ring-2 ring-blue-600 ring-offset-2'
                    : 'bg-slate-50 border-2 border-slate-100 text-slate-400'
                }`}
              >
                <CheckCircle2 className="w-10 h-10 mb-2" />
                <span className="text-xl font-bold">值班</span>
              </button>
              <button
                onClick={() => setStatus('resting')}
                className={`flex flex-col items-center justify-center h-28 rounded-xl transition-all active:scale-95 ${
                  status === 'resting'
                    ? 'bg-slate-600 text-white shadow-slate-200 shadow-lg ring-2 ring-slate-600 ring-offset-2'
                    : 'bg-slate-50 border-2 border-slate-100 text-slate-400'
                }`}
              >
                <AlertCircle className="w-10 h-10 mb-2" />
                <span className="text-xl font-bold">休息</span>
              </button>
            </div>

            {/* Calculator Button */}
            <button
              onClick={() => setShowCalculator(true)}
              className="w-full flex items-center justify-between p-4 bg-gradient-to-r from-indigo-500 to-purple-600 text-white rounded-xl shadow-lg active:scale-[0.98] transition-all mb-6"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
                  <Calculator className="w-5 h-5" />
                </div>
                <div className="text-left">
                  <div className="font-bold">数量计算器</div>
                  <div className="text-white/70 text-xs">件数 × 箱归 + 尾数</div>
                </div>
              </div>
              <ArrowRight className="w-5 h-5" />
            </button>

            {/* Logout Button */}
            <button
              onClick={handleLogout}
              className="w-full h-12 border-2 border-red-500 text-red-500 font-bold rounded-xl flex items-center justify-center gap-2 transition-all active:scale-[0.98] active:bg-red-50"
            >
              <LogOut className="w-5 h-5" />
              退出登录
            </button>
          </div>
        )}
      </div>

      {/* End of List */}
      {activeTab !== 'profile' && activeTab !== 'return' && !currentLoading && currentList.length > 0 && (
        <div className="text-center text-slate-400 py-8 text-sm">
          -- 没有更多任务了 --
        </div>
      )}
      {activeTab === 'return' && !returnLoading && filteredReturnList.length > 0 && (
        <div className="text-center text-slate-400 py-8 text-sm">
          -- 没有更多记录了 --
        </div>
      )}

      {/* Bottom Navigation */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 flex justify-around items-center pb-safe-area-inset-bottom z-50 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]">
        <button
          onClick={() => setActiveTab('pick')}
          className={`flex-1 flex flex-col items-center py-3 gap-1 relative ${activeTab === 'pick' ? 'text-blue-600' : 'text-slate-400'}`}
        >
          <PackageCheck className="w-6 h-6" />
          <span className="text-xs font-bold">分拣</span>
          {stats.pendingPickCount > 0 && (
            <span className="absolute top-1 right-1/4 bg-red-500 text-white text-[10px] font-bold min-w-[18px] h-[18px] rounded-full flex items-center justify-center">
              {stats.pendingPickCount > 99 ? '99+' : stats.pendingPickCount}
            </span>
          )}
          {activeTab === 'pick' && <div className="absolute top-0 w-8 h-1 bg-blue-600 rounded-b-full"></div>}
        </button>

        <button
          onClick={() => setActiveTab('stock')}
          className={`flex-1 flex flex-col items-center py-3 gap-1 relative ${activeTab === 'stock' ? 'text-blue-600' : 'text-slate-400'}`}
        >
          <PackagePlus className="w-6 h-6" />
          <span className="text-xs font-bold">入库</span>
          {stats.pendingStockCount > 0 && (
            <span className="absolute top-1 right-1/4 bg-red-500 text-white text-[10px] font-bold min-w-[18px] h-[18px] rounded-full flex items-center justify-center">
              {stats.pendingStockCount > 99 ? '99+' : stats.pendingStockCount}
            </span>
          )}
          {activeTab === 'stock' && <div className="absolute top-0 w-8 h-1 bg-blue-600 rounded-b-full"></div>}
        </button>

        <button
          onClick={() => setActiveTab('return')}
          className={`flex-1 flex flex-col items-center py-3 gap-1 relative ${activeTab === 'return' ? 'text-blue-600' : 'text-slate-400'}`}
        >
          <ArrowDownCircle className="w-6 h-6" />
          <span className="text-xs font-bold">客退</span>
          {stats.pendingReturnCount > 0 && (
            <span className="absolute top-1 right-1/4 bg-orange-500 text-white text-[10px] font-bold min-w-[18px] h-[18px] rounded-full flex items-center justify-center">
              {stats.pendingReturnCount > 99 ? '99+' : stats.pendingReturnCount}
            </span>
          )}
          {activeTab === 'return' && <div className="absolute top-0 w-8 h-1 bg-blue-600 rounded-b-full"></div>}
        </button>

        <button
          onClick={() => setActiveTab('profile')}
          className={`flex-1 flex flex-col items-center py-3 gap-1 relative ${activeTab === 'profile' ? 'text-blue-600' : 'text-slate-400'}`}
        >
          <User className="w-6 h-6" />
          <span className="text-xs font-bold">我的</span>
          {activeTab === 'profile' && <div className="absolute top-0 w-8 h-1 bg-blue-600 rounded-b-full"></div>}
        </button>
      </div>

      {/* 客退录入弹窗 */}
      {returnModalItem && (
        <div className="fixed inset-0 z-[100] flex items-end justify-center">
          <div
            className="absolute inset-0 bg-black/50"
            onClick={closeReturnModal}
          />
          <div className="relative w-full max-w-lg bg-white rounded-t-3xl px-6 pt-6 pb-12 animate-slide-up">
            <div className="absolute top-3 left-1/2 -translate-x-1/2 w-12 h-1.5 bg-slate-300 rounded-full" />

            {/* Header */}
            <div className="flex items-center justify-between mb-6 pt-4">
              <h3 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                <PackagePlus className="w-6 h-6 text-blue-600" />
                确认取回
              </h3>
              <button
                onClick={closeReturnModal}
                className="w-10 h-10 flex items-center justify-center rounded-full bg-slate-100 text-slate-500 active:bg-slate-200"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            {/* 商品信息 */}
            <div className="bg-slate-50 rounded-xl p-4 mb-6">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-blue-600 font-semibold">{returnModalItem.merchantName}</span>
                <span className={`text-xs font-bold px-2 py-1 rounded-full ${
                  (returnModalItem.dataType || 0) === DataTypes.SURPLUS
                    ? 'bg-green-100 text-green-700'
                    : 'bg-orange-100 text-orange-700'
                }`}>
                  {(returnModalItem.dataType || 0) === DataTypes.SURPLUS ? '余货' : '客退'}
                </span>
              </div>
              <h4 className="text-lg font-bold text-slate-900 mb-1">{returnModalItem.productName}</h4>
              <div className="flex items-center gap-3 text-sm text-slate-600 mb-1">
                <span>单位: <span className="font-semibold">{returnModalItem.unit}</span></span>
                <span className="text-slate-300">|</span>
                <span>实退数量: <span className="font-bold text-slate-900 text-base">{returnModalItem.actualReturnQuantity}</span></span>
              </div>
              <div className="flex items-center gap-3 text-sm text-slate-500">
                <span>理论正品: <span className="font-semibold text-green-600">{returnModalItem.goodQuantity}</span></span>
                <span className="text-slate-300">|</span>
                <span>理论残品: <span className="font-semibold text-red-600">{returnModalItem.defectiveQuantity}</span></span>
              </div>
            </div>

            {/* 输入区域 */}
            <div className="space-y-4 mb-6">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">
                  取回正品数量 <span className="text-slate-400 font-normal">(最大 {returnModalItem.actualReturnQuantity - (parseInt(returnDefectiveQty) || 0)})</span>
                </label>
                <input
                  type="number"
                  inputMode="numeric"
                  value={returnGoodQty}
                  onChange={(e) => setReturnGoodQty(e.target.value)}
                  placeholder="0"
                  min="0"
                  max={returnModalItem.actualReturnQuantity}
                  className="w-full h-14 px-4 text-xl font-bold rounded-xl border-2 border-slate-200 focus:border-green-500 focus:outline-none bg-white"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">
                  取回残品数量 <span className="text-slate-400 font-normal">(最大 {returnModalItem.actualReturnQuantity - (parseInt(returnGoodQty) || 0)})</span>
                </label>
                <input
                  type="number"
                  inputMode="numeric"
                  value={returnDefectiveQty}
                  onChange={(e) => setReturnDefectiveQty(e.target.value)}
                  placeholder="0"
                  min="0"
                  max={returnModalItem.actualReturnQuantity}
                  className="w-full h-14 px-4 text-xl font-bold rounded-xl border-2 border-slate-200 focus:border-red-500 focus:outline-none bg-white"
                />
              </div>
            </div>

            {/* 汇总提示 */}
            {(() => {
              const good = parseInt(returnGoodQty) || 0;
              const defective = parseInt(returnDefectiveQty) || 0;
              const total = good + defective;
              const max = returnModalItem.actualReturnQuantity;
              const isOver = total > max;
              return (
                <div className={`rounded-xl p-4 mb-6 text-center ${
                  isOver ? 'bg-red-50 border border-red-200' : 'bg-blue-50'
                }`}>
                  <div className="text-sm text-slate-500 mb-1">取回正品 + 取回残品 = 合计</div>
                  <div className={`text-2xl font-black ${isOver ? 'text-red-600' : 'text-slate-900'}`}>
                    {good} + {defective} = {total}
                    <span className="text-base font-normal text-slate-400"> / {max}</span>
                  </div>
                  {isOver && (
                    <div className="text-sm text-red-600 font-semibold mt-1">
                      超出实退数量 {total - max}
                    </div>
                  )}
                </div>
              );
            })()}

            {/* 操作按钮 */}
            <div className="flex gap-3">
              <button
                onClick={closeReturnModal}
                className="flex-1 h-12 border-2 border-slate-200 text-slate-600 font-bold rounded-xl active:bg-slate-50"
              >
                取消
              </button>
              <button
                onClick={handleReturnSubmit}
                disabled={returnSubmitting || ((parseInt(returnGoodQty) || 0) + (parseInt(returnDefectiveQty) || 0)) > returnModalItem.actualReturnQuantity}
                className="flex-1 h-12 bg-blue-600 text-white font-bold rounded-xl active:bg-blue-700 disabled:bg-slate-300 disabled:text-slate-500 flex items-center justify-center gap-2"
              >
                {returnSubmitting ? (
                  <><Loader2 className="w-5 h-5 animate-spin" /> 保存中...</>
                ) : (
                  '确认取回'
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Calculator Modal */}
      {showCalculator && (
        <div className="fixed inset-0 z-[100] flex items-end justify-center">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => setShowCalculator(false)}
          />

          {/* Modal Content */}
          <div className="relative w-full max-w-lg bg-white rounded-t-3xl px-6 pt-6 pb-12 animate-slide-up">
            {/* Handle */}
            <div className="absolute top-3 left-1/2 -translate-x-1/2 w-12 h-1.5 bg-slate-300 rounded-full" />

            {/* Header */}
            <div className="flex items-center justify-between mb-8 pt-4">
              <h3 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                <Calculator className="w-6 h-6 text-indigo-600" />
                数量计算器
              </h3>
              <button
                onClick={() => setShowCalculator(false)}
                className="w-10 h-10 flex items-center justify-center rounded-full bg-slate-100 text-slate-500 active:bg-slate-200"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            {/* 横向输入布局 */}
            <div className="flex items-center gap-2 mb-8">
              <div className="flex-1">
                <label className="block text-sm font-semibold text-slate-500 mb-2">件数</label>
                <input
                  ref={piecesInputRef}
                  type="number"
                  inputMode="numeric"
                  enterKeyHint="next"
                  value={calcPieces}
                  onChange={(e) => setCalcPieces(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      perBoxInputRef.current?.focus();
                    }
                  }}
                  placeholder="0"
                  className="w-full h-16 px-3 text-2xl font-bold text-center rounded-xl border-2 border-slate-200 focus:border-indigo-500 focus:outline-none bg-slate-50"
                />
              </div>
              <span className="text-3xl font-bold text-slate-400 pt-7">×</span>
              <div className="flex-1">
                <label className="block text-sm font-semibold text-slate-500 mb-2">箱归</label>
                <input
                  ref={perBoxInputRef}
                  type="number"
                  inputMode="numeric"
                  enterKeyHint="next"
                  value={calcPerBox}
                  onChange={(e) => setCalcPerBox(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      remainderInputRef.current?.focus();
                    }
                  }}
                  placeholder="0"
                  className="w-full h-16 px-3 text-2xl font-bold text-center rounded-xl border-2 border-slate-200 focus:border-indigo-500 focus:outline-none bg-slate-50"
                />
              </div>
              <span className="text-3xl font-bold text-slate-400 pt-7">+</span>
              <div className="flex-1">
                <label className="block text-sm font-semibold text-slate-500 mb-2">尾数</label>
                <input
                  ref={remainderInputRef}
                  type="number"
                  inputMode="numeric"
                  enterKeyHint="done"
                  value={calcRemainder}
                  onChange={(e) => setCalcRemainder(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      remainderInputRef.current?.blur();
                    }
                  }}
                  placeholder="0"
                  className="w-full h-16 px-3 text-2xl font-bold text-center rounded-xl border-2 border-slate-200 focus:border-indigo-500 focus:outline-none bg-slate-50"
                />
              </div>
            </div>

            {/* 结果显示 */}
            <div className="bg-gradient-to-r from-indigo-500 to-purple-600 rounded-2xl p-6 text-white text-center mb-8">
              <div className="text-white/80 text-sm mb-2">= 总数量</div>
              <div className="text-6xl font-black">{calcTotal()}</div>
            </div>

            {/* 公式和清除 */}
            <div className="flex items-center justify-between">
              <div className="text-sm text-slate-400">
                {calcPieces || '0'} × {calcPerBox || '0'} + {calcRemainder || '0'} = {calcTotal()}
              </div>
              <button
                onClick={resetCalculator}
                className="flex items-center gap-2 px-6 py-3 text-base font-medium text-slate-600 bg-slate-100 rounded-xl active:bg-slate-200"
              >
                <RotateCcw className="w-5 h-5" />
                清除
              </button>
            </div>
          </div>
        </div>
      )}

      <style jsx global>{`
        .pb-safe-area-inset-bottom {
          padding-bottom: env(safe-area-inset-bottom);
        }
        @keyframes slide-up {
          from {
            transform: translateY(100%);
          }
          to {
            transform: translateY(0);
          }
        }
        .animate-slide-up {
          animation: slide-up 0.3s ease-out;
        }
      `}</style>
    </div>
  );
}

// 三连击按钮组件
function TripleClickButton({
  count,
  type,
  disabled,
  isLoading = false,
  onConfirmed,
  returnLabel
}: {
  count: number;
  type: 'pick' | 'stock' | 'return';
  disabled: boolean;
  isLoading?: boolean;
  onConfirmed?: () => Promise<boolean> | void;
  returnLabel?: string;
}) {
  const [clicks, setClicks] = useState(0);
  const [isConfirming, setIsConfirming] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [timeoutProgress, setTimeoutProgress] = useState(100);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const progressRef = useRef<NodeJS.Timeout | null>(null);

  // 触发触觉反馈
  const triggerHaptic = useCallback((pattern: number | number[]) => {
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      try {
        navigator.vibrate(pattern);
      } catch (e) {
        // 忽略不支持的设备
      }
    }
  }, []);

  // 清理定时器
  const clearTimers = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    if (progressRef.current) {
      clearInterval(progressRef.current);
      progressRef.current = null;
    }
  }, []);

  // 重置状态
  const resetState = useCallback(() => {
    clearTimers();
    setClicks(0);
    setTimeoutProgress(100);
    setIsConfirming(false);
    setIsSuccess(false);
  }, [clearTimers]);

  // 处理点击计数变化
  useEffect(() => {
    // 清理之前的定时器
    clearTimers();

    if (clicks > 0 && clicks < 3) {
      // 启动进度条动画
      const startTime = Date.now();
      const duration = 2000; // 2秒超时

      progressRef.current = setInterval(() => {
        const elapsed = Date.now() - startTime;
        const remaining = Math.max(0, 100 - (elapsed / duration) * 100);
        setTimeoutProgress(remaining);

        if (remaining <= 0) {
          resetState();
        }
      }, 50);

      // 设置超时重置
      timeoutRef.current = setTimeout(() => {
        triggerHaptic(100); // 超时震动提示
        resetState();
      }, duration);
    }

    return () => clearTimers();
  }, [clicks, clearTimers, resetState, triggerHaptic]);

  // 处理三连击完成
  useEffect(() => {
    if (clicks === 3 && !isConfirming && !isSuccess) {
      setIsConfirming(true);
      triggerHaptic([100, 50, 100, 50, 200]); // 成功震动模式

      if (onConfirmed) {
        const result = onConfirmed();
        if (result instanceof Promise) {
          result.then((success) => {
            if (success) {
              setIsSuccess(true);
              // 保持成功状态一段时间
              setTimeout(() => {
                resetState();
              }, 800);
            } else {
              // 失败时重置
              triggerHaptic([200, 100, 200]); // 失败震动
              resetState();
            }
          }).catch(() => {
            triggerHaptic([200, 100, 200]);
            resetState();
          });
        } else {
          setIsSuccess(true);
          setTimeout(() => {
            resetState();
          }, 800);
        }
      } else {
        setIsSuccess(true);
        setTimeout(() => {
          resetState();
        }, 1000);
      }
    }
  }, [clicks, isConfirming, isSuccess, onConfirmed, resetState, triggerHaptic]);

  // 组件卸载时清理
  useEffect(() => {
    return () => clearTimers();
  }, [clearTimers]);

  const handleClick = () => {
    if (disabled || isConfirming || isLoading) return;

    // 触觉反馈：根据点击次数增加强度
    const intensity = [30, 50, 80][clicks] || 30;
    triggerHaptic(intensity);

    setClicks(prev => Math.min(prev + 1, 3));
  };

  const config = {
    pick: {
      color: 'amber',
      icon: <PackageCheck className="w-7 h-7" />,
      label: '待分拣',
      successLabel: '已分拣'
    },
    stock: {
      color: 'emerald',
      icon: <PackagePlus className="w-7 h-7" />,
      label: '待入库',
      successLabel: '已入库'
    },
    return: {
      color: 'rose',
      icon: <ArrowDownCircle className="w-7 h-7" />,
      label: '客退处理',
      successLabel: '已处理'
    }
  }[type];

  const isComplete = clicks === 3 || isSuccess;
  const isProcessing = isConfirming || isLoading;

  const colorClassesMap: Record<string, {
    bg: string; border: string; text: string; ring: string;
    iconBg: string; iconText: string; progressBg: string; timeoutBg: string;
  }> = {
    amber: {
      bg: isComplete ? 'bg-amber-600' : 'bg-amber-50',
      border: isComplete ? 'border-amber-600' : 'border-amber-500',
      text: isComplete ? 'text-white' : 'text-amber-900',
      ring: 'ring-amber-200',
      iconBg: isComplete ? 'bg-white' : 'bg-amber-500',
      iconText: isComplete ? 'text-amber-600' : 'text-white',
      progressBg: 'bg-amber-300',
      timeoutBg: 'bg-amber-400'
    },
    emerald: {
      bg: isComplete ? 'bg-emerald-600' : 'bg-emerald-50',
      border: isComplete ? 'border-emerald-600' : 'border-emerald-500',
      text: isComplete ? 'text-white' : 'text-emerald-900',
      ring: 'ring-emerald-200',
      iconBg: isComplete ? 'bg-white' : 'bg-emerald-500',
      iconText: isComplete ? 'text-emerald-600' : 'text-white',
      progressBg: 'bg-emerald-300',
      timeoutBg: 'bg-emerald-400'
    },
    rose: {
      bg: isComplete ? 'bg-rose-600' : 'bg-rose-50',
      border: isComplete ? 'border-rose-600' : 'border-rose-500',
      text: isComplete ? 'text-white' : 'text-rose-900',
      ring: 'ring-rose-200',
      iconBg: isComplete ? 'bg-white' : 'bg-rose-500',
      iconText: isComplete ? 'text-rose-600' : 'text-white',
      progressBg: 'bg-rose-300',
      timeoutBg: 'bg-rose-400'
    }
  };
  const colorClasses = colorClassesMap[config?.color || 'amber'];

  // 点击指示器样式
  const clickIndicators = [0, 1, 2].map(i => (
    <div
      key={i}
      className={`w-4 h-4 rounded-full transition-all duration-200 ${
        i < clicks
          ? `${colorClasses.iconBg} scale-110`
          : 'bg-slate-200'
      }`}
    />
  ));

  return (
    <button
      onClick={handleClick}
      disabled={disabled || isProcessing}
      className={`relative w-full flex items-center justify-between p-4 rounded-xl border-2 transition-all duration-200 overflow-hidden ${
        disabled || isProcessing
          ? 'bg-slate-50 border-slate-200 text-slate-400 cursor-not-allowed'
          : `${colorClasses.bg} ${colorClasses.border} ${colorClasses.text} ${isComplete ? `ring-4 ${colorClasses.ring}` : ''} active:scale-[0.98]`
      } ${clicks > 0 && clicks < 3 ? 'animate-pulse' : ''}`}
    >
      {/* 超时进度条（底部） */}
      {!disabled && !isProcessing && clicks > 0 && clicks < 3 && (
        <div className="absolute bottom-0 left-0 right-0 h-1 bg-slate-200">
          <div
            className={`h-full ${colorClasses.timeoutBg} transition-all duration-100 ease-linear`}
            style={{ width: `${timeoutProgress}%` }}
          />
        </div>
      )}

      {/* 点击进度背景 */}
      {!disabled && !isProcessing && clicks > 0 && clicks < 3 && (
        <div
          className={`absolute left-0 top-0 bottom-0 ${colorClasses.progressBg} opacity-40 transition-all duration-300 ease-out`}
          style={{ width: `${(clicks / 3) * 100}%` }}
        />
      )}

      {/* 成功动画背景 */}
      {isComplete && (
        <div className="absolute inset-0 bg-white opacity-10 animate-ping" />
      )}

      <div className="relative flex items-center gap-3 z-10">
        <div className={`p-2.5 rounded-full transition-all duration-300 ${
          disabled
            ? 'bg-slate-300 text-white'
            : isProcessing
              ? 'bg-slate-400 text-white'
              : `${colorClasses.iconBg} ${colorClasses.iconText}`
        } ${clicks > 0 && clicks < 3 ? 'scale-110' : ''}`}>
          {isLoading ? (
            <Loader2 className="w-7 h-7 animate-spin" />
          ) : isSuccess ? (
            <CheckCircle2 className="w-7 h-7 animate-bounce" />
          ) : (
            config.icon
          )}
        </div>
        <div className="text-left">
          <div className={`text-sm font-bold uppercase tracking-wider transition-opacity ${isComplete ? 'text-white' : 'opacity-70'}`}>
            {isSuccess ? config.successLabel : config.label}
          </div>
          {type !== 'return' && <div className="text-3xl font-black">{count}</div>}
          {type === 'return' && <div className="text-xl font-bold">{returnLabel || '扫码'}</div>}
        </div>
      </div>

      <div className="relative z-10 flex flex-col items-end gap-1">
        {/* 点击指示器 */}
        {!isComplete && !isProcessing && (
          <div className="flex items-center gap-2 mb-1">
            {clickIndicators}
          </div>
        )}

        {/* 状态文字 */}
        <div className="text-base font-bold flex items-center gap-1">
          {isLoading && <span>处理中...</span>}
          {!isLoading && clicks === 0 && (
            <span className="flex items-center gap-1">
              三连击确认
              <ArrowRight className="w-5 h-5" />
            </span>
          )}
          {!isLoading && clicks === 1 && (
            <span className="text-amber-700 animate-pulse">再点 2 下</span>
          )}
          {!isLoading && clicks === 2 && (
            <span className="text-red-600 font-black animate-pulse">最后 1 下!</span>
          )}
          {!isLoading && isSuccess && (
            <span className="flex items-center gap-1">
              <CheckCircle2 className="w-5 h-5" />
              完成!
            </span>
          )}
          {!isLoading && isConfirming && !isSuccess && (
            <span>确认中...</span>
          )}
        </div>
      </div>
    </button>
  );
}
