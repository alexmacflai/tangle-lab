const HOSTED_ASSET_PREFIX = '/vinyl-stickers-static';

function isHostedVinylRoute() {
  if (typeof window === 'undefined') return false;
  const hash = window.location.hash || '';
  const pathname = window.location.pathname || '';
  return hash.startsWith('#/vinyl-stickers') || pathname.startsWith('/vinyl-stickers');
}

export function vinylAssetPath(inputPath) {
  if (!inputPath) return inputPath;
  if (/^(https?:|data:)/.test(inputPath)) return inputPath;

  const path = inputPath.startsWith('/') ? inputPath : `/${inputPath}`;
  if (path.startsWith(HOSTED_ASSET_PREFIX)) return path;

  if (!isHostedVinylRoute()) {
    return path;
  }

  return `${HOSTED_ASSET_PREFIX}${path}`;
}
