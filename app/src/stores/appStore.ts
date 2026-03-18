import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { AppNotification, Toast } from '@/types';

interface AppState {
  sidebarCollapsed: boolean;
  toggleSidebar: () => void;
  setSidebarCollapsed: (collapsed: boolean) => void;

  selectedTenantId: string | null;
  setSelectedTenant: (id: string | null) => void;

  commandPaletteOpen: boolean;
  openCommandPalette: () => void;
  closeCommandPalette: () => void;

  notifications: AppNotification[];
  addNotification: (n: Omit<AppNotification, 'id' | 'timestamp'>) => void;
  markNotificationRead: (id: string) => void;
  dismissNotification: (id: string) => void;
  clearNotifications: () => void;
  unreadCount: () => number;

  toasts: Toast[];
  addToast: (t: Omit<Toast, 'id'>) => void;
  removeToast: (id: string) => void;
}

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      sidebarCollapsed: false,
      toggleSidebar: () => set((s) => ({ sidebarCollapsed: !s.sidebarCollapsed })),
      setSidebarCollapsed: (collapsed) => set({ sidebarCollapsed: collapsed }),

      selectedTenantId: null,
      setSelectedTenant: (id) => set({ selectedTenantId: id }),

      commandPaletteOpen: false,
      openCommandPalette: () => set({ commandPaletteOpen: true }),
      closeCommandPalette: () => set({ commandPaletteOpen: false }),

      notifications: [],
      addNotification: (n) =>
        set((s) => ({
          notifications: [
            { ...n, id: crypto.randomUUID(), timestamp: new Date().toISOString(), read: false },
            ...s.notifications,
          ].slice(0, 100),
        })),
      markNotificationRead: (id) =>
        set((s) => ({
          notifications: s.notifications.map((n) =>
            n.id === id ? { ...n, read: true } : n
          ),
        })),
      dismissNotification: (id) =>
        set((s) => ({
          notifications: s.notifications.filter((n) => n.id !== id),
        })),
      clearNotifications: () => set({ notifications: [] }),
      unreadCount: () => get().notifications.filter((n) => !n.read).length,

      toasts: [],
      addToast: (t) =>
        set((s) => ({
          toasts: [...s.toasts, { ...t, id: crypto.randomUUID() }],
        })),
      removeToast: (id) =>
        set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
    }),
    {
      name: 'msp-app-state',
      partialize: (state) => ({
        sidebarCollapsed: state.sidebarCollapsed,
        selectedTenantId: state.selectedTenantId,
      }),
    }
  )
);
