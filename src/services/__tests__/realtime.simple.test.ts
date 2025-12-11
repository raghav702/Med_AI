import { describe, it, expect } from 'vitest';
import { RealtimeConnectionStatus } from '../realtime';

describe('RealtimeService Types', () => {
  it('should have correct connection status enum values', () => {
    expect(RealtimeConnectionStatus.CONNECTING).toBe('connecting');
    expect(RealtimeConnectionStatus.CONNECTED).toBe('connected');
    expect(RealtimeConnectionStatus.DISCONNECTED).toBe('disconnected');
    expect(RealtimeConnectionStatus.ERROR).toBe('error');
    expect(RealtimeConnectionStatus.RECONNECTING).toBe('reconnecting');
  });
});