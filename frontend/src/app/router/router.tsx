import { createBrowserRouter, Navigate } from 'react-router-dom';
import { AppLayout } from '../../components/layout/AppLayout';
import { LoginPage } from '../../features/auth/pages/LoginPage';
import { RegisterPage } from '../../features/auth/pages/RegisterPage';
import { ProjectBoardPage } from '../../features/kanban/pages/ProjectBoardPage';
import { ProjectsPage } from '../../features/projects/pages/ProjectsPage';
import { ProtectedRoute } from './ProtectedRoute';
import { DashboardPage } from '../../features/dashboard/pages/DashboardPage';
import { ProfilePage } from '../../features/profile/pages/ProfilePage';
import { ProjectMembersPage } from '../../features/members/pages/ProjectMembersPage';

import { TaskDetailPage } from '../../features/kanban/pages/TaskDetailPage';
import { AdminRoute } from './AdminRoute';
import { AdminUsersPage } from '../../features/admin/pages/AdminUsersPage';

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
            path: '/board',
            element: <ProjectBoardPage />,
          },
          {
            path: '/kanban',
            element: <ProjectBoardPage />,
          },
          {
            path: '/projects/:projectId/board',
            element: <ProjectBoardPage />,
          },
          {
            path: '/projects/:projectId/kanban',
            element: <ProjectBoardPage />,
          },
          {
            path: '/projects/:projectId/tasks/:taskId',
            element: <TaskDetailPage />,
          },
          {
            path: '/tasks/:taskId',
            element: <TaskDetailPage />,
          },
          {
            path: '/projects/:projectId/dashboard',
            element: <DashboardPage />,
          },
          {
            path: '/profile',
            element: <ProfilePage />,
          },
          {
            path: '/members',
            element: <ProjectMembersPage />,
          },
          {
            path: '/projects/:projectId/members',
            element: <ProjectMembersPage />,
          },
          {
            element: <AdminRoute />,
            children: [
              { path: '/admin', element: <Navigate to="/admin/users" replace /> },
              { path: '/admin/users', element: <AdminUsersPage /> },
            ],
          },
        ],
      },
    ],
  },
]);
