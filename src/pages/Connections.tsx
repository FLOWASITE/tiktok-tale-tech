import { useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useCurrentBrand } from '@/contexts/BrandContext';
import { Globe, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function Connections() {
  const { currentBrand, loading } = useCurrentBrand();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && currentBrand?.id) {
      navigate(`/brands/${currentBrand.id}?tab=connections`, { replace: true });
    }
  }, [loading, currentBrand, navigate]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  if (!currentBrand) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 text-center px-4">
        <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center">
          <Globe className="w-8 h-8 text-muted-foreground" />
        </div>
        <h2 className="text-xl font-semibold">Chưa có brand nào</h2>
        <p className="text-muted-foreground max-w-md">
          Bạn cần tạo brand trước khi kết nối các kênh mạng xã hội.
        </p>
        <Button asChild>
          <Link to="/brands/new">
            <Plus className="w-4 h-4 mr-2" />
            Tạo Brand
          </Link>
        </Button>
      </div>
    );
  }

  return null;
}
