// ============================================
// Prompt Manager - Main Component for Prompt Management
// ============================================

import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  Search, 
  Plus, 
  FileText, 
  Beaker, 
  History,
  Filter,
  RefreshCw,
  FolderOpen,
  AlertTriangle
} from "lucide-react";
import { PromptList } from "./PromptList";
import { PromptEditor } from "./PromptEditor";
import { ABTestManager } from "./ABTestManager";
import { PromptHistoryViewer } from "./PromptHistoryViewer";
import { useCategoryConfig } from "@/hooks/useCategoryConfig";
import { toast } from "sonner";

export interface Prompt {
  id: string;
  function_name: string;
  prompt_key: string;
  name: string;
  description: string | null;
  content: string;
  prompt_type: string;
  variables: Record<string, any> | null;
  version: number;
  is_active: boolean;
  is_default: boolean;
  tags: string[] | null;
  category_id: string | null;
  organization_id: string | null;
  created_at: string;
  updated_at: string;
}

export function PromptManager() {
  const [activeTab, setActiveTab] = useState("prompts");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedPrompt, setSelectedPrompt] = useState<Prompt | null>(null);
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [filterFunction, setFilterFunction] = useState<string | null>(null);
  const [filterCategory, setFilterCategory] = useState<string | null>(null);

  // Fetch categories
  const { categories } = useCategoryConfig();

  // Fetch all prompts
  const { data: prompts, isLoading, refetch } = useQuery({
    queryKey: ["ai-prompts"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("ai_prompts")
        .select("*")
        .order("function_name", { ascending: true })
        .order("version", { ascending: false });

      if (error) throw error;
      return data as Prompt[];
    },
  });

  // Get unique function names for filtering
  const functionNames = useMemo(() => {
    if (!prompts) return [];
    return [...new Set(prompts.map(p => p.function_name))].sort();
  }, [prompts]);

  // Filter prompts
  const filteredPrompts = useMemo(() => {
    if (!prompts) return [];
    
    return prompts.filter(prompt => {
      const matchesSearch = !searchQuery || 
        prompt.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        prompt.function_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        prompt.prompt_key.toLowerCase().includes(searchQuery.toLowerCase());
      
      const matchesFunction = !filterFunction || prompt.function_name === filterFunction;
      
      const matchesCategory = !filterCategory || 
        prompt.category_id === filterCategory ||
        (filterCategory === 'uncategorized' && !prompt.category_id);
      
      return matchesSearch && matchesFunction && matchesCategory;
    });
  }, [prompts, searchQuery, filterFunction, filterCategory]);

  // Count uncategorized prompts
  const uncategorizedCount = useMemo(() => {
    if (!prompts) return 0;
    return prompts.filter(p => !p.category_id).length;
  }, [prompts]);

  const handleCreatePrompt = () => {
    setSelectedPrompt(null);
    setIsEditorOpen(true);
  };

  const handleEditPrompt = (prompt: Prompt) => {
    setSelectedPrompt(prompt);
    setIsEditorOpen(true);
  };

  const handleSavePrompt = async (data: Partial<Prompt>) => {
    try {
      if (selectedPrompt) {
        // Update existing prompt
        const { error } = await supabase
          .from("ai_prompts")
          .update({
            ...data,
            updated_at: new Date().toISOString(),
          })
          .eq("id", selectedPrompt.id);

        if (error) throw error;
        toast.success("Prompt đã được cập nhật!");
      } else {
        // Create new prompt
        const insertData = {
          function_name: data.function_name!,
          prompt_key: data.prompt_key!,
          name: data.name!,
          content: data.content!,
          prompt_type: data.prompt_type || "system",
          description: data.description,
          variables: data.variables,
          tags: data.tags,
          category_id: data.category_id,
          version: 1,
          is_active: true,
          is_default: false,
        };
        const { error } = await supabase
          .from("ai_prompts")
          .insert(insertData);

        if (error) throw error;
        toast.success("Prompt mới đã được tạo!");
      }

      setIsEditorOpen(false);
      refetch();
    } catch (error: any) {
      toast.error("Lỗi: " + error.message);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-blue-500/10">
            <FileText className="h-5 w-5 text-blue-500" />
          </div>
          <div>
            <h2 className="text-xl font-semibold">Prompt Management</h2>
            <p className="text-sm text-muted-foreground">
              Quản lý và tối ưu hóa AI prompts
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => refetch()}>
            <RefreshCw className="h-4 w-4 mr-1" />
            Làm mới
          </Button>
          <Button size="sm" onClick={handleCreatePrompt}>
            <Plus className="h-4 w-4 mr-1" />
            Tạo Prompt
          </Button>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid grid-cols-3 w-full max-w-md">
          <TabsTrigger value="prompts" className="flex items-center gap-1.5">
            <FileText className="h-4 w-4" />
            Prompts
          </TabsTrigger>
          <TabsTrigger value="ab-tests" className="flex items-center gap-1.5">
            <Beaker className="h-4 w-4" />
            A/B Tests
          </TabsTrigger>
          <TabsTrigger value="history" className="flex items-center gap-1.5">
            <History className="h-4 w-4" />
            History
          </TabsTrigger>
        </TabsList>

        <TabsContent value="prompts" className="space-y-4 mt-4">
          {/* Search and Filter */}
          <div className="flex gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Tìm kiếm prompts..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            <select
              value={filterFunction || ""}
              onChange={(e) => setFilterFunction(e.target.value || null)}
              className="px-3 py-2 border rounded-md bg-background text-sm min-w-[180px]"
            >
              <option value="">Tất cả functions</option>
              {functionNames.map(fn => (
                <option key={fn} value={fn}>{fn}</option>
              ))}
            </select>
            <select
              value={filterCategory || ""}
              onChange={(e) => setFilterCategory(e.target.value || null)}
              className="px-3 py-2 border rounded-md bg-background text-sm min-w-[180px]"
            >
              <option value="">Tất cả categories</option>
              <option value="uncategorized">⚠ Chưa phân loại ({uncategorizedCount})</option>
              {categories.map(cat => (
                <option key={cat.id} value={cat.id}>{cat.label}</option>
              ))}
            </select>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-5 gap-4">
            <Card className="bg-muted/30">
              <CardContent className="p-4">
                <div className="text-2xl font-bold">{prompts?.length || 0}</div>
                <div className="text-xs text-muted-foreground">Tổng prompts</div>
              </CardContent>
            </Card>
            <Card className="bg-muted/30">
              <CardContent className="p-4">
                <div className="text-2xl font-bold text-green-500">
                  {prompts?.filter(p => p.is_active).length || 0}
                </div>
                <div className="text-xs text-muted-foreground">Đang active</div>
              </CardContent>
            </Card>
            <Card className="bg-muted/30">
              <CardContent className="p-4">
                <div className="text-2xl font-bold text-blue-500">
                  {functionNames.length}
                </div>
                <div className="text-xs text-muted-foreground">Functions</div>
              </CardContent>
            </Card>
            <Card className="bg-muted/30">
              <CardContent className="p-4">
                <div className="text-2xl font-bold text-purple-500">
                  {prompts?.filter(p => p.is_default).length || 0}
                </div>
                <div className="text-xs text-muted-foreground">Defaults</div>
              </CardContent>
            </Card>
            <Card className={`bg-muted/30 ${uncategorizedCount > 0 ? 'border-amber-500/50' : ''}`}>
              <CardContent className="p-4">
                <div className="text-2xl font-bold text-amber-500 flex items-center gap-1">
                  {uncategorizedCount}
                  {uncategorizedCount > 0 && <AlertTriangle className="h-4 w-4" />}
                </div>
                <div className="text-xs text-muted-foreground">Chưa phân loại</div>
              </CardContent>
            </Card>
          </div>

          {/* Prompt List */}
          <PromptList
            prompts={filteredPrompts}
            isLoading={isLoading}
            onEdit={handleEditPrompt}
            onRefresh={refetch}
            categories={categories}
          />
        </TabsContent>

        <TabsContent value="ab-tests" className="mt-4">
          <ABTestManager prompts={prompts || []} />
        </TabsContent>

        <TabsContent value="history" className="mt-4">
          <PromptHistoryViewer />
        </TabsContent>
      </Tabs>

      {/* Prompt Editor Dialog */}
      <PromptEditor
        prompt={selectedPrompt}
        open={isEditorOpen}
        onOpenChange={setIsEditorOpen}
        onSave={handleSavePrompt}
        functionNames={functionNames}
        categories={categories}
      />
    </div>
  );
}
