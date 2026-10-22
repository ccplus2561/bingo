# 更新紀錄

> 階段編號自階段 4 起依《00_總覽與共同規範》改為「七階段」制；階段 1～3 的舊標題（／5）保留原樣。

## v1.5.0
- 移除語音功能（`audio/tts.js`、更多選單「語音」、規則視窗「朗讀規則」）；音效保留。
- 前三名全部登錄後，「名次已登錄完」按鈕改為「🏁 結束遊戲」，點擊會先出現確認視窗。
- 連抽 1 次時不再開全螢幕結果視窗，直接更新大號碼與最新 5 次；2 次以上維持原視窗。

## v1.4.4
- 名次出爐不再顯示「每人」，只顯示金額（同時多人才顯示「各 xx 元」）。
- 設定頁改為兩欄＋「獎金設定」預設收合（保底金額不外露），點擊展開；開始遊戲／重新開始並排於下方。

## v1.4.3
- 設定頁改為電腦版三欄卡片（玩家與卡片／抽號設定／獎金設定），開始遊戲與重新開始排在下方，一屏看完不需長捲動。

## v1.4.2
- 設定頁頂端新增「← 返回抽號」按鈕，遊戲進行中進入設定後可直接返回繼續抽。

## v1.4.1
- 移除 B／I／N／G／O 編號：矩陣表頭、大球字母、最新 5 次／連抽結果／驗卡的字母前綴，語音只念號碼。

## v1.4.0 — 介面重新設計（僅電腦版）
- 移除手機版與介面選擇：不再有進站選擇視窗、底部分頁、標題列；刪除 `css/mobile.css`、`css/desktop.css`、`js/ui/layout-switch.js`。
- 新版面（`css/layout.css`）：左＝兵果彩盤＋更多＋獎金池；中＝抽號卡（大球、連抽、右上「第 x 名賓果」）＋最新 5 次；右＝號碼矩陣。三欄等高、整頁不捲動。
- 抽號卡移除「結束遊戲」「驗卡」按鈕（皆在「更多」選單）。
- 設定頁頂端同樣有「兵果彩盤＋更多」，並移除「介面」設定區。

## v1.3.1
- 連抽結果視窗移除「全螢幕」按鈕。
- 重複數字／銘謝惠顧出現率略為提高（基礎 15%→25%、高壓 60%→70%）。
- 電腦版移除上方標題列；獎金池上方顯示「兵果彩盤」與「☰ 更多」。更多選單依序為：規則、驗卡、音效、語音、設定、結束遊戲（有確認視窗）。

## v1.3.0 — 規則最大化朗讀、開局跳抽號、預設開關
- 規則視窗最大化、字體加大，新增「🔊 朗讀規則」（可停止）。
- 設定頁「開始遊戲」後自動切到抽號卡。
- 「允許重複數字」「允許銘謝惠顧」預設開啟（新局／清除存檔後生效）。
- 連抽結果視窗預設近全螢幕、字體加大。
- 「第 x 名賓果」「結束遊戲」移到抽號卡右上方。

## v1.2.0 — 介面精簡、電腦版重排
- 進站選擇只剩「手機版／電腦版」，預設手機版（`LAYOUTS`、`DEFAULT_UI.layout`）；移除「自動」。
- 移除「撤回上一個」（`core/undo.js` 保留未用）。
- 連抽結果視窗加大，新增「⛶ 全螢幕」鋪滿畫面。
- 連抽付費上限改為「單抽單價 × 5」自動計算（不再有固定 100 元上限；`batch-draw.maxBatchAmount`）。
- 電腦版：移除上方分頁列，「設定」移到標題列語音右邊（設定頁內變「抽號」返回）；獎金池依內容高度；「最新 5 次」獨立成 `ui/ticker-view.js`，位於獎金池與抽號卡下方，共 4 個框架。

## v1.1.0 — 介面選擇、僅留連抽
- 每次進入網頁彈出「請選擇介面」（自動／手機／電腦）；標題列的版面按鈕移到「設定」頁的「介面」區。
- 移除「抽號（免費）」「付費單抽（1 次）」，抽號統一用連抽；連抽最高 5 次（`maxBatchDraws` 5，舊存檔讀入時一併套用）。
- 連抽結果以懸浮視窗顯示本次所有抽出內容；每次連抽結束後次數恢復為 1。
- 「最新 5 次」不再顯示「付費」標籤。
- 收據移除「截圖建議」「列印」「複製文字版收據」（含列印樣式）。

## v1.0.0（階段 7／7）— 結算收據、規則說明、整合測試、GitHub Pages 部署（最終正式版）
- `core/receipt.js`（新）：`endGame`、`buildReceipt`、`receiptSum`、`receiptToText`；金額守恆：總彩池 = 辛苦費 + 前三名實發 + 安慰獎 + 零頭。
- `ui/receipt-view.js`：「🏁 結束遊戲」二次確認 → 全螢幕「本局結算收據」（總收入分項、前三名實領含同時賓果平分、安慰獎、辛苦費、零頭）；📸 截圖建議、🖨 列印（單頁）、📋 複製文字版、🔄 開新局。收據不顯示任何調降或警告。結束後可關閉、重開（含重新整理後）。
- `ui/rules-view.js`：頂部「❓ 規則」彈窗，含同時賓果平分說明與主持人保留調整權利聲明。
- 抽號頁：結束後「結束遊戲」改為「🧾 查看結算收據」；`index.html` 新增 ❓／🧾 按鈕、OG／description meta；`css/mobile.css` 讓 ≤430px 標題列按鈕換行以免溢出。
- 測試新增 `tests/integration.test.js`（完整一局、0／1／3 人、續卡>新卡、彩池極低、未登錄名次、75 號全抽完、結算後重新整理、400 組隨機守恆），共 126 項。
- `docs/QA-checklist.md`、`404.html`、`.github/workflows/pages.yml`（先測試再部署）、README 補完。
- 清理：移除 TODO 空殼說明，確認無 `console.log`；`make_zip.py` 新增 `release` 純靜態版。
- `core/` 既有模組零修改。

## 階段 6／7 — 介面 C：音效、語音播報、動畫與視覺打磨
- `audio/sound.js`（Web Audio 振盪器合成，無外部音檔）：滾動聲、新號、重複、銘謝惠顧、賓果、撤回六種音效；`play(name)`、`setEnabled(bool)`。AudioContext 只在點擊開啟的同一次手勢內建立並 `resume()`，載入時完全無聲；關閉時 `play` 為無動作；節點播完即釋放、同時節點有上限。
- `audio/tts.js`（`speechSynthesis`，zh-TW）：「B，十二號」「重複號碼」「銘謝惠顧」「第一名賓果」；依序排隊、可一次取消；不支援時開關自動隱藏、全程無錯誤。
- `ui/effects.js`（新）：頂部「音效」「語音」開關（預設 🔇，重新整理後仍為關閉）；訂閱 state 差異觸發音效／語音／慶祝；撤回與新操作時取消尚未播報的語音；賓果登錄時顯示橫幅＋CSS 彩帶＋紅包（`prefers-reduced-motion` 時只留靜態橫幅）。
- 動畫與視覺：大號碼翻牌＋彈跳；矩陣最新一顆閃爍並顯示「已抽 N / 75」；對比度與走馬燈字級調整；禁用狀態灰階；未開始時的「前往設定」按鈕；載入畫面與失敗提示；內嵌 favicon；窄螢幕標題列不換行。
- `index.html`、`main.js`、`ui/board-view.js`、`ui/draw-view.js`（僅空狀態按鈕）與 CSS 為小幅加值；**`core/` 零修改**，階段 4~5 操作流程不變。
- 測試新增 `stage6-audio.test.js`（音效定義可分辨、AudioContext 懶建立與釋放、TTS 佇列與取消、不支援環境、狀態差異→事件），共 113 項。
- 另以 Chromium 實測 37 項（無聲載入、開啟才解鎖、連抽 10 次依序語音、撤回取消語音、減少動態、無 speechSynthesis、手機 360／390 寬）全數通過。

## 階段 5／7 — 介面 B：連抽、撤回、名次登錄、驗卡、獎金池
- `ui/draw-view.js`：新增「🎰 連抽」（− N + 步進器 1~10，依連抽上限與 100 元上限自動限縮，即時顯示金額；連抽結果每 0.8 秒套用一筆，播放期間鎖住所有抽號／撤回／名次／結束按鈕）、「↩ 撤回上一個」（二次確認；付費抽號提示「將退回 N 元」；若會取消該次登錄的名次也會提示）、「🎉 第 N 名賓果」（彈窗選同時賓果人數，並可取消上一個名次登錄）、「🏁 結束遊戲」（二次確認 → 佔位彈窗，不變更遊戲狀態）、電腦版「🔍 驗卡」彈窗。
- `ui/check-view.js`：驗卡（`5` 或 `5.12.33.68`，`inputmode="decimal"`、清除鈕），即時顯示 ✅ 已抽中（第幾次）／❌ 未抽中／⚠ 無效輸入；手機為分頁、電腦版為抽號頁彈窗，抽號或撤回後結果同步更新。
- `ui/prize-view.js`：總彩池（新卡／續卡／付費抽分項）、前三名預估獎金、已出爐名次（同時 K 人、併入平分）；第 2 名登錄後才顯示安慰獎；遊戲中不顯示辛苦費、零頭與任何調降訊息。手機分頁與電腦左欄共用同一份程式；設定頁加買卡或改人數後即時重算。
- core 只新增、不改既有介面：`finance.calcPoolBreakdown`、`ranks.rankSlots`、`batch-draw.maxBatchCount`；`defaults.js` 新增 `BATCH_PLAY_INTERVAL_MS`；`utils/dom.js` 新增 `showModal`。
- 移除階段 4 的 `ui/pool-view.js`（由 `prize-view.js` 取代）；手機抽號分頁不再重複顯示彩池（改看「獎金池」分頁）。
- 測試新增 `stage5-core.test.js`，共 92 項。

## 階段 4／7 — 介面 A：響應式版面、號碼矩陣、抽號卡、走馬燈
- `ui/layout-switch.js`：自動／手機／電腦三段切換（頂部按鈕），偏好存入 `state.ui.layout`；≥ 1024px 自動為電腦版，縮放視窗只重算版面、不動狀態。純函式 `resolveLayout`、`nextLayoutPref` 可測試。
- `css/desktop.css`：電腦三欄免滾動（左 獎金池簡版｜中 大號碼＋走馬燈｜右 1~75 矩陣），整頁高度鎖在 100vh；分頁列移到上方。以 `html[data-layout="desktop"]` 生效（不再用 media query，才能手動覆蓋）。
- `css/mobile.css`：頂部版面切換鈕、手機單欄排序（抽號卡 → 獎金池 → 矩陣）。
- `ui/draw-view.js` 重做：超大號碼球（球徑隨容器縮放，電視遠距可讀）、「🎲 抽號（免費）」「💰 付費單抽（1 次）」、最新 5 次走馬燈（固定 5 格，最新在左）。重複號碼＝青藍色＋虛線外框＋「重複號碼（無效）」；銘謝惠顧＝深褐色＋「銘謝惠顧」字樣，不顯示號碼。非 `playing` 禁用並提示「請先到設定頁開始遊戲」；75 號抽完禁用並提示。DOM 只建一次，由 `subscribe` 更新（鍵盤焦點不中斷）。
- `ui/board-view.js`：1~75 矩陣（B/I/N/G/O 欄頭），已抽中高亮、最新一顆脈動高亮；最新為重複號碼時該格以青藍虛線外框提示。
- `ui/pool-view.js`（新）：左欄簡版獎金池（總彩池呼叫 `finance.calcTotalPool`、付費抽次數、已抽出、狀態）。不顯示辛苦費與安慰獎。
- `utils/format.js` 新增 `bingoLetter`；`defaults.js` 新增 `LAYOUT_BREAKPOINT`、`TICKER_SIZE`、`BOARD_COLUMNS`。
- 本階段依規格，抽號頁只保留免費抽與付費單抽；階段 2～3 的簡易介面中的連抽、撤回、名次登錄按鈕暫時移除，**core 邏輯（`paidDraw`、`undoLast`、`declareRank` 等）與測試完全保留**，階段 5 接回介面。
- 驗卡佔位文字更正為「階段 5 實作」；獎金池分頁沿用階段 3 簡易版（完整版留待階段 5）。
- 測試新增 `layout.test.js`（版面判斷、bingoLetter）、`imports.test.js`（確認所有模組 import 有效），共 89 項。

## 階段 3／5 — 財務計算、防虧本、名次與同時賓果
- `core/finance.js`：`calcTotalPool`、`calcUnrankedPlayers`、`calcConsolationUnit`、`calcEstimatedConsolation`、`calcPressure`、`settle`（結算強平：辛苦費每步 1% → 安慰獎每步 10 元，調降過程只記在內部 `adjustments`）。
- `core/ranks.js`：`declareRank`、`retractLastRank`、`canDeclareRank`、`nextRank`、`winnerCount`、`calcPayouts`、`calcPayoutTotal`、`isConsolationVisible`；支援同時賓果。
- 抽號引擎的壓力值改接 `calcPressure`（階段 2 的固定 0.5 作廢）。
- `utils/format.js` 新增 `floorTo10`；`defaults.js` 新增 `FINANCE` 常數。
- 簡易介面：抽號頁新增「名次登錄」（同時賓果人數、取消上一個名次登錄）；獎金池分頁顯示總彩池、付費抽次數、預估獎金、安慰獎（第 2 名後才顯示）。
- 測試新增 `finance.test.js`、`ranks.test.js` 與壓力統計測試，共 63 項（含 1000 組隨機壓力測試）。

## 階段 2／5 — 抽號核心引擎
- `core/draw-engine.js`：`drawOne`（new／repeat／blank、可注入 rng 與壓力函式、連續無效上限 4）、`recomputeStreak`、`invalidRate`、`appendRecords`；75 號抽完回傳 `ALL_DRAWN`。
- `core/batch-draw.js`：`paidDraw`（連抽上限、金額上限、共用 batchId、抽完即停只計實際次數）。
- `core/undo.js`：`undoLast`（paid 同步扣回、重算 invalidStreak、移除失效名次）。
- `core/checker.js`：`parseNumbers`（半／全形分隔符、去重、1~75 驗證）、`checkNumbers`。
- `core/state.js`：讀檔時剔除損毀紀錄，並由 history 重算 `paidDrawCount`、`invalidStreak`。
- `ui/draw-view.js`：最小測試介面（免費抽、付費單抽、連抽 N 次、撤回、紀錄列表）。
- `defaults.js` 的 `DRAW_RULES`：高壓機率 0.6、repeat 占比 0.5、預設壓力 0.5。
- 修正：「重新開始」後停留在設定頁。
- 測試：新增 `draw-engine`、`batch-undo`、`checker` 測試，共 36 項。

## 階段 1／5 — 專案骨架、狀態管理、設定頁
- 建立專案資料夾與 GitHub Pages 可直接部署的結構（純 ES Modules）。
- `core/state.js`：state、`getState / setState / subscribe / save / load / reset`，localStorage 存檔，損毀資料安全回退預設值。
- 設定頁：11 項參數、輸入驗證（負數、小數、比例總和、單抽 × 10 ≤ 100 元）、開始遊戲後鎖定辛苦費 % 與安慰獎金額、重新開始（需確認）。
- 手機 App 風格外殼：頂部狀態列、底部固定 4 分頁（抽號卡／驗卡／獎金池為佔位畫面）。
- 紅金喜慶風基礎樣式（最小點擊區 48px）。
- 單元測試：`tests/state.test.js`（state 與設定驗證）。
- 文件：README、`docs/planning.md`、`docs/architecture.md`、`docs/decisions.md`；打包腳本 `make_zip.py`。
