import { StatusDropdown } from '@/components/layout/StatusDropdown';
import { NotificationBell } from '@/components/layout/NotificationBell';
import { SearchModal } from '@/components/search/SearchModal';
import { useSearchStore } from '@/stores/searchStore';

export function Topbar() {
  return (
    <header
      data-testid="topbar"
      className="relative z-[var(--z-controls)] flex h-[var(--height-topbar)] w-full items-center justify-between border-b border-border bg-surface-overlay px-4 backdrop-blur-sm"
    >
      {/* Left: Status dropdown with title */}
      <StatusDropdown />

      {/* Center: Search hint */}
      <button
        data-testid="topbar-search-hint"
        className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-text-muted hover:bg-white/5 transition-colors"
        aria-label="Open search"
        onClick={() => useSearchStore.getState().openSearchModal()}
      >
        <svg
          viewBox="0 0 24 24"
          className="h-4 w-4"
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <circle cx="11" cy="11" r="8" />
          <path d="M21 21l-4.35-4.35" />
        </svg>
        <kbd className="rounded bg-surface-elevated px-1.5 py-0.5 text-[10px] font-medium text-text-secondary">
          Cmd+K
        </kbd>
      </button>

      {/* Right: Notification bell */}
      <div className="flex items-center">
        <NotificationBell />
      </div>

      {/* Search modal overlay (z-modal renders above everything) */}
      <SearchModal />
    </header>
  );
}
