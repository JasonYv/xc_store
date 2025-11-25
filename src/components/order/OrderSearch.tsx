'use client';

import { useState } from 'react';
import { format } from "date-fns";
import { zhCN } from "date-fns/locale";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Search, X, CalendarIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface OrderSearchProps {
  onSearch: (filters: {
    shopName?: string;
    productName?: string;
    salesArea?: string;
    salesDate?: string;
  }) => void;
}

export default function OrderSearch({ onSearch }: OrderSearchProps) {
  const [shopName, setShopName] = useState('');
  const [productName, setProductName] = useState('');
  const [salesArea, setSalesArea] = useState('');
  const [date, setDate] = useState<Date | undefined>(undefined);

  const handleSearch = () => {
    const filters: any = {};
    if (shopName.trim()) filters.shopName = shopName.trim();
    if (productName.trim()) filters.productName = productName.trim();
    if (salesArea.trim()) filters.salesArea = salesArea.trim();
    if (date) {
      filters.salesDate = format(date, 'yyyy-MM-dd');
    }

    onSearch(filters);
  };

  const handleReset = () => {
    setShopName('');
    setProductName('');
    setSalesArea('');
    setDate(undefined);
    onSearch({});
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  return (
    <div className="bg-white rounded-lg border p-4 space-y-3">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="space-y-1">
          <label className="text-xs font-medium text-gray-700">店铺名称</label>
          <Input
            value={shopName}
            onChange={(e) => setShopName(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="搜索店铺名称"
            className="h-8 text-sm"
          />
        </div>

        <div className="space-y-1">
          <label className="text-xs font-medium text-gray-700">商品名称</label>
          <Input
            value={productName}
            onChange={(e) => setProductName(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="搜索商品名称"
            className="h-8 text-sm"
          />
        </div>

        <div className="space-y-1">
          <label className="text-xs font-medium text-gray-700">销售区域</label>
          <Input
            value={salesArea}
            onChange={(e) => setSalesArea(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="搜索销售区域"
            className="h-8 text-sm"
          />
        </div>

        <div className="space-y-1">
          <label className="text-xs font-medium text-gray-700">销售日期</label>
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  "w-full h-8 justify-start text-left font-normal text-sm",
                  !date && "text-muted-foreground"
                )}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {date ? format(date, "yyyy年MM月dd日", { locale: zhCN }) : "选择日期"}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={date}
                onSelect={setDate}
                locale={zhCN}
              />
            </PopoverContent>
          </Popover>
        </div>
      </div>

      <div className="flex justify-end space-x-2">
        <Button
          variant="outline"
          size="sm"
          onClick={handleReset}
          className="h-8 text-sm px-3"
        >
          <X className="h-3.5 w-3.5 mr-1" />
          重置
        </Button>
        <Button
          size="sm"
          onClick={handleSearch}
          className="h-8 text-sm px-3"
        >
          <Search className="h-3.5 w-3.5 mr-1" />
          搜索
        </Button>
      </div>
    </div>
  );
}
