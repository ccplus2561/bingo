// ⚙️ 設定頁：欄位驗證、開始遊戲（鎖定）、重新開始
import { getState, setState, reset, subscribe } from '../core/state.js';
import { DEFAULT_SETTINGS, LIMITS } from '../config/defaults.js';
import { el, toast, confirmDialog } from '../utils/dom.js';
import { formatMoney } from '../utils/format.js';
import { createLayoutPicker } from './layout-switch.js';

// ---------- 驗證（純函式，可在 Node 測試） ----------

const NUMBER_RULES = {
  players: { label: '參加總人數', max: LIMITS.maxPlayers },
  newCardPrice: { label: '新卡單價', max: LIMITS.maxPrice },
  renewCardPrice: { label: '續卡單價', max: LIMITS.maxPrice },
  newCardCount: { label: '新卡張數', max: LIMITS.maxCards },
  renewCardCount: { label: '續卡張數', max: LIMITS.maxCards },
  drawPrice: { label: '單抽單價', min: 1 },
  consolationAmount: { label: '安慰獎金額', max: LIMITS.maxPrice },
  hostFeePercent: { label: '主持人辛苦費', max: 100 },
};

const fail = (message) => ({ ok: false, message });

/** 單抽單價上限：只受一般輸入上限限制（連抽付費上限 = 單抽單價 × 連抽上限，自動套用） */
export function drawPriceLimit() {
  return LIMITS.maxPrice;
}

/** 驗證單一數字欄位，回傳 {ok:true,value} 或 {ok:false,message} */
export function validateNumberField(key, raw, settings = DEFAULT_SETTINGS) {
  const rule = NUMBER_RULES[key];
  if (!rule) return fail('未知欄位');
  const text = String(raw ?? '').trim();
  if (text === '') return fail(`${rule.label}不可空白`);
  const n = Number(text);
  if (!Number.isFinite(n)) return fail(`${rule.label}請輸入數字`);
  if (n < 0) return fail(`${rule.label}不可為負數`);
  if (!Number.isInteger(n)) return fail(`${rule.label}請輸入整數`);
  const min = rule.min ?? 0;
  if (n < min) return fail(`${rule.label}至少為 ${min}`);
  if (key === 'drawPrice') {
    if (n > drawPriceLimit(settings)) return fail(`${rule.label}不可超過 ${drawPriceLimit(settings)}`);
  } else if (rule.max !== undefined && n > rule.max) {
    return fail(`${rule.label}不可超過 ${rule.max}`);
  }
  return { ok: true, value: n };
}

/** 驗證獎金比例（3 個欄位，各為 0~100 整數，合計必須 100） */
export function validateRatio(values) {
  const nums = values.map((v) => (String(v ?? '').trim() === '' ? NaN : Number(v)));
  if (nums.length !== 3 || nums.some((n) => !Number.isInteger(n) || n < 0 || n > 100)) {
    return fail('獎金比例請輸入 0~100 的整數，不可為負數或空白');
  }
  const sum = nums[0] + nums[1] + nums[2];
  if (sum !== 100) return fail(`獎金比例合計為 ${sum}，必須為 100`);
  return { ok: true, value: nums };
}

/** 依比例自動換算為合計 100（餘數補在第 1 名） */
export function normalizeRatio(values) {
  const nums = values.map((v) => Math.max(0, Math.round(Number(v)) || 0));
  const sum = nums[0] + nums[1] + nums[2];
  if (sum <= 0) return [...DEFAULT_SETTINGS.prizeRatio];
  const scaled = nums.map((n) => Math.floor((n / sum) * 100));
  scaled[0] += 100 - (scaled[0] + scaled[1] + scaled[2]);
  return scaled;
}

// ---------- 可編輯規則 ----------

// 遊戲進行中，僅開放「加買卡」與「人數」；辛苦費 % 與安慰獎金額開局後一律鎖定
const EDITABLE_WHILE_PLAYING = ['players', 'newCardCount', 'renewCardCount'];

function isEditable(key, status) {
  if (status === 'setup') return true;
  if (status === 'playing') return EDITABLE_WHILE_PLAYING.includes(key);
  return false;
}

// ---------- 畫面 ----------

export function initSettings(root) {
  let signature = '';
  const layoutPicker = createLayoutPicker(); // 只建立一次，重繪設定頁時沿用同一個節點

  function setError(key, message) {
    const node = root.querySelector(`#err-${key}`);
    if (node) node.textContent = message;
  }

  function lockTag(editable) {
    return editable ? null : el('span', { class: 'lock-tag' }, '🔒 已鎖定');
  }

  function numberField(key, label, status, hint) {
    const { settings } = getState();
    const editable = isEditable(key, status);
    const rule = NUMBER_RULES[key];
    const input = el('input', {
      class: 'input',
      id: `f-${key}`,
      type: 'number',
      inputMode: 'numeric',
      min: rule.min ?? 0,
      step: 1,
      value: String(settings[key]),
      disabled: !editable,
      onChange: () => {
        const res = validateNumberField(key, input.value, getState().settings);
        if (!res.ok) {
          setError(key, res.message);
          toast(res.message, 'error');
          input.value = String(getState().settings[key]); // 還原為有效值
          return;
        }
        setError(key, '');
        input.value = String(res.value);
        setState({ settings: { [key]: res.value } });
      },
    });
    return el(
      'div',
      { class: `field${editable ? '' : ' is-locked'}` },
      el('label', { class: 'field-label', htmlFor: `f-${key}` }, label, lockTag(editable)),
      input,
      hint ? el('p', { class: 'field-hint' }, hint) : null,
      el('p', { class: 'field-error', id: `err-${key}`, role: 'alert' })
    );
  }

  function toggleField(key, label, hint, status) {
    const { settings } = getState();
    const editable = isEditable(key, status);
    const input = el('input', {
      type: 'checkbox',
      class: 'switch',
      id: `f-${key}`,
      checked: settings[key],
      disabled: !editable,
      onChange: () => setState({ settings: { [key]: input.checked } }),
    });
    return el(
      'label',
      { class: `switch-row${editable ? '' : ' is-locked'}`, htmlFor: `f-${key}` },
      el('span', { class: 'switch-text' }, el('strong', {}, label, lockTag(editable)), el('small', {}, hint)),
      input
    );
  }

  function ratioField(status) {
    const { settings } = getState();
    const editable = isEditable('prizeRatio', status);
    const sumEl = el('span', { class: 'ratio-sum' });
    const inputs = settings.prizeRatio.map((v, i) =>
      el('input', {
        class: 'input',
        type: 'number',
        inputMode: 'numeric',
        min: 0,
        max: 100,
        step: 1,
        value: String(v),
        disabled: !editable,
        'aria-label': `第 ${i + 1} 名比例`,
        onInput: updateSum,
        onChange: commitRatio,
      })
    );
    function updateSum() {
      const sum = inputs.reduce((acc, i) => acc + (Number(i.value) || 0), 0);
      sumEl.textContent = `合計 ${sum} / 100`;
      sumEl.classList.toggle('is-bad', sum !== 100);
    }
    function commitRatio() {
      const res = validateRatio(inputs.map((i) => i.value));
      if (!res.ok) {
        setError('prizeRatio', res.message);
        toast(res.message, 'error');
        return; // 不儲存；保留輸入內容讓使用者修正
      }
      setError('prizeRatio', '');
      setState({ settings: { prizeRatio: res.value } });
    }
    const autoBtn = el(
      'button',
      {
        type: 'button',
        class: 'btn btn-small btn-secondary',
        disabled: !editable,
        onClick: () => {
          normalizeRatio(inputs.map((i) => i.value)).forEach((v, i) => (inputs[i].value = String(v)));
          updateSum();
          commitRatio();
        },
      },
      '自動換算為 100'
    );
    updateSum();
    return el(
      'div',
      { class: `field${editable ? '' : ' is-locked'}` },
      el('span', { class: 'field-label' }, '獎金分派比例（第 1 : 2 : 3 名）', lockTag(editable)),
      el(
        'div',
        { class: 'ratio-row' },
        ...inputs.flatMap((input, i) => [i > 0 ? el('span', { class: 'ratio-colon' }, ':') : null, input])
      ),
      el('div', { class: 'ratio-foot' }, sumEl, autoBtn),
      el('p', { class: 'field-error', id: 'err-prizeRatio', role: 'alert' })
    );
  }

  async function onStart() {
    const { settings } = getState();
    if (settings.players < 1) {
      setError('players', '開始前請先填寫參加總人數（至少 1 人）');
      toast('請先填寫參加總人數', 'error');
      root.querySelector('#f-players')?.focus();
      return;
    }
    const ok = await confirmDialog({
      title: '開始遊戲？',
      message: '開始後，主持人辛苦費 % 與安慰獎金額將鎖定，無法修改。',
      confirmText: '▶ 開始遊戲',
    });
    if (!ok) return;
    setState({ settings: { locked: true }, game: { status: 'playing' } });
    toast('遊戲開始！');
  }

  async function onReset() {
    const ok = await confirmDialog({
      title: '重新開始？',
      message: '將清除所有設定與對局紀錄，回到初始狀態，此操作無法復原。',
      confirmText: '確定清除',
      danger: true,
    });
    if (!ok) return;
    reset();
    setState({ ui: { tab: 'settings' } }); // 重新開始後停留在設定頁
    render();
    toast('已重新開始');
  }

  function render() {
    const { settings, game } = getState();
    const status = game.status;
    signature = `${status}|${settings.locked}`;

    const startCard =
      status === 'setup'
        ? el(
            'div',
            { class: 'card card-action' },
            el('button', { type: 'button', class: 'btn btn-primary btn-block', onClick: onStart }, '▶ 開始遊戲'),
            el('p', { class: 'field-hint' }, '開始後，辛苦費 % 與安慰獎金額將鎖定。')
          )
        : el(
            'div',
            { class: 'card card-note' },
            el('strong', {}, status === 'playing' ? '遊戲進行中' : '本局已結束'),
            el(
              'p',
              { class: 'field-hint' },
              status === 'playing'
                ? '辛苦費 % 與安慰獎金額已鎖定；可修改參加人數與新／續卡張數（加買卡）。'
                : '所有設定已鎖定，請按「重新開始」開新局。'
            )
          );

    root.replaceChildren(
      el(
        'div',
        { class: 'card' },
        el('h2', { class: 'card-title' }, '介面'),
        layoutPicker.node
      ),
      el(
        'div',
        { class: 'card' },
        el('h2', { class: 'card-title' }, '玩家與卡片'),
        numberField('players', '參加總人數（持卡玩家數）', status, '安慰獎以人數計算，認人不認卡'),
        numberField('newCardPrice', '新卡單價（元）', status),
        numberField('renewCardPrice', '續卡單價（元）', status),
        numberField('newCardCount', '新卡張數', status),
        numberField('renewCardCount', '續卡張數', status)
      ),
      el(
        'div',
        { class: 'card' },
        el('h2', { class: 'card-title' }, '抽號設定'),
        numberField(
          'drawPrice',
          '單抽單價（元）',
          status,
          `連抽最高 ${settings.maxBatchDraws} 次，單次付費上限 = 單抽單價 × ${settings.maxBatchDraws}（目前 ${formatMoney(settings.drawPrice * settings.maxBatchDraws)}）`
        ),
        toggleField('allowRepeat', '允許重複數字', '可能抽到已出現過的號碼', status),
        toggleField('allowBlank', '允許銘謝惠顧', '可能抽到無號碼的空籤', status)
      ),
      el(
        'div',
        { class: 'card' },
        el('h2', { class: 'card-title' }, '獎金設定'),
        ratioField(status),
        numberField('consolationAmount', '安慰獎金額（每人，元）', status),
        numberField('hostFeePercent', '主持人辛苦費（%）', status)
      ),
      startCard,
      el(
        'div',
        { class: 'card-action' },
        el('button', { type: 'button', class: 'btn btn-danger-outline btn-block', onClick: onReset }, '🔄 重新開始')
      )
    );
  }

  render();
  // 只有開局狀態改變時才整頁重繪，避免輸入中失去焦點
  subscribe((s) => {
    if (`${s.game.status}|${s.settings.locked}` !== signature) render();
  });
}
