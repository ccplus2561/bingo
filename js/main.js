// 啟動入口：讀檔、版面切換、建立分頁，並載入各視圖
import { load, getState, subscribe } from './core/state.js';
import { initTabs } from './ui/tabs.js';
import { initSettings } from './ui/settings-view.js';
import { initDrawView } from './ui/draw-view.js';
import { initPrizeView } from './ui/prize-view.js';
import { initBoardView } from './ui/board-view.js';
import { initCheckView } from './ui/check-view.js';
import { initLayoutSwitch, openLayoutPicker } from './ui/layout-switch.js';
import { initEffects } from './ui/effects.js';
import { initRulesView } from './ui/rules-view.js';
import { openReceipt } from './ui/receipt-view.js';

const STATUS_TEXT = { setup: '設定中', playing: '遊戲進行中', ended: '已結束' };

function start() {
  load();
  initLayoutSwitch();
  initTabs(document.getElementById('tab-bar'), document.querySelectorAll('[data-panel]'));
  initPrizeView(document.getElementById('pool-root')); // 電腦版左欄：與獎金池分頁共用同一份邏輯
  initDrawView(document.getElementById('draw-root'));
  initBoardView(document.getElementById('board-root'));
  initPrizeView(document.getElementById('prize-root'));
  initCheckView(document.getElementById('check-root'));
  initSettings(document.getElementById('settings-root'));
  initEffects({ soundBtn: document.getElementById('sound-btn'), ttsBtn: document.getElementById('tts-btn') });

  initRulesView(document.getElementById('rules-btn'));
  const receiptBtn = document.getElementById('receipt-btn');
  receiptBtn.addEventListener('click', openReceipt);

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
