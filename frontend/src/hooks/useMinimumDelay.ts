import { useEffect, useState } from 'react';

/** Giữ màn loading hiển thị tối thiểu `ms` để hoạt ảnh không bị chớp. */
export function useMinimumDelay(active: boolean, ms = 1200) {
  const [elapsed, setElapsed] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setElapsed(true), ms);
    return () => clearTimeout(t);
  }, [ms]);
  return active || !elapsed;
}
