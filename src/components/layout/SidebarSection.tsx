import type { ReactNode } from 'react';

interface SidebarSectionProps {
  title: string;
  icon: ReactNode;
  isOpen: boolean;
  onToggle: () => void;
  children: ReactNode;
  id: string;
}

export function SidebarSection({
  title,
  icon,
  isOpen,
  onToggle,
  children,
  id,
}: SidebarSectionProps) {
  return (
    <div id={id} data-testid={`sidebar-section-${id}`}>
      <button
        onClick={onToggle}
        className="flex w-full items-center gap-2 py-2 text-xs font-semibold uppercase tracking-wider text-text-secondary hover:text-text-primary transition-colors"
      >
        <span className="h-4 w-4 flex items-center justify-center text-text-muted">{icon}</span>
        <span className="flex-1 text-left">{title}</span>
        <svg
          viewBox="0 0 24 24"
          className={`h-3 w-3 text-text-muted transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path d="M6 9l6 6 6-6" />
        </svg>
      </button>
      <div
        className={`overflow-hidden transition-all duration-200 ${isOpen ? 'max-h-[2000px] opacity-100' : 'max-h-0 opacity-0'}`}
      >
        <div className="pb-2">{children}</div>
      </div>
    </div>
  );
}
