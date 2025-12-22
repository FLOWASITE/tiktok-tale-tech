import { useState } from 'react';
import { Building2, Check, ChevronsUpDown, Plus } from 'lucide-react';
import { useOrganization } from '@/hooks/useOrganization';
import { ORG_ROLE_LABELS } from '@/types/organization';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
export function OrganizationSwitcher() {
  const { 
    organizations, 
    currentOrganization, 
    switchOrganization, 
    createOrganization,
    updating 
  } = useOrganization();
  
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [newOrgName, setNewOrgName] = useState('');

  const handleCreateOrganization = async () => {
    if (!newOrgName.trim()) return;
    
    const org = await createOrganization(newOrgName.trim());
    if (org) {
      setShowCreateDialog(false);
      setNewOrgName('');
      switchOrganization(org.id);
    }
  };

  if (!currentOrganization) {
    return null;
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            className="justify-start gap-2 px-2 h-auto py-1.5"
          >
            <div
              className="flex h-7 w-7 items-center justify-center rounded-md text-xs font-medium"
              style={{ 
                backgroundColor: currentOrganization.primary_color + '20',
                color: currentOrganization.primary_color 
              }}
            >
              {currentOrganization.logo_url ? (
                <img 
                  src={currentOrganization.logo_url} 
                  alt={currentOrganization.name}
                  className="h-5 w-5 rounded object-cover"
                />
              ) : (
                <Building2 className="h-4 w-4" />
              )}
            </div>
            <div className="flex flex-col items-start text-left min-w-0">
              <span className="text-sm font-medium truncate max-w-[120px]">
                {currentOrganization.name}
              </span>
              <span className="text-[10px] text-muted-foreground">
                {ORG_ROLE_LABELS[currentOrganization.role]}
              </span>
            </div>
            <ChevronsUpDown className="h-4 w-4 text-muted-foreground shrink-0" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-64">
          <DropdownMenuLabel>Tổ chức của bạn</DropdownMenuLabel>
          <DropdownMenuSeparator />
          {organizations.map((org) => (
            <DropdownMenuItem
              key={org.id}
              onClick={() => switchOrganization(org.id)}
              className="flex items-center gap-2 py-2"
            >
              <div
                className="flex h-8 w-8 items-center justify-center rounded-md text-xs font-medium shrink-0"
                style={{ 
                  backgroundColor: org.primary_color + '20',
                  color: org.primary_color 
                }}
              >
                {org.logo_url ? (
                  <img 
                    src={org.logo_url} 
                    alt={org.name}
                    className="h-6 w-6 rounded object-cover"
                  />
                ) : (
                  <Building2 className="h-4 w-4" />
                )}
              </div>
              <div className="flex flex-col flex-1 min-w-0">
                <span className="text-sm font-medium truncate">{org.name}</span>
                <span className="text-xs text-muted-foreground">
                  {ORG_ROLE_LABELS[org.role]}
                </span>
              </div>
              {org.id === currentOrganization.id && (
                <Check className="h-4 w-4 text-primary shrink-0" />
              )}
            </DropdownMenuItem>
          ))}
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onClick={() => setShowCreateDialog(true)}
            className="flex items-center gap-2"
          >
            <Plus className="h-4 w-4" />
            <span>Tạo tổ chức mới</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Tạo tổ chức mới</DialogTitle>
            <DialogDescription>
              Tạo một tổ chức mới để quản lý nội dung và mời thành viên cộng tác.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="org-name">Tên tổ chức</Label>
              <Input
                id="org-name"
                placeholder="VD: Công ty ABC"
                value={newOrgName}
                onChange={(e) => setNewOrgName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    handleCreateOrganization();
                  }
                }}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
              Hủy
            </Button>
            <Button 
              onClick={handleCreateOrganization} 
              disabled={updating || !newOrgName.trim()}
            >
              {updating ? 'Đang tạo...' : 'Tạo tổ chức'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
