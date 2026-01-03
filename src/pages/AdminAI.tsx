import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { ArrowLeft, LayoutDashboard, Plug, Settings, BarChart3, Database, RefreshCcw } from 'lucide-react';
import { AIDashboard } from '@/components/admin/ai/AIDashboard';
import { AIProviderManager } from '@/components/admin/ai/AIProviderManager';
import { AIFunctionConfigComponent } from '@/components/admin/ai/AIFunctionConfig';
import CacheAnalytics from '@/components/admin/CacheAnalytics';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export default function AdminAI() {
  const navigate = useNavigate();
  const [organizationId, setOrganizationId] = useState<string | undefined>();
  const [isAdmin, setIsAdmin] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const checkAccess = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          navigate('/auth');
          return;
        }

        // Check if admin
        const { data: roles } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', user.id)
          .eq('role', 'admin');
        
        setIsAdmin(!!roles?.length);

        // Get user's organization
        const { data: orgMember } = await supabase
          .from('organization_members')
          .select('organization_id')
          .eq('user_id', user.id)
          .limit(1)
          .single();
        
        if (orgMember) {
          setOrganizationId(orgMember.organization_id);
        }

        // Check if user is org admin
        if (!roles?.length && orgMember) {
          const { data: orgRole } = await supabase
            .from('organization_members')
            .select('role')
            .eq('user_id', user.id)
            .eq('organization_id', orgMember.organization_id)
            .single();
          
          if (!orgRole || !['owner', 'admin'].includes(orgRole.role)) {
            toast.error('Bạn không có quyền truy cập trang này');
            navigate('/');
            return;
          }
        }
      } catch (error) {
        console.error('Error checking access:', error);
        toast.error('Lỗi kiểm tra quyền truy cập');
      } finally {
        setIsLoading(false);
      }
    };

    checkAccess();
  }, [navigate]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <RefreshCcw className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto py-6 px-4 max-w-7xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate('/admin')}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold">AI Management Center</h1>
              <p className="text-muted-foreground">
                Quản lý AI providers, functions, và analytics
              </p>
            </div>
          </div>
          {isAdmin && (
            <Button variant="outline" onClick={() => navigate('/admin')}>
              Admin Panel
            </Button>
          )}
        </div>

        {/* Tabs */}
        <Tabs defaultValue="dashboard" className="space-y-6">
          <TabsList className="grid grid-cols-5 w-full max-w-2xl">
            <TabsTrigger value="dashboard" className="flex items-center gap-2">
              <LayoutDashboard className="h-4 w-4" />
              <span className="hidden sm:inline">Dashboard</span>
            </TabsTrigger>
            <TabsTrigger value="providers" className="flex items-center gap-2">
              <Plug className="h-4 w-4" />
              <span className="hidden sm:inline">Providers</span>
            </TabsTrigger>
            <TabsTrigger value="functions" className="flex items-center gap-2">
              <Settings className="h-4 w-4" />
              <span className="hidden sm:inline">Functions</span>
            </TabsTrigger>
            <TabsTrigger value="metrics" className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4" />
              <span className="hidden sm:inline">Metrics</span>
            </TabsTrigger>
            <TabsTrigger value="cache" className="flex items-center gap-2">
              <Database className="h-4 w-4" />
              <span className="hidden sm:inline">Cache</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="dashboard" className="space-y-6">
            <AIDashboard organizationId={isAdmin ? undefined : organizationId} />
          </TabsContent>

          <TabsContent value="providers" className="space-y-6">
            <AIProviderManager organizationId={organizationId} />
          </TabsContent>

          <TabsContent value="functions" className="space-y-6">
            <AIFunctionConfigComponent organizationId={organizationId} />
          </TabsContent>

          <TabsContent value="metrics" className="space-y-6">
            <AIDashboard organizationId={isAdmin ? undefined : organizationId} />
          </TabsContent>

          <TabsContent value="cache" className="space-y-6">
            <CacheAnalytics />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
