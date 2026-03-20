// @vitest-environment node
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Fake WebSocket class for testing
class FakeWebSocket {
  static instances: FakeWebSocket[] = [];
  url: string;
  listeners: Record<string, Array<(event: unknown) => void>> = {};
  sentMessages: string[] = [];
  closeCallCount = 0;

  constructor(url: string) {
    this.url = url;
    FakeWebSocket.instances.push(this);
  }

  addEventListener(event: string, handler: (event: unknown) => void): void {
    if (!this.listeners[event]) this.listeners[event] = [];
    this.listeners[event].push(handler);
  }

  send(data: string): void {
    this.sentMessages.push(data);
  }

  close(): void {
    this.closeCallCount++;
  }

  // Simulate server events
  simulateOpen(): void {
    for (const handler of this.listeners['open'] ?? []) {
      handler({});
    }
  }

  simulateMessage(data: unknown): void {
    for (const handler of this.listeners['message'] ?? []) {
      handler({ data: JSON.stringify(data) });
    }
  }

  simulateError(error?: unknown): void {
    for (const handler of this.listeners['error'] ?? []) {
      handler(error ?? new Error('WebSocket error'));
    }
  }
}

// Sample AISStream message
const samplePositionReport = {
  MessageType: 'PositionReport',
  Message: {
    PositionReport: {
      UserID: 123456789,
      Latitude: 27.5,
      Longitude: 52.3,
      Sog: 12.5,
      Cog: 180.0,
      TrueHeading: 175,
    },
  },
  MetaData: {
    MMSI: 123456789,
    ShipName: 'TEST VESSEL',
    latitude: 27.5,
    longitude: 52.3,
    time_utc: '2026-03-15T10:00:00Z',
  },
};

describe('AISStream Adapter - collectShips()', () => {
  let collectShips: typeof import('../../adapters/aisstream.js').collectShips;

  beforeEach(async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-03-15T00:00:00Z'));
    FakeWebSocket.instances = [];
    vi.stubGlobal('WebSocket', FakeWebSocket);
    process.env.AISSTREAM_API_KEY = 'test-key';
    delete process.env.AISSTREAM_COLLECT_MS;

    // Reset module state between tests
    vi.resetModules();
    const mod = await import('../../adapters/aisstream.js');
    collectShips = mod.collectShips;
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
    delete process.env.AISSTREAM_API_KEY;
    delete process.env.AISSTREAM_COLLECT_MS;
  });

  it('sends correct subscription with API key and bbox on open', async () => {
    const promise = collectShips();

    expect(FakeWebSocket.instances).toHaveLength(1);
    const ws = FakeWebSocket.instances[0];
    expect(ws.url).toBe('wss://stream.aisstream.io/v0/stream');

    // Simulate connection open
    ws.simulateOpen();

    expect(ws.sentMessages).toHaveLength(1);
    const subscription = JSON.parse(ws.sentMessages[0]);
    expect(subscription.APIKey).toBe('test-key');
    expect(subscription.BoundingBoxes).toEqual([
      [[0.0, 20.0], [50.0, 80.0]],
    ]);
    expect(subscription.FilterMessageTypes).toEqual(['PositionReport']);

    // Let the collect window expire to resolve
    await vi.advanceTimersByTimeAsync(5000);
    await promise;
  });

  it('normalizes PositionReport to ShipEntity correctly', async () => {
    const promise = collectShips();
    const ws = FakeWebSocket.instances[0];
    ws.simulateOpen();
    ws.simulateMessage(samplePositionReport);

    await vi.advanceTimersByTimeAsync(5000);
    const ships = await promise;

    expect(ships).toHaveLength(1);
    const ship = ships[0];
    expect(ship.id).toBe('ship-123456789');
    expect(ship.type).toBe('ship');
    expect(ship.lat).toBe(27.5);
    expect(ship.lng).toBe(52.3);
    expect(ship.label).toBe('TEST VESSEL');
    expect(ship.data.mmsi).toBe(123456789);
    expect(ship.data.shipName).toBe('TEST VESSEL');
    expect(ship.data.speedOverGround).toBe(12.5);
    expect(ship.data.courseOverGround).toBe(180.0);
    expect(ship.data.trueHeading).toBe(175);
  });

  it('deduplicates by MMSI (later message overwrites earlier)', async () => {
    const promise = collectShips();
    const ws = FakeWebSocket.instances[0];
    ws.simulateOpen();

    // First message
    ws.simulateMessage(samplePositionReport);

    // Same MMSI, updated position
    ws.simulateMessage({
      ...samplePositionReport,
      Message: {
        PositionReport: {
          ...samplePositionReport.Message.PositionReport,
          Latitude: 28.0,
          Longitude: 53.0,
        },
      },
    });

    await vi.advanceTimersByTimeAsync(5000);
    const ships = await promise;

    expect(ships).toHaveLength(1);
    expect(ships[0].lat).toBe(28.0);
    expect(ships[0].lng).toBe(53.0);
  });

  it('resolves after AISSTREAM_COLLECT_MS timeout with collected ships', async () => {
    const promise = collectShips();
    const ws = FakeWebSocket.instances[0];
    ws.simulateOpen();

    // Send two different ships
    ws.simulateMessage(samplePositionReport);
    ws.simulateMessage({
      ...samplePositionReport,
      Message: {
        PositionReport: {
          ...samplePositionReport.Message.PositionReport,
          UserID: 987654321,
          Latitude: 30.0,
          Longitude: 50.0,
        },
      },
      MetaData: {
        ...samplePositionReport.MetaData,
        MMSI: 987654321,
        ShipName: 'SECOND VESSEL',
      },
    });

    await vi.advanceTimersByTimeAsync(5000);
    const ships = await promise;

    expect(ships).toHaveLength(2);
    expect(ws.closeCallCount).toBe(1); // WebSocket closed after collect window
  });

  it('rejects on WebSocket error', async () => {
    const promise = collectShips();
    const ws = FakeWebSocket.instances[0];

    ws.simulateError(new Error('Connection refused'));

    await expect(promise).rejects.toThrow('AISStream WebSocket connection failed');
  });

  it('throws when AISSTREAM_API_KEY is not set', async () => {
    delete process.env.AISSTREAM_API_KEY;
    // Need to reimport since env is checked at call time
    vi.resetModules();
    const mod = await import('../../adapters/aisstream.js');

    await expect(mod.collectShips()).rejects.toThrow('AISSTREAM_API_KEY');
  });

  it('respects custom AISSTREAM_COLLECT_MS env var', async () => {
    process.env.AISSTREAM_COLLECT_MS = '2000';
    vi.resetModules();
    const mod = await import('../../adapters/aisstream.js');

    const promise = mod.collectShips();
    const ws = FakeWebSocket.instances[FakeWebSocket.instances.length - 1];
    ws.simulateOpen();
    ws.simulateMessage(samplePositionReport);

    // Advance only 2000ms (custom value), should resolve
    await vi.advanceTimersByTimeAsync(2000);
    const ships = await promise;

    expect(ships).toHaveLength(1);
    expect(ws.closeCallCount).toBe(1);
  });
});
