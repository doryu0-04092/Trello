# バックエンド雛形

要件定義書（`/要件定義書.md`）をもとにした、Trello風タスク管理アプリのバックエンド最小雛形です。
フロントエンド（React）は未実装のため、まずバックエンド単体で動作確認できる構成にしています。

## 構成

- Java 21 + Spring Boot 3.3（Maven）
- データベース: PostgreSQL（Docker Composeで起動。データはコンテナ再起動後も永続化される）
- 起動時に初期データとして「作業中」「完了」の2リストを自動作成（要件4.1）

## 起動方法

1. PostgreSQLコンテナを起動（リポジトリルートで実行）

```bash
docker compose up -d
```

2. バックエンドを起動

```bash
cd backend
mvn spring-boot:run
```

接続情報は環境変数で上書き可能（デフォルトは `docker-compose.yml` の設定と一致）。

| 環境変数 | デフォルト |
|---|---|
| DB_HOST | localhost |
| DB_PORT | 5432 |
| DB_NAME | trello |
| DB_USER | trello |
| DB_PASSWORD | trello |

### ポート

バックエンドのポートは `SERVER_PORT` 環境変数で上書き可能（デフォルトは `8080`）。指定ポートが使用中の場合、Spring Bootは別のポートへ自動フォールバックせず起動エラーで終了する。フロントエンド（`frontend/vite.config.ts`）は開発時 `http://localhost:8080` へAPIをプロキシする前提のため、`SERVER_PORT`を変更した場合はフロントエンド側の設定も合わせて変更すること。

| 環境変数 | デフォルト |
|---|---|
| SERVER_PORT | 8080 |

起動後、ブラウザで以下を開く。

- http://localhost:8080/ — 動作確認用の簡易ページ。リスト・カードの追加/削除がその場でAPI経由で行われ、動いている様子を確認できる
- http://localhost:8080/api/lists — REST APIの生のJSONレスポンス

DBの内容を直接確認したい場合は `docker exec -it trello-postgres psql -U trello -d trello` でpsqlに接続する。

## API一覧（最小実装）

| メソッド | パス | 内容 |
|---|---|---|
| GET | /api/lists | リスト一覧（カード・コメント含む） |
| POST | /api/lists | リスト追加 `{ "title": "..." }` |
| PUT | /api/lists/{id} | リスト名変更 |
| DELETE | /api/lists/{id} | リスト削除（配下のカードも削除） |
| GET | /api/lists/{listId}/cards | カード一覧 |
| POST | /api/lists/{listId}/cards | カード追加 `{ "text": "..." }` |
| PUT | /api/cards/{id} | カード更新 `{ "text", "dueDate", "priority" }` |
| DELETE | /api/cards/{id} | カード削除（完全削除） |
| GET | /api/cards/{cardId}/comments | コメント一覧 |
| POST | /api/cards/{cardId}/comments | コメント追加 `{ "text": "..." }` |

## テスト実行

READ系API（`GET /api/lists`, `GET /api/lists/{listId}/cards`, `GET /api/cards/{cardId}/comments`）に対する統合テストを用意している。H2ではなく、起動中のdocker-compose PostgreSQLに対して実際にテストデータをINSERTしてからGETを叩き、レスポンス内容を検証する（テストデータは`@Transactional`により終了後に自動ロールバックされる）。

```bash
docker compose up -d   # リポジトリルートでPostgreSQLを起動済みにしておく
cd backend
mvn test
```

## 今回スコープ外（雛形のため未実装）

- ドラッグ＆ドロップの並び替え保存（`displayOrder`項目自体は用意済み）
- ソフトデリート・ゴミ箱（7日間保持・復元）
- カードの自動並び替え（期限日順／優先度順）
- Flywayによるマイグレーション管理
- フロントエンド（React）からの接続・CORS設定
