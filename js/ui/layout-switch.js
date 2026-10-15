// 響應式與手動切換：決定實際版面（mobile / desktop），寫到 <html data-layout>。
// 偏好存在 state.ui.layout（'auto' | 'mobile' | 'desktop'），重新整理後保留。
// 每次進入網頁會跳出選擇視窗（openLayoutPicker）；之後可在「設定」頁的「介面」區更改（createLayoutPicker）。
import { LAYOUTS, LAYOUT_BREAKPOINT } from '../config/defaults.js';
import { getState, setState, subscribe } from '../core/state.js';
import { el, showModal } from '../utils/dom.js';

export const LAYOUT_LABELS = {
  auto: { icon: '🖥️', text: '自動', desc: '依螢幕寬度自動判斷' },
  mobile: { icon: '📱', text: '手機', desc: '單欄，底部分頁' },
  desktop: { icon: '🖥️', text: '電腦', desc: '三欄免滾動，適合投屏' },
};

/** 純函式：由偏好與視窗寬度算出實際版面 */
export function resolveLayout(pref, width, breakpoint = LAYOUT_BREAKPOINT) {
  if (pref === 'mobile' || pref === 'desktop') return pref;
  return width >= breakpoint ? 'desktop' : 'mobile';
}

/** 純函式：自動 → 手機 → 電腦 → 自動 */
export function nextLayoutPref(pref) {
  const i = LAYOUTS.indexOf(pref);
  return LAYOUTS[(i + 1) % LAYOUTS.length];
}

export function initLayoutSwitch() {
  const root = document.documentElement;
  const mq = window.matchMedia(`(min-width: ${LAYOUT_BREAKPOINT}px)`);

  function apply() {
    const pref = getState().ui.layout;
    root.dataset.layout = resolveLayout(pref, window.innerWidth);
    root.dataset.layoutPref = pref;
  }

  // 拖曳縮放視窗：只重算版面，不動 state，進度不會遺失
  mq.addEventListener('change', apply);
  window.addEventListener('resize', apply);
  subscribe(apply);
  apply();
}

/**
 * 三選一按鈕組（自動／手機／電腦）。點選時寫入 state.ui.layout 並呼叫 onPick；
 * 之後由 state 變化自動更新選取狀態（不需重建）。回傳 { node, destroy }。
 */
export function createLayoutPicker({ onPick } = {}) {
  const buttons = LAYOUTS.map((id) => {
    const info = LAYOUT_LABELS[id];
    return el('button', {
      type: 'button', class: 'layout-opt', dataset: { layout: id },
      onClick: () => { setState({ ui: { layout: id } }); if (onPick) onPick(id); },
    },
      el('span', { class: 'layout-opt-icon', 'aria-hidden': 'true' }, info.icon),
      el('span', { class: 'layout-opt-text' }, info.text),
      el('small', { class: 'layout-opt-desc' }, info.desc));
  });
  const node = el('div', { class: 'layout-opts', role: 'radiogroup', 'aria-label': '介面' }, ...buttons);

  function paint() {
    const pref = getState().ui.layout;
    const actual = resolveLayout(pref, window.innerWidth);
    for (const b of buttons) {
      const on = b.dataset.layout === pref;
      b.classList.toggle('is-active', on);
      b.setAttribute('role', 'radio');
      b.setAttribute('aria-checked', String(on));
    }
    node.dataset.actual = actual;
  }
  paint();
  const unsubscribe = subscribe(paint);
  return { node, destroy: typeof unsubscribe === 'function' ? unsubscribe : () => {} };
}

/** 每次進入網頁彈出的介面選擇視窗；點選即套用並關閉，Esc／點背景則沿用目前選擇 */
export function openLayoutPicker() {
  let modal = null;
  const picker = createLayoutPicker({ onPick: () => modal && modal.close() });
  modal = showModal({
    title: '請選擇介面',
    content: el('div', {},
      el('p', { class: 'field-hint' }, '可隨時到「設定」頁更改。'),
      picker.node),
    onClose: picker.destroy,
  });
}
