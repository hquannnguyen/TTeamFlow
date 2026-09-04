import { createBrowserRouter, Navigate } from 'react-router-dom';
import { AppLayout } from '../../components/layout/AppLayout';
import { LoginPage } from '../../features/auth/pages/LoginPage';
import { RegisterPage } from '../../features/auth/pages/RegisterPage';
import { ProjectBoardPage } from '../../features/kanban/pages/ProjectBoardPage';
import { ProjectsPage } from '../../features/projects/pages/ProjectsPage';
import { ProtectedRoute } from './ProtectedRoute';
import { DashboardPage } from '../../features/dashboard/pages/DashboardPage';
import { ProfilePage } from '../../features/profile/pages/ProfilePage';

export const router = createBrowserRouter([
  {
    path: '/login',
    element: <LoginPage />,
  },
  {
    path: '/register',
    element: <RegisterPage />,
  },
  {
    element: <ProtectedRoute />,
    children: [
      {
        element: <AppLayout />,
        children: [
          { path: '/', element: <Navigate to="/dashboard" replace /> },
          { path: '/dashboard', element: <DashboardPage /> },
          { path: '/projects', element: <ProjectsPage /> },
          {
            path: '/projects/:projectId/board',
            element: <ProjectBoardPage />,
          },
          {
            path: '/projects/:projectId/dashboard',
            element: <DashboardPage />,
          },
          {
            path: '/profile',
            element: <ProfilePage />,
          },
        ],
      },
    ],
  },
]);
