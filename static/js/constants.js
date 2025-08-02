// API configuration
// アプリケーションが配置されているベースパスを含める
// APIエンドポイントのベースURLを動的に決定
// Flaskから渡されたBASE_PATHがあれば使い、なければURLの最初のセグメントをベースパスとする
// スクリプトタグの src からアプリケーションのベースパスを取得
let basePath = '';
if (typeof document !== 'undefined') {
  const moduleScripts = Array.from(document.getElementsByTagName('script'))
    .filter(s => s.type === 'module' && s.src && s.src.endsWith('/static/js/index.js'));
  if (moduleScripts.length > 0) {
    const srcPath = new URL(moduleScripts[0].src).pathname;
    // /static/js/index.js を除去してベースパスを決定
    basePath = srcPath.replace(/\/static\/js\/index\.js$/, '');
  }
}
// API リクエスト時はパスにプレフィックスを付与
export const API_BASE_URL = basePath;

// Default league settings
export const DEFAULT_LEAGUE_SETTINGS = {
  gameStartChipCount: 25000,
  calculationBaseChipCount: 25000,
  umaPoints: {
    1: 20,
    2: 10,
    3: -10,
    4: -20
  }
};

// Application constants
export const APP_NAME = '麻雀リーグトラッカー';
export const VERSION = '2.0.0';

// Local storage keys
export const STORAGE_KEYS = {
  THEME: 'mahjongTheme',
  ACTIVE_SEASON: 'activeSeasonId'
};

// Routes
export const ROUTES = {
  HOME: '/',
  PLAYERS: '/players',
  RECORD_GAME: '/record-game',
  GAME_HISTORY: '/game-history',
  SETTINGS: '/settings',
  SEASONS: '/seasons',
  PLAYER_DETAIL: '/player'
};