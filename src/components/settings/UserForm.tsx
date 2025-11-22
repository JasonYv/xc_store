import { useState, useEffect } from 'react';
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { UserFormData, User } from '@/lib/types';
import { EyeIcon, EyeOffIcon } from "lucide-react";

interface UserFormProps {
  user?: Omit<User, 'password'>;
  onSubmit: (data: UserFormData) => void;
  onCancel: () => void;
}

export default function UserForm({ user, onSubmit, onCancel }: UserFormProps) {
  const [formData, setFormData] = useState<UserFormData>({
    username: '',
    password: '',
    displayName: '',
    isActive: true,
  });

  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState<{[key: string]: string}>({});

  // 如果是编辑模式，加载用户数据
  useEffect(() => {
    if (user) {
      setFormData({
        username: user.username,
        password: '', // 编辑时密码为空，表示不修改
        displayName: user.displayName,
        isActive: user.isActive,
      });
    }
  }, [user]);

  const validateForm = () => {
    const newErrors: {[key: string]: string} = {};
    
    if (!formData.username.trim()) {
      newErrors.username = '用户名不能为空';
    }
    
    if (!user && !formData.password) {
      newErrors.password = '密码不能为空';
    }
    
    if (!formData.displayName.trim()) {
      newErrors.displayName = '显示名称不能为空';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) {
      return;
    }
    onSubmit(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <label htmlFor="username" className="text-sm font-medium">用户名</label>
        <Input
          id="username"
          value={formData.username}
          onChange={(e) => setFormData({ ...formData, username: e.target.value })}
          disabled={!!user} // 编辑模式下用户名不可修改
          className={errors.username ? "border-red-500" : ""}
        />
        {errors.username && <p className="text-xs text-red-500">{errors.username}</p>}
      </div>

      <div className="space-y-2">
        <label htmlFor="password" className="text-sm font-medium">
          密码 {user && <span className="text-xs text-muted-foreground">(留空表示不修改)</span>}
        </label>
        <div className="relative">
          <Input
            id="password"
            type={showPassword ? "text" : "password"}
            value={formData.password}
            onChange={(e) => setFormData({ ...formData, password: e.target.value })}
            placeholder={user ? "输入新密码以修改" : "请输入密码"}
            className={errors.password ? "border-red-500" : ""}
          />
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
            onClick={() => setShowPassword(!showPassword)}
          >
            {showPassword ? (
              <EyeOffIcon className="h-4 w-4 text-muted-foreground" />
            ) : (
              <EyeIcon className="h-4 w-4 text-muted-foreground" />
            )}
            <span className="sr-only">{showPassword ? '隐藏' : '显示'}密码</span>
          </Button>
        </div>
        {errors.password && <p className="text-xs text-red-500">{errors.password}</p>}
      </div>

      <div className="space-y-2">
        <label htmlFor="displayName" className="text-sm font-medium">显示名称</label>
        <Input
          id="displayName"
          value={formData.displayName}
          onChange={(e) => setFormData({ ...formData, displayName: e.target.value })}
          className={errors.displayName ? "border-red-500" : ""}
        />
        {errors.displayName && <p className="text-xs text-red-500">{errors.displayName}</p>}
      </div>

      <div className="flex items-center space-x-2">
        <Switch
          checked={formData.isActive}
          onCheckedChange={(checked) => setFormData({ ...formData, isActive: checked })}
          id="isActive"
        />
        <label htmlFor="isActive" className="text-sm font-medium">账号启用</label>
      </div>

      <div className="border-t my-4"></div>

      <div className="flex justify-end space-x-2">
        <Button
          variant="outline"
          type="button"
          onClick={onCancel}
        >
          取消
        </Button>
        <Button
          type="submit"
        >
          {user ? '更新' : '添加'}
        </Button>
      </div>
    </form>
  );
} 