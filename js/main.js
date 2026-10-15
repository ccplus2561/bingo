// 啟動入口：讀檔、版面切換、建立分頁，並載入各視圖
import { load, getState, setState, subscribe } from './core/state.js';
import { initTabs } from './ui/tabs.js';
import { initSettings } from './ui/settings-view.js';
import { initDrawView } from './ui/draw-view.js';
import { initTickerView } from './ui/ticker-view.js';
import { initPrizeView } from './ui/prize-view.js';
import { initBoardView } from './ui/board-view.js';
import { initCheckView } from './ui/check-view.js';
import { initLayoutSwitch, openLayoutPicker } from './ui/layout-switch.js';
import { initEffects } from './ui/effects.js';
import { initRulesView } from './ui/rules-view.js';
import { openReceipt } from './ui/receipt-view.js';
import { el } from './utils/dom.js';

const STATUS_TEXT = { setup: '設定中', playing: '遊戲進行中', ended: '已結束' };

function start() {
  load();
  setState({ ui: { layout: 'mobile' } }); // 每次載入預設手機版，進站視窗再讓使用者選擇
  initLayoutSwitch();
  initTabs(document.getElementById('tab-bar'), document.querySelectorAll('[data-panel]'));
  initPrizeView(document.getElementById('pool-root')); // 電腦版左欄：與獎金池分頁共用同一份邏輯
  initDrawView(document.getElementById('draw-root'));
  initTickerView(document.getElementById('ticker-root'));
  initBoardView(document.getElementById('board-root'));
  initPrizeView(document.getElementById('prize-root'));
  initCheckView(document.getElementById('check-root'));
  initSettings(document.getElementById('settings-root'));
  initEffects({ soundBtn: document.getElementById('sound-btn'), ttsBtn: document.getElementById('tts-btn') });

  initRulesView(document.getElementById('rules-btn'));
  const receiptBtn = document.getElementById('receipt-btn');
  receiptBtn.addEventListener('click', openReceipt);

  // 電腦版沒有分頁列：右上「設定」按鈕在抽號卡與設定頁之間切換
  const settingsBtn = document.getElementById('settings-btn');
  settingsBtn.addEventListener('click', () => {
    setState({ ui: { tab: getState().ui.tab === 'settings' ? 'draw' : 'settings' } });
  });
  const updateSettingsBtn = () => {
    const { tab, layout } = getState().ui;
    const inSettings = tab === 'settings';
    settingsBtn.replaceChildren(
      el('span', { class: 'hdr-icon', 'aria-hidden': 'true' }, inSettings ? '🎲' : '⚙️'),
      el('span', { class: 'hdr-text' }, inSettings ? '抽號' : '設定'));
    settingsBtn.setAttribute('aria-label', inSettings ? '回到抽號卡' : '設定');
    // 電腦版只有抽號與設定兩個畫面：從手機版帶過來的驗卡／獎金池分頁改回抽號
    if (layout === 'desktop' && (tab === 'check' || tab === 'prize')) setState({ ui: { tab: 'draw' } });
  };
  updateSettingsBtn();
  subscribe(updateSettingsBtn);

  const badge = document.getElementById('status-badge');
  const updateBadge = () => {
    const status = getState().game.status;
    badge.textContent = STATUS_TEXT[status] ?? status;
    badge.dataset.status = status;
    receiptBtn.hidden = status !== 'ended'; // 結束後才顯示「🧾 收據」，重新整理後仍可再開
  };
  updateBadge();
  subscribe(updateBadge);

  // 載入完成：移除載入畫面
  const boot = document.getElementById('boot');
  if (boot) boot.hidden = true;

  // 每次進入網頁都先讓使用者選擇介面（自動／手機／電腦），之後可到「設定」更改
  openLayoutPicker();
}

start();
