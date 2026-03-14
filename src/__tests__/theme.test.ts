import { readFileSync } from 'fs';
import { resolve } from 'path';

describe('theme CSS', () => {
  const css = readFileSync(resolve(__dirname, '../styles/app.css'), 'utf-8');

  it('contains @theme directive', () => {
    expect(css).toContain('@theme');
  });

  it('defines accent-blue color', () => {
    expect(css).toContain('accent-blue');
  });

  it('defines accent-red color', () => {
    expect(css).toContain('accent-red');
  });

  it('defines accent-green color', () => {
    expect(css).toContain('accent-green');
  });

  it('defines accent-yellow color', () => {
    expect(css).toContain('accent-yellow');
  });

  it('defines surface colors', () => {
    expect(css).toContain('--color-surface');
    expect(css).toContain('--color-surface-elevated');
    expect(css).toContain('--color-surface-overlay');
  });

  it('defines z-index scale variables', () => {
    expect(css).toContain('--z-map');
    expect(css).toContain('--z-overlay');
    expect(css).toContain('--z-panel');
    expect(css).toContain('--z-controls');
    expect(css).toContain('--z-modal');
  });

  it('defines detail panel width variable', () => {
    expect(css).toContain('--width-detail-panel');
  });
});
