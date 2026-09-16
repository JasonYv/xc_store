'use client';

import { Pencil, ShieldCheck, Trash2 } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import type { TenantUser } from '@/lib/types';

// 租户自己的账号列表。
//
// 「停用/删除自己」在界面上就禁掉——后端也拦（防止把自己锁在门外），
// 但点了才被告知体验很差。

export type TenantUserRow = Omit<TenantUser, 'password'>;

interface UserTableProps {
  users: TenantUserRow[];
  isLoading: boolean;
  currentUserId: string;
  onEdit: (user: TenantUserRow) => void;
  onToggleActive: (user: TenantUserRow) => void;
  onDelete: (user: TenantUserRow) => void;
}

export default function UserTable({
  users,
  isLoading,
  currentUserId,
  onEdit,
  onToggleActive,
  onDelete,
}: UserTableProps) {
  return (
    <div className="rounded-md border bg-white">
      <Table>
        <TableHeader>
          <TableRow className="bg-muted/50">
            <TableHead className="h-9 px-2 py-1 font-medium">登录名</TableHead>
            <TableHead className="h-9 px-2 py-1 font-medium">显示名</TableHead>
            <TableHead className="h-9 px-2 py-1 font-medium">角色</TableHead>
            <TableHead className="h-9 px-2 py-1 font-medium">状态</TableHead>
            <TableHead className="h-9 px-2 py-1 font-medium">最后登录</TableHead>
            <TableHead className="h-9 w-[150px] px-2 py-1 text-right font-medium">操作</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {isLoading ? (
            <TableRow>
              <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                加载中…
              </TableCell>
            </TableRow>
          ) : users.length === 0 ? (
            <TableRow>
              <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                还没有账号
              </TableCell>
            </TableRow>
          ) : (
            users.map(user => {
              const isSelf = user.id === currentUserId;
              return (
                <TableRow key={user.id}>
                  <TableCell className="px-2 py-1.5 font-mono text-xs">{user.username}</TableCell>
                  <TableCell className="px-2 py-1.5">
                    {user.displayName}
                    {isSelf && (
                      <span className="ml-1.5 text-xs text-muted-foreground">(你)</span>
                    )}
                  </TableCell>
                  <TableCell className="px-2 py-1.5">
                    {user.role === 'owner' ? (
                      <Badge variant="secondary" className="gap-1">
                        <ShieldCheck className="h-3 w-3" />
                        管理员
                      </Badge>
                    ) : (
                      <Badge variant="outline">普通成员</Badge>
                    )}
                  </TableCell>
                  <TableCell className="px-2 py-1.5">
                    {user.isActive ? (
                      <span className="text-sm text-green-600">启用</span>
                    ) : (
                      <span className="text-sm text-muted-foreground">已停用</span>
                    )}
                  </TableCell>
                  <TableCell className="px-2 py-1.5 text-xs text-muted-foreground">
                    {user.lastLoginTime
                      ? new Date(user.lastLoginTime).toLocaleString('zh-CN')
                      : '从未登录'}
                  </TableCell>
                  <TableCell className="px-2 py-1.5 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onEdit(user)}
                        className="h-7 px-2 text-xs"
                      >
                        <Pencil className="h-3 w-3" />
                        <span className="sr-only">编辑</span>
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onToggleActive(user)}
                        disabled={isSelf}
                        className="h-7 px-2 text-xs"
                      >
                        {user.isActive ? '停用' : '启用'}
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onDelete(user)}
                        disabled={isSelf}
                        className="h-7 px-2 text-xs text-destructive hover:text-destructive"
                      >
                        <Trash2 className="h-3 w-3" />
                        <span className="sr-only">删除</span>
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              );
            })
          )}
        </TableBody>
      </Table>
    </div>
  );
}
