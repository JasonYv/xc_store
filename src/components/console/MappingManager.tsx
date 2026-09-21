'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

import MappingSearch from '@/components/console/MappingSearch';
import MappingTable, {
  CLOUD_MAPPING_COLUMNS,
  TENANT_MAPPING_COLUMNS,
} from '@/components/console/MappingTable';
import MappingForm, {
  CLOUD_FORM_FIELDS,
  TENANT_FORM_FIELDS,
  type MappingFormValue,
} from '@/components/console/MappingForm';
import Modal from '@/components/common/Modal';
import { useToast } from '@/hooks/use-toast';
import type { ProductMapping } from '@/lib/types';

// 商品映射表的维护界面：增删改查 + 关键字搜索 + xlsx 导入/导出。
//
// 两处用它：租户控制台（/console/mappings，数据给商家版）和云仓内部后台
// （/dashboard/dispatch-mappings，数据给云仓版）。两边只差接口前缀和
// 「数据给谁用」的提示文字，逻辑必须一致，所以只写这一份。
//
// 两边的表格式不同（variant）：
// - tenant：商家版清单 7 列，按表头名认列
// - cloud：云仓版原表 A–D 四列，按位置读，派单名必填（见 lib/cloud-mapping-xlsx.ts）

const VARIANTS = {
  tenant: {
    columns: TENANT_MAPPING_COLUMNS,
    formFields: TENANT_FORM_FIELDS,
    accept: '.xlsx',
    searchPlaceholder: '商品名 / 派单名 / 商品码 / 金蝶代码，任一即可',
    description: undefined,
    skippedReason: '表头重复或缺商品码',
  },
  cloud: {
    columns: CLOUD_MAPPING_COLUMNS,
    formFields: CLOUD_FORM_FIELDS,
    accept: '.xls,.xlsx',
    searchPlaceholder: '派单名 / 多多商品名 / ID，任一即可',
    description: (
      <>
        导入直接用原来那份映射表（.xls/.xlsx 都行）：第 1 行当表头跳过，按
        <strong className="font-medium"> A 派单名 / B 多多商品名称 / C ID / D 规格 </strong>
        读，E 列不读；按 ID 更新，文件里没有的商品保持不变。
      </>
    ),
    skippedReason: '缺派单名或缺 ID',
  },
} as const;

const PAGE_SIZE_OPTIONS = [20, 50, 100];

interface MappingManagerProps {
  /** 表格式，默认 tenant */
  variant?: keyof typeof VARIANTS;
  /** 接口前缀，如 /api/console/mappings；导入/导出/模板在它下面 */
  apiBase: string;
  /** 数据的使用方（「商家版」/「云仓版」），用在删除确认里 */
  consumerLabel: string;
  /** 接口返回 401 时怎么办（控制台要跳回登录页；内部后台没有服务端会话，不传） */
  onUnauthorized?: () => void;
}

export default function MappingManager({
  variant = 'tenant',
  apiBase,
  consumerLabel,
  onUnauthorized,
}: MappingManagerProps) {
  const { toast } = useToast();
  const config = VARIANTS[variant];

  const [rows, setRows] = useState<ProductMapping[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(PAGE_SIZE_OPTIONS[1]);
  // 输入框里的值和「已提交的搜索词」分开：不然打到一半就开始查
  const [keywordInput, setKeywordInput] = useState('');
  const [keyword, setKeyword] = useState('');
  const [loading, setLoading] = useState(true);

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editing, setEditing] = useState<ProductMapping | undefined>(undefined);
  const [saving, setSaving] = useState(false);
  const [importing, setImporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), pageSize: String(pageSize) });
      if (keyword) params.set('keyword', keyword);
      const res = await fetch(`${apiBase}?${params.toString()}&t=${Date.now()}`);
      if (res.status === 401 && onUnauthorized) {
        onUnauthorized();
        return;
      }
      const body = await res.json();
      if (!res.ok || !body.success) throw new Error(body.error || '加载失败');
      setRows(body.data.items);
      setTotal(body.data.total);
    } catch (error) {
      toast({
        title: '加载失败',
        description: error instanceof Error ? error.message : '未知错误',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }, [apiBase, page, pageSize, keyword, onUnauthorized, toast]);

  useEffect(() => {
    void load();
  }, [load]);

  const handleAdd = () => {
    setEditing(undefined);
    setIsFormOpen(true);
  };

  const handleEdit = (row: ProductMapping) => {
    setEditing(row);
    setIsFormOpen(true);
  };

  const closeForm = () => {
    setIsFormOpen(false);
    setEditing(undefined);
  };

  const handleFormSubmit = async (value: MappingFormValue) => {
    if (!value.productId.trim()) {
      toast({ title: '商品码不能为空', variant: 'destructive' });
      return;
    }
    if (variant === 'cloud' && !value.dispatchName.trim()) {
      toast({ title: '派单表商品名称不能为空', variant: 'destructive' });
      return;
    }
    setSaving(true);
    try {
      const isEdit = !!editing;
      const res = await fetch(`${apiBase}?t=${Date.now()}`, {
        method: isEdit ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(isEdit ? { id: editing!.id, ...value } : value),
      });
      const body = await res.json();
      if (!res.ok || !body.success) throw new Error(body.error || '保存失败');
      toast({ title: isEdit ? '已保存' : '已新增' });
      closeForm();
      await load();
    } catch (error) {
      toast({
        title: '保存失败',
        description: error instanceof Error ? error.message : '未知错误',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (row: ProductMapping) => {
    const label = row.dispatchName || row.pddName || row.productId;
    if (!window.confirm(`确认删除「${label}」？删掉后${consumerLabel}下次拉取就没有它了。`)) return;
    try {
      const res = await fetch(`${apiBase}?id=${encodeURIComponent(row.id)}&t=${Date.now()}`, {
        method: 'DELETE',
      });
      const body = await res.json();
      if (!res.ok || !body.success) throw new Error(body.error || '删除失败');
      toast({ title: '已删除' });
      // 删掉当前页最后一条时往前翻一页，免得停在空页上
      if (rows.length === 1 && page > 1) setPage(page - 1);
      else await load();
    } catch (error) {
      toast({
        title: '删除失败',
        description: error instanceof Error ? error.message : '未知错误',
        variant: 'destructive',
      });
    }
  };

  const handleImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    // 清空 value：不然连续选同一个文件不会触发 change
    event.target.value = '';
    if (!file) return;

    setImporting(true);
    try {
      const data = new FormData();
      data.append('file', file);
      const res = await fetch(`${apiBase}/import?t=${Date.now()}`, { method: 'POST', body: data });
      const body = await res.json();
      if (!res.ok || !body.success) throw new Error(body.error || '导入失败');

      const { inserted, updated, skipped, parseSkipped, headerRecognized } = body.data;
      const details = [
        `新增 ${inserted}、更新 ${updated}`,
        // 跳过原因按表格式说清楚，否则用户会对着文件数不出来为什么少一行
        parseSkipped ? `另有 ${parseSkipped} 行已跳过（${config.skippedReason}）` : '',
        skipped ? `${skipped} 行被跳过` : '',
        headerRecognized ? '' : '（表头没认出来，按固定列位置读的）',
      ].filter(Boolean).join('；');

      toast({ title: '导入完成', description: details });
      setPage(1);
      await load();
    } catch (error) {
      toast({
        title: '导入失败',
        description: error instanceof Error ? error.message : '未知错误',
        variant: 'destructive',
      });
    } finally {
      setImporting(false);
    }
  };

  return (
    <>
      <MappingSearch
        apiBase={apiBase}
        keyword={keywordInput}
        onKeywordChange={setKeywordInput}
        onSearch={() => {
          setKeyword(keywordInput.trim());
          setPage(1);
        }}
        onReset={() => {
          setKeywordInput('');
          setKeyword('');
          setPage(1);
        }}
        onAdd={handleAdd}
        onImportClick={() => fileInputRef.current?.click()}
        importing={importing}
        total={total}
        description={config.description}
        searchPlaceholder={config.searchPlaceholder}
      />

      {/* 隐藏的文件选择器：导入按钮只是它的触发器，样式统一到 Button 上 */}
      <input
        ref={fileInputRef}
        type="file"
        accept={config.accept}
        className="hidden"
        onChange={handleImport}
      />

      <MappingTable
        rows={rows}
        columns={config.columns}
        isLoading={loading}
        currentPage={page}
        totalPages={Math.max(1, Math.ceil(total / pageSize))}
        pageSize={pageSize}
        totalItems={total}
        onPageChange={setPage}
        onPageSizeChange={size => {
          setPageSize(size);
          setPage(1);
        }}
        onEdit={handleEdit}
        onDelete={handleDelete}
      />

      <Modal
        isOpen={isFormOpen}
        onClose={closeForm}
        title={editing ? '编辑映射行' : '新增映射行'}
      >
        <MappingForm
          mapping={editing}
          onSubmit={handleFormSubmit}
          onCancel={closeForm}
          submitting={saving}
          fields={config.formFields}
        />
      </Modal>
    </>
  );
}
