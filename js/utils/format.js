// 金額、數字格式化
import { BOARD_COLUMNS } from '../config/defaults.js';

/** 12345 → "12,345 元" */
export function formatMoney(n) {
  return `${Number(n).toLocaleString('zh-TW')} 元`;
}

/** 12345 → "12,345" */
export function formatNumber(n) {
  return Number(n).toLocaleString('zh-TW');
}

/** 無條件捨去至 10 元（金額計算共用） */
export function floorTo10(n) {
  return Math.floor(n / 10) * 10;
}

/** 號碼所屬的賓果欄位字母：7 → "B"、16 → "I"、75 → "O"；超出 1~75 回傳空字串 */
export function bingoLetter(n) {
  const col = BOARD_COLUMNS.find((c) => n >= c.min && n <= c.max);
  return col ? col.letter : '';
}
