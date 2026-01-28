import { useState, useEffect } from 'react';
import Head from 'next/head';
import { 
  Box, 
  ArrowRight, 
  CheckCircle2, 
  AlertCircle,
  PackageCheck,
  PackagePlus,
  ArrowDownCircle,
  Search,
  Store,
  User,
  RotateCcw
} from 'lucide-react';

// Enhanced Mock Data
const INITIAL_PRODUCTS = [
  {
    id: '1',
    name: '可口可乐 Coca-Cola 汽水 碳酸饮料 摩登罐',
    spec: '330ml*24听/箱',
    merchantName: '可口可乐官方旗舰店',
    toPick: 150,
    toStockIn: 50, // Added stock in qty for demo
    image: 'https://images.unsplash.com/photo-1622483767028-3f66f32aef97?w=200&h=200&fit=crop&q=80',
    pickStatus: 'pending', // 'pending' | 'modifying'
    stockInStatus: 'pending', // 'pending' | 'done'
    stockInTime: 0,
    returnType: 'customer', // 'customer' | 'surplus'
    isRepick: true // DEMO: This is a repick item
  },
  {
    id: '2',
    name: '伊利 纯牛奶 全脂牛奶 早餐奶 礼盒装',
    spec: '250ml*16盒/箱',
    merchantName: '伊利乳业配送中心',
    toPick: 45,
    toStockIn: 200,
    image: 'https://images.unsplash.com/photo-1563636619-e9143da7973b?w=200&h=200&fit=crop&q=80',
    pickStatus: 'pending',
    stockInStatus: 'pending',
    stockInTime: 0,
    returnType: 'customer',
    isRepick: false
  },
  {
    id: '3',
    name: '维达(Vinda) 抽纸 超韧3层120抽 软包面巾纸',
    spec: '133mm*195mm*24包/箱',
    merchantName: '维达纸业供销社',
    toPick: 10, // Changed from 0 to show in list initially
    toStockIn: 500,
    image: 'https://images.unsplash.com/photo-1584620521569-b3a620d48f76?w=200&h=200&fit=crop&q=80',
    pickStatus: 'pending',
    stockInStatus: 'pending',
    stockInTime: 0,
    returnType: 'customer',
    isRepick: false
  },
  {
    id: '4',
    name: '蓝月亮 深层洁净洗衣液 薰衣草香',
    spec: '2kg*4瓶/箱',
    merchantName: '蓝月亮日化专营',
    toPick: 12,
    toStockIn: 20,
    image: 'https://images.unsplash.com/photo-1585842378081-5c02b84ebc36?w=200&h=200&fit=crop&q=80',
    pickStatus: 'pending',
    stockInStatus: 'pending',
    stockInTime: 0,
    returnType: 'customer',
    isRepick: true // Another repick example
  },
];

export default function WarehousePrototype() {
  const [activeTab, setActiveTab] = useState<'pick' | 'stock' | 'return' | 'profile'>('pick');
  const [status, setStatus] = useState<'on_duty' | 'resting'>('on_duty');
  const [products, setProducts] = useState(INITIAL_PRODUCTS);

  // -- LOGIC HANDLERS --

  // 1. Picking Logic
  const handlePickConfirm = (id: string) => {
    // Remove item from list (simulate completion)
    setProducts(prev => prev.filter(p => p.id !== id));
  };


  // 2. Stock In Logic
  const handleStockInConfirm = (id: string) => {
    const now = Date.now();
    setProducts(prev => {
        const updated = prev.map(p => 
            p.id === id ? { ...p, stockInStatus: 'done', stockInTime: now } : p
        );
        // Sort: pending first, then done (sorted by time)
        return updated.sort((a, b) => {
            if (a.stockInStatus === b.stockInStatus) {
                // If both done, sort by time asc (earliest done first? or latest? Let's do latest at bottom)
                return a.stockInTime - b.stockInTime; 
            }
            return a.stockInStatus === 'pending' ? -1 : 1;
        });
    });
  };

  // 3. Return Logic
  const handleReturnConfirm = (id: string) => {
     // For demo, maybe just alert or visual feedback, user said "confirm return"
     alert(`商品 ${id} 已确认退货/入库`);
  };

  const setReturnType = (id: string, type: string) => {
      setProducts(prev => prev.map(p => 
        p.id === id ? { ...p, returnType: type } : p
      ));
  };


  // Filter visible items for Picking Tab (only show if toPick > 0 to start with, though we filter out on complete)
  // For Stock In, we show all, but sorted.
  let visibleProducts = products;
  if (activeTab === 'pick') {
      visibleProducts = products.filter(p => p.toPick > 0); // Only tasks
  }
  // For Stock Tab, we use the sorted 'products' state directly (which is sorted on update)
  

  return (
    <div className="min-h-screen bg-slate-100 pb-24 font-sans">
      <Head>
        <title>仓库作业看板 - 消费品版</title>
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=0" />
      </Head>

      {/* Top Header */}
      <div className={`bg-blue-600 text-white p-4 sticky top-0 z-50 transition-colors ${status === 'resting' ? 'grayscale' : ''}`}>
        <div className="flex justify-between items-center mb-2">
          <h1 className="text-xl font-bold">仓库作业系统</h1>
          <div className="text-blue-100 text-sm flex items-center gap-2">
            操作员: 007
            {status === 'on_duty' && <span className="inline-block w-2 h-2 rounded-full bg-green-400 shadow-[0_0_8px_rgba(74,222,128,0.8)]"></span>}
          </div>
        </div>
        
        {/* Search Bar */}
        <div className="relative">
          <input 
            type="text" 
            placeholder="扫描商品条码或输入名称..." 
            disabled={status === 'resting'}
            className="w-full h-10 pl-10 pr-4 rounded-lg bg-blue-700 border-none text-white placeholder-blue-300 focus:outline-none focus:ring-2 focus:ring-blue-400 disabled:opacity-50"
          />
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-blue-300 w-5 h-5" />
        </div>
      </div>

      {/* Main Content Area */}
      <div className="p-3 space-y-3 relative">
        {/* Resting Overlay/Grayscale Wrapper for Task List */}
        <div className={`transition-all duration-300 ${status === 'resting' ? 'grayscale opacity-60 pointer-events-none select-none' : ''}`}>
           {visibleProducts.map((product) => {
             const isStockDone = activeTab === 'stock' && product.stockInStatus === 'done';

             return (
            <div key={product.id} className={`bg-white rounded-xl p-4 shadow-sm border border-slate-100 transition-all ${isStockDone ? 'bg-slate-50 order-last' : ''}`}>
              
              {/* Product Info Row */}
              <div className="flex gap-3 mb-4">
                {/* Thumbnail */}
                <div className={`w-24 h-24 bg-slate-100 rounded-lg flex-shrink-0 bg-cover bg-center border border-slate-200 ${isStockDone ? 'grayscale opacity-80' : ''}`} style={{ backgroundImage: `url(${product.image})` }}></div>
                
                <div className="flex-1 min-w-0 flex flex-col justify-between">
                  <div>
                    {/* Title */}
                    <div className="flex justify-between items-start gap-2">
                        <h2 className={`text-lg font-bold leading-snug mb-1 line-clamp-2 ${isStockDone ? 'line-through text-slate-500' : 'text-slate-900'}`}>
                        {product.name}
                        </h2>
                        
                        {/* Repick Marker (Only in Picking Tab) */}
                        {activeTab === 'pick' && !isStockDone && product.isRepick && (
                           <div className="flex items-center gap-1 bg-amber-100 text-amber-700 px-3 py-1.5 rounded-full shadow-sm flex-shrink-0">
                               <RotateCcw className="w-3.5 h-3.5 stroke-[3]" />
                               <span className="text-xs font-black leading-none">重配</span>
                           </div>
                        )}
                    </div>
                    
                    {/* Spec */}
                    <div className="text-sm font-medium text-slate-600 mb-1">
                      规格: <span className="text-slate-900">{product.spec}</span>
                    </div>

                    {/* Merchant Name & Return Type Tag */}
                    <div className="flex flex-wrap items-center gap-2 mt-1">
                      <div className="flex items-center gap-1 text-xs text-blue-600 font-medium bg-blue-50 px-2 py-1 rounded">
                        <Store className="w-3 h-3" />
                        {product.merchantName}
                      </div>

                      {/* Return Type Toggle Badge (Only in Return Tab) */}
                      {activeTab === 'return' && (
                        <button 
                          onClick={() => setReturnType(product.id, product.returnType === 'customer' ? 'surplus' : 'customer')}
                          className={`flex items-center gap-1 text-xs font-bold px-2 py-1 rounded border transition-colors ${
                              product.returnType === 'customer' 
                              ? 'bg-rose-50 text-rose-600 border-rose-200' 
                              : 'bg-indigo-50 text-indigo-600 border-indigo-200'
                          }`}
                        >
                          {product.returnType === 'customer' ? <ArrowDownCircle className="w-3 h-3"/> : <PackagePlus className="w-3 h-3"/>}
                          {product.returnType === 'customer' ? '客退商品' : '多余货品'}
                          <span className="ml-1 opacity-50 text-[10px]">↻</span>
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Dynamic Action Area based on Active Tab */}
              <div>
                
                {/* 1. PICKING TAB */}
                {activeTab === 'pick' && (
                  <TripleClickButton 
                      count={product.toPick} 
                      type="pick" 
                      disabled={status === 'resting'}
                      onConfirmed={() => handlePickConfirm(product.id)}
                  />
                )}

                {/* 2. STOCK IN TAB */}
                {activeTab === 'stock' && (
                    isStockDone ? (
                        <div className="w-full p-4 bg-slate-200 rounded-xl border border-slate-300 text-center">
                            <div className="text-slate-600 font-bold flex items-center justify-center gap-2 text-lg">
                                <CheckCircle2 className="w-6 h-6 text-slate-600" /> 已入库
                            </div>
                            <div className="text-sm text-slate-500 mt-1 font-mono">入库时间: {new Date(product.stockInTime).toLocaleTimeString()}</div>
                        </div>
                    ) : (
                        <TripleClickButton 
                            count={product.toStockIn} 
                            type="stock" 
                            disabled={status === 'resting'}
                            onConfirmed={() => handleStockInConfirm(product.id)}
                        />
                    )
                )}

                {/* 3. RETURN TAB */}
                {activeTab === 'return' && (
                  <TripleClickButton 
                    count={0} 
                    type="return" 
                    returnLabel={product.returnType === 'customer' ? '确认客退' : '确认余货'}
                    disabled={status === 'resting'}
                    onConfirmed={() => handleReturnConfirm(product.id)}
                  />
                )}
              </div>

            </div>
          );
        })}
        </div>
{/* ... Bottom Nav ... */}

        {/* Profile Tab Content (Replaces the list when active) */}
        {activeTab === 'profile' && (
          <div className="fixed inset-0 top-[72px] bottom-[80px] bg-slate-100 z-40 p-6 flex flex-col items-center justify-center">
             <div className="bg-white rounded-2xl shadow-sm p-8 w-full max-w-sm flex flex-col items-center mb-8">
                {/* Avatar with Status Ring */}
                <div className={`relative w-24 h-24 bg-slate-200 rounded-full mb-4 flex items-center justify-center transition-all ${status === 'on_duty' ? 'ring-4 ring-emerald-400 ring-offset-4' : ''}`}>
                  <User className="w-12 h-12 text-slate-400" />
                  {status === 'on_duty' && <div className="absolute bottom-0 right-0 w-6 h-6 bg-emerald-500 border-4 border-white rounded-full"></div>}
                </div>
                
                <h2 className="text-2xl font-black text-slate-900 mb-1">张三</h2>
                <p className="text-lg text-slate-500 font-mono mb-6">138 0000 8888</p>
                
                <div className="grid grid-cols-2 gap-4 w-full">
                  <button 
                    onClick={() => setStatus('on_duty')}
                    className={`flex flex-col items-center justify-center h-32 rounded-xl transition-all active:scale-95 ${
                      status === 'on_duty' 
                        ? 'bg-blue-600 text-white shadow-blue-200 shadow-lg ring-2 ring-blue-600 ring-offset-2' 
                        : 'bg-white border-2 border-slate-100 text-slate-400'
                    }`}
                  >
                    <CheckCircle2 className="w-10 h-10 mb-2" />
                    <span className="text-xl font-bold">值班</span>
                  </button>
                  <button 
                     onClick={() => setStatus('resting')}
                     className={`flex flex-col items-center justify-center h-32 rounded-xl transition-all active:scale-95 ${
                      status === 'resting'
                        ? 'bg-slate-600 text-white shadow-slate-200 shadow-lg ring-2 ring-slate-600 ring-offset-2'
                        : 'bg-white border-2 border-slate-100 text-slate-400'
                     }`}
                  >
                    <AlertCircle className="w-10 h-10 mb-2" />
                    <span className="text-xl font-bold">休息</span>
                  </button>
                </div>
             </div>
          </div>
        )}
      </div>

      {/* End of List */}
      {activeTab !== 'profile' && (
        <div className="text-center text-slate-400 py-8 text-sm">
          -- 没有更多任务了 --
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
          {activeTab === 'pick' && <div className="absolute top-0 w-8 h-1 bg-blue-600 rounded-b-full"></div>}
        </button>

        <button 
          onClick={() => setActiveTab('stock')}
          className={`flex-1 flex flex-col items-center py-3 gap-1 relative ${activeTab === 'stock' ? 'text-blue-600' : 'text-slate-400'}`}
        >
          <PackagePlus className="w-6 h-6" />
          <span className="text-xs font-bold">入库</span>
          {activeTab === 'stock' && <div className="absolute top-0 w-8 h-1 bg-blue-600 rounded-b-full"></div>}
        </button>

        <button 
          onClick={() => setActiveTab('return')}
          className={`flex-1 flex flex-col items-center py-3 gap-1 relative ${activeTab === 'return' ? 'text-blue-600' : 'text-slate-400'}`}
        >
          <ArrowDownCircle className="w-6 h-6" />
          <span className="text-xs font-bold">客退</span>
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

      <style jsx global>{`
        pb-safe-area-inset-bottom {
          padding-bottom: env(safe-area-inset-bottom);
        }
      `}</style>
    </div>
  );
}

// Sub-component for Triple Click Logic
function TripleClickButton({ 
    count, 
    type, 
    disabled, 
    onConfirmed,
    returnLabel 
}: { 
    count: number, 
    type: 'pick' | 'stock' | 'return', 
    disabled: boolean,
    onConfirmed?: () => void,
    returnLabel?: string
}) {
  const [clicks, setClicks] = useState(0);

  // Auto-reset clicks after 2 seconds of inactivity or confirm
  useEffect(() => {
    if (clicks > 0 && clicks < 3) {
      const timer = setTimeout(() => setClicks(0), 1000); 
      return () => clearTimeout(timer);
    }
    if (clicks === 3) {
        // Trigger the callback
        if (onConfirmed) {
            // Small delay to show the "Confirmed!" state before action happens
            const confirmTimer = setTimeout(() => {
                onConfirmed();
                setClicks(0);
            }, 500);
            return () => clearTimeout(confirmTimer);
        } else {
            const timer = setTimeout(() => setClicks(0), 1000);
            return () => clearTimeout(timer);
        }
    }
  }, [clicks, onConfirmed]);

  const handleClick = () => {
    if (disabled) return;
    setClicks(prev => Math.min(prev + 1, 3));
  };

  // Visuals configuration
  const config = {
    pick: {
      color: 'amber',
      icon: <PackageCheck className="w-6 h-6" />,
      label: '待分拣'
    },
    stock: {
      color: 'emerald',
      icon: <PackagePlus className="w-6 h-6" />,
      label: '待入库'
    },
    return: {
      color: 'rose',
      icon: <ArrowDownCircle className="w-6 h-6" />,
      label: '客退处理'
    }
  }[type];

  // Colors
  const baseClass = disabled 
    ? `bg-slate-50 border-slate-200 text-slate-400 grayscale cursor-not-allowed`
    : clicks === 3 
      ? `bg-${config.color}-600 border-${config.color}-600 text-white ring-4 ring-${config.color}-200`
      : `bg-${config.color}-50 border-${config.color}-500 text-${config.color}-900 active:scale-[0.98]`;

  return (
    <button 
      onClick={handleClick}
      disabled={disabled}
      className={`relative w-full flex items-center justify-between p-4 rounded-xl border-2 transition-all duration-200 overflow-hidden ${baseClass}`}
    >
      {/* Progress Background Overlay */}
      {!disabled && clicks > 0 && clicks < 3 && (
        <div 
           className={`absolute left-0 top-0 bottom-0 bg-${config.color}-200 opacity-30 transition-all duration-300 ease-out`}
           style={{ width: `${(clicks / 3) * 100}%` }}
        ></div>
      )}

      <div className="relative flex items-center gap-3 z-10">
        <div className={`p-2 rounded-full transition-colors duration-300 ${
            disabled 
                ? 'bg-slate-300 text-white' 
                : clicks === 3 
                    ? 'bg-white text-' + config.color + '-600'
                    : 'bg-' + config.color + '-500 text-white'
            }`}>
          {clicks === 3 ? <CheckCircle2 className="w-6 h-6" /> : config.icon}
        </div>
        <div className="text-left">
          <div className={`text-xs font-bold uppercase tracking-wider ${clicks === 3 ? 'text-white' : 'opacity-70'}`}>{config.label}</div>
           {type !== 'return' && <div className="text-2xl font-black">{count}</div>}
           {type === 'return' && <div className="text-lg font-bold">{returnLabel || '扫码'}</div>}
        </div>
      </div>
      
      <div className="relative z-10 text-sm font-bold flex items-center gap-1">
        {clicks === 0 && (
            <span>三连击确认 <ArrowRight className="inline w-4 h-4" /></span>
        )}
        {clicks === 1 && <span>再点 2 下...</span>}
        {clicks === 2 && <span>再点 1 下...</span>}
        {clicks === 3 && <span>已确认!</span>}
      </div>
    </button>
  );
}
