import React from 'react';
import { StoreProvider, useStore } from './store/store';
import { ToastProvider } from './ui/toast';
import { AppShell } from './ui/AppShell';
import { useRoute } from './ui/router';
import { AuthPage, MigrationModal } from './pages/Auth';
import { Dashboard } from './pages/Dashboard';
import { Syllabus } from './pages/Syllabus';
import { Tasks } from './pages/Tasks';
import { CalendarPage } from './pages/Calendar';
import { Lectures } from './pages/Lectures';
import { Revision } from './pages/Revision';
import { Tests } from './pages/Tests';
import { AnswerWriting } from './pages/AnswerWriting';
import { CurrentAffairs } from './pages/CurrentAffairs';
import { Timer } from './pages/Timer';
import { StudyHours } from './pages/StudyHours';
import { Analytics } from './pages/Analytics';
import { Settings } from './pages/Settings';
import { FocusTimerProvider } from './ui/focusTimer';

function Router() {
  const [route] = useRoute();
  const { authState } = useStore();

  // Loading the session — splash to avoid flashing private data
  if (authState === 'loading') {
    return (
      <div style={{ minHeight: '100vh', display: 'grid', placeItems: 'center' }}>
        <div style={{ textAlign: 'center' }}>
          <div className="brand-mark" style={{ width: 44, height: 44, fontSize: 21, margin: '0 auto 10px' }}>M</div>
          <div className="muted small">Loading your preparation…</div>
        </div>
      </div>
    );
  }

  // Not authenticated — auth screen instead of the app (private data protected)
  if (authState === 'gate') return <AuthPage />;

  const page = (() => {
    switch (route) {
      case '/dashboard': return <Dashboard />;
      case '/syllabus': return <Syllabus />;
      case '/tasks': return <Tasks />;
      case '/calendar': return <CalendarPage />;
      case '/lectures': return <Lectures />;
      case '/revision': return <Revision />;
      case '/tests': return <Tests />;
      case '/answers': return <AnswerWriting />;
      case '/current-affairs': return <CurrentAffairs />;
      case '/timer': return <Timer />;
      case '/hours': return <StudyHours />;
      case '/analytics': return <Analytics />;
      case '/settings': return <Settings />;
      default: return <Dashboard />;
    }
  })();
  return (
    <>
      <AppShell>{page}</AppShell>
      <MigrationModal />
    </>
  );
}

export default function App() {
  return (
    <StoreProvider>
      <ToastProvider>
        <FocusTimerProvider>
          <Router />
        </FocusTimerProvider>
      </ToastProvider>
    </StoreProvider>
  );
}
