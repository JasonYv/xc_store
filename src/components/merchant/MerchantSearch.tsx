import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, X, Plus } from "lucide-react";

export interface SearchFilters {
  name: string;
  merchantId: string;
  pinduoduoName: string;
  warehouse1: string;
  groupName: string;
  sendMessage: 'all' | 'true' | 'false';
}

interface MerchantSearchProps {
  filters: SearchFilters;
  onFilterChange: (filters: SearchFilters) => void;
  onSearch: () => void;
  onAdd: () => void;
}

export default function MerchantSearch({
  filters,
  onFilterChange,
  onSearch,
  onAdd
}: MerchantSearchProps) {
  const handleInputChange = (field: keyof SearchFilters, value: string) => {
    onFilterChange({
      ...filters,
      [field]: value
    });
  };

  const handleReset = () => {
    const resetFilters: SearchFilters = {
      name: '',
      merchantId: '',
      pinduoduoName: '',
      warehouse1: '',
      groupName: '',
      sendMessage: 'all'
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
        <h1 className="text-xl font-bold tracking-tight">商家管理</h1>
      </div>

      {/* 搜索条件卡片 */}
      <div className="bg-white rounded-lg border p-4 space-y-3">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          <div className="space-y-1">
            <label className="text-xs font-medium text-gray-700">商家名称</label>
            <Input
              type="text"
              placeholder="搜索商家名称"
              value={filters.name}
              onChange={(e) => handleInputChange('name', e.target.value)}
              onKeyDown={handleKeyDown}
              className="h-8 text-sm"
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-medium text-gray-700">商家ID</label>
            <Input
              type="text"
              placeholder="搜索商家ID"
              value={filters.merchantId}
              onChange={(e) => handleInputChange('merchantId', e.target.value)}
              onKeyDown={handleKeyDown}
              className="h-8 text-sm"
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-medium text-gray-700">拼多多名称</label>
            <Input
              type="text"
              placeholder="搜索拼多多名称"
              value={filters.pinduoduoName}
              onChange={(e) => handleInputChange('pinduoduoName', e.target.value)}
              onKeyDown={handleKeyDown}
              className="h-8 text-sm"
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-medium text-gray-700">仓库名称</label>
            <Input
              type="text"
              placeholder="搜索仓库名称"
              value={filters.warehouse1}
              onChange={(e) => handleInputChange('warehouse1', e.target.value)}
              onKeyDown={handleKeyDown}
              className="h-8 text-sm"
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-medium text-gray-700">群名称</label>
            <Input
              type="text"
              placeholder="搜索群名称"
              value={filters.groupName}
              onChange={(e) => handleInputChange('groupName', e.target.value)}
              onKeyDown={handleKeyDown}
              className="h-8 text-sm"
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-medium text-gray-700">发送消息</label>
            <Select
              value={filters.sendMessage}
              onValueChange={(value) => handleInputChange('sendMessage', value as 'all' | 'true' | 'false')}
            >
              <SelectTrigger className="h-8 text-sm">
                <SelectValue placeholder="选择状态" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">全部</SelectItem>
                <SelectItem value="true">是</SelectItem>
                <SelectItem value="false">否</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* 操作按钮行 */}
      <div className="flex items-center justify-between">
        <Button onClick={onAdd} size="sm" className="h-8 text-sm px-3">
          <Plus className="h-3.5 w-3.5 mr-1" />
          添加商家
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