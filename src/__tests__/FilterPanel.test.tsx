import { render, screen, fireEvent } from '@testing-library/react';
import { useUIStore } from '@/stores/uiStore';
import { useFilterStore } from '@/stores/filterStore';

import { FilterPanelSlot } from '@/components/layout/FilterPanelSlot';

describe('FilterPanelSlot', () => {
  beforeEach(() => {
    useUIStore.setState({ isFiltersCollapsed: true });
    useFilterStore.setState({
      flightCountries: [],
      eventCountries: [],
      flightSpeedMin: null,
      flightSpeedMax: null,
      shipSpeedMin: null,
      shipSpeedMax: null,
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
    expect(screen.queryByText('Flight Country')).not.toBeInTheDocument();
  });

  it('expanding shows filter section headings', () => {
    useUIStore.setState({ isFiltersCollapsed: false });
    render(<FilterPanelSlot />);
    expect(screen.getByText('Flight Country')).toBeInTheDocument();
    expect(screen.getByText('Event Country')).toBeInTheDocument();
    expect(screen.getAllByText('Flight Speed').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('Ship Speed').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('Altitude').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('Proximity').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('Date Range')).toBeInTheDocument();
  });

  it('shows badge count when filters are active', () => {
    useFilterStore.setState({ flightCountries: ['Iran'] });
    useUIStore.setState({ isFiltersCollapsed: false });
    render(<FilterPanelSlot />);
    expect(screen.getByText('(1)')).toBeInTheDocument();
  });

  it('shows "Clear all filters" button when filters are active', () => {
    useFilterStore.setState({ flightCountries: ['Iran'] });
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
    expect(screen.queryByText('Flight Country')).not.toBeInTheDocument();
    fireEvent.click(screen.getByText('Filters'));
    expect(screen.getByText('Flight Country')).toBeInTheDocument();
  });

  it('has data-testid attribute', () => {
    render(<FilterPanelSlot />);
    expect(screen.getByTestId('filter-panel-slot')).toBeInTheDocument();
  });

  it('shows arrow indicator for active filter and dashes for inactive', () => {
    useFilterStore.setState({ flightCountries: ['Iran'] });
    useUIStore.setState({ isFiltersCollapsed: false });
    render(<FilterPanelSlot />);
    const arrows = screen.getAllByText('\u25B6');
    expect(arrows.length).toBeGreaterThanOrEqual(1);
    const dashes = screen.getAllByText('---');
    expect(dashes.length).toBeGreaterThanOrEqual(4);
  });
});
