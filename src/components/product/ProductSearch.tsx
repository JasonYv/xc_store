import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Combobox } from "@/components/ui/combobox";
import { Search, X, Plus } from "lucide-react";
import { useEffect, useState } from "react";

export interface ProductSearchFilters {
  productName: string;
  pinduoduoProductId: string;
  pinduoduoProductName: string;
  merchantId: string;
}

interface ProductSearchProps {
  filters: ProductSearchFilters;
  onFilterChange: (filters: ProductSearchFilters) => void;
  onSearch: () => void;
  onAdd: () => void;
}

export default function ProductSearch({
  filters,
  onFilterChange,
  onSearch,
  onAdd
}: ProductSearchProps) {
  const [merchants, setMerchants] = useState<Array<{ id: string; name: string }>>([]);

  useEffect(() => {
    // 获取商家列表用于下拉选择
    fetchMerchants();
  }, []);

  const fetchMerchants = async () => {
    try {
      const response = await fetch(`/api/merchants?pageSize=1000&t=${Date.now()}`);
      const data = await response.json();
      setMerchants(data.items || []);
    } catch (error) {
      console.error('获取商家列表失败:', error);
    }
  };

  const handleInputChange = (field: keyof ProductSearchFilters, value: string) => {
    onFilterChange({
      ...filters,
      [field]: value
    });
  };

  const handleReset = () => {
    const resetFilters: ProductSearchFilters = {
      productName: '',
      pinduoduoProductId: '',
      pinduoduoProductName: '',
      merchantId: 'all'
    };
    onFilterChange(resetFilters);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      onSearch();
    }
  };

  return (
    <div className="space-y-3">
      {/* 标题行 */}
      <div>
        <h1 className="text-xl font-bold tracking-tight">商品管理</h1>
      </div>

      {/* 搜索条件卡片 */}
      <div className="bg-white rounded-lg border p-4 space-y-3">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="space-y-1">
            <label className="text-xs font-medium text-gray-700">商品名称</label>
            <Input
              type="text"
              placeholder="搜索商品名称"
              value={filters.productName}
              onChange={(e) => handleInputChange('productName', e.target.value)}
              onKeyDown={handleKeyDown}
              className="h-8 text-sm w-full"
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-medium text-gray-700">拼多多商品ID</label>
            <Input
              type="text"
              placeholder="搜索拼多多商品ID"
              value={filters.pinduoduoProductId}
              onChange={(e) => handleInputChange('pinduoduoProductId', e.target.value)}
              onKeyDown={handleKeyDown}
              className="h-8 text-sm w-full"
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-medium text-gray-700">拼多多商品名称</label>
            <Input
              type="text"
              placeholder="搜索拼多多商品名称"
              value={filters.pinduoduoProductName}
              onChange={(e) => handleInputChange('pinduoduoProductName', e.target.value)}
              onKeyDown={handleKeyDown}
              className="h-8 text-sm w-full"
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-medium text-gray-700">所属商家</label>
            <div className="w-full">
              <Combobox
                options={[
                  { value: 'all', label: '全部商家' },
                  ...merchants.map(m => ({ value: m.id, label: m.name }))
                ]}
                value={filters.merchantId}
                onValueChange={(value) => handleInputChange('merchantId', value)}
                placeholder="选择商家"
                searchPlaceholder="搜索商家..."
                emptyText="未找到商家"
                className="h-8 text-sm w-full"
              />
            </div>
          </div>
        </div>
      </div>

      {/* 操作按钮行 */}
      <div className="flex items-center justify-between">
        <Button onClick={onAdd} size="sm" className="h-8 text-sm px-3">
          <Plus className="h-3.5 w-3.5 mr-1" />
          添加商品
        </Button>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleReset}
            className="h-8 text-sm px-3"
          >
            <X className="h-3.5 w-3.5 mr-1" />
            重置搜索
          </Button>
          <Button onClick={onSearch} size="sm" className="h-8 text-sm px-3">
            <Search className="h-3.5 w-3.5 mr-1" />
            搜索
          </Button>
        </div>
      </div>
    </div>
  );
}
