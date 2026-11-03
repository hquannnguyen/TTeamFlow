import { Navigate, Outlet } from 'react-router-dom';
import { BrandLoader } from '../../components/ui/BrandLoader';
import { useMinimumDelay } from '../../hooks/useMinimumDelay';
import { useAuthStore } from '../../features/auth/store/auth.store';

export function ProtectedRoute() {
  const { accessToken, isBootstrapping } = useAuthStore();
  // Giữ màn loading thương hiệu đủ lâu để hoạt ảnh không bị chớp khi mạng nhanh
  const showLoader = useMinimumDelay(isBootstrapping);

  if (showLoader) return <BrandLoader />;
  return accessToken ? <Outlet /> : <Navigate to="/login" replace />;
}
