import React from 'react';
import { StoreProvider } from './store/store';
import { ToastProvider } from './ui/toast';
import { AppShell } from './ui/AppShell';
import { useRoute } from './ui/router';
import { Dashboard } from './pages/Dashboard';
import { Syllabus } from './pages/Syllabus';
import { Tasks } from './pages/Tasks';
import { CalendarPage } from './pages/Calendar';
import { Lectures } from './pages/Lectures';
import { Revision } from './pages/Revision';
import { PYQTracker } from './pages/PYQTracker';
import { Tests } from './pages/Tests';
import { AnswerWriting } from './pages/AnswerWriting';
import { CurrentAffairs } from './pages/CurrentAffairs';
import { Timer } from './pages/Timer';
import { StudyHours } from './pages/StudyHours';
import { Analytics } from './pages/Analytics';
import { Settings } from './pages/Settings';

function Router() {
  const [route] = useRoute();
  const page = (() => {
    switch (route) {
      case '/dashboard': return <Dashboard />;
      case '/syllabus': return <Syllabus />;
      case '/tasks': return <Tasks />;
      case '/calendar': return <CalendarPage />;
      case '/lectures': return <Lectures />;
      case '/revision': return <Revision />;
      case '/pyq': return <PYQTracker />;
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
  return <AppShell>{page}</AppShell>;
}

export default function App() {
  return (
    <StoreProvider>
      <ToastProvider>
        <Router />
      </ToastProvider>
    </StoreProvider>
  );
}
