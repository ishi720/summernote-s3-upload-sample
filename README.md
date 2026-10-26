# Summernote からS3へアップロードするサンプルプログラム

Summernote に挿入した画像を、署名付きURL（Presigned URL）でブラウザから S3 へ直接アップロードするサンプルです。

## 構成

```
summernote-s3-upload-sample/
├── server.js
├── cloudformation/
│    └── template.yaml
├── public/
│    ├── index.html
│    ├── app.js
│    └── style.css
├── package.json
└── .env.example
```

## 事前準備（初回のみ）

GitHub Actions から AWS を操作するための IAM ロールを AWS コンソールで作成し、GitHub に登録する。

1. IAM → ID プロバイダ → プロバイダを追加
   - プロバイダのタイプ: OpenID Connect
   - プロバイダの URL: `https://token.actions.githubusercontent.com`
   - 対象者: `sts.amazonaws.com`
2. IAM → ロール → ロールを作成
   - 信頼されたエンティティタイプ: ウェブアイデンティティ
   - アイデンティティプロバイダー: `token.actions.githubusercontent.com`、Audience: `sts.amazonaws.com`
   - GitHub 組織: `ishi720`、GitHub リポジトリ: `summernote-s3-upload-sample`、GitHub ブランチ: `main`
   - 許可ポリシー: `AWSCloudFormationFullAccess` / `AmazonS3FullAccess` / `IAMFullAccess`
3. リポジトリの Settings → Secrets and variables → Actions で以下を設定する

| 種類 | 名前 | 必須 | 内容 |
| --- | --- | --- | --- |
| Secret | `AWS_ROLE_ARN` | ○ | 手順2で作成したロールの ARN |
| Variable | `AWS_REGION` | | デプロイ先リージョン（未設定なら `ap-northeast-1`） |
| Variable | `S3_BUCKET` | | バケット名（未設定なら自動生成） |
| Variable | `ALLOWED_ORIGIN` | | CORS で許可するオリジン（未設定なら `http://localhost:3000`） |
| Variable | `STACK_NAME` | | スタック名（未設定なら `summernote-s3-upload-sample`） |

## デプロイ

1. GitHub Actions でデプロイ

[.github/workflows/deploy-cloudformation.yml](.github/workflows/deploy-cloudformation.yml) が、`main` への `cloudformation/` の変更 push 時、または Actions 画面からの手動実行でスタックをデプロイする。

2. 出力値を確認し、IAM ユーザーのアクセスキーを発行する

ワークフロー実行結果の Summary で出力値（`Region` / `BucketName` / `PublicBaseUrl` / `UserName`）を確認する。アクセスキーは AWS コンソールの IAM → ユーザー → `UserName` のユーザー → セキュリティ認証情報 → アクセスキーを作成 で発行する。

## アプリの起動

1. 環境変数を設定する

```bash
cp .env.example .env
```

`AWS_REGION` / `S3_BUCKET` / `PUBLIC_BASE_URL` にはデプロイの出力値 `Region` / `BucketName` / `PublicBaseUrl` を、`AWS_ACCESS_KEY_ID` / `AWS_SECRET_ACCESS_KEY` には発行したアクセスキーを設定する。

```
AWS_REGION=
S3_BUCKET=
PUBLIC_BASE_URL=
AWS_ACCESS_KEY_ID=
AWS_SECRET_ACCESS_KEY=
PORT=
```

2. npmパッケージのインストール

```bash
npm install
```

3. アプリ（express）起動する

```bash
npm start
```

