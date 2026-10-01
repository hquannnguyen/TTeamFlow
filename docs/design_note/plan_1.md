# Hướng dẫn Live Code: Xây dựng Skeleton Dashboard UI (KienTT)
> **Phiên bản cập nhật sau khi đồng bộ với nhánh `develop` mới nhất**  
> Đã đối chiếu và chuẩn hóa 100% theo:
> - `docs/API_REQUEST_RESPONSE.md` (Mục 10: Dashboard contract)
> - `docs/API_CONVENTIONS.md` (Mục 15: Query keys)
> - `CODING CONVENTION.md` (Mục 42 - 47: Feature-based & TanStack Query)
> - `.agents/rules/frontend.md` & `frontend/src/styles.css` (Style Linear/Notion đồng bộ toàn hệ thống)

---

## 1. Điểm mới quan trọng cần cập nhật sau khi pull `develop`

Trước khi bắt tay vào code, bạn cần nắm 3 điểm thay đổi cực kỳ quan trọng từ team:

1. **API Contract chính thức (`docs/API_REQUEST_RESPONSE.md`)**:
   - `statusDistribution` là **Mảng các cột Kanban** (`Array<{ columnId, columnName, isCompleted, count }>`) thay vì object `{ todo, doing, done }`. Lý do: Cột Kanban trong dự án là động, có thể thêm/bớt/đổi tên cột.
   - `memberWorkload` gồm: `userId`, `fullName`, `avatarUrl`, `activeTaskCount` (không dùng `userName` hay `taskCount`).
2. **Sử dụng `TanStack Query` (`useQuery`)**:
   - Dự án đã cài đặt sẵn `@tanstack/react-query` và bọc `AppProviders`. Cả trang `ProjectsPage` lẫn `ProjectBoardPage` đều dùng `useQuery`.
   - Query key chuẩn: `['dashboard', projectId]`. Dùng `useQuery` ngay với hàm Mock Promise giúp code ngắn gọn, xử lý `isLoading`/`isError` tự động và chuẩn 100% convention.
3. **Design System & CSS Token (`styles.css`)**:
   - Tận dụng các class có sẵn: `.page-heading`, `.page-title`, `.card`, `.grid`, `.muted`, `.text-sm` thay vì viết inline CSS thô sơ `border: '1px solid #ccc'`. Giao diện sẽ mang phong cách tối giản, tinh tế chuẩn Linear/Notion.

---

## 2. Các bước Live Code chuẩn xác (Step-by-step)

### Bước 1: Kiểm tra Git Branch
Đảm bảo bạn đang làm việc trên branch riêng của mình:
```bash
git checkout -b feature/dashboard
```

---

### Bước 2: Định nghĩa Types theo đúng API Contract
Mở file `frontend/src/features/dashboard/types/dashboard.types.ts` và viết:

```typescript
// src/features/dashboard/types/dashboard.types.ts

export interface StatusDistributionItem {
  columnId: string;
  columnName: string;
  isCompleted: boolean;
  count: number;
}

export interface MemberWorkloadItem {
  userId: string;
  fullName: string;
  avatarUrl: string | null;
  activeTaskCount: number;
}

export interface DashboardMetrics {
  totalTasks: number;
  completedTasks: number;
  overdueTasks: number;
  progress: number;
  statusDistribution: StatusDistributionItem[];
  memberWorkload: MemberWorkloadItem[];
}
```

*Lời thoại thuyết trình:*  
> "Em định nghĩa các interface dựa chính xác theo tài liệu `API_REQUEST_RESPONSE.md`. Điểm đặc biệt là `statusDistribution` là một mảng động theo từng cột của Kanban Board, và `memberWorkload` thể hiện số task đang xử lý của từng thành viên."

---

### Bước 3: Tạo Mock API Service
Mở file `frontend/src/features/dashboard/api/dashboard.api.ts`:
*(Lưu ý: Chú ý chữ `import` không bị gõ thiếu thành `mport` nhé!)*

```typescript
// src/features/dashboard/api/dashboard.api.ts
import { DashboardMetrics } from '../types/dashboard.types';

// Dữ liệu giả lập đúng theo format trả về của Backend API
const mockDashboardData: DashboardMetrics = {
  totalTasks: 42,
  completedTasks: 20,
  overdueTasks: 3,
  progress: 47.62,
  statusDistribution: [
    { columnId: 'col-1', columnName: 'TODO', isCompleted: false, count: 12 },
    { columnId: 'col-2', columnName: 'IN PROGRESS', isCompleted: false, count: 10 },
    { columnId: 'col-3', columnName: 'DONE', isCompleted: true, count: 20 },
  ],
  memberWorkload: [
    { userId: 'u-1', fullName: 'QuanNH', avatarUrl: null, activeTaskCount: 6 },
    { userId: 'u-2', fullName: 'PhongVV', avatarUrl: null, activeTaskCount: 8 },
    { userId: 'u-3', fullName: 'KienTT', avatarUrl: null, activeTaskCount: 5 },
  ],
};

// Giả lập API call với delay 600ms để kiểm tra loading state
export async function getDashboardMetrics(projectId: string): Promise<DashboardMetrics> {
  // Sau này khi BE hoàn thành chỉ cần:
  // const res = await http.get(`/projects/${projectId}/dashboard`);
  // return res.data.data;
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve(mockDashboardData);
    }, 600);
  });
}
```

*Lời thoại thuyết trình:*  
> "Tất cả các lệnh gọi API được đóng gói riêng trong tầng `api/` theo Coding Convention mục 46. Em dùng Promise với delay 600ms để giả lập độ trễ mạng thực tế. Sau này khi Backend xong, chỉ cần thay bằng 1 dòng `http.get` mà không cần sửa giao diện."

---

### Bước 4: Tạo Component DashboardStats (Thẻ số liệu & Tiến độ)
Mở file `frontend/src/features/dashboard/components/DashboardStats.tsx`:
*(Lưu ý: File này chỉ nhận props và render UI, không chứa mock data)*

```tsx
// src/features/dashboard/components/DashboardStats.tsx
import { DashboardMetrics } from '../types/dashboard.types';

interface DashboardStatsProps {
  metrics: DashboardMetrics;
}

export function DashboardStats({ metrics }: DashboardStatsProps) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Hàng các thẻ thống kê */}
      <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))' }}>
        <div className="card">
          <span className="muted text-sm">Tổng công việc</span>
          <div style={{ fontSize: 28, fontWeight: 700, marginTop: 4 }}>
            {metrics.totalTasks}
          </div>
        </div>

        <div className="card">
          <span className="muted text-sm">Đã hoàn thành</span>
          <div style={{ fontSize: 28, fontWeight: 700, color: 'var(--color-success)', marginTop: 4 }}>
            {metrics.completedTasks}
          </div>
        </div>

        <div className="card">
          <span className="muted text-sm">Quá hạn (Overdue)</span>
          <div style={{ fontSize: 28, fontWeight: 700, color: 'var(--color-error)', marginTop: 4 }}>
            {metrics.overdueTasks}
          </div>
        </div>

        <div className="card">
          <span className="muted text-sm">Tiến độ chung</span>
          <div style={{ fontSize: 28, fontWeight: 700, color: 'var(--brand-500)', marginTop: 4 }}>
            {metrics.progress}%
          </div>
        </div>
      </div>

      {/* Progress Bar tinh tế theo phong cách Linear/Notion */}
      <div className="card" style={{ padding: '14px 20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8, fontSize: 13 }}>
          <span className="font-semibold">Mức độ hoàn thành dự án</span>
          <span className="muted">{metrics.completedTasks}/{metrics.totalTasks} công việc ({metrics.progress}%)</span>
        </div>
        <div style={{ height: 8, background: 'var(--gray-200)', borderRadius: 4, overflow: 'hidden' }}>
          <div
            style={{
              height: '100%',
              width: `${metrics.progress}%`,
              background: 'var(--brand-500)',
              borderRadius: 4,
              transition: 'width 0.4s ease',
            }}
          />
        </div>
      </div>
    </div>
  );
}
```

---

### Bước 5: Tạo Component DashboardCharts (Phân bổ cột & Khối lượng công việc)
Tạo file `frontend/src/features/dashboard/components/DashboardCharts.tsx`:

```tsx
// src/features/dashboard/components/DashboardCharts.tsx
import { DashboardMetrics } from '../types/dashboard.types';

interface DashboardChartsProps {
  metrics: DashboardMetrics;
}

export function DashboardCharts({ metrics }: DashboardChartsProps) {
  return (
    <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 16 }}>
      {/* Phân bổ theo trạng thái cột Kanban */}
      <div className="card">
        <h3 style={{ fontSize: 15, fontWeight: 600, marginBottom: 14 }}>Phân bổ theo cột Kanban</h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {metrics.statusDistribution.map((col) => (
            <div
              key={col.columnId}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '8px 12px',
                background: 'var(--gray-50)',
                borderRadius: 'var(--radius-sm)',
                border: '1px solid var(--color-border)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span
                  style={{
                    width: 8,
                    height: 8,
                    borderRadius: '50%',
                    background: col.isCompleted ? 'var(--color-success)' : 'var(--brand-500)',
                  }}
                />
                <span style={{ fontSize: 13, fontWeight: 500 }}>{col.columnName}</span>
              </div>
              <span className="font-semibold text-sm">{col.count} tasks</span>
            </div>
          ))}
        </div>
      </div>

      {/* Phân bổ khối lượng công việc thành viên (Workload) */}
      <div className="card">
        <h3 style={{ fontSize: 15, fontWeight: 600, marginBottom: 14 }}>Khối lượng công việc (Workload)</h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {metrics.memberWorkload.map((member) => (
            <div
              key={member.userId}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '8px 12px',
                background: 'var(--gray-50)',
                borderRadius: 'var(--radius-sm)',
                border: '1px solid var(--color-border)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                {/* Avatar tròn ký tự viết tắt */}
                <div
                  style={{
                    width: 28,
                    height: 28,
                    borderRadius: '50%',
                    background: 'var(--brand-50)',
                    color: 'var(--brand-500)',
                    display: 'grid',
                    placeItems: 'center',
                    fontSize: 12,
                    fontWeight: 600,
                  }}
                >
                  {member.fullName.slice(0, 2).toUpperCase()}
                </div>
                <span style={{ fontSize: 13, fontWeight: 500 }}>{member.fullName}</span>
              </div>
              <span className="text-sm font-semibold">
                {member.activeTaskCount} đang làm
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
```

---

### Bước 6: Ghép vào DashboardPage với `TanStack Query`
Tạo file `frontend/src/features/dashboard/pages/DashboardPage.tsx`:

```tsx
// src/features/dashboard/pages/DashboardPage.tsx
import { useQuery } from '@tanstack/react-query';
import { Link, useParams } from 'react-router-dom';
import { getDashboardMetrics } from '../api/dashboard.api';
import { DashboardCharts } from '../components/DashboardCharts';
import { DashboardStats } from '../components/DashboardStats';

export function DashboardPage() {
  const { projectId = '' } = useParams<{ projectId: string }>();

  // Sử dụng useQuery chuẩn convention ['dashboard', projectId]
  const { data: metrics, isLoading, isError } = useQuery({
    queryKey: ['dashboard', projectId],
    queryFn: () => getDashboardMetrics(projectId),
    enabled: Boolean(projectId),
  });

  if (isLoading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: 40, justifyContent: 'center' }}>
        <span className="spinner-ring" style={{ width: 24, height: 24 }} />
        <span className="muted text-sm">Đang nạp dữ liệu Dashboard...</span>
      </div>
    );
  }

  if (isError || !metrics) {
    return (
      <div className="card" style={{ padding: 24, textAlign: 'center', color: 'var(--color-error)' }}>
        Không thể tải thông tin Dashboard. Vui lòng thử lại sau.
      </div>
    );
  }

  return (
    <section style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      {/* Tiêu đề & thanh điều hướng tab */}
      <div className="page-heading">
        <div>
          <h1 className="page-title">Project Dashboard</h1>
          <p className="muted text-sm">Báo cáo tổng quan tiến độ và phân bổ công việc của dự án.</p>
        </div>

        {/* Nút tiện ích để chuyển qua Kanban Board */}
        <Link to={`/projects/${projectId}/board`} className="btn btn-ghost text-sm">
          Xem Kanban Board &rarr;
        </Link>
      </div>

      {/* 4 Thẻ chỉ số & Progress Bar */}
      <DashboardStats metrics={metrics} />

      {/* Biểu đồ trạng thái & Workload thành viên */}
      <DashboardCharts metrics={metrics} />
    </section>
  );
}
```

*Lời thoại thuyết trình:*  
> "Trang `DashboardPage` sử dụng hook `useQuery` với query key `['dashboard', projectId]`. Nhờ đó em quản lý được toàn bộ các trạng thái `isLoading`, `isError` một cách khai báo (declarative) mà không cần viết các cờ `useState` thủ công. Skeleton và loading ring đều tái sử dụng class từ `styles.css` của dự án."

---

### Bước 7: Khai báo Route trong `router.tsx`
Mở file `frontend/src/app/router/router.tsx`, thêm route vào danh sách con của `AppLayout`:

```diff
  import { createBrowserRouter, Navigate } from 'react-router-dom';
  import { AppLayout } from '../../components/layout/AppLayout';
  import { LoginPage } from '../../features/auth/pages/LoginPage';
  import { RegisterPage } from '../../features/auth/pages/RegisterPage';
  import { ProjectBoardPage } from '../../features/kanban/pages/ProjectBoardPage';
  import { ProjectsPage } from '../../features/projects/pages/ProjectsPage';
+ import { DashboardPage } from '../../features/dashboard/pages/DashboardPage';
  import { ProtectedRoute } from './ProtectedRoute';

  export const router = createBrowserRouter([
    // ...
          children: [
            { path: '/', element: <Navigate to="/projects" replace /> },
            { path: '/projects', element: <ProjectsPage /> },
            {
              path: '/projects/:projectId/board',
              element: <ProjectBoardPage />,
            },
+           {
+             path: '/projects/:projectId/dashboard',
+             element: <DashboardPage />,
+           },
          ],
    // ...
  ]);
```

---

### Bước 8: Kiểm tra thành quả (Demo)
1. Mở terminal tại thư mục `frontend`:
   ```bash
   npm run dev
   ```
2. Đăng nhập hoặc truy cập trực tiếp: `http://localhost:5173/projects/any-project-id/dashboard`
3. Bạn sẽ thấy hiệu ứng loading spinner 600ms, sau đó xuất hiện dashboard gọn gàng, đẹp mắt, các thẻ thống kê số liệu, thanh tiến độ và phân bổ khối lượng công việc.

---

### Bước 9: Commit chuẩn Git Convention
```bash
git add .
git commit -m "feat(dashboard): KienTT implement dashboard skeleton with mock data"
```
*(Đúng quy ước `feat(dashboard): <description>` theo Coding Convention mục 6)*.

---

## 💡 Bảng kiểm tra Definition of Done (DoD) trước khi kết thúc
- [x] **Cards**: Hiển thị Total Tasks, Completed, Overdue.
- [x] **Progress**: Hiển thị tỉ lệ % hoàn thành kèm progress bar trực quan.
- [x] **Status**: Hiển thị phân bổ theo từng cột Kanban động.
- [x] **Workload**: Hiển thị danh sách thành viên và số task đang phụ trách.
- [x] **Tổ chức code**: Tách biệt rõ ràng `types`, `api`, `components`, `pages`.
- [x] **TanStack Query**: Sử dụng đúng `useQuery` và query key chuẩn `['dashboard', projectId]`.
