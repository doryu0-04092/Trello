# Trello風タスク管理アプリ

ブラウザ上で動作する、Trelloに似たカンバン形式のタスク管理アプリ（個人学習用プロジェクト）。
詳細な仕様は[要件定義書](./要件定義書.md)を参照。

## 概要

- リスト・カードのCRUD、ドラッグ＆ドロップ並び替え、優先度・期限日・コメント、ソフトデリート＋7日間ゴミ箱を備えたカンバンボード
- 当初はサーバーを使わないHTML/CSS/JavaScriptのみのプロトタイプ（`index.html` / `style.css` / `app.js`、`localStorage`保存）として作成
- 本実装ではフロントエンドをReact、バックエンドをJava/Spring Boot + PostgreSQLとするフルスタック構成に移行中

## 技術スタック

| レイヤー | 技術 |
|---|---|
| フロントエンド | React 19.2 + TypeScript 6.0（Vite 8.1） |
| バックエンド | Java 21 + Spring Boot 3.5（Maven） |
| データベース | PostgreSQL 16（Docker Compose） |
| Lint | oxlint（フロントエンド） |

バージョンや技術選定の背景は[要件定義書 2. 技術構成](./要件定義書.md#2-技術構成)を参照。

## ディレクトリ構成

```
.
├── backend/            バックエンド（Spring Boot）
├── frontend/            フロントエンド（React + Vite）
├── docker-compose.yml  ローカル開発用PostgreSQL
├── 要件定義書.md         要件定義書
├── index.html / style.css / app.js   旧プロトタイプ（HTML/CSS/JS版）
└── CONTRIBUTING.md      開発ルール（Issue駆動・ブランチ運用・コミット規約）
```

## セットアップ・起動方法

前提: Docker、Java 21、Maven、Node.js がインストール済みであること。

### 1. PostgreSQLを起動（リポジトリルートで実行）

```bash
docker compose up -d
```

### 2. バックエンドを起動

```bash
cd backend
mvn spring-boot:run
```

`http://localhost:8080` で起動する。詳細（接続情報・API一覧・テスト実行方法）は[backend/README.md](./backend/README.md)を参照。

### 3. フロントエンドを起動

```bash
cd frontend
npm install
npm run dev
```

`http://localhost:5173` で起動し、`/api`宛のリクエストはバックエンド（`http://localhost:8080`）へプロキシされる。詳細は[frontend/README.md](./frontend/README.md)を参照。

## 動作確認

- http://localhost:5173 — フロントエンド（React）
- http://localhost:8080 — バックエンド動作確認用の簡易ページ
- http://localhost:8080/api/lists — REST APIの生のJSONレスポンス

## テスト

```bash
docker compose up -d   # PostgreSQLを起動済みにしておく
cd backend
mvn test
```

READ系APIに対する統合テストを用意している（詳細は[backend/README.md](./backend/README.md)参照）。フロントエンドの自動テストは未整備。

## 現在のスコープ

バックエンドは最小雛形の段階であり、以下は未実装（要件定義書上は対象範囲）。

- ドラッグ＆ドロップの並び替え保存
- ソフトデリート・ゴミ箱（7日間保持・復元）
- カードの自動並び替え（期限日順／優先度順）
- Flywayによるマイグレーション管理（現状はHibernateの`ddl-auto`による自動生成）
- フロントエンドからバックエンドへの接続・CORS設定

## 開発ルール

Issue駆動開発・ブランチ運用・コミット規約は[CONTRIBUTING.md](./CONTRIBUTING.md)を参照。
