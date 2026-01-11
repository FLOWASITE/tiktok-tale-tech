// ============================================
// Prompt Editor Dialog Component
// ============================================

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  FileText, 
  Code, 
  Variable, 
  Tags,
  Save,
  X,
  Plus,
  Info
} from "lucide-react";
import type { Prompt } from "./PromptManager";

interface PromptEditorProps {
  prompt: Prompt | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (data: Partial<Prompt>) => void;
  functionNames: string[];
}

const PROMPT_TYPES = [
  { value: "system", label: "System Prompt" },
  { value: "user", label: "User Template" },
  { value: "template", label: "Generation Template" },
  { value: "component", label: "Component/Partial" },
];

export function PromptEditor({ 
  prompt, 
  open, 
  onOpenChange, 
  onSave,
  functionNames 
}: PromptEditorProps) {
  const [formData, setFormData] = useState({
    function_name: "",
    prompt_key: "",
    name: "",
    description: "",
    content: "",
    prompt_type: "system",
    variables: {} as Record<string, any>,
    tags: [] as string[],
  });
  const [newTag, setNewTag] = useState("");
  const [newVarKey, setNewVarKey] = useState("");
  const [newVarDesc, setNewVarDesc] = useState("");
  const [activeTab, setActiveTab] = useState("basic");

  useEffect(() => {
    if (prompt) {
      setFormData({
        function_name: prompt.function_name,
        prompt_key: prompt.prompt_key,
        name: prompt.name,
        description: prompt.description || "",
        content: prompt.content,
        prompt_type: prompt.prompt_type,
        variables: prompt.variables || {},
        tags: prompt.tags || [],
      });
    } else {
      setFormData({
        function_name: "",
        prompt_key: "",
        name: "",
        description: "",
        content: "",
        prompt_type: "system",
        variables: {},
        tags: [],
      });
    }
    setActiveTab("basic");
  }, [prompt, open]);

  const handleSubmit = () => {
    if (!formData.function_name || !formData.prompt_key || !formData.name || !formData.content) {
      return;
    }
    onSave(formData);
  };

  const addTag = () => {
    if (newTag && !formData.tags.includes(newTag)) {
      setFormData(prev => ({
        ...prev,
        tags: [...prev.tags, newTag],
      }));
      setNewTag("");
    }
  };

  const removeTag = (tag: string) => {
    setFormData(prev => ({
      ...prev,
      tags: prev.tags.filter(t => t !== tag),
    }));
  };

  const addVariable = () => {
    if (newVarKey && !formData.variables[newVarKey]) {
      setFormData(prev => ({
        ...prev,
        variables: {
          ...prev.variables,
          [newVarKey]: { description: newVarDesc, required: true },
        },
      }));
      setNewVarKey("");
      setNewVarDesc("");
    }
  };

  const removeVariable = (key: string) => {
    const newVars = { ...formData.variables };
    delete newVars[key];
    setFormData(prev => ({ ...prev, variables: newVars }));
  };

  // Extract variables from content
  const extractedVars = formData.content.match(/\{\{(\w+)\}\}/g)?.map(v => v.slice(2, -2)) || [];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-blue-500" />
            {prompt ? "Chỉnh sửa Prompt" : "Tạo Prompt mới"}
          </DialogTitle>
          <DialogDescription>
            {prompt ? `Đang chỉnh sửa: ${prompt.name}` : "Tạo prompt mới cho AI functions"}
          </DialogDescription>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1">
          <TabsList className="grid grid-cols-3 w-full">
            <TabsTrigger value="basic" className="flex items-center gap-1.5">
              <FileText className="h-4 w-4" />
              Cơ bản
            </TabsTrigger>
            <TabsTrigger value="content" className="flex items-center gap-1.5">
              <Code className="h-4 w-4" />
              Nội dung
            </TabsTrigger>
            <TabsTrigger value="variables" className="flex items-center gap-1.5">
              <Variable className="h-4 w-4" />
              Biến ({Object.keys(formData.variables).length})
            </TabsTrigger>
          </TabsList>

          <ScrollArea className="h-[500px] mt-4">
            <TabsContent value="basic" className="space-y-4 px-1">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Function Name *</Label>
                  <Input
                    value={formData.function_name}
                    onChange={(e) => setFormData(prev => ({ 
                      ...prev, 
                      function_name: e.target.value 
                    }))}
                    placeholder="generate-multichannel"
                    list="function-names"
                  />
                  <datalist id="function-names">
                    {functionNames.map(fn => (
                      <option key={fn} value={fn} />
                    ))}
                  </datalist>
                </div>

                <div className="space-y-2">
                  <Label>Prompt Key *</Label>
                  <Input
                    value={formData.prompt_key}
                    onChange={(e) => setFormData(prev => ({ 
                      ...prev, 
                      prompt_key: e.target.value 
                    }))}
                    placeholder="system_prompt"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Tên Prompt *</Label>
                <Input
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ 
                    ...prev, 
                    name: e.target.value 
                  }))}
                  placeholder="Multi-channel System Prompt v1"
                />
              </div>

              <div className="space-y-2">
                <Label>Mô tả</Label>
                <Textarea
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ 
                    ...prev, 
                    description: e.target.value 
                  }))}
                  placeholder="Mô tả ngắn về prompt này..."
                  rows={2}
                />
              </div>

              <div className="space-y-2">
                <Label>Loại Prompt</Label>
                <select
                  value={formData.prompt_type}
                  onChange={(e) => setFormData(prev => ({ 
                    ...prev, 
                    prompt_type: e.target.value 
                  }))}
                  className="w-full px-3 py-2 border rounded-md bg-background"
                >
                  {PROMPT_TYPES.map(type => (
                    <option key={type.value} value={type.value}>
                      {type.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <Tags className="h-4 w-4" />
                  Tags
                </Label>
                <div className="flex gap-2">
                  <Input
                    value={newTag}
                    onChange={(e) => setNewTag(e.target.value)}
                    placeholder="Thêm tag..."
                    onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addTag())}
                  />
                  <Button type="button" variant="outline" onClick={addTag}>
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {formData.tags.map(tag => (
                    <Badge 
                      key={tag} 
                      variant="secondary"
                      className="cursor-pointer hover:bg-destructive/20"
                      onClick={() => removeTag(tag)}
                    >
                      {tag}
                      <X className="h-3 w-3 ml-1" />
                    </Badge>
                  ))}
                </div>
              </div>
            </TabsContent>

            <TabsContent value="content" className="space-y-4 px-1">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>Nội dung Prompt *</Label>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Info className="h-3.5 w-3.5" />
                    Sử dụng {"{{variableName}}"} cho biến động
                  </div>
                </div>
                <Textarea
                  value={formData.content}
                  onChange={(e) => setFormData(prev => ({ 
                    ...prev, 
                    content: e.target.value 
                  }))}
                  placeholder={`Bạn là một AI assistant chuyên nghiệp...

Sử dụng biến: {{brandName}}, {{topic}}, {{channel}}`}
                  rows={20}
                  className="font-mono text-sm"
                />
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <span>{formData.content.length} ký tự</span>
                  {extractedVars.length > 0 && (
                    <>
                      <span>•</span>
                      <span>Biến phát hiện: {extractedVars.join(", ")}</span>
                    </>
                  )}
                </div>
              </div>
            </TabsContent>

            <TabsContent value="variables" className="space-y-4 px-1">
              <div className="p-3 bg-muted/30 rounded-lg text-sm">
                <div className="flex items-start gap-2">
                  <Info className="h-4 w-4 mt-0.5 text-blue-500" />
                  <div>
                    <p className="font-medium">Khai báo biến</p>
                    <p className="text-muted-foreground">
                      Định nghĩa các biến sẽ được thay thế khi sử dụng prompt. 
                      Biến được sử dụng với cú pháp {"{{variableName}}"}.
                    </p>
                  </div>
                </div>
              </div>

              {extractedVars.length > 0 && (
                <div className="p-3 border rounded-lg space-y-2">
                  <p className="text-sm font-medium">Biến phát hiện từ nội dung:</p>
                  <div className="flex flex-wrap gap-2">
                    {extractedVars.map(v => (
                      <Badge 
                        key={v} 
                        variant={formData.variables[v] ? "default" : "outline"}
                        className="font-mono"
                      >
                        {v}
                        {!formData.variables[v] && (
                          <span className="ml-1 text-yellow-500">⚠</span>
                        )}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              <div className="space-y-2">
                <Label>Thêm biến mới</Label>
                <div className="flex gap-2">
                  <Input
                    value={newVarKey}
                    onChange={(e) => setNewVarKey(e.target.value)}
                    placeholder="Tên biến (vd: brandName)"
                    className="flex-1"
                  />
                  <Input
                    value={newVarDesc}
                    onChange={(e) => setNewVarDesc(e.target.value)}
                    placeholder="Mô tả"
                    className="flex-1"
                  />
                  <Button type="button" variant="outline" onClick={addVariable}>
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              <div className="space-y-2">
                {Object.entries(formData.variables).map(([key, value]) => (
                  <div 
                    key={key} 
                    className="flex items-center justify-between p-3 border rounded-lg"
                  >
                    <div>
                      <code className="text-sm font-mono bg-muted px-1.5 py-0.5 rounded">
                        {`{{${key}}}`}
                      </code>
                      <p className="text-sm text-muted-foreground mt-1">
                        {(value as any)?.description || "Không có mô tả"}
                      </p>
                    </div>
                    <Button 
                      variant="ghost" 
                      size="sm"
                      onClick={() => removeVariable(key)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </TabsContent>
          </ScrollArea>
        </Tabs>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Hủy
          </Button>
          <Button 
            onClick={handleSubmit}
            disabled={!formData.function_name || !formData.prompt_key || !formData.name || !formData.content}
          >
            <Save className="h-4 w-4 mr-1" />
            {prompt ? "Cập nhật" : "Tạo mới"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
