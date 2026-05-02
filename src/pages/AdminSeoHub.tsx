import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Search, FlaskConical, FolderTree, Upload, BarChart3, FileText } from "lucide-react";
import KeywordDashboardTab from "@/components/admin/seo-keywords/KeywordDashboardTab";
import KeywordExplorerTab from "@/components/admin/seo-keywords/KeywordExplorerTab";
import KeywordClusterTab from "@/components/admin/seo-keywords/KeywordClusterTab";
import KeywordResearchLabTab from "@/components/admin/seo-keywords/KeywordResearchLabTab";
import KeywordImportTab from "@/components/admin/seo-keywords/KeywordImportTab";
import AdminSeoPages from "@/pages/AdminSeoPages";

export default function AdminSeoHub() {
  const [tab, setTab] = useState("dashboard");

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <Search className="h-7 w-7 text-muted-foreground" />
          SEO Hub
        </h1>
        <p className="text-muted-foreground mt-1">
          Programmatic SEO — quản lý từ khóa, cluster và landing pages trong một nơi.
        </p>
      </div>

      <Tabs value={tab} onValueChange={setTab} className="w-full">
        <TabsList className="grid w-full grid-cols-6 max-w-4xl">
          <TabsTrigger value="dashboard" className="gap-1.5">
            <BarChart3 className="h-4 w-4" /> Dashboard
          </TabsTrigger>
          <TabsTrigger value="explorer" className="gap-1.5">
            <Search className="h-4 w-4" /> Keywords
          </TabsTrigger>
          <TabsTrigger value="clusters" className="gap-1.5">
            <FolderTree className="h-4 w-4" /> Clusters
          </TabsTrigger>
          <TabsTrigger value="research" className="gap-1.5">
            <FlaskConical className="h-4 w-4" /> Research
          </TabsTrigger>
          <TabsTrigger value="import" className="gap-1.5">
            <Upload className="h-4 w-4" /> Import
          </TabsTrigger>
          <TabsTrigger value="pages" className="gap-1.5">
            <FileText className="h-4 w-4" /> Pages
          </TabsTrigger>
        </TabsList>

        <TabsContent value="dashboard" className="mt-6">
          <KeywordDashboardTab />
        </TabsContent>
        <TabsContent value="explorer" className="mt-6">
          <KeywordExplorerTab />
        </TabsContent>
        <TabsContent value="clusters" className="mt-6">
          <KeywordClusterTab />
        </TabsContent>
        <TabsContent value="research" className="mt-6">
          <KeywordResearchLabTab />
        </TabsContent>
        <TabsContent value="import" className="mt-6">
          <KeywordImportTab />
        </TabsContent>
        <TabsContent value="pages" className="mt-6 -m-6">
          <AdminSeoPages />
        </TabsContent>
      </Tabs>
    </div>
  );
}
