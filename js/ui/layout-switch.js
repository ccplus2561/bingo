// 響應式與手動切換：決定實際版面（mobile / desktop），寫到 <html data-layout>。
// 偏好存在 state.ui.layout（'auto' | 'mobile' | 'desktop'），重新整理後保留。
import { LAYOUTS, LAYOUT_BREAKPOINT } from '../config/defaults.js';
import { getState, setState, subscribe } from '../core/state.js';

export const LAYOUT_LABELS = {
  auto: { icon: '🖥️', text: '自動' },
  mobile: { icon: '📱', text: '手機' },
  desktop: { icon: '🖥️', text: '電腦' },
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

export function initLayoutSwitch(button) {
  const root = document.documentElement;
  const mq = window.matchMedia(`(min-width: ${LAYOUT_BREAKPOINT}px)`);

  function apply() {
    const pref = getState().ui.layout;
    const actual = resolveLayout(pref, window.innerWidth);
    root.dataset.layout = actual;
    root.dataset.layoutPref = pref;
    const info = LAYOUT_LABELS[pref] ?? LAYOUT_LABELS.auto;
    button.textContent = `${info.icon} ${info.text}`;
    button.setAttribute(
      'aria-label',
      `版面：${info.text}${pref === 'auto' ? `（目前為${actual === 'desktop' ? '電腦' : '手機'}）` : ''}，點擊切換`
    );
  }

  button.addEventListener('click', () => {
    setState({ ui: { layout: nextLayoutPref(getState().ui.layout) } });
  });

  // 拖曳縮放視窗：只重算版面，不動 state，進度不會遺失
  mq.addEventListener('change', apply);
  window.addEventListener('resize', apply);
  subscribe(apply);
  apply();
}
