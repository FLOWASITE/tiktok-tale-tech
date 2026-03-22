import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow
} from '@/components/ui/table';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from '@/components/ui/select';
import { 
  Search, Server, AlertTriangle, Shield, ShieldOff, 
  ArrowLeft, ExternalLink, Layers, Activity, BarChart3
} from 'lucide-react';
import { Link } from 'react-router-dom';
import {
  EDGE_FUNCTIONS, CATEGORY_META, getCategorySummary, getRiskSummary, getExternalApiSummary,
  type FunctionCategory, type RiskLevel
} from '@/data/edgeFunctionRegistry';
import { EdgeFunctionMonitoring } from '@/components/admin/EdgeFunctionMonitoring';

const RISK_CONFIG: Record<RiskLevel, { label: string; className: string }> = {
  low:      { label: 'Thấp',     className: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/30' },
  medium:   { label: 'Trung bình', className: 'bg-amber-500/10 text-amber-600 border-amber-500/30' },
  high:     { label: 'Cao',      className: 'bg-orange-500/10 text-orange-600 border-orange-500/30' },
  critical: { label: 'Nghiêm trọng', className: 'bg-destructive/10 text-destructive border-destructive/30' },
};

export default function AdminEdgeFunctions() {
  const [activeTab, setActiveTab] = useState('monitoring');
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [riskFilter, setRiskFilter] = useState<string>('all');

  const categorySummary = useMemo(() => getCategorySummary(), []);
  const riskSummary = useMemo(() => getRiskSummary(), []);
  const apiSummary = useMemo(() => getExternalApiSummary(), []);

  const filtered = useMemo(() => {
    return EDGE_FUNCTIONS.filter(f => {
      if (search && !f.name.toLowerCase().includes(search.toLowerCase()) && 
          !f.description.toLowerCase().includes(search.toLowerCase())) return false;
      if (categoryFilter !== 'all' && f.category !== categoryFilter) return false;
      if (riskFilter !== 'all' && f.riskLevel !== riskFilter) return false;
      return true;
    });
  }, [search, categoryFilter, riskFilter]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link to="/admin/dashboard">
          <Button variant="ghost" size="icon" className="h-8 w-8">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Server className="h-6 w-6 text-primary" />
            Edge Functions Report
          </h1>
          <p className="text-sm text-muted-foreground">
            {EDGE_FUNCTIONS.length} functions · Phân tích tĩnh codebase
          </p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="w-full max-w-md">
          <TabsTrigger value="monitoring" className="flex items-center gap-1.5">
            <BarChart3 className="h-4 w-4" />
            Monitoring
          </TabsTrigger>
          <TabsTrigger value="registry" className="flex items-center gap-1.5">
            <Server className="h-4 w-4" />
            Registry
          </TabsTrigger>
        </TabsList>

        <TabsContent value="monitoring" className="mt-4">
          <EdgeFunctionMonitoring />
        </TabsContent>

        <TabsContent value="registry" className="mt-4 space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-muted-foreground text-sm">
              <Server className="h-4 w-4" /> Tổng Functions
            </div>
            <p className="text-3xl font-bold mt-1">{EDGE_FUNCTIONS.length}</p>
            <p className="text-xs text-muted-foreground mt-1">{categorySummary.length} categories</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-muted-foreground text-sm">
              <ExternalLink className="h-4 w-4" /> External APIs
            </div>
            <p className="text-3xl font-bold mt-1">{apiSummary.length}</p>
            <p className="text-xs text-muted-foreground mt-1">providers khác nhau</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-amber-600 text-sm">
              <AlertTriangle className="h-4 w-4" /> High Risk
            </div>
            <p className="text-3xl font-bold mt-1 text-amber-600">{riskSummary.high + riskSummary.critical}</p>
            <p className="text-xs text-muted-foreground mt-1">
              {riskSummary.critical} critical · {riskSummary.high} high
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-muted-foreground text-sm">
              <ShieldOff className="h-4 w-4" /> No JWT
            </div>
            <p className="text-3xl font-bold mt-1">
              {EDGE_FUNCTIONS.filter(f => !f.verifyJwt).length}
            </p>
            <p className="text-xs text-muted-foreground mt-1">verify_jwt = false</p>
          </CardContent>
        </Card>
      </div>

      {/* Category Distribution */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Layers className="h-4 w-4" /> Phân bổ theo Category
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {categorySummary.map(cat => (
              <button
                key={cat.category}
                onClick={() => setCategoryFilter(
                  categoryFilter === cat.category ? 'all' : cat.category
                )}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-all cursor-pointer
                  ${categoryFilter === cat.category 
                    ? 'ring-2 ring-ring ring-offset-1' 
                    : 'hover:shadow-sm'
                  }`}
                style={{ 
                  borderColor: cat.color + '40',
                  backgroundColor: cat.color + '15',
                  color: cat.color
                }}
              >
                <span className="font-bold">{cat.count}</span>
                {cat.label}
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* External API Usage */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Activity className="h-4 w-4" /> External API Dependencies
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {apiSummary.map(({ api, count }) => (
              <Badge key={api} variant="outline" className="text-xs gap-1">
                {api} <span className="font-bold text-primary">×{count}</span>
              </Badge>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Tìm kiếm function..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Category" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tất cả category</SelectItem>
            {categorySummary.map(cat => (
              <SelectItem key={cat.category} value={cat.category}>
                {cat.label} ({cat.count})
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={riskFilter} onValueChange={setRiskFilter}>
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="Risk level" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tất cả risk</SelectItem>
            <SelectItem value="critical">Nghiêm trọng ({riskSummary.critical})</SelectItem>
            <SelectItem value="high">Cao ({riskSummary.high})</SelectItem>
            <SelectItem value="medium">Trung bình ({riskSummary.medium})</SelectItem>
            <SelectItem value="low">Thấp ({riskSummary.low})</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Results count */}
      <p className="text-sm text-muted-foreground">
        Hiển thị {filtered.length}/{EDGE_FUNCTIONS.length} functions
      </p>

      {/* Functions Table */}
      <Card>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="min-w-[200px]">Function</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>External APIs</TableHead>
                <TableHead>Risk</TableHead>
                <TableHead className="text-center">JWT</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map(fn => {
                const catMeta = CATEGORY_META[fn.category];
                const riskCfg = RISK_CONFIG[fn.riskLevel];
                return (
                  <TableRow key={fn.name}>
                    <TableCell>
                      <div>
                        <code className="text-xs font-mono font-semibold">{fn.name}</code>
                        <p className="text-xs text-muted-foreground mt-0.5">{fn.description}</p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge 
                        variant="outline" 
                        className="text-[10px] whitespace-nowrap"
                        style={{ 
                          borderColor: catMeta.color + '50',
                          backgroundColor: catMeta.color + '10',
                          color: catMeta.color
                        }}
                      >
                        {catMeta.label}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {fn.externalApis.length === 0 ? (
                          <span className="text-xs text-muted-foreground">—</span>
                        ) : fn.externalApis.map(api => (
                          <Badge key={api} variant="secondary" className="text-[10px] py-0">
                            {api}
                          </Badge>
                        ))}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={`text-[10px] ${riskCfg.className}`}>
                        {riskCfg.label}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-center">
                      {fn.verifyJwt ? (
                        <Shield className="h-4 w-4 text-emerald-500 mx-auto" />
                      ) : (
                        <ShieldOff className="h-4 w-4 text-muted-foreground mx-auto" />
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
              {filtered.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                    Không tìm thấy function nào phù hợp
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
