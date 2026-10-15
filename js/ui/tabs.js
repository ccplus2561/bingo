// 手機底部 4 分頁：切換面板並記錄在 state.ui.tab
import { TAB_LIST } from '../config/defaults.js';
import { getState, setState, subscribe } from '../core/state.js';
import { el } from '../utils/dom.js';

export function initTabs(nav, panels) {
  const buttons = TAB_LIST.map((tab) =>
    el(
      'button',
      {
        type: 'button',
        class: 'tab-btn',
        role: 'tab',
        dataset: { tab: tab.id },
        onClick: () => {
          if (getState().ui.tab !== tab.id) setState({ ui: { tab: tab.id } });
        },
      },
      el('span', { class: 'tab-icon', 'aria-hidden': 'true' }, tab.icon),
      el('span', { class: 'tab-label' }, tab.label)
    )
  );
  nav.replaceChildren(...buttons);

  let current = null;
  function apply() {
    const active = getState().ui.tab;
    if (active === current) return;
    current = active;
    buttons.forEach((b) => {
      const on = b.dataset.tab === active;
      b.classList.toggle('is-active', on);
      b.setAttribute('aria-selected', String(on));
    });
    panels.forEach((p) => {
      p.hidden = p.dataset.panel !== active;
    });
    window.scrollTo(0, 0);
  }
  apply();
  subscribe(apply);
}
