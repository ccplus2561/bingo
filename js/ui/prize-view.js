// 🏆 獎金池（手機分頁與電腦左欄共用同一份邏輯）：
// 總彩池（新卡／續卡／付費抽分項）、前三名預估獎金、已出爐名次；第 2 名登錄後才顯示安慰獎。
// 遊戲中不顯示主持人辛苦費與零頭，也不顯示任何調降或警告訊息。
import { getState, subscribe } from '../core/state.js';
import { settle, calcPoolBreakdown } from '../core/finance.js';
import { isConsolationVisible, rankSlots } from '../core/ranks.js';
import { drawnNumbers } from '../core/draw-engine.js';
import { NUMBER_MAX } from '../config/defaults.js';
import { el } from '../utils/dom.js';
import { formatMoney, formatNumber } from '../utils/format.js';

const row = (label, value, cls = '') =>
  el('div', { class: `pr-row ${cls}` }, el('span', { class: 'pr-label' }, label), el('strong', { class: 'pr-value' }, value));

function slotRow(slot) {
  if (slot.status === 'declared') {
    const tie = slot.winners > 1 ? `（同時 ${slot.winners} 人）` : '';
    return row(`🎉 第 ${slot.position} 名已出爐${tie}`, `${slot.winners > 1 ? '各 ' : ''}${formatMoney(slot.perPerson)}`, 'is-declared');
  }
  if (slot.status === 'merged') {
    return row(`第 ${slot.position} 名`, `併入第 ${slot.mergedInto} 名平分`, 'is-merged');
  }
  return row(`第 ${slot.position} 名`, `預估 ${formatMoney(slot.estimate)}`);
}

export function initPrizeView(root) {
  function render() {
    const state = getState();
    const { settings, game } = state;
    const pool = calcPoolBreakdown(state);
    const settlement = settle(state);
    const slots = rankSlots(state, settlement);

    root.replaceChildren(
      el('div', { class: 'card prize-card' },
        el('h2', { class: 'card-title' }, '🏆 獎金池'),
        el('div', { class: 'pool-main' },
          el('p', { class: 'pool-label' }, '總彩池'),
          el('p', { class: 'pool-amount pool-amount-xl', 'aria-live': 'polite' }, formatMoney(pool.total))
        ),
        el('div', { class: 'pr-group' },
          row(`新卡 ${formatNumber(settings.newCardCount)} 張`, formatMoney(pool.newCards)),
          row(`續卡 ${formatNumber(settings.renewCardCount)} 張`, formatMoney(pool.renewCards)),
          row(`付費抽號 ${formatNumber(game.paidDrawCount)} 次`, formatMoney(pool.paidDraws))
        ),
        el('h3', { class: 'sub-title' }, '前三名獎金'),
        el('div', { class: 'pr-group' }, ...slots.map(slotRow)),
        isConsolationVisible(state)
          ? el('div', {},
              el('h3', { class: 'sub-title' }, '安慰獎'),
              el('div', { class: 'pr-group' },
                row('每人', formatMoney(settlement.consolationUnitUsed)),
                row('人數', `${formatNumber(settlement.unrankedPlayers)} 人`)))
          : null,
        el('div', { class: 'pr-group pr-foot' }, row('已抽出', `${drawnNumbers(game.history).size} / ${NUMBER_MAX}`))
      )
    );
  }
  render();
  subscribe(render);
}
