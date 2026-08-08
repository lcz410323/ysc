// ============================================================
// 爱赞美 drpy2 蜘蛛脚本（vod_id 直传完整 API 链接版）
// ============================================================

var rule = {
    title: '爱赞美',
    host: 'https://api.xiaohai.org',

    // 分类入口（专辑列表）
    class_name: '全部&全长专辑&单曲EP&现场Live&精选集&原创集&伴奏集&诗歌本&经文诗歌&有声读物',
    class_url: 'type=0&type=1201&type=1202&type=1203&type=1204&type=1205&type=1206&type=1207&type=1208&type=1209',
    url: 'https://api.xiaohai.org/album/filterlist?f=json&size=15&page=fypage&fyclass',

    // 搜索入口（单曲搜索）
    searchUrl: 'https://api.xiaohai.org/search/song?f=json&page_no=1&page_size=20&q=**',

    searchable: 2,
    quickSearch: 1,
    filterable: 0,
    timeout: 20000,
    play_parse: true,

    headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'application/json, text/plain, */*'
    },

    // 1. 首页推荐：vod_id 组装为完整的专辑详情 API 链接
    推荐: `js:
        var u = "https://api.xiaohai.org/plaza/RecommendAlbum?limit=24";
        VODS = [];
        try {
            var h = request(u).trim();
            var obj = JSON.parse(h);
            var items = (obj && obj.mItems) || [];
            for (var i = 0; i < items.length; i++) {
                var it = items[i];
                if (!it || !it.mAlbumId) continue;
                
                var author = String(it.mAuthor || "").trim();
                var total = it.mSongsTotal ? ("共" + it.mSongsTotal + "首") : "";
                var pubTime = it.mPublishTime || "";
                
                VODS.push({
                    // 直接将 vod_id 组装成完整的专辑详情 API 地址
                    vod_id: "https://api.xiaohai.org/album/info?album_id=" + it.mAlbumId,
                    vod_name: String(it.mTitle || "").trim(),
                    vod_pic: it.mPicSmall || "",
                    vod_remarks: [author, total, pubTime].filter(Boolean).join(" · ")
                });
            }
        } catch(e) { log("推荐加载失败: " + e.message); }
    `,

    // 2. 一级分类页：vod_id 同理组装为完整 API 链接
    一级: `js:
        var u = input;
        if (u.indexOf("http") < 0) { u = "https://api.xiaohai.org/" + u; }
        VODS = [];
        try {
            var h = request(u).trim();
            var obj = JSON.parse(h);
            var items = (obj && obj.mItems) || [];
            for (var i = 0; i < items.length; i++) {
                var it = items[i];
                if (!it || !it.mAlbumId) continue;
                
                var author = String(it.mAuthor || "").trim();
                var total = it.mSongsTotal ? ("共" + it.mSongsTotal + "首") : "";
                var pubTime = it.mPublishTime || "";
                
                VODS.push({
                    vod_id: "https://api.xiaohai.org/album/info?album_id=" + it.mAlbumId,
                    vod_name: String(it.mTitle || "").trim(),
                    vod_pic: it.mPicSmall || "",
                    vod_remarks: [author, total, pubTime].filter(Boolean).join(" · ")
                });
            }
        } catch(e) { log("一级列表加载失败: " + e.message); }
    `,

    // 3. 搜索页：提取 mAlbumId 组装为对应专辑的完整 API 链接
    // 3. 搜索页：带封面补全与缓存机制
    搜索: `js:
        VODS = [];
        try {
            var h = request(input).trim();
            var obj = JSON.parse(h);
            var items = (obj && obj.mItems) || [];
            var picCache = {}; // 建立封面缓存池，防止重复请求卡顿
            
            for (var i = 0; i < items.length; i++) {
                var it = items[i];
                if (!it || !it.mAlbumId) continue;
                
                var aid = String(it.mAlbumId);
                var songName = String(it.mTitle || "").trim();
                var author = String(it.mAuthor || "未知艺术家").trim();
                var albumTitle = String(it.mAlbumTitle || "").trim();
                var pic = "";
                
                // 动态获取封面：优先查缓存，查不到再去请求 album/info 接口
                if (picCache[aid]) {
                    pic = picCache[aid];
                } else {
                    try {
                        var infoUrl = "https://api.xiaohai.org/album/info?album_id=" + aid;
                        var infoRes = request(infoUrl).trim();
                        var infoObj = JSON.parse(infoRes);
                        pic = infoObj.mPicSmall || infoObj.mPicBig || "";
                        if (pic) { picCache[aid] = pic; } // 写入缓存
                    } catch(err) {
                        log("封面补全失败: " + err.message);
                    }
                }
                
                VODS.push({
                    vod_id: "https://api.xiaohai.org/album/info?album_id=" + aid,
                    vod_name: songName,
                    vod_pic: pic, // 精准显示的专辑封面
                    vod_remarks: author + (albumTitle ? (" · 《" + albumTitle + "》") : "")
                });
            }
        } catch(e) { log("搜索解析失败: " + e.message); }
    `,


    // 4. 二级详情页：input 已经是完整的 API 请求链接，直接发起请求
    二级: `js:
        var infoUrl = String(input || "").trim();

        try {
            // 直接请求 input (即上一级组装好的 API 链接)
            var h = request(infoUrl).trim();
            var d = JSON.parse(h);
            
            // 提取歌曲列表并使用接口给出的 mFileLink 直链
            var songs = (d && d.mItems) || [];
            var playList = [];
            for (var j = 0; j < songs.length; j++) {
                var x = songs[j];
                if (!x || !x.mFileLink) continue;
                
                var sTitle = String(x.mTitle || ("Track " + (j + 1)))
                                .replace(/[#$@$\\r\\n]/g, "")
                                .trim();
                var ord = x.mSongOrder || (j + 1);
                var numStr = (ord < 10) ? ("0" + ord) : String(ord);
                
                // 使用 JSON 中的 mFileLink 原生 MP3 直链
                playList.push(numStr + ". " + sTitle + "$" + String(x.mFileLink).trim());
            }

            // 读取 JSON 中的元数据填充 UI 界面
            var albName = String(d.mTitle || "音乐专辑").replace(/[#$@#]/g, "").trim();
            var albPic = d.mPicBig || d.mPicSmall || "";
            var albAuthor = String(d.mAuthor || "未知艺术家").trim();
            var albType = (d.mAlbumType || "专辑") + (d.mAlbumGenre ? (" · " + d.mAlbumGenre) : "");
            var albLang = d.mAlbumLang || "国语";
            var albPubTime = d.mPublishTime || "";
            var albInfo = String(d.mInfo || d.mDetail || "暂无专辑介绍").replace(/[#$@#]/g, "").trim();
            var albTotal = d.mSongsTotal || playList.length;

            VOD = {
                vod_id: infoUrl,
                vod_name: albName,
                vod_pic: albPic,
                type_name: albType,
                vod_actor: albAuthor,
                vod_area: albLang,
                vod_year: albPubTime,
                vod_remarks: "全辑共 " + albTotal + " 首曲目",
                vod_content: albInfo,
                vod_play_from: "爱赞美原声",
                vod_play_url: playList.join("#")
            };

        } catch(e) {
            log("专辑详情抓取异常: " + e.message);
            VOD = {
                vod_id: infoUrl,
                vod_name: "数据加载异常",
                vod_play_from: "爱赞美原声",
                vod_play_url: "加载失败$https://play.j53.net/"
            };
        }
    `,

    // 5. 播放配置（免浏览器渲染嗅探）
    lazy: 'js:input={parse:0,url:input,jx:0,header:{"User-Agent":"Mozilla/5.0","Referer":"https://www.izanmei.cc/"}}'
};
