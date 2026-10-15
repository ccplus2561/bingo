// 兩個畫面：抽號（draw）與設定（settings），依 state.ui.tab 切換
import { getState, subscribe } from '../core/state.js';

export function initTabs(panels) {
  function apply() {
    let active = getState().ui.tab;
    if (active !== 'settings') active = 'draw'; // 舊存檔的 check / prize 一律回抽號
    panels.forEach((p) => { p.hidden = p.dataset.panel !== active; });
    window.scrollTo(0, 0);
  }
  let current = null;
  const run = () => { const t = getState().ui.tab; if (t !== current) { current = t; apply(); } };
  run();
  subscribe(run);
}
