import { useEffect } from 'react';
import { useSearchStore } from '@/stores/searchStore';
import { useNotificationStore } from '@/stores/notificationStore';
import { useUIStore } from '@/stores/uiStore';

/**
 * Centralized Escape key handler with priority stack:
 * 1. Search modal open -> close search modal
 * 2. Search filter active -> clear search filter
 * 3. Notification dropdown open -> close dropdown
 * 4. Detail panel open -> close detail panel + deselect entity
 *
 * Only one action fires per keypress. Mounted once in AppShell.
 */
export function useEscapeKeyHandler() {
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key !== 'Escape') return;

      // Priority 1: Close search modal
      if (useSearchStore.getState().isSearchModalOpen) {
        useSearchStore.getState().closeSearchModal();
        return;
      }

      // Priority 2: Clear search filter
      if (useSearchStore.getState().isFilterMode) {
        useSearchStore.getState().clearSearch();
        return;
      }

      // Priority 3: Close notification dropdown
      if (useNotificationStore.getState().isDropdownOpen) {
        useNotificationStore.getState().closeDropdown();
        return;
      }

      // Priority 4: Close detail panel and deselect entity
      if (useUIStore.getState().isDetailPanelOpen) {
        useUIStore.getState().closeDetailPanel();
        useUIStore.getState().selectEntity(null);
        return;
      }
    }

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);
}
