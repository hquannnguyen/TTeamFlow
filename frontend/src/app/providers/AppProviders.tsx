import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactNode, useState } from 'react';
import { useBootstrap } from '../../features/auth/hooks/useBootstrap';

function BootstrapGate({ children }: { children: ReactNode }) {
  useBootstrap();
  return <>{children}</>;
}

export function AppProviders({ children }: { children: ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 30_000,
            retry: 1,
          },
        },
      }),
  );

  return (
    <QueryClientProvider client={queryClient}>
      <BootstrapGate>{children}</BootstrapGate>
    </QueryClientProvider>
  );
}
