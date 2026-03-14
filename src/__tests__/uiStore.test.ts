import { useUIStore } from '@/stores/uiStore';

describe('uiStore', () => {
  beforeEach(() => {
    // Reset store to initial state before each test
    useUIStore.setState({
      isDetailPanelOpen: false,
      isCountersCollapsed: false,
      isFiltersExpanded: false,
    });
  });

  it('has all panels closed/collapsed in initial state', () => {
    const state = useUIStore.getState();
    expect(state.isDetailPanelOpen).toBe(false);
    expect(state.isCountersCollapsed).toBe(false);
    expect(state.isFiltersExpanded).toBe(false);
  });

  it('openDetailPanel sets isDetailPanelOpen to true', () => {
    useUIStore.getState().openDetailPanel();
    expect(useUIStore.getState().isDetailPanelOpen).toBe(true);
  });

  it('closeDetailPanel sets isDetailPanelOpen to false', () => {
    useUIStore.setState({ isDetailPanelOpen: true });
    useUIStore.getState().closeDetailPanel();
    expect(useUIStore.getState().isDetailPanelOpen).toBe(false);
  });

  it('toggleCounters flips isCountersCollapsed', () => {
    expect(useUIStore.getState().isCountersCollapsed).toBe(false);
    useUIStore.getState().toggleCounters();
    expect(useUIStore.getState().isCountersCollapsed).toBe(true);
    useUIStore.getState().toggleCounters();
    expect(useUIStore.getState().isCountersCollapsed).toBe(false);
  });

  it('toggleFilters flips isFiltersExpanded', () => {
    expect(useUIStore.getState().isFiltersExpanded).toBe(false);
    useUIStore.getState().toggleFilters();
    expect(useUIStore.getState().isFiltersExpanded).toBe(true);
    useUIStore.getState().toggleFilters();
    expect(useUIStore.getState().isFiltersExpanded).toBe(false);
  });
});
