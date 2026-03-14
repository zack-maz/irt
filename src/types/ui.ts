export interface UIState {
  isDetailPanelOpen: boolean;
  isCountersCollapsed: boolean;
  isFiltersExpanded: boolean;
  openDetailPanel: () => void;
  closeDetailPanel: () => void;
  toggleCounters: () => void;
  toggleFilters: () => void;
}
