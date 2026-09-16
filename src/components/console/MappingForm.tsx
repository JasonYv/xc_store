'use client';

import { useEffect, useState } from 'react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import type { ProductMapping } from '@/lib/types';

// 映射行的编辑表单。字段顺序按「填表的人怎么想」排：
// 先名字（人认得的），再商品码（机器匹配用的），最后是清单里的附加列。

export interface MappingFormValue {
  productId: string;
  pddName: string;
  dispatchName: string;
  spec: string;
  listCode: string;
  boxSpec: string;
  category: string;
}

export const EMPTY_MAPPING_FORM: MappingFormValue = {
  productId: '',
  pddName: '',
  dispatchName: '',
  spec: '',
  listCode: '',
  boxSpec: '',
  category: '',
};

const FIELDS: {
  key: keyof MappingFormValue;
  label: string;
  hint?: string;
  full?: boolean;
}[] = [
  { key: 'dispatchName', label: '派单表商品名称', hint: '派单表里显示的名字', full: true },
  { key: 'pddName', label: '多多商品名称', hint: '多多买菜上的商品名', full: true },
  { key: 'productId', label: '商品码 (productId)', hint: '匹配用的，必填且不可重复' },
  { key: 'spec', label: '规格 / 单位' },
  { key: 'listCode', label: '金蝶代码', hint: '条形码由它末 13 位推导' },
  { key: 'boxSpec', label: '箱规' },
  { key: 'category', label: '商品大类' },
];

interface MappingFormProps {
  mapping?: ProductMapping;
  onSubmit: (value: MappingFormValue) => void;
  onCancel: () => void;
  submitting: boolean;
}

export default function MappingForm({ mapping, onSubmit, onCancel, submitting }: MappingFormProps) {
  const [value, setValue] = useState<MappingFormValue>(EMPTY_MAPPING_FORM);

  useEffect(() => {
    if (mapping) {
      setValue({
        productId: mapping.productId,
        pddName: mapping.pddName,
        dispatchName: mapping.dispatchName,
        spec: mapping.spec,
        listCode: mapping.listCode,
        boxSpec: mapping.boxSpec,
        category: mapping.category,
      });
    } else {
      setValue(EMPTY_MAPPING_FORM);
    }
  }, [mapping]);

  const set = (key: keyof MappingFormValue, next: string) =>
    setValue(prev => ({ ...prev, [key]: next }));

  return (
    <form
      onSubmit={event => {
        event.preventDefault();
        onSubmit(value);
      }}
    >
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {FIELDS.map(field => (
          <div key={field.key} className={field.full ? 'sm:col-span-2' : ''}>
            <label className="mb-1 block text-xs font-medium text-gray-700" htmlFor={field.key}>
              {field.label}
            </label>
            <Input
              id={field.key}
              value={value[field.key]}
              onChange={event => set(field.key, event.target.value)}
              className="h-8 text-sm"
            />
            {field.hint && <p className="mt-1 text-xs text-muted-foreground">{field.hint}</p>}
          </div>
        ))}
      </div>

      <div className="my-2.5 border-t"></div>

      <div className="flex justify-end space-x-2">
        <Button
          variant="outline"
          type="button"
          onClick={onCancel}
          disabled={submitting}
          className="h-8 px-3 text-sm"
        >
          取消
        </Button>
        <Button type="submit" disabled={submitting} className="h-8 px-3 text-sm">
          {submitting ? '保存中…' : '保存'}
        </Button>
      </div>
    </form>
  );
}
