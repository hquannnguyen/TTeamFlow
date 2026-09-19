import { useEffect } from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuthStore } from '../../features/auth/store/auth.store';
import { toast } from '../../components/ui/toast.store';

export function AdminRoute() {
  const { user, isBootstrapping } = useAuthStore();
  const isAdmin = user?.systemRole === 'ADMIN';

  useEffect(() => {
    if (!isBootstrapping && user && !isAdmin) {
      toast.error('Bạn không có quyền truy cập vào khu vực quản trị');
    }
  }, [isBootstrapping, user, isAdmin]);

  if (isBootstrapping) {
    return (
      <div className="bootstrap-spinner" aria-label="Đang kiểm tra quyền..." role="status">
        <span className="spinner-ring" />
      </div>
    );
  }

  if (!user || !isAdmin) {
    return <Navigate to="/dashboard" replace />;
  }

  return <Outlet />;
}

