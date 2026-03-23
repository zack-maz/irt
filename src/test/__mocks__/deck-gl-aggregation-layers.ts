/**
 * Mock for @deck.gl/aggregation-layers in jsdom tests.
 * Captures constructor props so tests can inspect layer configuration without WebGL.
 */

export class HeatmapLayer {
  id: string;
  props: Record<string, unknown>;

  constructor(props: Record<string, unknown> = {}) {
    this.id = (props.id as string) ?? '';
    this.props = { ...props };
  }
}
