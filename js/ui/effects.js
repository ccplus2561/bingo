// 氣氛層（階段 6）：頂部聲音／語音開關、依 state 變化播放音效與語音、賓果慶祝動畫。
// 設計：只「訂閱」state 並比對前後差異，不介入 draw-view 的操作流程，也不修改 core。
//   抽出新的一筆 → 滾動聲 ＋ 結果音效 ＋ 語音
//   history 變短  → 撤回提示音 ＋ 取消尚未播報的語音
//   登錄名次      → 賓果慶祝音 ＋ 語音 ＋ 紅包彩帶動畫
import { getState, setState, subscribe } from '../core/state.js';
import * as sound from '../audio/sound.js';
import * as tts from '../audio/tts.js';
import { phraseForRecord, phraseForRank } from '../audio/tts.js';
import { el, toast } from '../utils/dom.js';

const CONFETTI_COUNT = 36;
const ENVELOPE_COUNT = 8;
const CELEBRATE_MS = 4200;
const CELEBRATE_REDUCED_MS = 2200;
const ROLL_SECONDS = 0.3; // 滾動聲長度，結果音效排在其後

/**
 * 純函式：比對前後狀態，回傳要觸發的事件清單（可在 Node 測試）。
 * 事件：{type:'draw', record} | {type:'undo'} | {type:'reset'} | {type:'rank', rank, tieCount} | {type:'rankRetract'}
 */
export function diffEvents(prev, next) {
  const events = [];
  const ph = prev.game.history.length;
  const nh = next.game.history.length;
  if (nh > ph) {
    events.push({ type: 'draw', record: next.game.history[nh - 1] });
  } else if (nh < ph) {
    events.push({ type: next.game.status === 'playing' ? 'undo' : 'reset' });
  }
  const pr = prev.game.ranks.length;
  const nr = next.game.ranks.length;
  if (nr > pr && nh >= ph) {
    const r = next.game.ranks[nr - 1];
    events.push({ type: 'rank', rank: r.rank, tieCount: r.tieCount });
  } else if (nr < pr && nh >= ph) {
    events.push({ type: 'rankRetract' });
  }
  return events;
}

function snapshot(state) {
  return { game: { history: state.game.history, ranks: state.game.ranks, status: state.game.status } };
}

export function prefersReducedMotion() {
  try {
    return !!globalThis.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  } catch {
    return false;
  }
}

export function initEffects({ soundBtn, ttsBtn }) {
  // 不支援的功能直接隱藏開關，不報錯
  if (!sound.isSupported()) soundBtn.hidden = true;
  if (!tts.isSupported()) ttsBtn.hidden = true;

  // ---- 開關按鈕 ----
  function paintToggle(btn, name, on) {
    btn.setAttribute('aria-pressed', String(on));
    btn.setAttribute('aria-label', `${name}：${on ? '開啟，點擊關閉' : '關閉，點擊開啟'}`);
    btn.dataset.on = String(on);
    btn.replaceChildren(
      el('span', { class: 'hdr-icon', 'aria-hidden': 'true' }, on ? '🔊' : '🔇'),
      el('span', { class: 'hdr-text' }, name)
    );
  }

  soundBtn.addEventListener('click', () => {
    const want = !getState().ui.soundOn;
    if (want) {
      // 必須在這個 click 手勢內同步建立並 resume AudioContext
      if (!sound.setEnabled(true)) {
        toast('這個瀏覽器無法啟用音效', 'error');
        return;
      }
      sound.play('new'); // 開啟時的試聽
    } else {
      sound.setEnabled(false);
    }
    setState({ ui: { soundOn: want } });
  });

  ttsBtn.addEventListener('click', () => {
    const want = !getState().ui.ttsOn;
    if (want) {
      if (!tts.setEnabled(true)) {
        toast('這個瀏覽器不支援語音播報', 'error');
        return;
      }
      tts.speak('語音播報已開啟'); // 同一次手勢內發聲，同時解鎖 Safari
    } else {
      tts.setEnabled(false);
    }
    setState({ ui: { ttsOn: want } });
  });

  // ---- 依 state 變化觸發 ----
  let prev = snapshot(getState());
  let lastBatchId = null; // 連抽的每一筆共用 batchId：同一批連續播報，不同批（新操作）則先清掉舊語音

  function onState(state) {
    paintToggle(soundBtn, '音效', state.ui.soundOn);
    paintToggle(ttsBtn, '語音', state.ui.ttsOn);
    // state 與引擎不同步時（例如重新載入）以 state 為準
    if (!state.ui.soundOn && sound.isEnabled()) sound.setEnabled(false);
    if (!state.ui.ttsOn && tts.isEnabled()) tts.setEnabled(false);

    const events = diffEvents(prev, snapshot(state));
    prev = snapshot(state);
    for (const e of events) handle(e);
  }

  function handle(e) {
    switch (e.type) {
      case 'draw': {
        const kind = e.record.type;
        if (!e.record.batchId || e.record.batchId !== lastBatchId) tts.cancel(); // 新操作：取消仍在排隊的舊語音
        lastBatchId = e.record.batchId;
        sound.play('roll');
        sound.play(kind, { delay: ROLL_SECONDS });
        tts.speak(phraseForRecord(e.record));
        break;
      }
      case 'undo':
        lastBatchId = null;
        tts.cancel(); // 撤回：取消尚未播報的語音
        sound.play('undo');
        break;
      case 'reset':
        lastBatchId = null;
        tts.cancel();
        break;
      case 'rankRetract':
        sound.play('undo');
        break;
      case 'rank':
        sound.play('bingo');
        tts.speak(phraseForRank(e.rank));
        celebrate(e.rank, e.tieCount);
        break;
    }
  }

  onState(getState());
  subscribe(onState);
}

// ---- 賓果慶祝：CSS 紅包與彩帶 ----
let celebrateTimer = null;

export function celebrate(rank, tieCount = 1) {
  document.querySelector('.celebrate')?.remove();
  clearTimeout(celebrateTimer);

  const reduce = prefersReducedMotion();
  const banner = el('div', { class: 'celebrate-banner', role: 'status' },
    el('strong', {}, `🎉 第 ${rank} 名賓果！`),
    tieCount > 1 ? el('small', {}, `同時 ${tieCount} 人`) : null
  );
  const layer = el('div', { class: `celebrate${reduce ? ' is-static' : ''}` }, banner);

  if (!reduce) {
    const rand = (min, max) => min + Math.random() * (max - min);
    for (let i = 0; i < CONFETTI_COUNT; i++) {
      const piece = el('i', { class: `confetti c${i % 5}`, 'aria-hidden': 'true' });
      piece.style.setProperty('--x', `${rand(2, 98).toFixed(1)}vw`);
      piece.style.setProperty('--delay', `${rand(0, 1.2).toFixed(2)}s`);
      piece.style.setProperty('--dur', `${rand(2.4, 3.6).toFixed(2)}s`);
      piece.style.setProperty('--rot', `${Math.round(rand(360, 1080))}deg`);
      layer.append(piece);
    }
    for (let i = 0; i < ENVELOPE_COUNT; i++) {
      const env = el('span', { class: 'envelope', 'aria-hidden': 'true' }, '🧧');
      env.style.setProperty('--x', `${rand(4, 92).toFixed(1)}vw`);
      env.style.setProperty('--delay', `${rand(0, 1.4).toFixed(2)}s`);
      env.style.setProperty('--dur', `${rand(2.8, 3.8).toFixed(2)}s`);
      layer.append(env);
    }
  }

  document.body.append(layer);
  celebrateTimer = setTimeout(() => layer.remove(), reduce ? CELEBRATE_REDUCED_MS : CELEBRATE_MS);
}
