import { Navigate, Outlet } from 'react-router-dom';
import { useAuthStore } from '../../features/auth/store/auth.store';

/** Shows a minimal full-screen spinner while session is being restored */
function BootstrapSpinner() {
  return (
    <div className="bootstrap-spinner" aria-label="Đang tải..." role="status">
      <span className="spinner-ring" />
    </div>
  );
}

export function ProtectedRoute() {
  const { accessToken, isBootstrapping } = useAuthStore();

  if (isBootstrapping) return <BootstrapSpinner />;
  return accessToken ? <Outlet /> : <Navigate to="/login" replace />;
}
