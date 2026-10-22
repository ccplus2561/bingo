// 全域狀態：純邏輯、無 DOM。localStorage 可注入（setStorage），方便 Node 測試。
import {
  STORAGE_KEY,
  GAME_STATUS,
  LAYOUTS,
  TAB_LIST,
  createDefaultState,
} from '../config/defaults.js';
import { recomputeStreak } from './draw-engine.js';

let storage = detectStorage();
let state = createDefaultState();
const listeners = new Set();

function detectStorage() {
  try {
    return globalThis.localStorage ?? null;
  } catch {
    return null; // 隱私模式或 Node 環境
  }
}

/** 注入儲存體（測試用，或傳入 null 停用存檔） */
export function setStorage(s) {
  storage = s;
}

/** 取得目前狀態（唯讀參考，請勿直接修改；用 setState） */
export function getState() {
  return state;
}

/**
 * 更新狀態。patch 格式：{ settings?, game?, ui? }，每個區塊做淺層合併
 * （陣列與物件欄位會整個取代）。更新後自動存檔並通知訂閱者。
 */
export function setState(patch = {}) {
  state = {
    settings: { ...state.settings, ...(patch.settings || {}) },
    game: { ...state.game, ...(patch.game || {}) },
    ui: { ...state.ui, ...(patch.ui || {}) },
  };
  save();
  notify();
  return state;
}

/** 訂閱狀態變化，回傳取消訂閱函式 */
export function subscribe(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

function notify() {
  for (const fn of [...listeners]) {
    try {
      fn(state);
    } catch (err) {
      console.error('[state] 訂閱者發生錯誤', err);
    }
  }
}

/** 存檔到 localStorage，失敗（空間不足／被停用）時回傳 false，不中斷遊戲 */
export function save() {
  if (!storage) return false;
  try {
    storage.setItem(STORAGE_KEY, JSON.stringify(state));
    return true;
  } catch (err) {
    console.warn('[state] 存檔失敗', err);
    return false;
  }
}

/** 讀檔；資料不存在或損毀時安全回退預設值 */
export function load() {
  const defaults = createDefaultState();
  let next = defaults;
  try {
    const text = storage ? storage.getItem(STORAGE_KEY) : null;
    if (text) next = sanitize(JSON.parse(text), defaults);
  } catch (err) {
    console.warn('[state] 存檔損毀，已回退預設值', err);
    next = defaults;
  }
  state = next;
  notify();
  return state;
}

/** 清除存檔並回到 setup 預設狀態 */
export function reset() {
  state = createDefaultState();
  try {
    if (storage) storage.removeItem(STORAGE_KEY);
  } catch (err) {
    console.warn('[state] 清除存檔失敗', err);
  }
  notify();
  return state;
}

// ---- 讀檔時的資料清洗：欄位缺漏或型別錯誤就用預設值 ----

function sameType(value, def) {
  if (Array.isArray(def)) return Array.isArray(value);
  if (typeof value !== typeof def) return false;
  return typeof value !== 'number' || Number.isFinite(value);
}

function cleanSection(raw, def) {
  const src = raw && typeof raw === 'object' ? raw : {};
  const out = {};
  for (const key of Object.keys(def)) {
    out[key] = sameType(src[key], def[key]) ? src[key] : structuredClone(def[key]);
  }
  return out;
}

export function sanitize(raw, defaults = createDefaultState()) {
  const src = raw && typeof raw === 'object' ? raw : {};
  const settings = cleanSection(src.settings, defaults.settings);
  const game = cleanSection(src.game, defaults.game);
  const ui = cleanSection(src.ui, defaults.ui);

  const ratio = settings.prizeRatio;
  const ratioOk =
    ratio.length === 3 &&
    ratio.every((n) => Number.isFinite(n) && n >= 0) &&
    ratio[0] + ratio[1] + ratio[2] === 100;
  if (!ratioOk) settings.prizeRatio = [...defaults.settings.prizeRatio];

  settings.rules = settings.rules
    .filter((r) => r && typeof r.title === 'string' && typeof r.body === 'string')
    .map((r) => ({ title: r.title, body: r.body }));
  if (src.settings && !Array.isArray(src.settings.rules)) settings.rules = defaults.settings.rules.map((r) => ({ ...r }));

  settings.maxBatchDraws = defaults.settings.maxBatchDraws; // 連抽上限非使用者設定，舊存檔一併套用新上限
  if (!GAME_STATUS.includes(game.status)) game.status = defaults.game.status;
  if (!LAYOUTS.includes(ui.layout)) ui.layout = defaults.ui.layout;
  if (!TAB_LIST.some((t) => t.id === ui.tab)) ui.tab = defaults.ui.tab;

  // 對局紀錄：剔除損毀項目，衍生欄位一律由 history 重算，確保一致
  game.history = game.history.filter(isRecord);
  game.paidDrawCount = game.history.filter((r) => r.paid).length;
  game.invalidStreak = recomputeStreak(game.history);
  game.ranks = game.ranks.filter(
    (r) => r && [1, 2, 3].includes(r.rank) && Number.isInteger(r.tieCount) && Number.isInteger(r.atSeq)
  );

  // 音效每次載入一律預設關閉（瀏覽器也需使用者操作才能解鎖播放）
  ui.soundOn = false;
  delete ui.ttsOn; // 舊存檔殘留欄位

  return { settings, game, ui };
}

function isRecord(r) {
  if (!r || typeof r !== 'object') return false;
  if (!Number.isInteger(r.seq) || typeof r.paid !== 'boolean') return false;
  if (r.type === 'blank') return r.number === null;
  if (r.type === 'new' || r.type === 'repeat') {
    return Number.isInteger(r.number) && r.number >= 1 && r.number <= 75;
  }
  return false;
}
