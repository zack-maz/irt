import { render, screen } from '@testing-library/react';
import { useFlightStore } from '@/stores/flightStore';
import { useShipStore } from '@/stores/shipStore';
import { useEventStore } from '@/stores/eventStore';
import { StatusPanel } from '@/components/ui/StatusPanel';

describe('StatusPanel', () => {
  beforeEach(() => {
    useFlightStore.setState({
      connectionStatus: 'connected',
      flightCount: 0,
    });
    useShipStore.setState({
      connectionStatus: 'connected',
      shipCount: 0,
    });
    useEventStore.setState({
      connectionStatus: 'connected',
      eventCount: 0,
    });
  });

  it('renders three feed lines (flights, ships, events)', () => {
    useFlightStore.setState({ connectionStatus: 'connected', flightCount: 247 });
    useShipStore.setState({ connectionStatus: 'connected', shipCount: 42 });
    useEventStore.setState({ connectionStatus: 'connected', eventCount: 17 });

    render(<StatusPanel />);

    expect(screen.getByText('247')).toBeInTheDocument();
    expect(screen.getByText('42')).toBeInTheDocument();
    expect(screen.getByText('17')).toBeInTheDocument();
    expect(screen.getByText('flights')).toBeInTheDocument();
    expect(screen.getByText('ships')).toBeInTheDocument();
    expect(screen.getByText('events')).toBeInTheDocument();
  });

  it('shows green dot for connected status', () => {
    useFlightStore.setState({ connectionStatus: 'connected', flightCount: 10 });
    render(<StatusPanel />);

    const dot = screen.getByTestId('status-dot-flights');
    expect(dot.className).toContain('bg-accent-green');
  });

  it('shows yellow dot for stale status', () => {
    useShipStore.setState({ connectionStatus: 'stale', shipCount: 5 });
    render(<StatusPanel />);

    const dot = screen.getByTestId('status-dot-ships');
    expect(dot.className).toContain('bg-accent-yellow');
  });

  it('shows red dot for error status', () => {
    useEventStore.setState({ connectionStatus: 'error', eventCount: 0 });
    render(<StatusPanel />);

    const dot = screen.getByTestId('status-dot-events');
    expect(dot.className).toContain('bg-accent-red');
  });

  it('shows gray pulsing dot and dash for loading status', () => {
    useFlightStore.setState({ connectionStatus: 'loading', flightCount: 0 });
    render(<StatusPanel />);

    const dot = screen.getByTestId('status-dot-flights');
    expect(dot.className).toContain('bg-text-muted');
    expect(dot.className).toContain('animate-pulse');
    // Em dash (\u2014) should be shown instead of count
    expect(screen.getByText('\u2014')).toBeInTheDocument();
  });

  it('shows red dot for rate_limited status', () => {
    useFlightStore.setState({ connectionStatus: 'rate_limited', flightCount: 100 });
    render(<StatusPanel />);

    const dot = screen.getByTestId('status-dot-flights');
    expect(dot.className).toContain('bg-accent-red');
  });
});
