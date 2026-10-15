// 語音播報（speechSynthesis，語言 zh-TW）。
// - 獨立開關；瀏覽器不支援時 isSupported() 為 false，所有方法皆為安全的無動作。
// - speak() 依序排隊（連抽 10 次會依序播報）；cancel() 一次清掉尚未播報的語音（撤回、新操作時使用）。

const ZH_DIGIT = ['零', '一', '二', '三', '四', '五', '六', '七', '八', '九'];

/** 1~99 的中文數字：12 → 十二、20 → 二十、75 → 七十五 */
export function numberToZh(n) {
  const v = Math.trunc(Number(n));
  if (!Number.isFinite(v) || v < 0 || v > 99) return String(n);
  if (v < 10) return ZH_DIGIT[v];
  const tens = Math.floor(v / 10);
  const ones = v % 10;
  return `${tens === 1 ? '' : ZH_DIGIT[tens]}十${ones ? ZH_DIGIT[ones] : ''}`;
}

/** 賓果欄位字母（與 utils/format.js 的 bingoLetter 規則相同，此處獨立實作以維持 audio 模組零依賴） */
function letterOf(n) {
  return 'BINGO'[Math.min(4, Math.floor((n - 1) / 15))];
}

/** 一筆抽號紀錄 → 播報文字：「B，十二號」「重複號碼」「銘謝惠顧」 */
export function phraseForRecord(record) {
  if (!record) return '';
  if (record.type === 'blank') return '銘謝惠顧';
  if (record.type === 'repeat') return '重複號碼';
  return `${numberToZh(record.number)}號`;
}

/** 名次 → 「第一名賓果」 */
export function phraseForRank(rank) {
  return `第${numberToZh(rank)}名賓果`;
}

/**
 * 建立語音控制器。getSynth 可注入（測試用）：回傳 { synth, Utterance } 或 null。
 * 預設每次呼叫時才偵測，因此在執行期刪除 speechSynthesis 也能正確回報不支援。
 */
export function createTts({ getSynth = detectSynth } = {}) {
  let enabled = false;
  let cachedVoice = null;

  function isSupported() {
    return !!getSynth();
  }

  function pickVoice(synth) {
    if (cachedVoice) return cachedVoice;
    try {
      const voices = synth.getVoices ? synth.getVoices() : [];
      cachedVoice =
        voices.find((v) => v.lang === 'zh-TW') ??
        voices.find((v) => /^zh[-_]TW$/i.test(v.lang)) ??
        voices.find((v) => /^zh/i.test(v.lang)) ??
        null;
    } catch {
      cachedVoice = null;
    }
    return cachedVoice;
  }

  /** 開關。開啟時需在使用者手勢內呼叫（Safari 要求手勢才能首次發聲） */
  function setEnabled(flag) {
    const env = getSynth();
    enabled = !!flag && !!env;
    if (!enabled) cancel();
    return enabled;
  }

  function isEnabled() {
    return enabled;
  }

  /** 排入佇列依序播報；關閉或不支援時無動作 */
  function speak(text, { force = false } = {}) {
    if ((!enabled && !force) || !text) return false;
    const env = getSynth();
    if (!env) return false;
    try {
      const u = new env.Utterance(text);
      u.lang = 'zh-TW';
      u.rate = 1.05;
      u.pitch = 1;
      u.volume = 1;
      const voice = pickVoice(env.synth);
      if (voice) u.voice = voice;
      u.onerror = () => {}; // canceled / interrupted 都是正常情況
      env.synth.speak(u);
      return true;
    } catch (err) {
      console.warn('[tts] 播報失敗', err);
      return false;
    }
  }

  /** 取消正在播與尚未播報的全部語音 */
  function cancel() {
    const env = getSynth();
    if (!env) return;
    try {
      env.synth.cancel();
    } catch {
      /* 忽略 */
    }
  }

  return { isSupported, setEnabled, isEnabled, speak, cancel };
}

function detectSynth() {
  const g = globalThis;
  try {
    if (g.speechSynthesis && typeof g.SpeechSynthesisUtterance === 'function') {
      return { synth: g.speechSynthesis, Utterance: g.SpeechSynthesisUtterance };
    }
  } catch {
    /* 某些環境存取會丟例外，視為不支援 */
  }
  return null;
}

const tts = createTts();
export const isSupported = tts.isSupported;
export const setEnabled = tts.setEnabled;
export const isEnabled = tts.isEnabled;
export const speak = tts.speak;
export const cancel = tts.cancel;
export default tts;
