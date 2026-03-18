import { render, screen, fireEvent } from '@testing-library/react';
import { useUIStore } from '@/stores/uiStore';
import { useFilterStore } from '@/stores/filterStore';

import { FilterPanelSlot } from '@/components/layout/FilterPanelSlot';

describe('FilterPanelSlot', () => {
  beforeEach(() => {
    // Reset UI store -- filters collapsed by default
    useUIStore.setState({ isFiltersCollapsed: true });
    // Reset filter store to defaults
    useFilterStore.setState({
      selectedCountries: [],
      speedMin: null,
      speedMax: null,
      altitudeMin: null,
      altitudeMax: null,
      proximityPin: null,
      proximityRadiusKm: 100,
      dateStart: null,
      dateEnd: null,
      isSettingPin: false,
    });
  });

  it('renders collapsed by default with "Filters" header', () => {
    render(<FilterPanelSlot />);
    expect(screen.getByText('Filters')).toBeInTheDocument();
    // Collapsed -- no filter sections visible
    expect(screen.queryByText('Country')).not.toBeInTheDocument();
  });

  it('expanding shows filter section headings', () => {
    useUIStore.setState({ isFiltersCollapsed: false });
    render(<FilterPanelSlot />);
    // Section headers rendered with uppercase CSS -- text content is title case
    // Some labels also appear in RangeSlider, so use getAllByText
    expect(screen.getAllByText('Country').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('Speed').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('Altitude').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('Proximity').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('Date Range')).toBeInTheDocument();
  });

  it('shows badge count when filters are active', () => {
    // Set a country filter to make activeFilterCount = 1
    useFilterStore.setState({ selectedCountries: ['Iran'] });
    useUIStore.setState({ isFiltersCollapsed: false });
    render(<FilterPanelSlot />);
    expect(screen.getByText('(1)')).toBeInTheDocument();
  });

  it('shows "Clear all filters" button when filters are active', () => {
    useFilterStore.setState({ selectedCountries: ['Iran'] });
    useUIStore.setState({ isFiltersCollapsed: false });
    render(<FilterPanelSlot />);
    expect(screen.getByText('Clear all filters')).toBeInTheDocument();
  });

  it('does not show "Clear all filters" button when no filters active', () => {
    useUIStore.setState({ isFiltersCollapsed: false });
    render(<FilterPanelSlot />);
    expect(screen.queryByText('Clear all filters')).not.toBeInTheDocument();
  });

  it('clicking header toggles expansion', () => {
    render(<FilterPanelSlot />);
    // Initially collapsed
    expect(screen.queryByText('Country')).not.toBeInTheDocument();
    // Click to expand
    fireEvent.click(screen.getByText('Filters'));
    expect(screen.getByText('Country')).toBeInTheDocument();
  });

  it('has data-testid attribute', () => {
    render(<FilterPanelSlot />);
    expect(screen.getByTestId('filter-panel-slot')).toBeInTheDocument();
  });

  it('shows arrow indicator for active filter and dashes for inactive', () => {
    useFilterStore.setState({ selectedCountries: ['Iran'] });
    useUIStore.setState({ isFiltersCollapsed: false });
    render(<FilterPanelSlot />);
    // Country is active (arrow), others inactive (dashes)
    const arrows = screen.getAllByText('\u25B6');
    expect(arrows.length).toBeGreaterThanOrEqual(1);
    const dashes = screen.getAllByText('---');
    // 4 inactive section headers + 2 RangeSlider labels (speed, altitude showing "---" when at defaults)
    expect(dashes.length).toBe(6);
  });
});
