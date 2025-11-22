'use client';

import { useState } from 'react';
import {
  Input
} from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { X } from "lucide-react";
import { Merchant, MerchantFormData } from '@/lib/types';

interface MerchantFormProps {
  merchant?: Merchant;
  onSubmit: (data: MerchantFormData) => void;
  onCancel: () => void;
}

export default function MerchantForm({ merchant, onSubmit, onCancel }: MerchantFormProps) {
  const [formData, setFormData] = useState<MerchantFormData>({
    name: merchant?.name || '',
    merchantId: merchant?.merchantId || '',
    pinduoduoName: merchant?.pinduoduoName || '',
    warehouse1: merchant?.warehouse1 || '',
    groupName: merchant?.groupName || '',
    sendMessage: merchant?.sendMessage || false,
    mentionList: merchant?.mentionList || [],
    subAccount: merchant?.subAccount || '',
    pinduoduoPassword: merchant?.pinduoduoPassword || '',
    cookie: '', // Cookie不在前端显示和编辑
  });

  const [mentionInput, setMentionInput] = useState('');

  const validateForm = () => {
    if (!formData.name || !formData.warehouse1 || !formData.groupName) {
      return false;
    }
    return true;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) {
      return;
    }
    onSubmit(formData);
  };

  // 添加艾特对象
  const handleAddMention = () => {
    const trimmedInput = mentionInput.trim();
    if (trimmedInput && !formData.mentionList.includes(trimmedInput)) {
      setFormData({
        ...formData,
        mentionList: [...formData.mentionList, trimmedInput]
      });
      setMentionInput('');
    }
  };

  // 删除艾特对象
  const handleRemoveMention = (index: number) => {
    setFormData({
      ...formData,
      mentionList: formData.mentionList.filter((_, i) => i !== index)
    });
  };

  // 处理回车键添加
  const handleMentionKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAddMention();
    }
  };

  // 为每个名称生成一致的颜色
  const getColorForName = (name: string) => {
    const colors = [
      'bg-blue-100 text-blue-700',
      'bg-green-100 text-green-700',
      'bg-purple-100 text-purple-700',
      'bg-pink-100 text-pink-700',
      'bg-yellow-100 text-yellow-700',
      'bg-indigo-100 text-indigo-700',
      'bg-red-100 text-red-700',
      'bg-orange-100 text-orange-700',
      'bg-teal-100 text-teal-700',
      'bg-cyan-100 text-cyan-700'
    ];

    let hash = 0;
    for (let i = 0; i < name.length; i++) {
      hash += name.charCodeAt(i);
    }

    return colors[hash % colors.length];
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-2.5">
      <div className="space-y-1">
        <label htmlFor="name" className="text-xs font-medium">商家名称</label>
        <Input
          id="name"
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          required
          className="h-8 text-sm"
        />
      </div>

      <div className="space-y-1">
        <label htmlFor="merchantId" className="text-xs font-medium">多多买菜店铺ID</label>
        <Input
          id="merchantId"
          value={formData.merchantId}
          onChange={(e) => setFormData({ ...formData, merchantId: e.target.value })}
          placeholder="选填"
          className="h-8 text-sm"
        />
      </div>

      <div className="space-y-1">
        <label htmlFor="pinduoduoName" className="text-xs font-medium">多多买菜店铺名称</label>
        <Input
          id="pinduoduoName"
          value={formData.pinduoduoName}
          onChange={(e) => setFormData({ ...formData, pinduoduoName: e.target.value })}
          placeholder="选填"
          className="h-8 text-sm"
        />
      </div>

      <div className="space-y-1">
        <label htmlFor="subAccount" className="text-xs font-medium">子账号</label>
        <Input
          id="subAccount"
          value={formData.subAccount}
          onChange={(e) => setFormData({ ...formData, subAccount: e.target.value })}
          placeholder="选填"
          className="h-8 text-sm"
        />
      </div>

      <div className="space-y-1">
        <label htmlFor="pinduoduoPassword" className="text-xs font-medium">多多密码</label>
        <Input
          id="pinduoduoPassword"
          type="password"
          value={formData.pinduoduoPassword}
          onChange={(e) => setFormData({ ...formData, pinduoduoPassword: e.target.value })}
          placeholder="选填"
          className="h-8 text-sm"
        />
      </div>

      <div className="space-y-1">
        <label htmlFor="warehouse1" className="text-xs font-medium">1仓名称</label>
        <Input
          id="warehouse1"
          value={formData.warehouse1}
          onChange={(e) => setFormData({ ...formData, warehouse1: e.target.value })}
          required
          className="h-8 text-sm"
        />
      </div>

      <div className="space-y-1">
        <label htmlFor="groupName" className="text-xs font-medium">群名称</label>
        <Input
          id="groupName"
          value={formData.groupName}
          onChange={(e) => setFormData({ ...formData, groupName: e.target.value })}
          required
          className="h-8 text-sm"
        />
      </div>

      <div className="flex items-center space-x-2">
        <Switch
          checked={formData.sendMessage}
          onCheckedChange={(checked) => setFormData({ ...formData, sendMessage: checked })}
          id="sendMessage"
        />
        <label htmlFor="sendMessage" className="text-xs font-medium">发送消息</label>
      </div>

      <div className="space-y-1">
        <label className="text-xs font-medium">艾特对象</label>
        <div className="flex gap-2">
          <Input
            value={mentionInput}
            onChange={(e) => setMentionInput(e.target.value)}
            onKeyDown={handleMentionKeyDown}
            placeholder="输入名称后按回车添加"
            className="flex-1 h-8 text-sm"
          />
          <Button
            type="button"
            variant="outline"
            onClick={handleAddMention}
            disabled={!mentionInput.trim()}
            className="h-8 text-sm px-3"
          >
            添加
          </Button>
        </div>
        {formData.mentionList.length > 0 && (
          <div className="flex flex-wrap gap-2 p-2 bg-muted/30 rounded-md">
            {formData.mentionList.map((mention, index) => (
              <span
                key={index}
                className={`inline-flex items-center gap-1 px-2 py-1 rounded text-sm font-medium ${getColorForName(mention)}`}
              >
                @{mention}
                <button
                  type="button"
                  onClick={() => handleRemoveMention(index)}
                  className="hover:bg-black/10 rounded-full p-0.5"
                >
                  <X className="h-3 w-3" />
                </button>
              </span>
            ))}
          </div>
        )}
      </div>

      <div className="border-t my-2.5"></div>

      <div className="flex justify-end space-x-2">
        <Button
          variant="outline"
          type="button"
          onClick={onCancel}
          className="h-8 text-sm px-3"
        >
          取消
        </Button>
        <Button
          type="submit"
          className="h-8 text-sm px-3"
        >
          保存
        </Button>
      </div>
    </form>
  );
} 