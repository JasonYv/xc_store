'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { Button } from "@/components/ui/button";
import { UserPlus } from "lucide-react";
import DashboardLayout from '@/components/layout/DashboardLayout';
import Modal from '@/components/common/Modal';
import UserTable from '@/components/settings/UserTable';
import UserForm from '@/components/settings/UserForm';
import { User, UserFormData } from '@/lib/types';
import { useToast } from "@/components/ui/use-toast";

export default function UsersPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [users, setUsers] = useState<Omit<User, 'password'>[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<Omit<User, 'password'> | undefined>(undefined);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // 检查用户是否已登录
  useEffect(() => {
    const auth = localStorage.getItem('isAuthenticated');
    if (!auth) {
      router.push('/');
    } else {
      setIsAuthenticated(true);
      fetchUsers();
    }
  }, [router]);

  // 获取所有用户
  const fetchUsers = async () => {
    try {
      setIsLoading(true);
      const response = await fetch('/api/users');
      const data = await response.json();
      if (data.success) {
        setUsers(data.data);
      }
    } catch (error) {
      console.error('获取用户列表失败:', error);
      toast({
        title: "出错了",
        description: "获取用户列表失败，请稍后再试",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // 打开新增用户模态框
  const handleAddClick = () => {
    setSelectedUser(undefined);
    setIsModalOpen(true);
  };

  // 打开编辑用户模态框
  const handleEditClick = (user: Omit<User, 'password'>) => {
    setSelectedUser(user);
    setIsModalOpen(true);
  };

  // 处理删除用户
  const handleDeleteClick = async (id: string) => {
    if (!confirm('确定要删除此用户吗？')) {
      return;
    }

    try {
      const response = await fetch(`/api/users?id=${id}`, {
        method: 'DELETE'
      });
      const data = await response.json();
      
      if (data.success) {
        toast({
          title: "删除成功",
          description: "用户已成功删除",
        });
        fetchUsers();
      } else {
        throw new Error(data.error || '删除失败');
      }
    } catch (error: any) {
      const errorMessage = error.message || '删除用户失败，请稍后再试';
      toast({
        title: "删除失败",
        description: errorMessage,
        variant: "destructive",
      });
    }
  };

  // 提交表单（新增/编辑用户）
  const handleSubmit = async (formData: UserFormData) => {
    try {
      setIsSubmitting(true);
      let response;
      
      if (selectedUser) {
        // 编辑用户
        response = await fetch(`/api/users?id=${selectedUser.id}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(formData)
        });
      } else {
        // 新增用户
        response = await fetch('/api/users', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(formData)
        });
      }
      
      const data = await response.json();
      
      if (data.success) {
        toast({
          title: selectedUser ? "更新成功" : "添加成功",
          description: selectedUser ? "用户信息已更新" : "新用户已添加",
        });
        
        setIsModalOpen(false);
        fetchUsers();
      } else {
        throw new Error(data.error || '操作失败');
      }
    } catch (error: any) {
      const errorMessage = error.message || '操作失败，请稍后再试';
      toast({
        title: "保存失败",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // 如果未登录，不渲染内容
  if (!isAuthenticated) {
    return null;
  }

  return (
    <DashboardLayout>
      <div className="space-y-4">
        <div className="flex items-center justify-between mb-2">
          <h1 className="text-xl font-bold tracking-tight">管理员账号管理</h1>
          <Button onClick={handleAddClick} size="sm">
            <UserPlus className="mr-1 h-4 w-4" />
            添加管理员
          </Button>
        </div>
        
        <UserTable 
          users={users}
          isLoading={isLoading}
          onEdit={handleEditClick}
          onDelete={handleDeleteClick}
        />
        
        <Modal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          title={selectedUser ? "编辑管理员" : "添加管理员"}
        >
          <UserForm
            user={selectedUser}
            onSubmit={handleSubmit}
            onCancel={() => setIsModalOpen(false)}
          />
        </Modal>
      </div>
    </DashboardLayout>
  );
} 