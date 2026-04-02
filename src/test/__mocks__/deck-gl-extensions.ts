/**
 * Mock for @deck.gl/extensions in jsdom tests.
 * Captures constructor props so tests can inspect extension configuration without WebGL.
 */

export class FillStyleExtension {
  props: Record<string, unknown>;

  constructor(props: Record<string, unknown> = {}) {
    this.props = { ...props };
  }
}
