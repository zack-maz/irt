import { describe, it, expect } from 'vitest';
import { ETHNIC_GROUPS, ETHNIC_GROUP_IDS } from '@/lib/ethnicGroups';

describe('EthnicOverlay', () => {
  it('ETHNIC_GROUPS has exactly 10 entries', () => {
    expect(ETHNIC_GROUP_IDS).toHaveLength(10);
    expect(Object.keys(ETHNIC_GROUPS)).toHaveLength(10);
  });

  it.todo('ethnic-zones.json is valid FeatureCollection with group/groups property on each feature');

  it.todo('ETHNIC_GROUPS config covers all groups found in ethnic-zones.json');

  it.todo('useEthnicLayers returns empty array when ethnic layer is inactive');

  it.todo('EthnicOverlay component mounts without error when active');

  it.todo('LEGEND_REGISTRY contains ethnic entry after EthnicOverlay module is imported');

  it.todo('LayerTogglesSlot renders ethnic row without soon label');

  it.todo('overlap features have groups array property');
});
