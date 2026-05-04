---
name: Internal Links — Published URL Storage
description: Lưu URL thực từ Website/Blogger/WordPress/Flowa Blog sau publish; Internal Links chỉ suggest bài có URL công khai
type: feature
---

`multi_channel_contents` có 4 cặp cột URL/ID: `website_post_*`, `blogger_post_*`, `wordpress_post_*`, `flowa_blog_post_*`. Sau mỗi publish thành công, `channel-publisher` extract `postUrl`+`postId` từ response của publish-* và update vào cột tương ứng (URL_COLUMN_MAP), đồng thời insert audit row vào `publish_attempts` (success+failure).

`publish-blog` trả URL absolute `${PUBLIC_BLOG_DOMAIN || https://flowa.one}/blog/${slug}` thay vì relative.

`backfill-content-embeddings` + `EmbeddingBackfillCard` chỉ đếm/embed bài có ít nhất 1 URL công khai (filter `.or(website_post_url.not.is.null,...)`). `suggest-internal-links` join URL từ 4 cột → loại bài chưa publish khỏi suggestions, trả URL thực qua `url` và `url_hint`.
