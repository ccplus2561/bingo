// 🧾 本局結算收據（全螢幕）：結束遊戲流程、列印、複製文字版、開新局。
// 只呈現最終結果；不顯示辛苦費或安慰獎被調降的過程，也不顯示任何警告。
import { getState, setState, reset } from '../core/state.js';
import { endGame, buildReceipt, receiptToText } from '../core/receipt.js';
import { el, toast, confirmDialog, showModal } from '../utils/dom.js';
import { formatMoney, formatNumber } from '../utils/format.js';

let openOverlay = null;

const dateText = () => new Date().toLocaleString('zh-TW', { hour12: false });

const line = (label, value, cls = '') =>
  el('div', { class: `rc-row ${cls}` }, el('span', { class: 'rc-label' }, label), el('strong', { class: 'rc-value' }, value));

function prizeRow(l) {
  if (l.status === 'none') return line(`第 ${l.position} 名`, '無人得獎', 'is-none');
  if (l.status === 'merged') return line(`第 ${l.position} 名`, `併入第 ${l.mergedInto} 名平分`, 'is-none');
  const range = l.positions.length > 1 ? `（第 ${l.positions[0]}～${l.positions.at(-1)} 名獎金平分）` : '';
  const who = l.winners > 1 ? `${l.winners} 人 × ${formatMoney(l.perPerson)}` : formatMoney(l.perPerson);
  return line(`🏆 第 ${l.position} 名${range}`, who, 'is-prize');
}

/** 複製文字到剪貼簿；不支援 Clipboard API 時改用 execCommand */
async function copyText(text) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    const area = el('textarea', { value: text, style: 'position:fixed;opacity:0;top:0;left:0' });
    document.body.append(area);
    area.select();
    let ok = false;
    try { ok = document.execCommand('copy'); } catch { ok = false; }
    area.remove();
    return ok;
  }
}

/** 開啟（或重新開啟）全螢幕收據。只有已結束的局才可開啟 */
export function openReceipt() {
  const state = getState();
  if (state.game.status !== 'ended') return;
  closeReceipt();
  const r = buildReceipt(state);
  const when = dateText();
  const previous = document.activeElement;

  const close = () => {
    document.removeEventListener('keydown', onKey);
    overlay.remove();
    openOverlay = null;
    if (previous && previous.focus) previous.focus();
  };
  // 只在沒有其他彈窗時，Esc 才關閉收據
  const onKey = (e) => { if (e.key === 'Escape' && !document.querySelector('.modal-overlay')) close(); };

  const onScreenshot = () => showModal({
    title: '📸 截圖建議',
    content: el('div', {},
      el('p', {}, '手機：同時按「電源鍵＋音量上」（iPhone：側邊鍵＋音量上）即可截圖整張收據；內容較長時可往下捲動後再截一張。'),
      el('p', { style: 'margin-top:8px' }, '電腦：Windows 按 Win＋Shift＋S，Mac 按 Shift＋Command＋4，框選收據範圍。'),
      el('p', { style: 'margin-top:8px' }, '也可按「🖨 列印」另存成 PDF，或「📋 複製文字版收據」貼到家族群組。')),
    actions: [{ text: '知道了', kind: 'primary' }],
  });

  const onCopy = async () => {
    const ok = await copyText(receiptToText(r, when));
    toast(ok ? '已複製文字版收據' : '複製失敗，請改用截圖或列印', ok ? 'info' : 'error');
  };

  const onNewGame = async () => {
    const ok = await confirmDialog({
      title: '開新局？',
      message: '將清除本局所有設定與紀錄，回到初始狀態，此操作無法復原。建議先截圖或複製收據。',
      confirmText: '🔄 開新局',
      danger: true,
    });
    if (!ok) return;
    close();
    reset();
    setState({ ui: { tab: 'settings' } });
    toast('已開新局');
  };

  const overlay = el('div', { class: 'receipt-overlay', role: 'dialog', 'aria-modal': 'true', 'aria-label': '本局結算收據' },
    el('div', { class: 'receipt-scroll' },
      el('article', { class: 'receipt' },
        el('h2', { class: 'rc-title' }, '🧧 本局結算收據'),
        el('p', { class: 'rc-sub' }, `${when}｜參加 ${formatNumber(r.players)} 人｜抽號 ${formatNumber(r.drawCount)} 次`),

        el('section', { class: 'rc-sec' },
          el('div', { class: 'rc-total' }, el('span', {}, '總收入'), el('strong', {}, formatMoney(r.totalPool))),
          line('新卡', formatMoney(r.pool.newCards)),
          line('續卡', formatMoney(r.pool.renewCards)),
          line('付費抽號', formatMoney(r.pool.paidDraws))),

        el('section', { class: 'rc-sec' },
          el('h3', { class: 'rc-h' }, '前三名實領'),
          ...r.prizeLines.map(prizeRow),
          line('前三名合計', formatMoney(r.prizePaid), 'is-sum')),

        el('section', { class: 'rc-sec' },
          el('h3', { class: 'rc-h' }, '其他'),
          line(`安慰獎（${formatNumber(r.consolation.people)} 人 × ${formatMoney(r.consolation.unit)}）`, formatMoney(r.consolation.total)),
          line('主持人辛苦費', formatMoney(r.hostFee)),
          line('零頭', formatMoney(r.remainder))))),
    el('div', { class: 'receipt-actions' },
      el('button', { type: 'button', class: 'btn btn-secondary', onClick: onScreenshot }, '📸 截圖建議'),
      el('button', { type: 'button', class: 'btn btn-secondary', onClick: () => window.print() }, '🖨 列印'),
      el('button', { type: 'button', class: 'btn btn-secondary', onClick: onCopy }, '📋 複製文字版收據'),
      el('button', { type: 'button', class: 'btn btn-danger-outline', onClick: onNewGame }, '🔄 開新局'),
      el('button', { type: 'button', class: 'btn btn-primary', onClick: close }, '關閉收據')));

  document.body.append(overlay);
  document.addEventListener('keydown', onKey);
  openOverlay = { close };
  overlay.querySelector('.receipt-actions .btn:last-child').focus();
}

export function closeReceipt() {
  if (openOverlay) openOverlay.close();
}

/** 「結束遊戲」流程：二次確認 → status='ended' → 彈出收據 */
export async function endGameFlow() {
  const ok = await confirmDialog({
    title: '結束遊戲？',
    message: '結束後將進入結算並產生收據，之後無法再抽號或撤回，確定要結束本局嗎？',
    confirmText: '🏁 結束遊戲',
    danger: true,
  });
  if (!ok) return;
  const result = endGame(getState());
  if (!result.ok) {
    toast(result.message, 'error');
    return;
  }
  setState({ game: result.game });
  openReceipt();
}
