interface BrandLoaderProps {
  /** Dòng trạng thái nhỏ dưới thanh tiến trình */
  message?: string;
}

/**
 * Màn hình loading mang thương hiệu TTeamFlow: ba "thành viên" (ba cột Kanban)
 * lần lượt nhấp nhô, thẻ việc bật lên, dòng chảy (Flow) xuyên qua và dấu tích hoàn thành.
 */
export function BrandLoader({ message = 'Đang chuẩn bị không gian làm việc của bạn…' }: BrandLoaderProps) {
  return (
    <div className="brand-loader" role="status" aria-live="polite" aria-label="Đang tải TTeamFlow">
      <i className="bl-orb bl-orb--a" />
      <i className="bl-orb bl-orb--b" />

      <div className="bl-stage">
        <svg className="bl-mark" viewBox="0 0 240 160" aria-hidden="true">
          <defs>
            <linearGradient id="bl-g1" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0" stopColor="#0AA3F0" />
              <stop offset="1" stopColor="#0A4FE0" />
            </linearGradient>
            <linearGradient id="bl-g2" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0" stopColor="#3B2FD0" />
              <stop offset="1" stopColor="#5B46F5" />
            </linearGradient>
            <linearGradient id="bl-g3" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0" stopColor="#00D2C0" />
              <stop offset="1" stopColor="#0A97A8" />
            </linearGradient>
          </defs>

          <g className="bl-person bl-person--1">
            <circle cx="50" cy="24" r="14" fill="#0A4FE0" className="bl-head" />
            <rect x="20" y="46" width="60" height="96" rx="15" fill="url(#bl-g1)" />
            <rect className="bl-card bl-card--1" x="30" y="58" width="40" height="26" rx="7" fill="#fff" />
            <rect className="bl-card bl-card--2" x="30" y="108" width="26" height="22" rx="7" fill="#fff" />
          </g>

          <g className="bl-person bl-person--2">
            <circle cx="120" cy="24" r="14" fill="#4C3BE0" className="bl-head" />
            <rect x="90" y="46" width="60" height="96" rx="15" fill="url(#bl-g2)" />
            <rect className="bl-card bl-card--3" x="100" y="58" width="40" height="26" rx="7" fill="#fff" opacity=".6" />
            <rect className="bl-card bl-card--4" x="100" y="94" width="40" height="26" rx="7" fill="#fff" />
          </g>

          <g className="bl-person bl-person--3">
            <circle cx="190" cy="24" r="14" fill="#0A9FA8" className="bl-head" />
            <rect x="160" y="46" width="60" height="96" rx="15" fill="url(#bl-g3)" />
            <rect className="bl-card bl-card--5" x="170" y="58" width="40" height="26" rx="7" fill="#fff" />
            <path
              className="bl-check"
              d="M180 71 l6 6 l12 -12"
              fill="none"
              stroke="#0A9FA8"
              strokeWidth="4"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <rect className="bl-card bl-card--6" x="170" y="104" width="40" height="26" rx="7" fill="#fff" opacity=".65" />
          </g>

          <path
            className="bl-wave"
            d="M26 98 C 50 106, 66 80, 96 84 S 140 112, 170 100 S 206 94, 216 96"
            fill="none"
            stroke="#fff"
            strokeWidth="6"
            strokeLinecap="round"
          />
        </svg>

        <h1 className="bl-word">
          <span>TTeam</span>
          <span className="bl-word-flow">Flow</span>
        </h1>
        <p className="bl-tag">Làm việc nhóm gọn gàng, minh bạch</p>

        <div className="bl-bar" aria-hidden="true">
          <span />
        </div>
        <p className="bl-msg">{message}</p>
      </div>
    </div>
  );
}
