'use client';

import { Download, FileDown, FileUp, Plus, Search, X } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

// 映射表页的搜索与操作区。排版照 dashboard/merchants 那套：
// 标题行 → 搜索卡片 → 操作按钮行。

interface MappingSearchProps {
  /** 映射表接口前缀，导出/模板链接挂在它下面（控制台与云仓内部后台各一个） */
  apiBase: string;
  keyword: string;
  onKeywordChange: (value: string) => void;
  onSearch: () => void;
  onReset: () => void;
  onAdd: () => void;
  onImportClick: () => void;
  importing: boolean;
  total: number;
}

export default function MappingSearch({
  apiBase,
  keyword,
  onKeywordChange,
  onSearch,
  onReset,
  onAdd,
  onImportClick,
  importing,
  total,
}: MappingSearchProps) {
  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === 'Enter') onSearch();
  };

  return (
    <div className="space-y-3">
      <div>
        <h1 className="text-xl font-bold tracking-tight">商品映射表</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          共 {total} 行。导入是<strong className="font-medium">按商品码更新</strong>：
          只影响文件里出现的商品，没提到的保持不变。
        </p>
      </div>

      <div className="space-y-3 rounded-lg border bg-white p-4">
        <div className="space-y-1">
          <label className="text-xs font-medium text-gray-700">搜索</label>
          <Input
            type="text"
            placeholder="商品名 / 派单名 / 商品码 / 金蝶代码，任一即可"
            value={keyword}
            onChange={event => onKeywordChange(event.target.value)}
            onKeyDown={handleKeyDown}
            className="h-8 text-sm"
          />
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2">
        <Button onClick={onAdd} size="sm" className="h-8 px-3 text-sm">
          <Plus className="mr-1 h-3.5 w-3.5" />
          新增一行
        </Button>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={onImportClick}
            disabled={importing}
            className="h-8 px-3 text-sm"
          >
            <FileUp className="mr-1 h-3.5 w-3.5" />
            {importing ? '导入中…' : '导入 xlsx'}
          </Button>
          <Button variant="outline" size="sm" asChild className="h-8 px-3 text-sm">
            <a href={`${apiBase}/export`}>
              <FileDown className="mr-1 h-3.5 w-3.5" />
              导出 xlsx
            </a>
          </Button>
          <Button variant="outline" size="sm" asChild className="h-8 px-3 text-sm">
            <a href={`${apiBase}/template`}>
              <Download className="mr-1 h-3.5 w-3.5" />
              下载模板
            </a>
          </Button>

          <span className="mx-1 hidden h-5 w-px bg-border sm:block" />

          <Button
            variant="outline"
            size="sm"
            onClick={onReset}
            className="h-8 px-3 text-sm"
          >
            <X className="mr-1 h-3.5 w-3.5" />
            重置
          </Button>
          <Button onClick={onSearch} size="sm" className="h-8 px-3 text-sm">
            <Search className="mr-1 h-3.5 w-3.5" />
            搜索
          </Button>
        </div>
      </div>
    </div>
  );
}
