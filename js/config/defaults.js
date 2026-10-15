// 預設值與常數（單一來源）。其他模組一律由此匯入，不要在別處寫死數字。

export const STORAGE_KEY = 'bingo-board-v1';

// 號碼範圍
export const NUMBER_MIN = 1;
export const NUMBER_MAX = 75;

// 設定欄位的輸入上限（防呆）
export const LIMITS = {
  maxPlayers: 999,
  maxCards: 999,
  maxPrice: 9999,
};

// 版面：>= 此寬度（px）時「自動」模式採電腦三欄
export const LAYOUT_BREAKPOINT = 1024;

// 連抽依序播放，每筆結果的間隔（毫秒）
export const BATCH_PLAY_INTERVAL_MS = 800;

// 走馬燈顯示最新幾次抽號
export const TICKER_SIZE = 5;

// 賓果欄位（矩陣標示用）
export const BOARD_COLUMNS = [
  { letter: 'B', min: 1, max: 15 },
  { letter: 'I', min: 16, max: 30 },
  { letter: 'N', min: 31, max: 45 },
  { letter: 'G', min: 46, max: 60 },
  { letter: 'O', min: 61, max: 75 },
];

// 底部分頁
export const TAB_LIST = [
  { id: 'draw', icon: '🎲', label: '抽號卡' },
  { id: 'check', icon: '🔍', label: '驗卡' },
  { id: 'prize', icon: '🏆', label: '獎金池' },
  { id: 'settings', icon: '⚙️', label: '設定' },
];

export const GAME_STATUS = ['setup', 'playing', 'ended'];
export const LAYOUTS = ['mobile', 'desktop']; // 只提供手機版／電腦版（無自動）

// 抽號暗控參數（單一來源，可自行調整）
export const DRAW_RULES = {
  maxInvalidStreak: 4, // 最多連續 4 次無效，第 5 次必定為新有效號
  baseInvalidRate: 0.15, // 壓力 0 時的無效號（repeat/blank）出現率
  boostedInvalidRate: 0.6, // 壓力 1 時的無效號出現率
  repeatShare: 0.5, // 兩個開關皆開時，無效號中 repeat 所占比例（其餘為 blank）
  defaultPressure: 0.5, // 階段 3 接上財務壓力前的預設壓力值（0~1）
};

// 財務與名次常數
export const FINANCE = {
  prizeRankCount: 3, // 設獎名次數（前三名）
  consolationDiscount: 30, // 續卡張數 > 新卡張數時的安慰獎單價上限
  hostFeeStep: 1, // 結算強平：辛苦費每步調降 1%
  consolationStep: 10, // 結算強平：安慰獎單價每步調降 10 元
  prizeRounding: 10, // 獎金無條件捨去至 10 元
  comfortRatio: 1.5, // 壓力值：可分配彩池達「最低需求」的 1.5 倍以上視為寬裕（壓力 0）
};

export const DEFAULT_SETTINGS = {
  players: 0,
  newCardPrice: 50,
  renewCardPrice: 30,
  newCardCount: 0,
  renewCardCount: 0,
  drawPrice: 10,
  maxBatchDraws: 5, // 連抽最高 5 次
  maxBatchAmount: 100,
  prizeRatio: [50, 30, 20],
  consolationAmount: 50,
  allowRepeat: false,
  allowBlank: false,
  hostFeePercent: 10,
  locked: false,
};

export const DEFAULT_GAME = {
  status: 'setup',
  history: [],
  paidDrawCount: 0,
  invalidStreak: 0,
  ranks: [],
};

export const DEFAULT_UI = {
  layout: 'mobile',
  soundOn: false,
  ttsOn: false,
  tab: 'draw',
};

/** 取得全新的預設 state（深拷貝，避免共用參考） */
export function createDefaultState() {
  return {
    settings: { ...DEFAULT_SETTINGS, prizeRatio: [...DEFAULT_SETTINGS.prizeRatio] },
    game: { ...DEFAULT_GAME, history: [], ranks: [] },
    ui: { ...DEFAULT_UI },
  };
}
