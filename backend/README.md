# バックエンド雛形

要件定義書（`/要件定義書.md`）をもとにした、Trello風タスク管理アプリのバックエンド最小雛形です。
フロントエンド（React）は未実装のため、まずバックエンド単体で動作確認できる構成にしています。

## 構成

- Java 21 + Spring Boot 3.3（Maven）
- データベース: H2インメモリDB（再起動するとデータは消えます。永続化が必要になったらPostgreSQLに切り替え予定）
- 起動時に初期データとして「作業中」「完了」の2リストを自動作成（要件4.1）

## 起動方法

```bash
cd backend
mvn spring-boot:run
```

起動後、ブラウザで以下を開く。

- http://localhost:8080/ — 動作確認用の簡易ページ。リスト・カードの追加/削除がその場でAPI経由で行われ、動いている様子を確認できる
- http://localhost:8080/api/lists — REST APIの生のJSONレスポンス
- http://localhost:8080/h2-console — H2のDB内容を直接確認（JDBC URL: `jdbc:h2:mem:trello`、ユーザー: `sa`、パスワードなし）

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

## 今回スコープ外（雛形のため未実装）

- ドラッグ＆ドロップの並び替え保存（`displayOrder`項目自体は用意済み）
- ソフトデリート・ゴミ箱（7日間保持・復元）
- カードの自動並び替え（期限日順／優先度順）
- PostgreSQL・Flyway・Docker Compose構成への切り替え
- フロントエンド（React）からの接続・CORS設定
