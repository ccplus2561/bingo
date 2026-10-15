// 付費單抽／連抽：純函式、無 DOM
import { drawOne } from './draw-engine.js';

/** 單次連抽的次數上限：同時受「連抽上限」與「單次付費上限」限制（至少 1） */
export function maxBatchCount(settings) {
  const byAmount = settings.drawPrice > 0 ? Math.floor(settings.maxBatchAmount / settings.drawPrice) : settings.maxBatchDraws;
  return Math.max(1, Math.min(settings.maxBatchDraws, byAmount));
}

const fail = (code, message) => ({ ok: false, code, message });

/**
 * 付費抽號 count 次（1 ~ maxBatchDraws，且 count × drawPrice ≤ maxBatchAmount）。
 * 同一次共用 batchId；遇到 75 號抽完就停，只計實際次數。
 * 成功：{ ok:true, records, requested, drawn, game }
 * 失敗：INVALID_COUNT / EXCEEDS_BATCH_DRAWS / EXCEEDS_BATCH_AMOUNT / ALL_DRAWN
 */
export function paidDraw(state, count, opts = {}) {
  const { settings } = state;
  if (!Number.isInteger(count) || count < 1) return fail('INVALID_COUNT', '次數需為 1 以上的整數');
  if (count > settings.maxBatchDraws) {
    return fail('EXCEEDS_BATCH_DRAWS', `單次最多連抽 ${settings.maxBatchDraws} 次`);
  }
  if (count * settings.drawPrice > settings.maxBatchAmount) {
    return fail('EXCEEDS_BATCH_AMOUNT', `單次付費上限 ${settings.maxBatchAmount} 元`);
  }

  const now = opts.now ?? Date.now;
  const batchId = opts.batchId ?? `b${state.game.history.length + 1}-${now()}`;
  const records = [];
  let working = { settings, game: state.game };

  for (let i = 0; i < count; i++) {
    const res = drawOne(working, { ...opts, paid: true, batchId });
    if (!res.ok) {
      if (res.code === 'ALL_DRAWN' && records.length > 0) break; // 抽完為止
      return res;
    }
    records.push(res.record);
    working = { settings, game: res.game };
  }
  return { ok: true, records, requested: count, drawn: records.length, game: working.game };
}
