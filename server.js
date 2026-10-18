import express from "express";
import crypto from "node:crypto";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { S3Client, PutObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const {
    AWS_REGION,
    S3_BUCKET,
    PUBLIC_BASE_URL,
    PORT = 3000,
} = process.env;

if (!AWS_REGION || !S3_BUCKET || !PUBLIC_BASE_URL) {
    console.error("AWS_REGION / S3_BUCKET / PUBLIC_BASE_URL を .env に設定してください");
    process.exit(1);
}

const s3 = new S3Client({
    region: AWS_REGION,
    // SDK v3.729以降は署名付きURLに空データのチェックサムが付き、ブラウザからのPUTが403になるため無効化
    requestChecksumCalculation: "WHEN_REQUIRED",
    responseChecksumValidation: "WHEN_REQUIRED",
});

// 許可する画像形式と拡張子
const ALLOWED_TYPES = {
    "image/jpeg": "jpg",
    "image/png": "png",
    "image/gif": "gif",
    "image/webp": "webp",
};
const MAX_SIZE = 5 * 1024 * 1024; // 5MB
const KEY_PREFIX = "uploads/";

const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

/**
  * 署名付きPUT URLを発行する
  * body: { contentType: string, size: number }
  * res : { uploadUrl, publicUrl, key }
  */
app.post("/api/upload-url", async (req, res) => {
    try {
        const { contentType, size } = req.body ?? {};

        const ext = ALLOWED_TYPES[contentType];
        if (!ext) return res.status(400).json({ error: "対応していない画像形式です" });
        if (typeof size !== "number" || size <= 0 || size > MAX_SIZE) {
            return res.status(400).json({ error: "ファイルサイズは5MB以下にしてください" });
        }

        const date = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
        const key = `${KEY_PREFIX}${date}/${crypto.randomUUID()}.${ext}`;

        const command = new PutObjectCommand({
            Bucket: S3_BUCKET,
            Key: key,
            ContentType: contentType,
            ContentLength: size, // 署名にサイズを含め、申告と違うサイズのPUTを拒否
            CacheControl: "public, max-age=31536000, immutable",
        });

        const uploadUrl = await getSignedUrl(s3, command, {
            expiresIn: 60, // 秒
            signableHeaders: new Set(["content-type", "content-length"]),
        });

        res.json({ uploadUrl, publicUrl: `${PUBLIC_BASE_URL}/${key}`, key });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "署名付きURLの発行に失敗しました" });
    }
});

/**
  * エディタ上で画像が削除されたときにS3からも削除する
  * body: { url: string }
  */
app.post("/api/delete-image", async (req, res) => {
    try {
        const { url } = req.body ?? {};
        if (typeof url !== "string" || !url.startsWith(`${PUBLIC_BASE_URL}/${KEY_PREFIX}`)) {
            return res.status(400).json({ error: "不正なURLです" });
        }
        const key = url.slice(PUBLIC_BASE_URL.length + 1);
        await s3.send(new DeleteObjectCommand({ Bucket: S3_BUCKET, Key: key }));
        res.json({ ok: true });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "削除に失敗しました" });
    }
});

/**
  * 投稿保存（未実装）。
  */
app.post("/api/posts", (req, res) => {
    const { html } = req.body ?? {};
    console.log("保存されたHTML:\n", html);
    res.json({ ok: true });
});

app.listen(PORT, () => {
    console.log(`http://localhost:${PORT}`);
});