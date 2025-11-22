import { MagnifyingGlassIcon } from "@heroicons/react/24/outline";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Combobox } from "@/components/ui/combobox";
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

  return (
    <div className="mb-4 space-y-3">
      {/* 第一行：标题 */}
      <div>
        <h1 className="text-xl font-bold tracking-tight">商品管理</h1>
      </div>

      {/* 第二行：搜索条件 */}
      <div className="flex items-center gap-1.5">
        <Input
          type="text"
          placeholder="云仓商品名称"
          value={filters.productName}
          onChange={(e) => handleInputChange('productName', e.target.value)}
          className="h-8 w-32 text-sm"
        />
        <Input
          type="text"
          placeholder="多多买菜商品ID"
          value={filters.pinduoduoProductId}
          onChange={(e) => handleInputChange('pinduoduoProductId', e.target.value)}
          className="h-8 w-40 text-sm"
        />
        <Input
          type="text"
          placeholder="多多买菜商品名称"
          value={filters.pinduoduoProductName}
          onChange={(e) => handleInputChange('pinduoduoProductName', e.target.value)}
          className="h-8 w-40 text-sm"
        />
        <Combobox
          options={[
            { value: 'all', label: '全部商家' },
            ...merchants.map(m => ({ value: m.id, label: m.name }))
          ]}
          value={filters.merchantId}
          onValueChange={(value) => handleInputChange('merchantId', value)}
          placeholder="所属商家"
          searchPlaceholder="搜索商家..."
          emptyText="未找到商家"
          className="h-8 w-60 text-sm"
        />
        <Button onClick={onSearch} size="sm" className="h-8 ml-auto text-sm">
          <MagnifyingGlassIcon className="h-3.5 w-3.5 mr-1" />
          搜索
        </Button>
      </div>

      {/* 第三行：添加商品按钮 */}
      <div>
        <Button onClick={onAdd} size="sm" className="h-8 text-sm">
          添加商品
        </Button>
      </div>
    </div>
  );
}
