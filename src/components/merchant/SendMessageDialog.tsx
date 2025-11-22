'use client';

import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Merchant } from '@/lib/types';
import { useToast } from "@/hooks/use-toast";
import { Send, Loader2 } from 'lucide-react';

interface SendMessageDialogProps {
  open: boolean;
  onClose: () => void;
  merchant: Merchant | null;
}

export default function SendMessageDialog({ open, onClose, merchant }: SendMessageDialogProps) {
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  const { toast } = useToast();

  const handleSend = async () => {
    if (!merchant) return;
    if (!message.trim()) {
      toast({
        variant: "destructive",
        title: "错误",
        description: "请输入消息内容"
      });
      return;
    }

    setSending(true);
    try {
      const response = await fetch(`/api/merchants/send-message?t=${Date.now()}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          merchantId: merchant.id,
          message: message.trim()
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.message || '发送失败');
      }

      toast({
        title: "发送成功",
        description: data.atList && data.atList.length > 0
          ? `消息已发送到群组: ${merchant.groupName} (@ ${data.atList.join(', ')})`
          : `消息已发送到群组: ${merchant.groupName}`
      });

      setMessage('');
      onClose();
    } catch (error) {
      console.error('发送消息失败:', error);
      toast({
        variant: "destructive",
        title: "发送失败",
        description: error instanceof Error ? error.message : '发送消息时出错'
      });
    } finally {
      setSending(false);
    }
  };

  const handleClose = () => {
    if (!sending) {
      setMessage('');
      onClose();
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>发送消息</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <div className="text-sm text-muted-foreground">
              <p><span className="font-medium">商家:</span> {merchant?.name}</p>
              <p><span className="font-medium">群名称:</span> {merchant?.groupName}</p>
              {merchant?.mentionList && merchant.mentionList.length > 0 && (
                <p>
                  <span className="font-medium">艾特对象:</span>{' '}
                  <span className="text-primary">
                    @ {merchant.mentionList.join(', ')}
                  </span>
                </p>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <label htmlFor="message" className="text-sm font-medium">
              消息内容
            </label>
            <textarea
              id="message"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="请输入要发送的消息内容..."
              className="w-full min-h-[120px] px-3 py-2 text-sm border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-ring"
              disabled={sending}
            />
            <p className="text-xs text-muted-foreground">
              提示: 使用 \n 可以换行
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={handleClose}
            disabled={sending}
          >
            取消
          </Button>
          <Button
            onClick={handleSend}
            disabled={sending || !message.trim()}
          >
            {sending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                发送中...
              </>
            ) : (
              <>
                <Send className="mr-2 h-4 w-4" />
                发送消息
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
