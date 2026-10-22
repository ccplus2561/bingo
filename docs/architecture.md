# 架構說明

## 資料流
```
使用者操作 → ui/*-view.js → core/state.js 的 setState(patch)
                              └─ 通知 subscribe() 的訂閱者 → UI 局部更新
```
- `core/` 為純邏輯、無 DOM，可在 Node 測試（`node --test`）。
- `ui/` 負責畫面；只透過 `getState / setState / subscribe` 與 core 溝通。
- 狀態只存在記憶體，不寫入 localStorage；關閉或重新整理網頁即回到初始狀態。

## state 結構（階段 1 定案，欄位名稱不得任意更改）
```js
state = {
  settings: { players, newCardPrice, renewCardPrice, newCardCount, renewCardCount,
              drawPrice, maxBatchDraws, maxBatchAmount, prizeRatio:[50,30,20],
              consolationAmount, allowRepeat, allowBlank, hostFeePercent, locked },
  game:     { status:'setup'|'playing'|'ended', history:[], paidDrawCount, invalidStreak, ranks:[] },
  ui:       { layout:'auto', soundOn:false, tab:'draw' }
}
```
- `setState(patch)`：patch 為 `{settings?, game?, ui?}`，各區塊淺層合併；陣列欄位整個取代。
- `reset()`：回到預設的 setup 狀態。

## 模組（階段 1 狀態）
| 模組 | 狀態 |
|------|------|
| `config/defaults.js`、`core/state.js` | ✅ 完成 |
| `ui/tabs.js`、`ui/settings-view.js` | ✅ 完成 |
| `utils/dom.js`（el、toast、confirmDialog）、`utils/format.js` | ✅ 完成 |
| `core/draw-engine / batch-draw / undo / checker` | ✅ 階段 2 完成 |
| `ui/draw-view.js`、`ui/board-view.js`、`ui/layout-switch.js` | ✅ 階段 4 完成，階段 5 擴充 draw-view |
| `ui/check-view.js`、`ui/prize-view.js` | ✅ 階段 5 完成 |
| `core/finance`、`core/ranks` | ✅ 階段 3 完成 |
| `core/receipt`、`ui/receipt-view`、`ui/rules-view` | ✅ 階段 7 完成 |
| `audio/sound.js`、`ui/effects.js` | ✅ 階段 6 完成 |

## 設定驗證
`ui/settings-view.js` 匯出純函式 `validateNumberField / validateRatio / normalizeRatio`，供測試與後續階段使用。

## 抽號核心 API（階段 2）
核心函式**不修改傳入的 state**，成功時回傳新的 `game` 欄位，由 UI 呼叫 `setState({ game: result.game })`；失敗回傳 `{ ok:false, code, message }`。
| 函式 | 說明 |
|------|------|
| `drawOne(state, {paid, batchId, rng, getPressure, now})` | 抽一個號碼 → `{ok, record, game}`；錯誤碼 `ALL_DRAWN` |
| `paidDraw(state, count, opts)` | 付費連抽 → `{ok, records, requested, drawn, game}`；錯誤碼 `INVALID_COUNT / EXCEEDS_BATCH_DRAWS / EXCEEDS_BATCH_AMOUNT / ALL_DRAWN` |
| `undoLast(state)` | 撤回最後一筆 → `{ok, removed, game}`；錯誤碼 `NOTHING_TO_UNDO` |
| `recomputeStreak(history)` | 由 history 結尾推算連續無效次數 |
| `parseNumbers(input)` / `checkNumbers(state, numbers)` | 驗卡解析與查詢 |

- **暗控流程**：無效率 = 基礎 0.15 ~ 高壓 0.60 依壓力線性插值；`getPressure(state)` 預設回傳 0.5（階段 3 改接 finance）。連續無效達 4 次，下一次必為 new。
- history 紀錄：`{ id:'d<seq>', seq, type, number, paid, batchId, ts }`，`seq` 從 1 起算；撤回後 seq 會被重用。

## 財務與名次 API（階段 3）
依賴方向：`draw-engine → finance → ranks`、`state → draw-engine`，無循環。
| 函式 | 說明 |
|------|------|
| `calcTotalPool(state)` | 新卡＋續卡＋付費抽號收入（撤回付費抽號自動連動） |
| `calcUnrankedPlayers(settings, winners=3)` | max(0, 人數 − 得獎人數) |
| `calcConsolationUnit(settings)` | 安慰獎單價（續卡 > 新卡 → 30）的單一來源 |
| `calcPressure(state)` | 0~1，寬裕 0、吃緊趨近 1；抽號引擎的預設壓力來源 |
| `settle(state)` | 結算物件（含內部 `adjustments`，不得顯示於 UI） |
| `declareRank / retractLastRank / canDeclareRank / nextRank` | 名次登錄；`ranks` 項目 `{rank, tieCount, atSeq}`，rank 為起始名次 |
| `winnerCount(ranks)` | 前三名內實際得獎人數 |
| `calcPayouts(state, settlement)` | 已登錄名次的每人實領 `[{rank, positions, winners, groupPool, perPerson}]` |
| `isConsolationVisible(state)` | 名次涵蓋到第 2 名（或遊戲已結束）才為 true |

## UI 與 core 的資料流（階段 4）
```
 按鈕（抽號卡）──► draw-view.run()
                     ├─ drawOne(getState(), {paid:false})   ┐ core：純函式，回傳
                     └─ paidDraw(getState(), 1)             ┘ { ok, game } 或 { ok:false, code }
                     └─ ok → setState({ game })  ─► notify()
                                                       │
        ┌──────────────────────┬───────────────────────┼────────────────────────┐
        ▼                      ▼                       ▼                        ▼
  draw-view.update()    board-view.update()     pool-view.update()      layout-switch.apply()
  大號碼／按鈕／走馬燈   矩陣 class 切換          calcTotalPool(state)    <html data-layout>
```
- **UI 不計算財務**：左欄金額一律呼叫 `finance.calcTotalPool`；UI 只做顯示與格式化（`utils/format.js`）。
- **DOM 建一次、之後只更新**：`draw-view`、`board-view`、`pool-view` 啟動時建立元素，`subscribe` 觸發時只改文字／class／disabled，鍵盤焦點與動畫不被打斷（走馬燈 5 格逐格替換）。
- **版面**：`layout-switch.js` 讀 `state.ui.layout`（auto／mobile／desktop）＋視窗寬度 → `resolveLayout()` → 寫入 `<html data-layout>`。`mobile.css` 為預設，`desktop.css` 以 `html[data-layout="desktop"]` 覆寫；視窗縮放只重算版面，不改 `state.game`。
- **index.html 結構**：`[data-panel="draw"]` 內含三欄容器 `#pool-root`（左）、`#draw-root`（中）、`#board-root`（右）；電腦版用 grid 排成「左｜中｜右」，手機版為單欄「中 → 左 → 右」（`order`）。
- **電腦版免滾動**：`body` 為 grid（標題列／分頁列／內容 `minmax(0,1fr)`）、`height:100dvh; overflow:hidden`；大號碼球位於 `container-type:size` 的容器內，直徑 = 容器短邊；矩陣 15 列以 `1fr` 均分高度。

## 階段 5：操作與資訊顯示
```
 連抽 ► paidDraw(state, n) 一次算出 records
          └─ busy=true（鎖按鈕）→ 每 800ms：setState({ game: appendRecords(game, [record]) }) → busy=false
 撤回 ► confirmDialog → undoLast(state) → setState({ game })
 名次 ► showModal（同時賓果人數）→ declareRank(state,{tieCount}) / retractLastRank(state) → setState({ game })
 驗卡 ► parseNumbers(input) → checkNumbers(state, valid)；subscribe 讓抽號／撤回後結果同步
 獎金池 ► calcPoolBreakdown + settle + rankSlots + isConsolationVisible（只顯示，不修改 state）
```
- 新增（不改既有介面）：`finance.calcPoolBreakdown`（彩池分項）、`ranks.rankSlots`（前三名 open／declared／merged）、`batch-draw.maxBatchCount`（連抽次數上限）。
- `prize-view.js` 以 `initPrizeView(root)` 掛在兩處：`#prize-root`（分頁）與 `#pool-root`（電腦左欄，手機隱藏），同一份渲染邏輯。
- `utils/dom.js` 的 `showModal({title, content, actions, wide, onClose})` 為通用彈窗（名次登錄、驗卡、結算佔位）；`confirmDialog` 維持原樣。
- 遊戲中不顯示辛苦費與零頭：UI 只讀取 `settle()` 的 `prizes`、`consolationUnitUsed`、`unrankedPlayers`，不讀 `hostFee`／`remainder`／`adjustments`。

## 階段 6：音效、動畫（audio 模組）
```
 頂部 🔊 音效 開關 ─► effects.js 的 click 處理（同一次手勢內解鎖）
                                  ├─ sound.setEnabled(true) → 建立 AudioContext ＋ resume()
                                  └─ setState({ ui: { soundOn } })

 state 變化 ─► effects.onState ─► diffEvents(前, 後)（純函式）
                                  ├─ draw        → sound 'roll' ＋ 結果音（new／repeat／blank）＋ tts 播報
                                  ├─ rank        → sound 'bingo'＋ celebrate()（紅包彩帶）
                                  └─ rankRetract → sound 'undo'
```
- **UI 不介入 core**：`effects.js` 只訂閱 state、比對前後差異；`core/` 與階段 4~5 的操作流程零修改（`draw-view.js` 僅新增「前往設定」空狀態按鈕）。
- **`audio/sound.js`**：`createSound({ getAudioContextClass })` 工廠＋全站共用實例；`play(name, { delay })`、`setEnabled(bool)`、`isEnabled()`、`isSupported()`。音效以 `SOUND_DEFS`（純資料）定義：`roll`、`new`、`repeat`、`blank`、`bingo`、`undo`，全部由振盪器合成，不使用外部音檔。
  - AudioContext **只在使用者點擊開啟時才建立**（載入頁面零接觸，因此不會有瀏覽器自動播放警告），並在同一手勢內呼叫 `resume()`、播放一個靜音緩衝（iOS Safari）。
  - 結果音以 `AudioContext` 時間排程（`delay`），不使用計時器，關閉或撤回後不會有殘留。
  - 每個音符的 oscillator／gain 於 `onended` 時 `disconnect()` 釋放；同時存活節點上限 80，超過直接略過。
- **`ui/effects.js` 的 `celebrate(rank, tieCount)`**：全螢幕橫幅＋ 36 片彩帶＋ 8 個 🧧，純 CSS（只動 `transform`／`opacity`），約 4.2 秒後自動移除；`prefers-reduced-motion` 時不建立彩帶與紅包，只顯示靜態橫幅 2.2 秒。
- **載入狀態**：`index.html` 的 `#boot` 於 `main.js` 啟動完成後隱藏；6 秒仍未啟動則提示「載入失敗，請用 http 伺服器開啟」。

## 結算收據與規則（階段 7）
| 函式 | 說明 |
|------|------|
| `receipt.endGame(state)` | 進行中 → `{ok, game:{status:'ended'}}`；否則 `NOT_PLAYING` |
| `receipt.buildReceipt(state)` | 收據資料：`pool`、`prizeLines`（declared／merged／none）、`prizePaid`、`consolation`、`hostFee`、`remainder`、`noWinners`；呼叫 `finance.settle`、`ranks.calcPayouts` |
| `receipt.receiptSum(r)` | 辛苦費＋前三名實發＋安慰獎＋零頭，恆等於 `totalPool` |
| `receipt.receiptToText(r, dateText)` | 純文字版收據 |
| `receipt-view.endGameFlow()` | 二次確認 → `setState({game})` → `openReceipt()` |
| `receipt-view.openReceipt()` | 只有 `ended` 才開啟全螢幕收據；列印、複製、開新局 |
| `rules-view.openRules()` | 規則說明彈窗 |

依賴：`receipt → finance, ranks, draw-engine`，不被 core 其他模組引用，無循環。
