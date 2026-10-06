import { MediaServerType } from '@server/constants/server';
import Media from '@server/entity/Media';
import { getSettings } from '@server/lib/settings';
import assert from 'node:assert/strict';
import { afterEach, beforeEach, describe, it } from 'node:test';

describe('Sluthub playback links', () => {
  let previousServerType: number;

  beforeEach(() => {
    previousServerType = getSettings().main.mediaServerType;
    getSettings().main.mediaServerType = MediaServerType.JELLYFIN;
  });

  afterEach(() => {
    getSettings().main.mediaServerType = previousServerType;
  });

  it('links standard and 4K playback to their respective items', () => {
    const media = new Media({
      jellyfinMediaId: 'standard-item',
      jellyfinMediaId4k: '4k-item',
    });

    media.setPlexUrls();

    assert.equal(media.mediaUrl, 'https://sluthub.is/#/item/standard-item');
    assert.equal(media.mediaUrl4k, 'https://sluthub.is/#/item/4k-item');
  });

  it('supports items available only in 4K', () => {
    const media = new Media({ jellyfinMediaId4k: '4k-only-item' });

    media.setPlexUrls();

    assert.equal(media.mediaUrl, undefined);
    assert.equal(media.mediaUrl4k, 'https://sluthub.is/#/item/4k-only-item');
  });
});
