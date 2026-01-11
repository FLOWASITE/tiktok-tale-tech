// ============================================
// A/B Test Manager Component
// ============================================

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Beaker,
  Plus,
  Play,
  Pause,
  Trophy,
  TrendingUp,
  Clock,
  Target,
  AlertCircle,
} from "lucide-react";
import { toast } from "sonner";
import type { Prompt } from "./PromptManager";

interface ABTest {
  id: string;
  name: string;
  description: string | null;
  function_name: string;
  prompt_key: string;
  variant_a_id: string | null;
  variant_b_id: string | null;
  variant_a_weight: number;
  variant_a_impressions: number | null;
  variant_b_impressions: number | null;
  variant_a_avg_score: number | null;
  variant_b_avg_score: number | null;
  variant_a_avg_time_ms: number | null;
  variant_b_avg_time_ms: number | null;
  status: string;
  winner_variant: string | null;
  min_sample_size: number;
  confidence_level: number;
  start_date: string | null;
  end_date: string | null;
  created_at: string;
}

interface ABTestManagerProps {
  prompts: Prompt[];
}

export function ABTestManager({ prompts }: ABTestManagerProps) {
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [newTest, setNewTest] = useState({
    name: "",
    description: "",
    function_name: "",
    prompt_key: "",
    variant_a_id: "",
    variant_b_id: "",
    min_sample_size: 100,
  });

  const { data: abTests, isLoading, refetch } = useQuery({
    queryKey: ["ab-tests"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("ai_prompt_ab_tests")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as ABTest[];
    },
  });

  const handleCreateTest = async () => {
    try {
      const { error } = await supabase
        .from("ai_prompt_ab_tests")
        .insert({
          name: newTest.name,
          description: newTest.description || null,
          function_name: newTest.function_name,
          prompt_key: newTest.prompt_key,
          variant_a_id: newTest.variant_a_id || null,
          variant_b_id: newTest.variant_b_id || null,
          min_sample_size: newTest.min_sample_size,
          status: "draft",
        });

      if (error) throw error;
      
      toast.success("A/B Test đã được tạo!");
      setIsCreateOpen(false);
      setNewTest({
        name: "",
        description: "",
        function_name: "",
        prompt_key: "",
        variant_a_id: "",
        variant_b_id: "",
        min_sample_size: 100,
      });
      refetch();
    } catch (error: any) {
      toast.error("Lỗi: " + error.message);
    }
  };

  const handleStartTest = async (testId: string) => {
    try {
      const { error } = await supabase
        .from("ai_prompt_ab_tests")
        .update({ 
          status: "running",
          start_date: new Date().toISOString(),
        })
        .eq("id", testId);

      if (error) throw error;
      toast.success("A/B Test đã bắt đầu!");
      refetch();
    } catch (error: any) {
      toast.error("Lỗi: " + error.message);
    }
  };

  const handlePauseTest = async (testId: string) => {
    try {
      const { error } = await supabase
        .from("ai_prompt_ab_tests")
        .update({ status: "paused" })
        .eq("id", testId);

      if (error) throw error;
      toast.success("A/B Test đã tạm dừng!");
      refetch();
    } catch (error: any) {
      toast.error("Lỗi: " + error.message);
    }
  };

  const handleDeclareWinner = async (testId: string, winner: "A" | "B") => {
    try {
      const { error } = await supabase
        .from("ai_prompt_ab_tests")
        .update({ 
          status: "completed",
          winner_variant: winner,
          end_date: new Date().toISOString(),
        })
        .eq("id", testId);

      if (error) throw error;
      toast.success(`Variant ${winner} đã được chọn là winner!`);
      refetch();
    } catch (error: any) {
      toast.error("Lỗi: " + error.message);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "running": return "bg-green-500/10 text-green-600 border-green-500/30";
      case "paused": return "bg-yellow-500/10 text-yellow-600 border-yellow-500/30";
      case "completed": return "bg-blue-500/10 text-blue-600 border-blue-500/30";
      default: return "bg-muted text-muted-foreground";
    }
  };

  const getPromptName = (id: string | null) => {
    if (!id) return "Chưa chọn";
    return prompts.find(p => p.id === id)?.name || id;
  };

  // Get unique function/key combos from prompts
  const promptGroups = prompts.reduce((acc, p) => {
    const key = `${p.function_name}::${p.prompt_key}`;
    if (!acc[key]) acc[key] = [];
    acc[key].push(p);
    return acc;
  }, {} as Record<string, Prompt[]>);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-purple-500/10">
            <Beaker className="h-5 w-5 text-purple-500" />
          </div>
          <div>
            <h3 className="font-semibold">A/B Testing</h3>
            <p className="text-sm text-muted-foreground">
              So sánh hiệu quả giữa các phiên bản prompt
            </p>
          </div>
        </div>

        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogTrigger asChild>
            <Button size="sm">
              <Plus className="h-4 w-4 mr-1" />
              Tạo A/B Test
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Tạo A/B Test mới</DialogTitle>
              <DialogDescription>
                So sánh 2 phiên bản prompt để tìm ra phiên bản tốt nhất
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Tên test</Label>
                <Input
                  value={newTest.name}
                  onChange={(e) => setNewTest(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="Test headline prompt v2 vs v3"
                />
              </div>

              <div className="space-y-2">
                <Label>Mô tả</Label>
                <Textarea
                  value={newTest.description}
                  onChange={(e) => setNewTest(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Mục tiêu và giả thuyết của test..."
                  rows={2}
                />
              </div>

              <div className="space-y-2">
                <Label>Function & Prompt Key</Label>
                <select
                  value={`${newTest.function_name}::${newTest.prompt_key}`}
                  onChange={(e) => {
                    const [fn, pk] = e.target.value.split("::");
                    setNewTest(prev => ({ 
                      ...prev, 
                      function_name: fn || "", 
                      prompt_key: pk || "",
                      variant_a_id: "",
                      variant_b_id: "",
                    }));
                  }}
                  className="w-full px-3 py-2 border rounded-md bg-background"
                >
                  <option value="::">Chọn function/prompt key</option>
                  {Object.keys(promptGroups).map(key => (
                    <option key={key} value={key}>
                      {key.replace("::", " → ")}
                    </option>
                  ))}
                </select>
              </div>

              {newTest.function_name && newTest.prompt_key && (
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Variant A</Label>
                    <select
                      value={newTest.variant_a_id}
                      onChange={(e) => setNewTest(prev => ({ 
                        ...prev, 
                        variant_a_id: e.target.value 
                      }))}
                      className="w-full px-3 py-2 border rounded-md bg-background"
                    >
                      <option value="">Chọn prompt</option>
                      {promptGroups[`${newTest.function_name}::${newTest.prompt_key}`]?.map(p => (
                        <option key={p.id} value={p.id}>
                          {p.name} (v{p.version})
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <Label>Variant B</Label>
                    <select
                      value={newTest.variant_b_id}
                      onChange={(e) => setNewTest(prev => ({ 
                        ...prev, 
                        variant_b_id: e.target.value 
                      }))}
                      className="w-full px-3 py-2 border rounded-md bg-background"
                    >
                      <option value="">Chọn prompt</option>
                      {promptGroups[`${newTest.function_name}::${newTest.prompt_key}`]?.map(p => (
                        <option key={p.id} value={p.id}>
                          {p.name} (v{p.version})
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              )}

              <div className="space-y-2">
                <Label>Sample size tối thiểu</Label>
                <Input
                  type="number"
                  value={newTest.min_sample_size}
                  onChange={(e) => setNewTest(prev => ({ 
                    ...prev, 
                    min_sample_size: parseInt(e.target.value) || 100 
                  }))}
                  min={10}
                />
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setIsCreateOpen(false)}>
                Hủy
              </Button>
              <Button 
                onClick={handleCreateTest}
                disabled={!newTest.name || !newTest.function_name}
              >
                Tạo Test
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[1, 2].map(i => (
            <Skeleton key={i} className="h-32 w-full rounded-lg" />
          ))}
        </div>
      ) : abTests?.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Beaker className="h-12 w-12 text-muted-foreground/50 mb-4" />
            <p className="text-muted-foreground">Chưa có A/B test nào</p>
            <p className="text-sm text-muted-foreground/70">
              Tạo test để so sánh hiệu quả các phiên bản prompt
            </p>
          </CardContent>
        </Card>
      ) : (
        <ScrollArea className="h-[500px]">
          <div className="space-y-4 pr-4">
            {abTests?.map(test => {
              const totalImpressions = (test.variant_a_impressions || 0) + (test.variant_b_impressions || 0);
              const progressA = totalImpressions > 0 
                ? ((test.variant_a_impressions || 0) / totalImpressions) * 100 
                : 50;

              return (
                <Card key={test.id}>
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div>
                        <CardTitle className="text-base flex items-center gap-2">
                          {test.name}
                          {test.winner_variant && (
                            <Badge className="bg-yellow-500/10 text-yellow-600">
                              <Trophy className="h-3 w-3 mr-1" />
                              Winner: {test.winner_variant}
                            </Badge>
                          )}
                        </CardTitle>
                        <CardDescription className="mt-1">
                          {test.function_name} → {test.prompt_key}
                        </CardDescription>
                      </div>
                      <Badge variant="outline" className={getStatusColor(test.status)}>
                        {test.status}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {/* Variants comparison */}
                    <div className="grid grid-cols-2 gap-4">
                      <div className="p-3 rounded-lg bg-blue-500/5 border border-blue-500/20">
                        <div className="flex items-center justify-between mb-2">
                          <span className="font-medium text-sm">Variant A</span>
                          <span className="text-xs text-muted-foreground">
                            {test.variant_a_impressions || 0} impressions
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground truncate">
                          {getPromptName(test.variant_a_id)}
                        </p>
                        {test.variant_a_avg_score !== null && (
                          <div className="mt-2 flex items-center gap-2">
                            <TrendingUp className="h-3.5 w-3.5 text-green-500" />
                            <span className="text-sm font-medium">
                              {test.variant_a_avg_score.toFixed(2)} score
                            </span>
                          </div>
                        )}
                      </div>

                      <div className="p-3 rounded-lg bg-purple-500/5 border border-purple-500/20">
                        <div className="flex items-center justify-between mb-2">
                          <span className="font-medium text-sm">Variant B</span>
                          <span className="text-xs text-muted-foreground">
                            {test.variant_b_impressions || 0} impressions
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground truncate">
                          {getPromptName(test.variant_b_id)}
                        </p>
                        {test.variant_b_avg_score !== null && (
                          <div className="mt-2 flex items-center gap-2">
                            <TrendingUp className="h-3.5 w-3.5 text-green-500" />
                            <span className="text-sm font-medium">
                              {test.variant_b_avg_score.toFixed(2)} score
                            </span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Traffic split */}
                    <div className="space-y-1.5">
                      <div className="flex justify-between text-xs text-muted-foreground">
                        <span>Traffic Split</span>
                        <span>{totalImpressions} / {test.min_sample_size} samples</span>
                      </div>
                      <Progress value={progressA} className="h-2" />
                      <div className="flex justify-between text-xs">
                        <span className="text-blue-500">A: {progressA.toFixed(0)}%</span>
                        <span className="text-purple-500">B: {(100 - progressA).toFixed(0)}%</span>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex justify-end gap-2">
                      {test.status === "draft" && (
                        <Button 
                          size="sm" 
                          onClick={() => handleStartTest(test.id)}
                        >
                          <Play className="h-4 w-4 mr-1" />
                          Bắt đầu
                        </Button>
                      )}
                      {test.status === "running" && (
                        <>
                          <Button 
                            size="sm" 
                            variant="outline"
                            onClick={() => handlePauseTest(test.id)}
                          >
                            <Pause className="h-4 w-4 mr-1" />
                            Tạm dừng
                          </Button>
                          <Button 
                            size="sm"
                            variant="outline"
                            onClick={() => handleDeclareWinner(test.id, "A")}
                          >
                            Chọn A
                          </Button>
                          <Button 
                            size="sm"
                            variant="outline"
                            onClick={() => handleDeclareWinner(test.id, "B")}
                          >
                            Chọn B
                          </Button>
                        </>
                      )}
                      {test.status === "paused" && (
                        <Button 
                          size="sm" 
                          onClick={() => handleStartTest(test.id)}
                        >
                          <Play className="h-4 w-4 mr-1" />
                          Tiếp tục
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </ScrollArea>
      )}
    </div>
  );
}
