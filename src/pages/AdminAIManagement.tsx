import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Brain,
  Plug,
  Settings,
  Activity,
  BarChart3,
  Database,
  LayoutDashboard,
  DollarSign,
  FileText,
  Bot,
  Crosshair,
} from "lucide-react";
import CacheAnalytics from "@/components/admin/CacheAnalytics";
import { AIDashboard } from "@/components/admin/ai/AIDashboard";
import { AIProviderManager } from "@/components/admin/ai/AIProviderManager";
import { AIFunctionConfigComponent } from "@/components/admin/ai/AIFunctionConfig";
import { AIChannelModelConfig } from "@/components/admin/ai/AIChannelModelConfig";
import { CostDashboard } from "@/components/admin/ai/CostDashboard";
import { PromptManager } from "@/components/admin/ai/prompts";
import { AIAgentModelConfig } from "@/components/admin/ai/AIAgentModelConfig";
import { IntentAnalyticsDashboard } from "@/components/admin/ai/IntentAnalyticsDashboard";

export default function AdminAIManagement() {
  const [activeTab, setActiveTab] = useState("dashboard");

  return (
    <div className="container py-8 space-y-6">
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-lg bg-purple-500/10">
          <Brain className="h-6 w-6 text-purple-500" />
        </div>
        <div>
          <h1 className="text-3xl font-bold">AI Management</h1>
          <p className="text-muted-foreground">Quản lý providers, functions, channels và cache</p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="flex w-full max-w-5xl mb-6 overflow-x-auto">
          <TabsTrigger value="dashboard" className="flex items-center gap-1.5 text-xs sm:text-sm">
            <LayoutDashboard className="h-4 w-4" />
            <span className="hidden sm:inline">Dashboard</span>
          </TabsTrigger>
          <TabsTrigger value="costs" className="flex items-center gap-1.5 text-xs sm:text-sm">
            <DollarSign className="h-4 w-4" />
            <span className="hidden sm:inline">Costs</span>
          </TabsTrigger>
          <TabsTrigger value="providers" className="flex items-center gap-1.5 text-xs sm:text-sm">
            <Plug className="h-4 w-4" />
            <span className="hidden sm:inline">Providers</span>
          </TabsTrigger>
          <TabsTrigger value="functions" className="flex items-center gap-1.5 text-xs sm:text-sm">
            <Settings className="h-4 w-4" />
            <span className="hidden sm:inline">Functions</span>
          </TabsTrigger>
          <TabsTrigger value="agents" className="flex items-center gap-1.5 text-xs sm:text-sm">
            <Bot className="h-4 w-4" />
            <span className="hidden sm:inline">Agents</span>
          </TabsTrigger>
          <TabsTrigger value="prompts" className="flex items-center gap-1.5 text-xs sm:text-sm">
            <FileText className="h-4 w-4" />
            <span className="hidden sm:inline">Prompts</span>
          </TabsTrigger>
          <TabsTrigger value="channels" className="flex items-center gap-1.5 text-xs sm:text-sm">
            <Activity className="h-4 w-4" />
            <span className="hidden sm:inline">Channels</span>
          </TabsTrigger>
          <TabsTrigger value="metrics" className="flex items-center gap-1.5 text-xs sm:text-sm">
            <BarChart3 className="h-4 w-4" />
            <span className="hidden sm:inline">Metrics</span>
          </TabsTrigger>
          <TabsTrigger value="cache" className="flex items-center gap-1.5 text-xs sm:text-sm">
            <Database className="h-4 w-4" />
            <span className="hidden sm:inline">Cache</span>
          </TabsTrigger>
          <TabsTrigger value="intent" className="flex items-center gap-1.5 text-xs sm:text-sm">
            <Crosshair className="h-4 w-4" />
            <span className="hidden sm:inline">Intent</span>
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="dashboard">
          <AIDashboard />
        </TabsContent>
        
        <TabsContent value="costs">
          <CostDashboard />
        </TabsContent>
        
        <TabsContent value="providers">
          <AIProviderManager />
        </TabsContent>
        
        <TabsContent value="functions">
          <AIFunctionConfigComponent />
        </TabsContent>
        
        <TabsContent value="agents">
          <AIAgentModelConfig />
        </TabsContent>
        
        <TabsContent value="prompts">
          <PromptManager />
        </TabsContent>
        
        <TabsContent value="channels">
          <AIChannelModelConfig />
        </TabsContent>
        
        <TabsContent value="metrics">
          <AIDashboard />
        </TabsContent>
        
        <TabsContent value="cache">
          <CacheAnalytics />
        </TabsContent>
        
        <TabsContent value="intent">
          <IntentAnalyticsDashboard />
        </TabsContent>
      </Tabs>
    </div>
  );
}
