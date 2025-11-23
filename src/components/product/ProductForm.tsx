'use client';

import { useState, useEffect } from 'react';
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Combobox } from "@/components/ui/combobox";
import { Product, ProductFormData } from '@/lib/types';

interface ProductFormProps {
  product?: Product;
  onSubmit: (data: ProductFormData) => void;
  onCancel: () => void;
}

export default function ProductForm({ product, onSubmit, onCancel }: ProductFormProps) {
  const [formData, setFormData] = useState<ProductFormData>({
    pinduoduoProductId: product?.pinduoduoProductId || '',
    pinduoduoProductImage: product?.pinduoduoProductImage || '',
    productName: product?.productName || '',
    pinduoduoProductName: product?.pinduoduoProductName || '',
    productSpec: product?.productSpec || '',
    merchantId: product?.merchantId || '',
  });

  const [merchants, setMerchants] = useState<Array<{ id: string; name: string }>>([]);

  useEffect(() => {
    // 获取商家列表用于下拉选择
    fetchMerchants();
  }, []);

  const fetchMerchants = async () => {
    try {
      const response = await fetch(`/api/merchants?pageSize=1000&t=${Date.now()}`);
      const data = await response.json();
      setMerchants(data.items || []);
    } catch (error) {
      console.error('获取商家列表失败:', error);
    }
  };

  const validateForm = () => {
    if (!formData.productName || !formData.merchantId) {
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

  return (
    <form onSubmit={handleSubmit} className="space-y-2.5">
      <div className="space-y-1">
        <label htmlFor="merchantId" className="text-xs font-medium">所属商家</label>
        <Combobox
          options={merchants.map(m => ({ value: m.id, label: m.name }))}
          value={formData.merchantId}
          onValueChange={(value) => setFormData({ ...formData, merchantId: value })}
          placeholder="请选择商家"
          searchPlaceholder="搜索商家..."
          emptyText="未找到商家"
          className="h-8 text-sm w-full"
        />
      </div>

      <div className="space-y-1">
        <label htmlFor="productName" className="text-xs font-medium">云仓商品名称</label>
        <Input
          id="productName"
          value={formData.productName}
          onChange={(e) => setFormData({ ...formData, productName: e.target.value })}
          required
          className="h-8 text-sm"
        />
      </div>

      <div className="space-y-1">
        <label htmlFor="pinduoduoProductId" className="text-xs font-medium">多多买菜商品ID</label>
        <Input
          id="pinduoduoProductId"
          value={formData.pinduoduoProductId}
          onChange={(e) => setFormData({ ...formData, pinduoduoProductId: e.target.value })}
          placeholder="选填"
          className="h-8 text-sm"
        />
      </div>

      <div className="space-y-1">
        <label htmlFor="pinduoduoProductName" className="text-xs font-medium">多多买菜商品名称</label>
        <Input
          id="pinduoduoProductName"
          value={formData.pinduoduoProductName}
          onChange={(e) => setFormData({ ...formData, pinduoduoProductName: e.target.value })}
          placeholder="选填"
          className="h-8 text-sm"
        />
      </div>

      <div className="space-y-1">
        <label htmlFor="productSpec" className="text-xs font-medium">商品规格</label>
        <Input
          id="productSpec"
          value={formData.productSpec}
          onChange={(e) => setFormData({ ...formData, productSpec: e.target.value })}
          placeholder="选填，例如：500g/袋"
          className="h-8 text-sm"
        />
      </div>

      <div className="space-y-1">
        <label htmlFor="pinduoduoProductImage" className="text-xs font-medium">商品图片URL</label>
        <Input
          id="pinduoduoProductImage"
          value={formData.pinduoduoProductImage}
          onChange={(e) => setFormData({ ...formData, pinduoduoProductImage: e.target.value })}
          placeholder="选填"
          className="h-8 text-sm"
        />
      </div>

      {formData.pinduoduoProductImage && (
        <div className="space-y-1">
          <label className="text-xs font-medium">图片预览</label>
          <div className="border rounded p-2 bg-muted/30">
            <img
              src={formData.pinduoduoProductImage}
              alt="商品图片预览"
              className="w-32 h-32 object-cover rounded"
              onError={(e) => {
                (e.target as HTMLImageElement).src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTI4IiBoZWlnaHQ9IjEyOCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTI4IiBoZWlnaHQ9IjEyOCIgZmlsbD0iI2YzZjRmNiIvPjx0ZXh0IHg9IjUwJSIgeT0iNTAlIiBmb250LXNpemU9IjE2IiBmaWxsPSIjOWNhM2FmIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBkeT0iLjNlbSI+5Zu+54mH5Yqg6L296ZSZ6K+v77yM6K+356iO5p6l6ZO+5o6l5piv5ZCm5pyJ5pWIPC90ZXh0Pjwvc3ZnPg==';
              }}
            />
          </div>
        </div>
      )}

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
