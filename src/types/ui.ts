export type FlightSource = 'opensky' | 'adsb' | 'adsblol';

export interface LayerToggles {
  showFlights: boolean;
  showShips: boolean;
  showDrones: boolean;
  showMissiles: boolean;
  showGroundTraffic: boolean;
  pulseEnabled: boolean;
  showNews: boolean;
}

export const LAYER_TOGGLE_DEFAULTS: LayerToggles = {
  showFlights: true,
  showShips: true,
  showDrones: true,
  showMissiles: true,
  showGroundTraffic: false,
  pulseEnabled: true,
  showNews: false,
};

export interface UIState {
  isDetailPanelOpen: boolean;
  isCountersCollapsed: boolean;
  isFiltersExpanded: boolean;
  pulseEnabled: boolean;
  showGroundTraffic: boolean;
  showFlights: boolean;
  showShips: boolean;
  showDrones: boolean;
  showMissiles: boolean;
  showNews: boolean;
  openDetailPanel: () => void;
  closeDetailPanel: () => void;
  toggleCounters: () => void;
  toggleFilters: () => void;
  togglePulse: () => void;
  toggleGroundTraffic: () => void;
  toggleFlights: () => void;
  toggleShips: () => void;
  toggleDrones: () => void;
  toggleMissiles: () => void;
  toggleNews: () => void;
}
