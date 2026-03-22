import { useEffect, useRef, useCallback } from 'react';
import { useSearchStore } from '@/stores/searchStore';
import { useNotificationStore } from '@/stores/notificationStore';
import { useUIStore } from '@/stores/uiStore';
import { useSearchResults } from '@/hooks/useSearchResults';
import { SearchResultGroup } from '@/components/search/SearchResultGroup';
import type { MapEntity, SiteEntity } from '@/types/entities';

/**
 * Spotlight-style search modal opened via Cmd+K.
 * Renders conditionally when searchStore.isSearchModalOpen is true.
 * Includes the global Cmd+K listener (always mounted).
 */
export function SearchModal() {
  const isOpen = useSearchStore((s) => s.isSearchModalOpen);
  const query = useSearchStore((s) => s.query);
  const inputRef = useRef<HTMLInputElement>(null);
  const results = useSearchResults();

  // Global Cmd+K shortcut (always active)
  useEffect(() => {
    function handleGlobalKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        useSearchStore.getState().openSearchModal();
      }
    }
    document.addEventListener('keydown', handleGlobalKeyDown);
    return () => document.removeEventListener('keydown', handleGlobalKeyDown);
  }, []);

  // Autofocus input on open
  useEffect(() => {
    if (isOpen) {
      // Small delay to ensure DOM is ready
      requestAnimationFrame(() => {
        inputRef.current?.focus();
      });
    }
  }, [isOpen]);

  const handleSelect = useCallback((entity: MapEntity | SiteEntity) => {
    // Fly to entity
    useNotificationStore.getState().setFlyToTarget({
      lng: entity.lng,
      lat: entity.lat,
      zoom: 10,
    });

    // Select and open detail panel
    useUIStore.getState().selectEntity(entity.id);
    useUIStore.getState().openDetailPanel();

    // Close modal
    useSearchStore.getState().closeSearchModal();
  }, []);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      useSearchStore.getState().closeSearchModal();
    } else if (e.key === 'Enter') {
      const q = useSearchStore.getState().query.trim();
      if (q) {
        // Compute matched IDs from current results
        const ids = new Set<string>();
        for (const r of results.flights) ids.add(r.entity.id);
        for (const r of results.ships) ids.add(r.entity.id);
        for (const r of results.events) ids.add(r.entity.id);
        for (const r of results.sites) ids.add(r.entity.id);
        useSearchStore.getState().setMatchedIds(ids);
        useSearchStore.getState().applyAsFilter();
      }
    }
  }, [results]);

  const handleBackdropClick = useCallback((e: React.MouseEvent) => {
    // Only close if the click target IS the backdrop (outermost element)
    if (e.target === e.currentTarget) {
      useSearchStore.getState().closeSearchModal();
    }
  }, []);

  if (!isOpen) return null;

  return (
    <div
      data-testid="search-modal"
      className="fixed inset-0 z-[var(--z-modal)] flex items-start justify-center bg-black/50 pt-[20vh]"
      onClick={handleBackdropClick}
      onKeyDown={handleKeyDown}
    >
      <div className="w-full max-w-lg rounded-xl border border-border bg-surface-elevated shadow-2xl">
        {/* Search input */}
        <div className="flex items-center gap-3 border-b border-border px-4 py-3">
          <svg
            viewBox="0 0 24 24"
            className="h-5 w-5 shrink-0 text-text-muted"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <circle cx="11" cy="11" r="8" />
            <path d="M21 21l-4.35-4.35" />
          </svg>
          <input
            ref={inputRef}
            data-testid="search-input"
            type="text"
            placeholder="Search flights, ships, events, sites..."
            value={query}
            onChange={(e) => useSearchStore.getState().setQuery(e.target.value)}
            className="flex-1 bg-transparent text-lg text-text-primary placeholder:text-text-muted outline-none"
          />
          {query && (
            <button
              className="rounded p-1 text-text-muted hover:text-text-primary transition-colors"
              onClick={() => useSearchStore.getState().setQuery('')}
              aria-label="Clear search"
            >
              <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2}>
                <path d="M18 6L6 18M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>

        {/* Results area */}
        {query.trim() && (
          <div className="max-h-[400px] overflow-y-auto">
            {results.totalCount === 0 ? (
              <div className="px-4 py-8 text-center text-sm text-text-muted">
                No results found
              </div>
            ) : (
              <>
                <SearchResultGroup
                  type="Flights"
                  results={results.flights}
                  onSelect={handleSelect}
                />
                <SearchResultGroup
                  type="Ships"
                  results={results.ships}
                  onSelect={handleSelect}
                />
                <SearchResultGroup
                  type="Events"
                  results={results.events}
                  onSelect={handleSelect}
                />
                <SearchResultGroup
                  type="Sites"
                  results={results.sites}
                  onSelect={handleSelect}
                />
              </>
            )}

            {/* Footer hint */}
            {results.totalCount > 0 && (
              <div className="flex items-center justify-between border-t border-border px-4 py-2">
                <span className="text-[10px] text-text-muted">
                  {results.totalCount} result{results.totalCount !== 1 ? 's' : ''}
                </span>
                <span className="text-[10px] text-text-muted">
                  Press <kbd className="rounded bg-surface px-1 font-medium">Enter</kbd> to filter
                </span>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
