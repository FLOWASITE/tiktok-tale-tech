import { useState } from 'react';
import { format } from 'date-fns';
import { vi } from 'date-fns/locale';
import {
  GitBranch,
  History,
  RefreshCw,
  Search,
  Filter,
  Globe,
  Building2,
  ShieldCheck,
  Lock,
  AlertTriangle,
  Eye,
  ChevronRight,
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useIndustryTemplates } from '@/hooks/useIndustryTemplates';
import { IndustryVersionManager, IndustryVersionBadge } from '@/components/admin/IndustryVersionManager';

export default function AdminIndustryVersions() {
  const [selectedCountry, setSelectedCountry] = useState('VN');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null);
  const [selectedTemplateName, setSelectedTemplateName] = useState<string>('');

  const {
    templates,
    countries,
    isLoading,
    isLoadingCountries,
    refetch,
  } = useIndustryTemplates({
    countryCode: selectedCountry,
    languageCode: 'vi',
  });

  // Filter templates
  const filteredTemplates = templates.filter((template) => {
    const matchesSearch =
      searchQuery === '' ||
      template.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      template.code.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesSearch;
  });

  // Get selected country info
  const selectedCountryInfo = countries.find(c => c.code === selectedCountry);

  const handleViewVersions = (templateId: string, templateName: string) => {
    setSelectedTemplateId(templateId);
    setSelectedTemplateName(templateName);
  };

  return (
    <div className="container py-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-primary/10">
            <GitBranch className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h1 className="text-3xl font-bold">Industry Memory Versions</h1>
            <p className="text-muted-foreground">
              Quản lý lịch sử phiên bản Industry Memory
            </p>
          </div>
        </div>
        <Button variant="outline" size="sm" onClick={() => refetch()}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Làm mới
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold">{templates.length}</p>
                <p className="text-sm text-muted-foreground">Industry Templates</p>
              </div>
              <Building2 className="h-8 w-8 text-muted-foreground/50" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold">{countries.length}</p>
                <p className="text-sm text-muted-foreground">Quốc gia</p>
              </div>
              <Globe className="h-8 w-8 text-muted-foreground/50" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold">
                  {templates.filter(t => {
                    const bv = t.brand_voice as Record<string, unknown>;
                    return Array.isArray(bv?.compliance_rules) && bv.compliance_rules.length > 0;
                  }).length}
                </p>
                <p className="text-sm text-muted-foreground">Có Compliance Rules</p>
              </div>
              <ShieldCheck className="h-8 w-8 text-emerald-500/50" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold">
                  {templates.filter(t => {
                    const bv = t.brand_voice as Record<string, unknown>;
                    return Array.isArray(bv?.forbidden_terms) && bv.forbidden_terms.length > 0;
                  }).length}
                </p>
                <p className="text-sm text-muted-foreground">Có Forbidden Terms</p>
              </div>
              <Lock className="h-8 w-8 text-destructive/50" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-wrap gap-4">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Tìm kiếm template..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={selectedCountry} onValueChange={setSelectedCountry}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Chọn quốc gia" />
              </SelectTrigger>
              <SelectContent>
                {isLoadingCountries ? (
                  <SelectItem value="loading" disabled>Loading...</SelectItem>
                ) : (
                  countries.map((country) => (
                    <SelectItem key={country.code} value={country.code}>
                      <span className="flex items-center gap-2">
                        <span>{country.flag_emoji}</span>
                        <span>{country.name}</span>
                      </span>
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Templates Table with Version Info */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <History className="h-5 w-5" />
            Industry Templates & Versions
            {selectedCountryInfo && (
              <Badge variant="secondary" className="ml-2">
                {selectedCountryInfo.flag_emoji} {selectedCountryInfo.name}
              </Badge>
            )}
          </CardTitle>
          <CardDescription>
            Click vào template để xem lịch sử phiên bản
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-2">
              {[1, 2, 3, 4, 5].map((i) => (
                <Skeleton key={i} className="h-16" />
              ))}
            </div>
          ) : filteredTemplates.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Globe className="h-12 w-12 text-muted-foreground/50 mb-4" />
              <p className="text-lg font-medium">Không tìm thấy template</p>
              <p className="text-sm text-muted-foreground">
                Thử thay đổi bộ lọc hoặc từ khóa tìm kiếm
              </p>
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[250px]">Template</TableHead>
                    <TableHead className="w-[100px]">Code</TableHead>
                    <TableHead className="w-[100px]">Target</TableHead>
                    <TableHead className="w-[120px]">Version</TableHead>
                    <TableHead className="w-[100px]">Compliance</TableHead>
                    <TableHead className="w-[100px]">Forbidden</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredTemplates.map((template) => (
                    <TableRow 
                      key={template.id}
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => handleViewVersions(template.id, template.name)}
                    >
                      <TableCell>
                        <div>
                          <p className="font-medium">{template.name}</p>
                          {template.short_name && template.short_name !== template.name && (
                            <p className="text-xs text-muted-foreground">
                              {template.short_name}
                            </p>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <code className="text-xs bg-muted px-1.5 py-0.5 rounded">
                          {template.code}
                        </code>
                      </TableCell>
                      <TableCell>
                        <Badge 
                          variant="outline"
                          className={
                            template.target_audience === 'B2B' 
                              ? 'bg-blue-500/10 text-blue-500 border-blue-500/30' 
                              : template.target_audience === 'B2C'
                              ? 'bg-green-500/10 text-green-500 border-green-500/30'
                              : 'bg-purple-500/10 text-purple-500 border-purple-500/30'
                          }
                        >
                          {template.target_audience}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <IndustryVersionBadge templateId={template.id} />
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
                          <span className="text-sm">
                            {(() => {
                              const bv = template.brand_voice as Record<string, unknown>;
                              return Array.isArray(bv?.compliance_rules) ? bv.compliance_rules.length : 0;
                            })()}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Lock className="w-3.5 h-3.5 text-destructive" />
                          <span className="text-sm">
                            {(() => {
                              const bv = template.brand_voice as Record<string, unknown>;
                              return Array.isArray(bv?.forbidden_terms) ? bv.forbidden_terms.length : 0;
                            })()}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleViewVersions(template.id, template.name);
                          }}
                        >
                          <Eye className="w-4 h-4 mr-1" />
                          Xem versions
                          <ChevronRight className="w-4 h-4 ml-1" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}

          <div className="mt-4 text-sm text-muted-foreground">
            Hiển thị {filteredTemplates.length} / {templates.length} templates
          </div>
        </CardContent>
      </Card>

      {/* Version History Dialog */}
      <Dialog 
        open={!!selectedTemplateId} 
        onOpenChange={(open) => !open && setSelectedTemplateId(null)}
      >
        <DialogContent className="max-w-2xl max-h-[90vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <GitBranch className="w-5 h-5" />
              Version History
            </DialogTitle>
            <DialogDescription>
              {selectedTemplateName} – {selectedCountryInfo?.name}
            </DialogDescription>
          </DialogHeader>
          
          {selectedTemplateId && (
            <IndustryVersionManager
              templateId={selectedTemplateId}
              templateName={selectedTemplateName}
              countryName={selectedCountryInfo?.name}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
