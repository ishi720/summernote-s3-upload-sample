const MAX_SIZE = 5 * 1024 * 1024;
const ALLOWED = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
const $status = $('#status');

function setStatus(msg, isError = false) {
    $status.text(msg).toggleClass('error', isError);
}

// サーバーで署名付きURLを発行 → S3へ直接PUT → 公開URLを返す
async function uploadToS3(file) {
    const res = await fetch('/api/upload-url', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contentType: file.type, size: file.size }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || '署名付きURLの取得に失敗しました');

    // Content-Type は署名時と同じ値にすること（違うと 403 になる）
    const put = await fetch(data.uploadUrl, {
        method: 'PUT',
        headers: { 'Content-Type': file.type },
        body: file,
    });
    if (!put.ok) throw new Error(`S3へのアップロードに失敗しました (${put.status})`);

    return data.publicUrl;
}

$('#editor').summernote({
    lang: 'ja-JP',
    height: 360,
    placeholder: '画像をドラッグ&ドロップ、または画像ボタンから挿入できます',
    callbacks: {
        // これを定義すると、デフォルトの base64 埋め込みが無効になる
        onImageUpload: async function (files) {
            const $editor = $(this);
            for (const file of files) {
                if (!ALLOWED.includes(file.type)) {
                    setStatus(`${file.name}: 対応していない形式です`, true);
                    continue;
                }
                if (file.size > MAX_SIZE) {
                    setStatus(`${file.name}: 5MB以下にしてください`, true);
                    continue;
                }
                try {
                    setStatus(`${file.name} をアップロード中…`);
                    const url = await uploadToS3(file);
                    $editor.summernote('insertImage', url, ($img) => {
                        $img.attr('alt', file.name);
                        $img.css('max-width', '100%');
                    });
                    setStatus(`${file.name} をアップロードしました`);
                } catch (e) {
                    console.error(e);
                    setStatus(`${file.name}: ${e.message}`, true);
                }
            }
        },

        // エディタから画像を削除したら S3 からも削除（任意）
        onMediaDelete: function ($target) {
            const url = $target.attr('src');
            if (!url) return;
            fetch('/api/delete-image', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ url }),
            }).catch(console.error);
        },
    },
});

$('#save').on('click', async () => {
    const html = $('#editor').summernote('code');
    const res = await fetch('/api/posts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ html }),
    });
    setStatus(res.ok ? '保存しました' : '保存に失敗しました', !res.ok);
});
