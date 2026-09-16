import { useCallback, useEffect, useState } from 'react';
import type { GetServerSideProps } from 'next';
import { Plus } from 'lucide-react';

import ConsoleLayout from '@/components/console/ConsoleLayout';
import UserTable, { type TenantUserRow } from '@/components/console/UserTable';
import Modal from '@/components/common/Modal';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { tenantPageProps, type ConsolePageProps } from '@/lib/console-page';

// 租户自己的员工账号。
//
// 只有 owner 进得来（getServerSideProps 和 /api/console/users 都按 owner 拦）。
// 三条自我保护规则在后端实现（不能删自己、不能停用最后一个管理员、登录名全局唯一），
// 界面上把对应按钮禁掉，别让用户点了才被告知。

interface UserFormValue {
  username: string;
  password: string;
  displayName: string;
  role: 'owner' | 'staff';
}

const EMPTY_USER_FORM: UserFormValue = {
  username: '',
  password: '',
  displayName: '',
  role: 'staff',
};

export const getServerSideProps: GetServerSideProps<ConsolePageProps> = async (context) => {
  const result = await tenantPageProps(context);
  // 非 owner 不给进：直接送去映射表页，而不是给一个进不去的空页面。
  // 注意 result.props 的类型是 `P | Promise<P>`（Next 的 GetServerSidePropsResult
  // 定义如此），所以要 await 一下才能取到字段。
  if ('props' in result) {
    const props = await result.props;
    if (props.user.role !== 'owner') {
      return { redirect: { destination: '/console/mappings', permanent: false } };
    }
  }
  return result;
};

export default function ConsoleUsers({ tenant, user }: ConsolePageProps) {
  const { toast } = useToast();
  const [users, setUsers] = useState<TenantUserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editing, setEditing] = useState<TenantUserRow | undefined>(undefined);
  const [form, setForm] = useState<UserFormValue>(EMPTY_USER_FORM);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/console/users?t=${Date.now()}`);
      if (res.status === 401) {
        window.location.href = '/console';
        return;
      }
      const body = await res.json();
      if (!res.ok || !body.success) throw new Error(body.error || '加载失败');
      setUsers(body.data);
    } catch (error) {
      toast({
        title: '加载失败',
        description: error instanceof Error ? error.message : '未知错误',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    void load();
  }, [load]);

  const handleAdd = () => {
    setForm(EMPTY_USER_FORM);
    setEditing(undefined);
    setIsFormOpen(true);
  };

  const handleEdit = (row: TenantUserRow) => {
    // 编辑时不回填密码：留空表示不改
    setForm({
      username: row.username,
      password: '',
      displayName: row.displayName,
      role: row.role,
    });
    setEditing(row);
    setIsFormOpen(true);
  };

  const closeForm = () => {
    setIsFormOpen(false);
    setEditing(undefined);
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setSaving(true);
    try {
      const isEdit = !!editing;
      const payload: Record<string, unknown> = {
        username: form.username.trim(),
        displayName: form.displayName.trim(),
        role: form.role,
      };
      if (form.password) payload.password = form.password;
      if (isEdit) payload.id = editing!.id;

      const res = await fetch('/api/console/users', {
        method: isEdit ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const body = await res.json();
      if (!res.ok || !body.success) throw new Error(body.error || '保存失败');
      toast({ title: isEdit ? '已保存' : '已创建' });
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

  const handleToggleActive = async (row: TenantUserRow) => {
    const next = !row.isActive;
    const label = next ? '启用' : '停用';
    if (!window.confirm(`确认${label}「${row.displayName}」？${next ? '' : '该账号会被立刻踢下线。'}`)) {
      return;
    }
    try {
      const res = await fetch('/api/console/users', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: row.id, isActive: next }),
      });
      const body = await res.json();
      if (!res.ok || !body.success) throw new Error(body.error || `${label}失败`);
      toast({ title: `已${label}` });
      await load();
    } catch (error) {
      toast({
        title: `${label}失败`,
        description: error instanceof Error ? error.message : '未知错误',
        variant: 'destructive',
      });
    }
  };

  const handleDelete = async (row: TenantUserRow) => {
    if (!window.confirm(`确认删除「${row.displayName}」？删掉后这个账号再也登不进来。`)) return;
    try {
      const res = await fetch(`/api/console/users?id=${encodeURIComponent(row.id)}`, {
        method: 'DELETE',
      });
      const body = await res.json();
      if (!res.ok || !body.success) throw new Error(body.error || '删除失败');
      toast({ title: '已删除' });
      await load();
    } catch (error) {
      toast({
        title: '删除失败',
        description: error instanceof Error ? error.message : '未知错误',
        variant: 'destructive',
      });
    }
  };

  return (
    <ConsoleLayout tenant={tenant} user={{ ...user }} title="员工账号">
      <div className="space-y-3">
        <div>
          <h1 className="text-xl font-bold tracking-tight">员工账号</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            这些账号用来登录本控制台维护映射表，共 {users.length} 个。
            登录名在系统内全局唯一。
          </p>
        </div>

        <div className="flex items-center justify-end">
          <Button onClick={handleAdd} size="sm" className="h-8 px-3 text-sm">
            <Plus className="mr-1 h-3.5 w-3.5" />
            新增账号
          </Button>
        </div>
      </div>

      <UserTable
        users={users}
        isLoading={loading}
        currentUserId={user.id}
        onEdit={handleEdit}
        onToggleActive={handleToggleActive}
        onDelete={handleDelete}
      />

      <Modal isOpen={isFormOpen} onClose={closeForm} title={editing ? '编辑账号' : '新增账号'}>
        <form onSubmit={handleSubmit}>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="space-y-1">
              <label className="text-xs font-medium text-gray-700" htmlFor="username">
                登录名
              </label>
              <Input
                id="username"
                value={form.username}
                onChange={event => setForm(prev => ({ ...prev, username: event.target.value }))}
                className="h-8 text-sm"
                required
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-medium text-gray-700" htmlFor="displayName">
                显示名
              </label>
              <Input
                id="displayName"
                value={form.displayName}
                onChange={event => setForm(prev => ({ ...prev, displayName: event.target.value }))}
                className="h-8 text-sm"
                required
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-medium text-gray-700" htmlFor="password">
                密码{editing && <span className="ml-1 text-muted-foreground">（留空表示不改）</span>}
              </label>
              <Input
                id="password"
                type="password"
                value={form.password}
                onChange={event => setForm(prev => ({ ...prev, password: event.target.value }))}
                autoComplete="new-password"
                className="h-8 text-sm"
                required={!editing}
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-medium text-gray-700" htmlFor="role">
                角色
              </label>
              <select
                id="role"
                className="h-8 w-full rounded-md border bg-white px-2 text-sm"
                value={form.role}
                onChange={event =>
                  setForm(prev => ({ ...prev, role: event.target.value as 'owner' | 'staff' }))
                }
              >
                <option value="staff">普通成员（只能维护映射表）</option>
                <option value="owner">管理员（还能管账号）</option>
              </select>
            </div>

            <p className="text-xs text-muted-foreground sm:col-span-2">
              密码至少 8 位。角色为「管理员」的账号登录后能看到「员工账号」这一项。
            </p>
          </div>

          <div className="my-2.5 border-t"></div>

          <div className="flex justify-end space-x-2">
            <Button
              variant="outline"
              type="button"
              onClick={closeForm}
              disabled={saving}
              className="h-8 px-3 text-sm"
            >
              取消
            </Button>
            <Button type="submit" disabled={saving} className="h-8 px-3 text-sm">
              {saving ? '保存中…' : '保存'}
            </Button>
          </div>
        </form>
      </Modal>
    </ConsoleLayout>
  );
}
