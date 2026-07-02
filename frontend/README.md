# フロントエンド雛形

要件定義書（`/要件定義書.md`）をもとにした、Trello風タスク管理アプリのフロントエンド最小雛形です（React + TypeScript + Vite）。
バックエンド（`backend/`）が `http://localhost:8080` で起動している前提で、開発サーバーの `/api` 宛リクエストをそこへプロキシします。

## 起動方法

```bash
npm install
npm run dev
```

## ポート

開発サーバー・プレビューともにポートを固定しており、`strictPort: true`（[vite.config.ts](vite.config.ts)）により指定ポートが使用中の場合は別ポートへ自動フォールバックせず起動エラーで終了する。

| コマンド | ポート |
|---|---|
| `npm run dev` | 5173 |
| `npm run preview` | 4173 |

バックエンド（デフォルト `8080`、[backend/README.md](../backend/README.md) 参照）とはポート帯が異なるため競合しない。バックエンドのポートを `SERVER_PORT` で変更した場合は、[vite.config.ts](vite.config.ts) の `server.proxy` の向き先も合わせて変更すること。

## Lint

```bash
npm run lint
```
