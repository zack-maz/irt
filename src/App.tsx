import { AppShell } from '@/components/layout/AppShell';
import { Analytics } from '@vercel/analytics/react';
import { SpeedInsights } from '@vercel/speed-insights/react';

function App() {
  return (
    <>
      <AppShell />
      <Analytics />
      <SpeedInsights />
    </>
  );
}

export default App;
