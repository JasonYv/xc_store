import { MagnifyingGlassIcon } from "@heroicons/react/24/outline";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

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

  return (
    <div className="mb-4 space-y-3">
      {/* 第一行：标题 */}
      <div>
        <h1 className="text-xl font-bold tracking-tight">商家管理</h1>
      </div>

      {/* 第二行：搜索条件 */}
      <div className="flex items-center gap-1.5">
        <Input
          type="text"
          placeholder="商家名称"
          value={filters.name}
          onChange={(e) => handleInputChange('name', e.target.value)}
          className="h-8 w-32 text-sm"
        />
        <Input
          type="text"
          placeholder="商家ID"
          value={filters.merchantId}
          onChange={(e) => handleInputChange('merchantId', e.target.value)}
          className="h-8 w-32 text-sm"
        />
        <Input
          type="text"
          placeholder="多多买菜名称"
          value={filters.pinduoduoName}
          onChange={(e) => handleInputChange('pinduoduoName', e.target.value)}
          className="h-8 w-32 text-sm"
        />
        <Input
          type="text"
          placeholder="1仓名称"
          value={filters.warehouse1}
          onChange={(e) => handleInputChange('warehouse1', e.target.value)}
          className="h-8 w-32 text-sm"
        />
        <Input
          type="text"
          placeholder="群名称"
          value={filters.groupName}
          onChange={(e) => handleInputChange('groupName', e.target.value)}
          className="h-8 w-32 text-sm"
        />
        <Select
          value={filters.sendMessage}
          onValueChange={(value) => handleInputChange('sendMessage', value as 'all' | 'true' | 'false')}
        >
          <SelectTrigger className="h-8 w-28 text-sm">
            <SelectValue placeholder="发送消息" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">全部</SelectItem>
            <SelectItem value="true">是</SelectItem>
            <SelectItem value="false">否</SelectItem>
          </SelectContent>
        </Select>
        <Button onClick={onSearch} size="sm" className="h-8 ml-auto text-sm">
          <MagnifyingGlassIcon className="h-3.5 w-3.5 mr-1" />
          搜索
        </Button>
      </div>

      {/* 第三行：添加商家按钮 */}
      <div>
        <Button onClick={onAdd} size="sm" className="h-8 text-sm">
          添加商家
        </Button>
      </div>
    </div>
  );
} 