import type { Platform } from './types';
import { WebPlatform } from './web';
import { TikTokPlatform, isTikTokRuntime } from './tiktok';

// 런타임 감지 후 적절한 구현 반환 (docs/03 §2)
export function createPlatform(): Platform {
  return isTikTokRuntime() ? new TikTokPlatform() : new WebPlatform();
}

export type { Platform } from './types';
