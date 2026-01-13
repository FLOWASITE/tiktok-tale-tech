/**
 * Edit Source Dialog - Edit existing regulation source
 */

import React, { useState, useEffect } from 'react';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { RegulationSource } from '@/hooks/useRegulationSources';

// Jurisdiction options
const JURISDICTIONS = [
  { value: 'VN', label: '🇻🇳 Việt Nam' },
  { value: 'EU', label: '🇪🇺 EU' },
  { value: 'US', label: '🇺🇸 United States' },
  { value: 'SG', label: '🇸🇬 Singapore' },
  { value: 'JP', label: '🇯🇵 Japan' },
];

// Category options
const CATEGORIES = [
  { value: 'tax', label: 'Thuế / Tax' },
  { value: 'advertising', label: 'Quảng cáo / Advertising' },
  { value: 'land', label: 'Đất đai / Land' },
  { value: 'finance', label: 'Tài chính / Finance' },
  { value: 'healthcare', label: 'Y tế / Healthcare' },
  { value: 'environment', label: 'Môi trường / Environment' },
  { value: 'labor', label: 'Lao động / Labor' },
  { value: 'data_privacy', label: 'Bảo mật dữ liệu / Data Privacy' },
  { value: 'consumer', label: 'Bảo vệ người tiêu dùng / Consumer Protection' },
  { value: 'general', label: 'Chung / General' },
];

// Frequency options
const FREQUENCIES = [
  { value: 'daily', label: 'Hàng ngày' },
  { value: 'weekly', label: 'Hàng tuần' },
  { value: 'monthly', label: 'Hàng tháng' },
];

interface EditSourceDialogProps {
  source: RegulationSource | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (data: Partial<RegulationSource> & { id: string }) => void;
  isLoading?: boolean;
}

export function EditSourceDialog({
  source,
  open,
  onOpenChange,
  onSave,
  isLoading = false,
}: EditSourceDialogProps) {
  const [formData, setFormData] = useState({
    source_name: '',
    source_url: '',
    jurisdiction: 'VN',
    category: 'general',
    search_query: '',
    crawl_frequency: 'weekly' as 'daily' | 'weekly' | 'monthly',
  });

  // Sync form data when source changes
  useEffect(() => {
    if (source) {
      setFormData({
        source_name: source.source_name,
        source_url: source.source_url,
        jurisdiction: source.jurisdiction,
        category: source.category,
        search_query: source.search_query || '',
        crawl_frequency: source.crawl_frequency,
      });
    }
  }, [source]);

  const handleSave = () => {
    if (!source) return;
    onSave({
      id: source.id,
      ...formData,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Chỉnh Sửa Nguồn Quy Định</DialogTitle>
          <DialogDescription>
            Cập nhật thông tin nguồn crawl quy định pháp lý.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="edit_source_name">Tên Nguồn</Label>
            <Input
              id="edit_source_name"
              placeholder="Ví dụ: Văn bản Chính phủ - Thuế"
              value={formData.source_name}
              onChange={(e) => setFormData({ ...formData, source_name: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="edit_source_url">URL Nguồn</Label>
            <Input
              id="edit_source_url"
              placeholder="https://vanban.chinhphu.vn"
              value={formData.source_url}
              onChange={(e) => setFormData({ ...formData, source_url: e.target.value })}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Khu vực pháp lý</Label>
              <Select
                value={formData.jurisdiction}
                onValueChange={(value) => setFormData({ ...formData, jurisdiction: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {JURISDICTIONS.map((j) => (
                    <SelectItem key={j.value} value={j.value}>
                      {j.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Danh mục</Label>
              <Select
                value={formData.category}
                onValueChange={(value) => setFormData({ ...formData, category: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map((c) => (
                    <SelectItem key={c.value} value={c.value}>
                      {c.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="edit_search_query">Query Tìm Kiếm</Label>
            <Input
              id="edit_search_query"
              placeholder="Ví dụ: Luật Quản lý thuế site:vanban.chinhphu.vn"
              value={formData.search_query}
              onChange={(e) => setFormData({ ...formData, search_query: e.target.value })}
            />
            <p className="text-xs text-muted-foreground">
              Sử dụng site: để giới hạn tìm kiếm trong domain cụ thể
            </p>
          </div>
          <div className="space-y-2">
            <Label>Tần suất Crawl</Label>
            <Select
              value={formData.crawl_frequency}
              onValueChange={(value: 'daily' | 'weekly' | 'monthly') =>
                setFormData({ ...formData, crawl_frequency: value })
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {FREQUENCIES.map((f) => (
                  <SelectItem key={f.value} value={f.value}>
                    {f.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Hủy
          </Button>
          <Button
            onClick={handleSave}
            disabled={isLoading || !formData.source_name || !formData.source_url}
          >
            {isLoading && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
            Lưu Thay Đổi
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default EditSourceDialog;
