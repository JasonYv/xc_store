import { useCallback, useEffect, useRef, useState } from 'react';
import type { GetServerSideProps } from 'next';

import ConsoleLayout from '@/components/console/ConsoleLayout';
import RemoteConfigCard from '@/components/console/RemoteConfigCard';
import MappingSearch from '@/components/console/MappingSearch';
import MappingTable from '@/components/console/MappingTable';
import MappingForm, {
  type MappingFormValue,
} from '@/components/console/MappingForm';
import Modal from '@/components/common/Modal';
import { useToast } from '@/hooks/use-toast';
import { tenantPageProps, type ConsolePageProps } from '@/lib/console-page';
import type { ProductMapping } from '@/lib/types';

// 商品映射表的维护界面：增删改查 + 关键字搜索 + xlsx 导入/导出。
//
// 表里存的就是桌面端读的那份数据（远程接口按 productId 匹配），所以这里改一行，
// 商家版下次拉取就生效——不用再去每台机器上换文件。

const PAGE_SIZE_OPTIONS = [20, 50, 100];

export const getServerSideProps: GetServerSideProps<ConsolePageProps> = tenantPageProps;

export default function ConsoleMappings({ tenant, user }: ConsolePageProps) {
  const { toast } = useToast();

  const [rows, setRows] = useState<ProductMapping[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(PAGE_SIZE_OPTIONS[1]);
  // 输入框里的值和「已提交的搜索词」分开：不然打到一半就开始查
  const [keywordInput, setKeywordInput] = useState('');
  const [keyword, setKeyword] = useState('');
  const [loading, setLoading] = useState(true);

  const [token, setToken] = useState('');
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
      const res = await fetch(`/api/console/mappings?${params.toString()}&t=${Date.now()}`);
      if (res.status === 401) {
        window.location.href = '/console';
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
  }, [page, pageSize, keyword, toast]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    fetch(`/api/console/me?t=${Date.now()}`)
      .then(res => (res.ok ? res.json() : null))
      .then(body => {
        if (body?.success) setToken(body.data.tenant.token || '');
      })
      .catch(() => undefined);
  }, []);

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
    setSaving(true);
    try {
      const isEdit = !!editing;
      const res = await fetch('/api/console/mappings', {
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
    if (!window.confirm(`确认删除「${label}」？删掉后商家版下次拉取就没有它了。`)) return;
    try {
      const res = await fetch(`/api/console/mappings?id=${encodeURIComponent(row.id)}`, {
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
      const res = await fetch('/api/console/mappings/import', { method: 'POST', body: data });
      const body = await res.json();
      if (!res.ok || !body.success) throw new Error(body.error || '导入失败');

      const { inserted, updated, skipped, parseSkipped, headerRecognized } = body.data;
      const details = [
        `新增 ${inserted}、更新 ${updated}`,
        // parseSkipped 里既有「缺商品码的行」，也有「重复出现的表头行」，
        // 别只写缺商品码，否则用户会对着文件数不出来为什么少一行
        parseSkipped ? `另有 ${parseSkipped} 行已跳过（表头重复或缺商品码）` : '',
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
    <ConsoleLayout tenant={tenant} user={{ ...user }} title="商品映射表">
      <RemoteConfigCard token={token} />

      <MappingSearch
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
      />

      {/* 隐藏的文件选择器：导入按钮只是它的触发器，样式统一到 Button 上 */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".xlsx,.xls"
        className="hidden"
        onChange={handleImport}
      />

      <MappingTable
        rows={rows}
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
        />
      </Modal>
    </ConsoleLayout>
  );
}
