'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/router';
import { Button } from "@/components/ui/button";
import { UserPlus, Users, Search, RefreshCw, Eye, EyeOff } from "lucide-react";
import DashboardLayout from '@/components/layout/DashboardLayout';
import Modal from '@/components/common/Modal';
import { Employee, EmployeeFormData } from '@/lib/types';
import { useToast } from "@/hooks/use-toast";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function EmployeesPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | undefined>(undefined);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // 搜索条件
  const [searchTerm, setSearchTerm] = useState('');

  // 自动生成的员工编号和登录码
  const [generatedEmployeeNumber, setGeneratedEmployeeNumber] = useState('');
  const [generatedLoginCode, setGeneratedLoginCode] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [nameForGenerate, setNameForGenerate] = useState('');

  // 密码显示控制
  const [showPassword, setShowPassword] = useState(false);

  // 检查用户是否已登录
  useEffect(() => {
    const auth = localStorage.getItem('isAuthenticated');
    if (!auth) {
      router.push('/');
    } else {
      setIsAuthenticated(true);
      fetchEmployees();
    }
  }, [router]);

  // 获取员工列表
  const fetchEmployees = async () => {
    try {
      setIsLoading(true);
      const params = new URLSearchParams();
      params.append('t', Date.now().toString());
      if (searchTerm) params.append('name', searchTerm);

      const response = await fetch(`/api/employees?${params.toString()}`);
      const data = await response.json();
      if (data.success) {
        setEmployees(data.data.items || []);
      }
    } catch (error) {
      console.error('获取员工列表失败:', error);
      toast({
        title: "出错了",
        description: "获取员工列表失败，请稍后再试",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // 根据姓名生成员工编号和登录码
  const generateEmployeeInfo = useCallback(async (name: string) => {
    if (!name || name.trim() === '') {
      setGeneratedEmployeeNumber('');
      setGeneratedLoginCode('');
      return;
    }

    try {
      setIsGenerating(true);
      const response = await fetch(`/api/employees/generate?t=${Date.now()}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim() })
      });
      const data = await response.json();

      if (data.success) {
        setGeneratedEmployeeNumber(data.data.employeeNumber);
        setGeneratedLoginCode(data.data.loginCode);
      } else {
        toast({
          title: "生成失败",
          description: data.error || '无法生成员工编号和登录码',
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('生成员工信息失败:', error);
      toast({
        title: "生成失败",
        description: "网络错误，请稍后重试",
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
    }
  }, [toast]);

  // 重新生成登录码
  const regenerateLoginCode = async () => {
    if (!nameForGenerate || nameForGenerate.trim() === '') {
      toast({
        title: "提示",
        description: "请先输入员工姓名",
        variant: "destructive",
      });
      return;
    }
    await generateEmployeeInfo(nameForGenerate);
  };

  // 打开新增模态框
  const handleAddClick = () => {
    setSelectedEmployee(undefined);
    setGeneratedEmployeeNumber('');
    setGeneratedLoginCode('');
    setNameForGenerate('');
    setShowPassword(false);
    setIsModalOpen(true);
  };

  // 打开编辑模态框
  const handleEditClick = (employee: Employee) => {
    setSelectedEmployee(employee);
    setShowPassword(false);
    setIsModalOpen(true);
  };

  // 处理删除
  const handleDeleteClick = async (id: string) => {
    if (!confirm('确定要删除此员工吗？')) {
      return;
    }

    try {
      const response = await fetch(`/api/employees?id=${id}&t=${Date.now()}`, {
        method: 'DELETE'
      });
      const data = await response.json();

      if (data.success) {
        toast({
          title: "删除成功",
          description: "员工已成功删除",
        });
        fetchEmployees();
      } else {
        throw new Error(data.error || '删除失败');
      }
    } catch (error: any) {
      toast({
        title: "删除失败",
        description: error.message || '删除员工失败，请稍后再试',
        variant: "destructive",
      });
    }
  };

  // 处理姓名输入变化（用于自动生成编号）
  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const name = e.target.value;
    setNameForGenerate(name);
    // 当姓名输入完成后自动生成（使用防抖）
    if (name.trim().length >= 2 && !selectedEmployee) {
      // 使用简单的防抖
      const timer = setTimeout(() => {
        generateEmployeeInfo(name);
      }, 500);
      return () => clearTimeout(timer);
    }
  };

  // 提交表单
  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSubmitting(true);

    const formData = new FormData(e.currentTarget);

    // 对于新增，使用自动生成的编号和登录码；编辑时使用原有编号（disabled字段不在FormData中）
    const employeeNumber = selectedEmployee
      ? selectedEmployee.employeeNumber
      : generatedEmployeeNumber;
    const loginCode = selectedEmployee
      ? (formData.get('loginCode') as string).toUpperCase()
      : generatedLoginCode;

    // 验证登录码格式
    if (!/^[A-Z0-9]{8}$/.test(loginCode)) {
      toast({
        title: "格式错误",
        description: "登录码必须是8位大写字母和数字组合",
        variant: "destructive",
      });
      setIsSubmitting(false);
      return;
    }

    // 验证员工编号
    if (!employeeNumber) {
      toast({
        title: "缺少编号",
        description: "请先输入员工姓名以自动生成员工编号",
        variant: "destructive",
      });
      setIsSubmitting(false);
      return;
    }

    // 获取手机号和密码
    const phone = formData.get('phone') as string;
    const password = formData.get('password') as string;

    // 验证手机号格式（如果提供）
    if (phone && !/^1[3-9]\d{9}$/.test(phone)) {
      toast({
        title: "格式错误",
        description: "手机号格式不正确",
        variant: "destructive",
      });
      setIsSubmitting(false);
      return;
    }

    // 新增时密码必填
    if (!selectedEmployee && !password) {
      toast({
        title: "缺少密码",
        description: "请输入登录密码",
        variant: "destructive",
      });
      setIsSubmitting(false);
      return;
    }

    const employeeData: EmployeeFormData = {
      employeeNumber: employeeNumber,
      name: formData.get('name') as string,
      realName: formData.get('realName') as string,
      phone: phone || '',
      password: password || undefined,
      loginCode: loginCode,
    };

    try {
      const url = selectedEmployee
        ? `/api/employees?id=${selectedEmployee.id}&t=${Date.now()}`
        : `/api/employees?t=${Date.now()}`;

      const response = await fetch(url, {
        method: selectedEmployee ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(employeeData)
      });

      const data = await response.json();

      if (data.success) {
        toast({
          title: selectedEmployee ? "更新成功" : "创建成功",
          description: `员工已成功${selectedEmployee ? '更新' : '创建'}`,
        });
        setIsModalOpen(false);
        fetchEmployees();
      } else {
        throw new Error(data.error || '操作失败');
      }
    } catch (error: any) {
      toast({
        title: "操作失败",
        description: error.message || '请稍后再试',
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isAuthenticated) {
    return null;
  }

  const formatLastLoginTime = (time?: string) => {
    if (!time) return '从未登录';
    return new Date(time).toLocaleString('zh-CN');
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* 页面标题 */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
              <Users className="w-8 h-8" />
              员工管理
            </h1>
            <p className="text-muted-foreground mt-2">
              管理员工账号和登录权限
            </p>
          </div>
          <Button onClick={handleAddClick}>
            <UserPlus className="mr-2 h-4 w-4" /> 添加员工
          </Button>
        </div>

        {/* 搜索条件 */}
        <div className="bg-white p-4 rounded-lg border space-y-4">
          <h3 className="font-semibold flex items-center gap-2">
            <Search className="w-4 h-4" />
            搜索员工
          </h3>
          <div className="flex gap-4">
            <div className="flex-1">
              <Input
                placeholder="搜索员工姓名或编号..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && fetchEmployees()}
              />
            </div>
            <Button onClick={fetchEmployees}>
              搜索
            </Button>
          </div>
        </div>

        {/* 数据表格 */}
        <div className="bg-white rounded-lg border">
          {isLoading ? (
            <div className="p-8 text-center text-gray-500">加载中...</div>
          ) : employees.length === 0 ? (
            <div className="p-8 text-center text-gray-500">暂无员工数据</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>员工编号</TableHead>
                  <TableHead>员工名字</TableHead>
                  <TableHead>真实姓名</TableHead>
                  <TableHead>手机号</TableHead>
                  <TableHead>登录码</TableHead>
                  <TableHead>最后登录时间</TableHead>
                  <TableHead>操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {employees.map((employee) => (
                  <TableRow key={employee.id}>
                    <TableCell className="font-medium">{employee.employeeNumber}</TableCell>
                    <TableCell>{employee.name}</TableCell>
                    <TableCell>{employee.realName}</TableCell>
                    <TableCell>{employee.phone || '-'}</TableCell>
                    <TableCell>
                      <code className="bg-slate-100 px-2 py-1 rounded text-sm font-mono">
                        {employee.loginCode}
                      </code>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {formatLastLoginTime(employee.lastLoginTime)}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button variant="outline" size="sm" onClick={() => handleEditClick(employee)}>
                          编辑
                        </Button>
                        <Button variant="destructive" size="sm" onClick={() => handleDeleteClick(employee.id)}>
                          删除
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </div>

        {/* 员工总数统计 */}
        {employees.length > 0 && (
          <div className="bg-white p-4 rounded-lg border">
            <p className="text-sm text-muted-foreground">
              共有 <span className="font-bold text-lg text-primary">{employees.length}</span> 名员工
            </p>
          </div>
        )}

        {/* 模态框 */}
        <Modal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          title={selectedEmployee ? "编辑员工" : "添加员工"}
        >
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* 新增时：先输入姓名，再自动生成编号 */}
            {!selectedEmployee && (
              <div className="bg-blue-50 p-3 rounded-lg text-sm text-blue-700 mb-4">
                请先输入员工名字，系统将自动生成员工编号和登录码
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="name">员工名字 *</Label>
                <Input
                  id="name"
                  name="name"
                  defaultValue={selectedEmployee?.name}
                  placeholder="如: 张三"
                  required
                  onChange={!selectedEmployee ? handleNameChange : undefined}
                />
                {!selectedEmployee && (
                  <p className="text-xs text-muted-foreground mt-1">输入姓名后自动生成编号</p>
                )}
              </div>
              <div>
                <Label htmlFor="employeeNumber">员工编号 *</Label>
                {selectedEmployee ? (
                  <>
                    <Input
                      id="employeeNumber"
                      name="employeeNumber"
                      defaultValue={selectedEmployee.employeeNumber}
                      disabled
                    />
                    <p className="text-xs text-muted-foreground mt-1">员工编号不可修改</p>
                  </>
                ) : (
                  <>
                    <Input
                      id="employeeNumber"
                      name="employeeNumber"
                      value={generatedEmployeeNumber}
                      placeholder="自动生成"
                      readOnly
                      className="bg-slate-50"
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      {isGenerating ? '正在生成...' : '根据姓名自动生成'}
                    </p>
                  </>
                )}
              </div>
            </div>
            <div>
              <Label htmlFor="realName">真实姓名 *</Label>
              <Input
                id="realName"
                name="realName"
                defaultValue={selectedEmployee?.realName}
                placeholder="如: 张三丰"
                required
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="phone">手机号码</Label>
                <Input
                  id="phone"
                  name="phone"
                  type="tel"
                  defaultValue={selectedEmployee?.phone || ''}
                  placeholder="如: 13800138000"
                  maxLength={11}
                />
                <p className="text-xs text-muted-foreground mt-1">用于手机号+密码登录</p>
              </div>
              <div>
                <Label htmlFor="password">{selectedEmployee ? '密码（不修改请留空）' : '登录密码 *'}</Label>
                <div className="relative">
                  <Input
                    id="password"
                    name="password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder={selectedEmployee ? '留空则不修改密码' : '请输入登录密码'}
                    required={!selectedEmployee}
                    className="pr-10"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {selectedEmployee ? '留空表示不修改原密码' : '新增员工必须设置密码'}
                </p>
              </div>
            </div>
            <div>
              <Label htmlFor="loginCode">登录码 *</Label>
              {selectedEmployee ? (
                <>
                  <Input
                    id="loginCode"
                    name="loginCode"
                    defaultValue={selectedEmployee.loginCode}
                    placeholder="8位大写字母和数字，如: ABC12345"
                    maxLength={8}
                    required
                    className="font-mono"
                    style={{ textTransform: 'uppercase' }}
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    必须是8位字符,仅包含大写字母A-Z和数字0-9
                  </p>
                </>
              ) : (
                <>
                  <div className="flex gap-2">
                    <Input
                      id="loginCode"
                      name="loginCode"
                      value={generatedLoginCode}
                      placeholder="自动生成"
                      readOnly
                      className="bg-slate-50 font-mono flex-1"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      onClick={regenerateLoginCode}
                      disabled={isGenerating || !nameForGenerate}
                      title="重新生成登录码"
                    >
                      <RefreshCw className={`h-4 w-4 ${isGenerating ? 'animate-spin' : ''}`} />
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {isGenerating ? '正在生成...' : '随机生成的8位登录码，点击刷新按钮可重新生成'}
                  </p>
                </>
              )}
            </div>
            {selectedEmployee?.lastLoginTime && (
              <div className="bg-slate-50 p-3 rounded-lg">
                <p className="text-sm text-muted-foreground">
                  最后登录时间: {formatLastLoginTime(selectedEmployee.lastLoginTime)}
                </p>
              </div>
            )}
            <div className="flex justify-end gap-2 pt-4">
              <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>
                取消
              </Button>
              <Button
                type="submit"
                disabled={isSubmitting || (!selectedEmployee && (!generatedEmployeeNumber || !generatedLoginCode))}
              >
                {isSubmitting ? '提交中...' : selectedEmployee ? '更新' : '创建'}
              </Button>
            </div>
          </form>
        </Modal>
      </div>
    </DashboardLayout>
  );
}
