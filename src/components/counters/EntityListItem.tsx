import type { CounterEntity } from './useCounterData';

interface EntityListItemProps {
  entity: CounterEntity;
  isSelected: boolean;
  onClick: (entity: CounterEntity) => void;
}

export function EntityListItem({ entity, isSelected, onClick }: EntityListItemProps) {
  return (
    <button
      className={`flex w-full items-center justify-between px-2 h-[25px] text-xs transition-colors rounded ${
        isSelected ? 'bg-white/10' : 'hover:bg-white/5'
      }`}
      onClick={() => onClick(entity)}
      data-testid="entity-list-item"
      aria-label={entity.label}
    >
      <span className="truncate text-text-primary mr-2">{entity.label}</span>
      <span className="text-text-muted tabular-nums shrink-0">{entity.metric}</span>
    </button>
  );
}
