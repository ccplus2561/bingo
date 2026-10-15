// 結算收據：純函式、無 DOM。只輸出「最終結果」，不含任何調降過程或警告。
// 金額守恆：總彩池 = 主持人辛苦費 + 前三名實發 + 安慰獎實發 + 零頭（零頭 = 其餘全部，歸主持人）。
import { FINANCE } from '../config/defaults.js';
import { settle, calcPoolBreakdown } from './finance.js';
import { calcPayouts, calcPayoutTotal } from './ranks.js';
import { drawnNumbers } from './draw-engine.js';
import { formatMoney, formatNumber } from '../utils/format.js';

/** 結束遊戲：只有進行中才能結束，回傳新的 game 欄位（由 UI 套用） */
export function endGame(state) {
  if (state.game.status !== 'playing') return { ok: false, code: 'NOT_PLAYING', message: '遊戲尚未開始或已結束' };
  return { ok: true, game: { ...state.game, status: 'ended' } };
}

/**
 * 組出收據資料。
 * prizeLines：第 1～3 名各一列，status = 'declared'（有人得獎）| 'merged'（併入前一名次平分）| 'none'（無人得獎）。
 */
export function buildReceipt(state) {
  const { settings, game } = state;
  const settlement = settle(state);
  const pool = calcPoolBreakdown(state);
  const payouts = calcPayouts(state, settlement);
  const prizePaid = calcPayoutTotal(payouts);
  const consolationTotal = settlement.consolationTotal;
  const hostFee = settlement.hostFee;
  const remainder = pool.total - hostFee - prizePaid - consolationTotal;

  const prizeLines = [];
  for (let position = 1; position <= FINANCE.prizeRankCount; position++) {
    const owner = payouts.find((p) => p.positions.includes(position));
    if (!owner) prizeLines.push({ position, status: 'none', winners: 0, perPerson: 0, subtotal: 0 });
    else if (owner.rank !== position) prizeLines.push({ position, status: 'merged', mergedInto: owner.rank, winners: 0, perPerson: 0, subtotal: 0 });
    else {
      prizeLines.push({
        position, status: 'declared', winners: owner.winners, perPerson: owner.perPerson,
        subtotal: owner.perPerson * owner.winners, positions: owner.positions,
      });
    }
  }

  return {
    players: settings.players,
    drawCount: game.history.length,
    drawnCount: drawnNumbers(game.history).size,
    pool,
    totalPool: pool.total,
    prizeLines,
    prizePaid,
    consolation: { unit: settlement.consolationUnitUsed, people: settlement.unrankedPlayers, total: consolationTotal },
    hostFee,
    remainder,
    noWinners: payouts.length === 0,
  };
}

/** 收據各分項加總（供測試與畫面核對）：應恆等於 totalPool */
export function receiptSum(r) {
  return r.hostFee + r.prizePaid + r.consolation.total + r.remainder;
}

function prizeLineText(line) {
  if (line.status === 'none') return `第 ${line.position} 名：無人得獎`;
  if (line.status === 'merged') return `第 ${line.position} 名：併入第 ${line.mergedInto} 名平分`;
  const range = line.positions.length > 1 ? `（第 ${line.positions[0]}～${line.positions.at(-1)} 名獎金平分）` : '';
  const who = line.winners > 1 ? `${line.winners} 人，每人 ${formatMoney(line.perPerson)}，共 ${formatMoney(line.subtotal)}` : `每人 ${formatMoney(line.perPerson)}`;
  return `第 ${line.position} 名${range}：${who}`;
}

/** 純文字版收據（複製到群組用）。dateText 由呼叫端提供，避免核心依賴時鐘 */
export function receiptToText(r, dateText = '') {
  const lines = [
    '🧧 兵果彩盤｜本局結算收據',
    dateText,
    `參加人數：${formatNumber(r.players)} 人｜抽號 ${formatNumber(r.drawCount)} 次`,
    '────────────',
    `總收入：${formatMoney(r.totalPool)}`,
    `　新卡：${formatMoney(r.pool.newCards)}`,
    `　續卡：${formatMoney(r.pool.renewCards)}`,
    `　付費抽號：${formatMoney(r.pool.paidDraws)}`,
    '────────────',
    '【前三名實領】',
    ...r.prizeLines.map(prizeLineText),
    `前三名合計：${formatMoney(r.prizePaid)}`,
    '────────────',
    `安慰獎：${formatNumber(r.consolation.people)} 人 × ${formatMoney(r.consolation.unit)} = ${formatMoney(r.consolation.total)}`,
    `主持人辛苦費：${formatMoney(r.hostFee)}`,
    `零頭：${formatMoney(r.remainder)}`,
  ];
  return lines.filter((l) => l !== '').join('\n');
}
