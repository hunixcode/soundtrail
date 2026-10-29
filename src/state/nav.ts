export type TabName = 'library' | 'player' | 'speed' | 'equalizer';

export const TAB_HREF: Record<TabName, '/' | '/player' | '/speed' | '/equalizer'> = {
  library: '/',
  player: '/player',
  speed: '/speed',
  equalizer: '/equalizer',
};

let lastTab: TabName = 'library';

export function rememberTab(name: TabName) {
  if (name !== 'player') lastTab = name;
}

export function previousTab(): TabName {
  return lastTab;
}
