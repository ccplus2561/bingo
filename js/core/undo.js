// 撤回上一筆：純函式、無 DOM
import { recomputeStreak } from './draw-engine.js';

export { recomputeStreak };

/**
 * 撤回最後一筆 history。
 * 成功：{ ok:true, removed, game }（paid 紀錄會同步扣回 paidDrawCount；
 * invalidStreak 由 history 重算；宣告於已不存在紀錄的名次一併移除）
 * 失敗：{ ok:false, code:'NOTHING_TO_UNDO' }
 */
export function undoLast(state) {
  const { game } = state;
  if (game.history.length === 0) {
    return { ok: false, code: 'NOTHING_TO_UNDO', message: '沒有可撤回的紀錄' };
  }
  const removed = game.history[game.history.length - 1];
  const history = game.history.slice(0, -1);
  return {
    ok: true,
    removed,
    game: {
      ...game,
      history,
      paidDrawCount: Math.max(0, game.paidDrawCount - (removed.paid ? 1 : 0)),
      invalidStreak: recomputeStreak(history),
      ranks: game.ranks.filter((r) => r.atSeq <= history.length),
    },
  };
}
