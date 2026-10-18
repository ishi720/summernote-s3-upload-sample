# Summernote からS3へアップロードするサンプルプログラム

Summernote に挿入した画像を、署名付きURL（Presigned URL）でブラウザから S3 へ直接アップロードするサンプルです。

## 構成

```
/
├── server.js
├── public/index.html
├── package.json
└── .env.example
```

## セットアップ

1. IAMを設定する
2. S3 バケットを作成する
3. 環境変数を設定する

```bash
cp .env.example .env
```

4. npmパッケージのインストール

```bash
npm install
```

5. アプリ（express）起動する

```bash
npm start
```

