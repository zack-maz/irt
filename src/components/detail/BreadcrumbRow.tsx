import type { PanelView } from '@/types/ui';

interface BreadcrumbRowProps {
  stack: PanelView[];
  onBack: () => void;
}

/**
 * Thin, horizontally scrollable row showing previous navigation stack entries.
 * Appears between header and content when stack has entries.
 * - Left arrow button goes back one step
 * - Last (most recent) segment is clickable (same as back)
 * - Deeper segments are display-only
 */
export function BreadcrumbRow({ stack, onBack }: BreadcrumbRowProps) {
  if (stack.length === 0) return null;

  return (
    <div
      data-testid="breadcrumb-row"
      className="animate-breadcrumb-enter flex items-center gap-1 border-b border-border px-3 py-1.5 overflow-hidden whitespace-nowrap"
    >
      {/* Back arrow button */}
      <button
        data-testid="breadcrumb-back"
        onClick={onBack}
        className="shrink-0 text-text-muted hover:text-text-primary transition-colors text-sm leading-none"
        aria-label="Go back"
      >
        {'\u2190'}
      </button>

      {/* Single truncatable trail — clips with "..." at the panel edge */}
      <span className="truncate min-w-0 text-[10px] text-text-muted">
        {stack.map((entry, i) => {
          const isLast = i === stack.length - 1;
          return (
            <span key={`${entry.entityId ?? 'cluster'}-${i}`}>
              <span className="select-none"> &gt; </span>
              {isLast ? (
                <button
                  onClick={onBack}
                  className="hover:text-text-primary transition-colors"
                  title={entry.breadcrumbLabel}
                >
                  {entry.breadcrumbLabel}
                </button>
              ) : (
                <span title={entry.breadcrumbLabel}>
                  {entry.breadcrumbLabel}
                </span>
              )}
            </span>
          );
        })}
      </span>
    </div>
  );
}
