import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { Topbar } from './Topbar';
import { ToastContainer } from '@/components/ui/Toast';
import { CommandPalette } from '@/components/ui/CommandPalette';

export function AppLayout() {
  return (
    <div className="app-layout">
      <Sidebar />
      <div className="app-main">
        <Topbar />
        <main className="app-content">
          <Outlet />
        </main>
      </div>
      <ToastContainer />
      <CommandPalette />
    </div>
  );
}
