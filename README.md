# 🧧 兵果彩盤

除夕家族聚會用的賓果彩盤。玩家使用紙卡，本網頁投屏到電視，顯示號碼、彩池與獎金。
純前端（HTML / CSS / JavaScript ES Modules），不需打包、不需安裝依賴。**v1.0.0**

完整需求見 [`docs/planning.md`](docs/planning.md)，模組說明見 [`docs/architecture.md`](docs/architecture.md)，假設與決策見 [`docs/decisions.md`](docs/decisions.md)，手動驗收見 [`docs/QA-checklist.md`](docs/QA-checklist.md)。

## 功能介紹
- 🎲 抽號 1～75：免費抽、付費單抽（10 元）、連抽（單次上限 100 元 10 抽，逐筆播放）、撤回上一筆（付費抽號同步退回彩池）。
- 📋 抽號類型：新號、重複號碼、銘謝惠顧（可於設定開關），連續無效最多 4 次。
- 🎉 名次登錄：主持人按「第 N 名賓果」，可填同時賓果人數（平分該名次與後續名次獎金）。
- 🔍 快速驗卡：輸入 `5` 或 `5.12.33.68` 查詢是否已抽中。
- 🏆 獎金池：總彩池分項、前三名預估／實領、第 2 名出爐後顯示安慰獎。
- 🧾 結算收據：結束遊戲後全螢幕收據（總收入、前三名實領、安慰獎、主持人辛苦費、零頭），可開新局。
- ❓ 規則說明、🔊 音效（預設關閉）、電視三欄／手機 App 兩種版面、重新整理不遺失進度。

> 截圖放置位置：`docs/screenshots/`（自行加入後可在此引用，例如 `![抽號畫面](docs/screenshots/draw.png)`）。

## 主持人操作指南
1. **設定**：到「⚙️ 設定」填參加人數、新卡／續卡張數與價格、獎金比例、辛苦費 %、安慰獎金額，按「▶ 開始遊戲」（開局後部分欄位鎖定）。
2. **抽號**：回到「🎲 抽號卡」按「抽號（免費）」；玩家想加碼可按「付費單抽」或「連抽」，彩池自動增加。按錯可「↩ 撤回上一個」。
3. **賓果**：玩家喊賓果後先用「🔍 驗卡」核對號碼，再按「🎉 第 N 名賓果」登錄（多人同時賓果就填人數）。
4. **結算**：前三名產生後（或要提前收場時）按「🏁 結束遊戲」→ 確認 → 收據彈出。
5. **開新局**：收據中按「🔄 開新局」（或設定頁「重新開始」）清除所有紀錄。

## 本機預覽
ES Modules 無法用 `file://` 開啟（直接雙擊 `index.html` 會空白），請啟動本機伺服器：

```bash
npx serve                      # 或
python -m http.server 8000     # 然後開啟 http://localhost:8000
```

## 執行測試
需要 Node.js 18 以上（建議 22），無需安裝任何套件：

```bash
npm test      # 等同 node --test，自動執行 tests/ 內所有 *.test.js（含整合測試）
```

## 部署到 GitHub Pages（自動部署）
1. 將本資料夾內容推上 GitHub 儲存庫的 `main` 分支（根目錄即為 `index.html`）。
2. 儲存庫 **Settings → Pages → Build and deployment → Source** 選 **GitHub Actions**。
3. 推送到 `main` 後，`.github/workflows/pages.yml` 會先執行 `npm test`，**測試通過才部署**。
4. 到 **Actions** 分頁確認成功，網址為 `https://<帳號>.github.io/<儲存庫名>/`。

只想直接上傳靜態檔案：使用 `bingo-board_release.zip`（不含測試與開發檔案），解壓後放到任何靜態空間即可。

## 專案結構
```
index.html  404.html  package.json  make_zip.py  CHANGELOG.md
css/        base / components / mobile / desktop
js/
  main.js                 啟動入口
  config/defaults.js      預設值與常數（單一來源）
  core/                   純邏輯（無 DOM）：state、draw-engine、batch-draw、undo、checker、ranks、finance、receipt
  ui/                     畫面：tabs、layout-switch、draw / board / check / prize / settings / receipt / rules、effects
  audio/                  sound（Web Audio）
  utils/                  dom、format
tests/                    node:test 單元與整合測試
docs/                     planning、architecture、decisions、QA-checklist
.github/workflows/pages.yml
```

## 打包
```bash
python make_zip.py 7          # 完整專案 → bingo-board_stage7.zip
python make_zip.py release    # 純靜態版 → bingo-board_release.zip
```

## 資料儲存
對局進度只存在瀏覽器的 localStorage（key：`bingo-board-v1`），重新整理不會遺失；
在「⚙️ 設定」按「🔄 重新開始」或收據的「🔄 開新局」會清除。

## 授權
MIT License — 可自由使用、修改與分享；請自行確認當地法規，本工具僅供家族娛樂之用。
