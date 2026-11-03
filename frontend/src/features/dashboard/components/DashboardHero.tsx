import { useAuthStore } from '../../auth/store/auth.store';
import { useCountUp } from '../../../hooks/useCountUp';
import type { DashboardMetrics } from '../types/dashboard.types';

interface DashboardHeroProps {
  projectName: string;
  metrics: DashboardMetrics;
  onOpenBoard: () => void;
}

function greeting(hour: number) {
  if (hour < 5) return 'Khuya rồi';
  if (hour < 11) return 'Chào buổi sáng';
  if (hour < 14) return 'Chào buổi trưa';
  if (hour < 18) return 'Chào buổi chiều';
  return 'Chào buổi tối';
}

function insight(m: DashboardMetrics) {
  if (m.totalTasks === 0) return 'Dự án đang trống. Tạo nhiệm vụ đầu tiên để bắt đầu hành trình.';
  if (m.progress >= 100) return 'Tuyệt vời! Toàn bộ nhiệm vụ đã hoàn thành.';
  if (m.overdueTasks > 0) return `Có ${m.overdueTasks} nhiệm vụ quá hạn cần được xử lý sớm.`;
  return `Đội ngũ đã hoàn thành ${m.completedTasks}/${m.totalTasks} nhiệm vụ. Cứ đà này nhé!`;
}

const RADIUS = 52;
const CIRC = 2 * Math.PI * RADIUS;

export function DashboardHero({ projectName, metrics, onOpenBoard }: DashboardHeroProps) {
  const user = useAuthStore((s) => s.user);
  const firstName = user?.fullName?.trim().split(/\s+/).pop() ?? 'bạn';
  const pct = useCountUp(Math.min(100, Math.max(0, metrics.progress)));
  const total = useCountUp(metrics.totalTasks);
  const done = useCountUp(metrics.completedTasks);
  const active = useCountUp(metrics.activeTasks ?? 0);
  const overdue = useCountUp(metrics.overdueTasks);
  const offset = CIRC - (pct / 100) * CIRC;

  return (
    <section className="dash-hero" aria-label="Tóm tắt dự án">
      <i className="dash-hero-glow dash-hero-glow--a" />
      <i className="dash-hero-glow dash-hero-glow--b" />
      <i className="dash-hero-glow dash-hero-glow--c" />

      <div className="dash-hero-main">
        <span className="dash-hero-chip">{projectName}</span>
        <h2 className="dash-hero-title">
          {greeting(new Date().getHours())}, <span>{firstName}</span> 👋
        </h2>
        <p className="dash-hero-sub">{insight(metrics)}</p>

        <div className="dash-hero-stats">
          <div><strong>{total}</strong><small>Tổng nhiệm vụ</small></div>
          <div><strong>{done}</strong><small>Hoàn thành</small></div>
          <div><strong>{active}</strong><small>Đang làm</small></div>
          <div className={metrics.overdueTasks > 0 ? 'is-alert' : ''}><strong>{overdue}</strong><small>Quá hạn</small></div>
        </div>

        {metrics.totalTasks === 0 && (
          <button type="button" className="dash-hero-cta" onClick={onOpenBoard}>
            Tạo nhiệm vụ đầu tiên →
          </button>
        )}
      </div>

      <div className="dash-hero-ring" aria-label={`Tiến độ ${metrics.progress}%`}>
        <svg viewBox="0 0 128 128" width="150" height="150">
          <defs>
            <linearGradient id="dh-ring" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0" stopColor="#7DD3FC" />
              <stop offset="1" stopColor="#5EEAD4" />
            </linearGradient>
          </defs>
          <circle cx="64" cy="64" r={RADIUS} fill="none" stroke="rgb(255 255 255 / .18)" strokeWidth="10" />
          <circle
            cx="64"
            cy="64"
            r={RADIUS}
            fill="none"
            stroke="url(#dh-ring)"
            strokeWidth="10"
            strokeLinecap="round"
            strokeDasharray={CIRC}
            strokeDashoffset={offset}
            transform="rotate(-90 64 64)"
          />
        </svg>
        <div className="dash-hero-ring-text">
          <strong>{pct}%</strong>
          <small>tiến độ</small>
        </div>
      </div>
    </section>
  );
}
