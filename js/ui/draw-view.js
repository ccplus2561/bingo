// 抽號卡（階段 5）：大號碼＋抽號／連抽／撤回／名次登錄／結束遊戲＋最新 5 次走馬燈。
// DOM 只建立一次，之後由 state.subscribe 驅動更新（按鈕不會被重建，鍵盤焦點與遙控器操作不中斷）。
import { getState, setState, subscribe } from '../core/state.js';
import { drawOne, drawnNumbers, appendRecords } from '../core/draw-engine.js';
import { paidDraw, maxBatchCount } from '../core/batch-draw.js';
import { undoLast } from '../core/undo.js';
import { canDeclareRank, declareRank, nextRank, retractLastRank, coveredPositions } from '../core/ranks.js';
import { NUMBER_MAX, TICKER_SIZE, FINANCE, BATCH_PLAY_INTERVAL_MS } from '../config/defaults.js';
import { el, toast, confirmDialog, showModal } from '../utils/dom.js';
import { bingoLetter, formatMoney } from '../utils/format.js';
import { createCheckPanel } from './check-view.js';
import { endGameFlow, openReceipt } from './receipt-view.js';

const KIND = {
  none: { caption: '尚未抽號', tag: '' },
  new: { caption: '新號碼', tag: '新號' },
  repeat: { caption: '重複號碼（無效）', tag: '重複' },
  blank: { caption: '銘謝惠顧（無號碼）', tag: '銘謝惠顧' },
};

const MESSAGES = {
  ALL_DRAWN: '號碼已全部抽出',
  NOT_PLAYING: '請先到設定頁開始遊戲',
  NOTHING_TO_UNDO: '沒有可撤回的紀錄',
};

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/** 數字步進器：− N +，到達上下限時對應按鈕禁用 */
function createStepper({ min = 1, max = 10, value = 1, label, onChange }) {
  let current = value;
  const out = el('output', { class: 'stepper-value', 'aria-label': label });
  const minus = el('button', { type: 'button', 'aria-label': `${label}減一`, onClick: () => set(current - 1, true) }, '−');
  const plus = el('button', { type: 'button', 'aria-label': `${label}加一`, onClick: () => set(current + 1, true) }, '+');
  const node = el('div', { class: 'stepper' }, minus, out, plus);
  function set(n, notify = false) {
    current = Math.min(max, Math.max(min, n));
    out.textContent = String(current);
    minus.disabled = current <= min;
    plus.disabled = current >= max;
    if (notify && onChange) onChange(current);
  }
  set(current);
  return {
    node,
    get: () => current,
    set,
    setBounds(lo, hi) { min = lo; max = hi; set(current); },
    setDisabled(flag) { if (flag) { minus.disabled = true; plus.disabled = true; } else set(current); },
  };
}

export function initDrawView(root) {
  let prevLen = null; // 上次渲染時的 history 長度，用來判斷「剛抽出新的一筆」才播放動畫
  let busy = false; // 連抽播放中：鎖住所有抽號／撤回／名次／結束按鈕

  // ---- 大號碼區 ----
  const ball = el('div', { class: 'ball-xl', dataset: { kind: 'none' }, 'aria-live': 'polite', 'aria-atomic': 'true' });
  const stage = el('div', { class: 'stage' }, ball);
  const caption = el('p', { class: 'ball-caption-xl', dataset: { kind: 'none' } });
  const hint = el('p', { class: 'draw-hint' });
  // 空狀態：尚未開始時，直接提供前往設定頁的按鈕
  const gotoSettings = el('button', { type: 'button', class: 'btn btn-primary btn-block btn-goto', onClick: () => setState({ ui: { tab: 'settings' } }) }, '⚙️ 前往設定並開始遊戲');

  // ---- 抽號按鈕 ----
  const freeBtn = el('button', { type: 'button', class: 'btn btn-primary btn-xl', onClick: () => run(() => drawOne(getState(), { paid: false })) }, '🎲 抽號（免費）');
  const paidPriceTag = el('small', { class: 'btn-sub' });
  const paidBtn = el('button', { type: 'button', class: 'btn btn-gold btn-xl', onClick: () => run(() => paidDraw(getState(), 1)) },
    el('span', {}, '💰 付費單抽（1 次）'), paidPriceTag);

  // ---- 連抽 ----
  const stepper = createStepper({ min: 1, max: 10, value: 3, label: '連抽次數', onChange: () => update() });
  const batchSub = el('small', { class: 'btn-sub' });
  const batchLabel = el('span', {});
  const batchBtn = el('button', { type: 'button', class: 'btn btn-gold btn-batch', onClick: onBatch }, batchLabel, batchSub);

  // ---- 其他操作 ----
  const undoBtn = el('button', { type: 'button', class: 'btn btn-secondary btn-tool', onClick: onUndo }, '↩ 撤回上一個');
  const rankBtn = el('button', { type: 'button', class: 'btn btn-primary btn-tool', onClick: openRankDialog });
  const checkBtn = el('button', { type: 'button', class: 'btn btn-secondary btn-tool btn-check-modal', onClick: openCheckModal }, '🔍 驗卡');
  const endBtn = el('button', { type: 'button', class: 'btn btn-danger-outline btn-tool btn-end', onClick: onEnd }, '🏁 結束遊戲');

  // ---- 走馬燈：固定 5 格，避免版面跳動 ----
  const slots = Array.from({ length: TICKER_SIZE }, () => el('div', { class: 'chip is-empty' }));
  const ticker = el('div', { class: 'ticker', role: 'list', 'aria-label': `最新 ${TICKER_SIZE} 次抽號` }, ...slots);

  root.replaceChildren(
    el('div', { class: 'draw-panel' },
      stage,
      caption,
      gotoSettings,
      el('div', { class: 'draw-actions' }, freeBtn, paidBtn),
      el('div', { class: 'batch-row' }, stepper.node, batchBtn),
      el('div', { class: 'draw-tools' }, undoBtn, rankBtn, checkBtn, endBtn),
      hint,
      el('div', { class: 'ticker-wrap' }, el('p', { class: 'ticker-title' }, `最新 ${TICKER_SIZE} 次`), ticker)
    )
  );

  // ---------- 動作 ----------

  function apply(result) {
    if (!result.ok) {
      toast(MESSAGES[result.code] ?? result.message, 'error');
      return false;
    }
    setState({ game: result.game });
    return true;
  }

  function run(action) {
    if (busy) return;
    apply(action());
  }

  /** 連抽：先一次算出結果，再每 0.8 秒套用一筆（每一步的 state 都一致，彩池逐筆增加） */
  async function onBatch() {
    if (busy) return;
    const result = paidDraw(getState(), stepper.get());
    if (!result.ok) {
      toast(MESSAGES[result.code] ?? result.message, 'error');
      return;
    }
    busy = true;
    update();
    const startLen = getState().game.history.length;
    try {
      for (let i = 0; i < result.records.length; i++) {
        if (i > 0) await sleep(BATCH_PLAY_INTERVAL_MS);
        const { game } = getState();
        // 播放期間若局面被改動（例如在設定頁重新開始），就中止，避免寫入錯誤的紀錄
        if (game.status !== 'playing' || game.history.length !== startLen + i) break;
        setState({ game: appendRecords(game, [result.records[i]]) });
      }
    } finally {
      busy = false;
      update();
    }
    if (result.drawn < result.requested) toast(`號碼已抽完，實際抽出 ${result.drawn} 次`);
  }

  async function onUndo() {
    if (busy) return;
    const { settings, game } = getState();
    const last = game.history[game.history.length - 1];
    if (!last) {
      toast(MESSAGES.NOTHING_TO_UNDO, 'error');
      return;
    }
    const what = last.type === 'blank' ? '銘謝惠顧' : last.type === 'repeat' ? `重複號碼 ${last.number}` : `號碼 ${last.number}`;
    const lines = [`將撤回第 ${last.seq} 次抽號（${what}）。`];
    if (last.paid) lines.push(`這是付費抽號，將退回 ${formatMoney(settings.drawPrice)}（彩池與付費次數同步扣回）。`);
    if (game.ranks.some((r) => r.atSeq >= game.history.length)) lines.push('在這次抽號登錄的名次也會一併取消。');
    const ok = await confirmDialog({ title: '撤回上一個？', message: lines.join('\n'), confirmText: '↩ 撤回', danger: true });
    if (ok) run(() => undoLast(getState()));
  }

  function openRankDialog() {
    if (busy) return;
    const state = getState();
    const rank = nextRank(state);
    const canDeclare = canDeclareRank(state);
    const maxTie = Math.max(1, state.settings.players);
    const tie = createStepper({ min: 1, max: maxTie, value: 1, label: '同時賓果人數', onChange: () => refreshNote() });
    const note = el('p', { class: 'field-hint' });
    const refreshNote = () => {
      const n = tie.get();
      const last = Math.min(FINANCE.prizeRankCount, rank + n - 1);
      note.textContent = n > 1 && last > rank
        ? `${n} 人同時賓果：第 ${rank}～${last} 名獎金合併後 ${n} 人平分，下一個名次為第 ${rank + n} 名。`
        : n > 1 ? `${n} 人同時賓果，平分第 ${rank} 名獎金。` : '只有 1 人賓果時維持 1。';
    };
    refreshNote();

    const registered = state.game.ranks;
    const content = el('div', { class: 'rank-dialog' },
      registered.length
        ? el('ul', { class: 'rank-registered' }, ...registered.map((r) =>
            el('li', {}, `第 ${r.rank} 名已登錄${r.tieCount > 1 ? `（同時 ${r.tieCount} 人）` : ''}・第 ${r.atSeq} 次抽號`)))
        : null,
      canDeclare
        ? el('div', {}, el('p', { class: 'field-label' }, `第 ${rank} 名・同時賓果人數`), tie.node, note)
        : el('p', { class: 'field-error' }, declareRank(state).message ?? '目前無法登錄名次'),
      registered.length
        ? el('button', { type: 'button', class: 'btn btn-danger-outline btn-block', style: 'margin-top:12px',
            onClick: async () => {
              modal.close();
              const last = getState().game.ranks.at(-1);
              const ok = await confirmDialog({ title: '取消名次登錄？', message: `將取消第 ${last.rank} 名的登錄。`, confirmText: '取消登錄', danger: true });
              if (ok) apply(retractLastRank(getState()));
            } }, `取消上一個名次登錄（第 ${registered.at(-1).rank} 名）`)
        : null
    );
    const actions = [{ text: canDeclare ? '取消' : '關閉', kind: 'secondary' }];
    if (canDeclare) {
      actions.push({
        text: `🎉 登錄第 ${rank} 名`, kind: 'primary',
        onClick: () => {
          if (apply(declareRank(getState(), { tieCount: tie.get() }))) {
            toast(`第 ${rank} 名已登錄${tie.get() > 1 ? `（同時 ${tie.get()} 人）` : ''}`);
            return true;
          }
          return false;
        },
      });
    }
    const modal = showModal({ title: `🎉 第 ${rank} 名賓果`, content, actions });
  }

  function openCheckModal() {
    const panel = createCheckPanel();
    showModal({ title: '🔍 驗卡', content: panel.node, wide: true, actions: [{ text: '關閉', kind: 'primary' }], onClose: panel.destroy });
    panel.focus();
  }

  async function onEnd() {
    if (busy) return;
    if (getState().game.status === 'ended') openReceipt();
    else await endGameFlow();
  }

  // ---------- 畫面更新 ----------

  function fillBall(last) {
    const kind = last ? last.type : 'none';
    ball.dataset.kind = kind;
    caption.dataset.kind = kind;
    caption.textContent = KIND[kind].caption;
    if (!last) {
      ball.replaceChildren(el('span', { class: 'ball-num' }, '—'));
    } else if (last.type === 'blank') {
      ball.replaceChildren(el('span', { class: 'ball-word' }, '銘謝', el('br'), '惠顧'));
    } else {
      ball.replaceChildren(
        el('span', { class: 'ball-letter' }, bingoLetter(last.number)),
        el('span', { class: 'ball-num' }, String(last.number))
      );
    }
  }

  function chipFor(record, isNewest, fresh) {
    const isBlank = record.type === 'blank';
    return el('div', {
      class: `chip chip-${record.type}${isNewest ? ' is-newest' : ''}${isNewest && fresh ? ' is-fresh' : ''}`,
      role: 'listitem',
    },
      el('span', { class: 'chip-num' }, isBlank ? '🙏' : `${bingoLetter(record.number)}${record.number}`),
      el('span', { class: 'chip-tag' }, KIND[record.type].tag),
      record.paid ? el('span', { class: 'chip-paid' }, '付費') : null
    );
  }

  function update() {
    const state = getState();
    const { settings, game } = state;
    const history = game.history;
    const last = history[history.length - 1];
    const fresh = prevLen !== null && history.length > prevLen;

    // 大號碼：只有「抽出新的一筆」才重播彈出動畫
    fillBall(last);
    if (fresh) {
      ball.classList.remove('is-pop');
      void ball.offsetWidth; // 重新觸發動畫
      ball.classList.add('is-pop');
    }

    const playing = game.status === 'playing';
    const allDrawn = drawnNumbers(history).size >= NUMBER_MAX;
    const canDraw = playing && !allDrawn && !busy;

    // 抽號與連抽
    freeBtn.disabled = !canDraw;
    paidBtn.disabled = !canDraw;
    paidPriceTag.textContent = formatMoney(settings.drawPrice);
    const maxCount = maxBatchCount(settings);
    stepper.setBounds(1, maxCount);
    const n = stepper.get();
    const amount = n * settings.drawPrice;
    const overLimit = n > settings.maxBatchDraws || amount > settings.maxBatchAmount;
    batchLabel.textContent = `🎰 連抽 ${n} 次`;
    batchSub.textContent = `${formatMoney(amount)}（上限 ${formatMoney(settings.maxBatchAmount)}）`;
    batchBtn.disabled = !canDraw || overLimit;
    if (busy || !playing) stepper.setDisabled(true);

    // 撤回、名次、結束
    undoBtn.disabled = !playing || busy || history.length === 0;
    const rankFull = coveredPositions(game.ranks) >= FINANCE.prizeRankCount;
    rankBtn.textContent = rankFull ? '🎉 名次已登錄完' : `🎉 第 ${nextRank(state)} 名賓果`;
    // 名次全滿時仍可開啟視窗（用來取消上一個名次登錄）；尚無名次又無法登錄時才禁用
    rankBtn.disabled = !playing || busy || (game.ranks.length === 0 && !canDeclareRank(state));
    const ended = game.status === 'ended';
    endBtn.textContent = ended ? '🧾 查看結算收據' : '🏁 結束遊戲';
    endBtn.disabled = !(playing || ended) || busy;

    hint.textContent = ended ? '本局已結束，可查看結算收據或到設定頁開新局' : !playing ? MESSAGES.NOT_PLAYING : busy ? '連抽播放中，請稍候…' : allDrawn ? MESSAGES.ALL_DRAWN : '';
    hint.classList.toggle('is-warn', allDrawn && playing && !busy);
    gotoSettings.hidden = playing || ended;

    // 走馬燈：最新在最左
    const recent = history.slice(-TICKER_SIZE).reverse();
    slots.forEach((slot, i) => {
      const record = recent[i];
      const next = record ? chipFor(record, i === 0, fresh) : el('div', { class: 'chip is-empty' });
      slot.replaceWith(next);
      slots[i] = next;
    });

    prevLen = history.length;
  }

  update();
  subscribe(update);
}
