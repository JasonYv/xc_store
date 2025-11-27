import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { EyeIcon, EyeOffIcon } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function SettingsForm() {
  const [darkMode, setDarkMode] = useState(false);
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [showApiKey, setShowApiKey] = useState(false);
  const [driverPhone, setDriverPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  // 加载设置
  useEffect(() => {
    const loadSettings = async () => {
      try {
        const response = await fetch(`/api/settings?t=${Date.now()}`);
        const data = await response.json();
        if (response.ok && data.success) {
          setDriverPhone(data.data.driverPhone || '');
        }
      } catch (error) {
        console.error('加载设置失败:', error);
      }
    };
    loadSettings();
  }, []);

  // 保存设置
  const handleSave = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/settings?t=${Date.now()}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          driverPhone,
        }),
      });

      const data = await response.json();
      if (response.ok && data.success) {
        toast({
          title: "成功",
          description: "设置已保存",
        });
      } else {
        throw new Error(data.message || '保存设置失败');
      }
    } catch (error) {
      toast({
        variant: "destructive",
        title: "错误",
        description: error instanceof Error ? error.message : '保存设置失败',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium">系统设置</h3>
        <p className="text-sm text-muted-foreground">
          配置系统基本参数和访问权限
        </p>
      </div>

      <Card>
        <CardContent className="p-6 space-y-6 pt-6">
          <div className="grid gap-5">
            <div className="space-y-2">
              <label htmlFor="apiKey" className="text-sm font-medium">API Key</label>
              <div className="relative">
                <Input
                  id="apiKey"
                  type={showApiKey ? "text" : "password"}
                  defaultValue="n4MBvJIdx9htUbkU0d8fpsJ7pM8bV4"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                  onClick={() => setShowApiKey(!showApiKey)}
                >
                  {showApiKey ? (
                    <EyeOffIcon className="h-4 w-4 text-muted-foreground" />
                  ) : (
                    <EyeIcon className="h-4 w-4 text-muted-foreground" />
                  )}
                  <span className="sr-only">{showApiKey ? '隐藏' : '显示'} API Key</span>
                </Button>
              </div>
            </div>
  
            <div className="space-y-2">
              <label htmlFor="username" className="text-sm font-medium">管理员用户名</label>
              <Input
                id="username"
                defaultValue="admin"
              />
            </div>
  
            <div className="space-y-2">
              <label htmlFor="password" className="text-sm font-medium">管理员密码</label>
              <Input
                id="password"
                type="password"
                placeholder="输入新密码以修改"
              />
              <p className="text-xs text-muted-foreground">留空表示不修改密码</p>
            </div>

            <div className="space-y-2">
              <label htmlFor="driverPhone" className="text-sm font-medium">送货司机手机号</label>
              <Input
                id="driverPhone"
                type="tel"
                placeholder="请输入手机号"
                value={driverPhone}
                onChange={(e) => setDriverPhone(e.target.value)}
                maxLength={11}
              />
              <p className="text-xs text-muted-foreground">用于送货通知和联系</p>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <label htmlFor="enableLogs" className="text-sm font-medium">系统日志</label>
                  <p className="text-xs text-muted-foreground">记录系统操作日志便于追踪和调试</p>
                </div>
                <Switch id="enableLogs" defaultChecked />
              </div>
  
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <label htmlFor="multiLogin" className="text-sm font-medium">多端登录</label>
                  <p className="text-xs text-muted-foreground">允许同一账号在多个设备同时登录</p>
                </div>
                <Switch id="multiLogin" defaultChecked />
              </div>
            </div>
          </div>

          <div className="flex justify-end">
            <Button size="sm" onClick={handleSave} disabled={loading}>
              {loading ? '保存中...' : '保存设置'}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
} 