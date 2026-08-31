// ============================================================
// 爱赞美 drpy2 蜘蛛脚本（二级专辑全字段补全版）
// ============================================================

var rule = {
    title: '爱赞美',
    host: 'https://api.xiaohai.org',

    // 分类入口
    class_name: 'MV视频&全部专辑&长专辑&单曲EP&现场Live&精选集&原创集&伴奏集&诗歌本&经文诗歌&有声读物',
    class_url: 'is_video=1&type=0&type=1201&type=1202&type=1203&type=1204&type=1205&type=1206&type=1207&type=1208&type=1209',
    url: 'https://api.xiaohai.org/album/filterlist?f=json&size=20&page=fypage&fyclass',

    searchUrl: 'https://api.xiaohai.org/search/singer?f=json&page_no=1&page_size=20&q=**',

    searchable: 2,
    quickSearch: 1,
    filterable: 1,
    timeout: 15000,
    play_parse: true,

    headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'application/json, text/plain, */*'
    },

    // 筛选配置
    filter: (function() {
        function parseFilterJson(resStr, categoryNameMap, excludeCats) {
            try {
                var obj = JSON.parse(resStr);
                var items = (obj && obj.mItems) || [];
                var groups = {};
                var groupOrder = [];
                for (var i = 0; i < items.length; i++) {
                    var item = items[i];
                    var cat = item.category;
                    if (!cat) continue;
                    if (excludeCats && excludeCats.indexOf(cat) >= 0) continue;
                    if (!groups[cat]) {
                        groups[cat] = { key: cat, name: (categoryNameMap && categoryNameMap[cat]) || cat, value: [] };
                        groupOrder.push(cat);
                    }
                    var label = "";
                    if (typeof item.name === "object" && item.name !== null) {
                        label = item.name.name || item.name.key || String(item.id);
                    } else {
                        label = String(item.name || "");
                    }
                    groups[cat].value.push({ n: label, v: String(item.id) });
                }
                var result = [];
                for (var j = 0; j < groupOrder.length; j++) { result.push(groups[groupOrder[j]]); }
                return result;
            } catch(e) { log("解析动态筛选 JSON 失败: " + e.message); return []; }
        }
        var myFilter = {};
        try {
            var vRes = request("https://api.xiaohai.org/video/getfilter").trim();
            myFilter["is_video=1"] = parseFilterJson(vRes, { "type": "视频类型", "sort": "排序依据" }, []);
        } catch(eV) {}
        try {
            var aRes = request("https://api.xiaohai.org/album/getfilter").trim();
            var albumFilterArray = parseFilterJson(aRes, { "lang": "语言分类", "genre": "音乐曲风", "initial": "首字母", "sort": "排序依据" }, ["type"]);
            var albumKeys = ["type=0","type=1201","type=1202","type=1203","type=1204","type=1205","type=1206","type=1207","type=1208","type=1209"];
            for (var k = 0; k < albumKeys.length; k++) { myFilter[albumKeys[k]] = albumFilterArray; }
        } catch(eA) {}
        return myFilter;
    })(),

    // 1. 首页推荐
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
                var rawYear = String(it.mPublishTime || it.mYear || "").trim();
                var year = rawYear ? rawYear.substring(0, 4) : "";
                var lang = String(it.mAlbumLang || it.mLanguage || "华语").trim();
                var typeName = String(it.mAlbumType || it.mAlbumGenre || "精选专辑").trim();
                var director = String(it.mComposer || it.mProducer || it.mLyricist || author).trim();
                var desc = String(it.mInfo || it.mDetail || "").replace(/[#$@#]/g, "").trim();
                var apiUrl = "https://api.xiaohai.org/album/info?album_id=" + it.mAlbumId;
                VODS.push({
                    vod_id: encodeURIComponent(apiUrl),
                    vod_name: String(it.mTitle || "").trim(),
                    vod_pic: it.mPicBig || it.mPicSmall || "",
                    type_name: typeName,
                    vod_actor: author,
                    vod_director: director,
                    vod_year: year,
                    vod_area: lang,
                    vod_remarks: [author, total, year].filter(Boolean).join(" · "),
                    vod_content: desc
                });
            }
        } catch(e) { log("推荐加载失败: " + e.message); }
    `,

    // 2. 一级分类
    一级: `js:
        var u = input;
        var isVideo = false;
        var pageNo = "1";
        if (typeof MY_PAGE !== "undefined" && MY_PAGE) {
            pageNo = String(MY_PAGE);
        } else if (typeof FYPAGE !== "undefined" && FYPAGE) {
            pageNo = String(FYPAGE);
        } else {
            var pgMatch = u.match(/page=(\\d+)/);
            pageNo = pgMatch ? pgMatch[1] : "1";
        }
        var sortVal = ""; var typeVal = ""; var langVal = ""; var genreVal = ""; var initialVal = "";
        if (typeof MY_FL !== "undefined" && MY_FL) {
            if (MY_FL.sort !== undefined && MY_FL.sort !== "") { sortVal = String(MY_FL.sort); }
            if (MY_FL.type !== undefined && MY_FL.type !== "") { typeVal = String(MY_FL.type); }
            if (MY_FL.lang !== undefined && MY_FL.lang !== "") { langVal = String(MY_FL.lang); }
            if (MY_FL.genre !== undefined && MY_FL.genre !== "") { genreVal = String(MY_FL.genre); }
            if (MY_FL.initial !== undefined && MY_FL.initial !== "") { initialVal = String(MY_FL.initial); }
        }
        if (u.indexOf("is_video=1") >= 0) {
            isVideo = true;
            u = "https://api.xiaohai.org/video/filterlist?f=json&size=20&page=" + pageNo + "&sort=" + sortVal + "&type=" + typeVal;
        } else {
            if (u.indexOf("http") < 0) { u = "https://api.xiaohai.org/" + u; }
            if (sortVal) { u += "&sort=" + sortVal; }
            if (typeVal && u.indexOf("type=") < 0) { u += "&type=" + typeVal; }
            if (langVal) { u += "&lang=" + langVal; }
            if (genreVal) { u += "&genre=" + genreVal; }
            if (initialVal) { u += "&initial=" + initialVal; }
        }
        VODS = [];
        try {
            var h = request(u).trim();
            var obj = JSON.parse(h);
            var items = (obj && obj.mItems) || [];
            for (var i = 0; i < items.length; i++) {
                var it = items[i];
                if (!it) continue;
                if (isVideo || it.mVideoId) {
                    var videoId = it.mVideoId;
                    if (!videoId) continue;
                    var pageUrl = "https://wozan.org/video/" + videoId + ".html";
                    var title = String(it.mTitle || "").trim();
                    var pic = it.mPicBig || it.mPicSmall || "";
                    var author = String(it.mAuthor || "").trim();
                    var duration = String(it.mDuration || "MV视频").trim();
                    var hitsCount = it.mVideoHits ? ("🔥 " + it.mVideoHits) : "";
                    var mvType = String(it.mVideoType || it.mType || "MV视频").trim();
                    var mvYear = String(it.mPublishTime || it.mYear || it.mCreateTime || "").trim();
                    mvYear = mvYear ? mvYear.substring(0, 4) : "";
                    var mvArea = String(it.mAlbumLang || it.mLanguage || "").trim() || "";
                    var mvContent = [title, author, mvType, mvYear].filter(Boolean).join(" · ") || "在线高清MV视频";
                    var packedId = pageUrl + "||" + title + "||" + pic + "||" + author + "||" + duration;
                    VODS.push({
                        vod_id: encodeURIComponent(packedId),
                        vod_name: title + "【MV】",
                        vod_pic: pic,
                        type_name: mvType,
                        vod_actor: author,
                        vod_director: author,
                        vod_year: mvYear,
                        vod_area: mvArea,
                        vod_remarks: [author, hitsCount, duration].filter(Boolean).join(" · "),
                        vod_content: mvContent
                    });
                } else {
                    if (!it.mAlbumId) continue;
                    var author = String(it.mAuthor || "").trim();
                    var total = it.mSongsTotal ? ("共" + it.mSongsTotal + "首") : "";
                    var rawYear = String(it.mPublishTime || it.mYear || "").trim();
                    var year = rawYear ? rawYear.substring(0, 4) : "";
                    var lang = String(it.mAlbumLang || it.mLanguage || "华语").trim();
                    var typeName = String(it.mAlbumType || it.mAlbumGenre || "专辑").trim();
                    var director = String(it.mComposer || it.mProducer || it.mLyricist || author).trim();
                    var desc = String(it.mInfo || it.mDetail || "").replace(/[#$@#]/g, "").trim();
                    var apiUrl = "https://api.xiaohai.org/album/info?album_id=" + it.mAlbumId;
                    VODS.push({
                        vod_id: encodeURIComponent(apiUrl),
                        vod_name: String(it.mTitle || "").trim(),
                        vod_pic: it.mPicBig || it.mPicSmall || "",
                        type_name: typeName,
                        vod_actor: author,
                        vod_director: director,
                        vod_year: year,
                        vod_area: lang,
                        vod_remarks: [author, total, year].filter(Boolean).join(" · "),
                        vod_content: desc
                    });
                }
            }
        } catch(e) { log("一级列表加载失败: " + e.message); }
    `,

    // 3. 搜索页
    搜索: `js:
        VODS = [];
        try {
            var rawInput = String(input || "").trim();
            var wd = "";
            if (rawInput.indexOf("q=") >= 0) {
                wd = rawInput.split("q=")[1].split("&")[0];
            } else {
                wd = encodeURIComponent(rawInput);
            }
            try {
                var singerSearchUrl = "https://api.xiaohai.org/search/singer?f=json&page_no=1&page_size=20&q=" + wd;
                var h1 = request(singerSearchUrl).trim();
                var obj1 = JSON.parse(h1);
                var items1 = (obj1 && obj1.mItems) || [];
                for (var i = 0; i < items1.length; i++) {
                    var it = items1[i];
                    var artistId = it.mArtistId || it.mUid;
                    if (!artistId) continue;
                    var name = String(it.mName || "未知歌手").trim();
                    var pic = it.mAvatarSmall || it.mAvatarMiddle || "";
                    var songNum = it.mSongsTotal ? ("单曲 " + it.mSongsTotal + " 首") : "";
                    var albNum = it.mAlbumsTotal ? ("专辑 " + it.mAlbumsTotal + " 本") : "";
                    var apiUrl = "https://api.xiaohai.org/artist/SongList?offset=0&limit=0&uid=" + artistId;
                    VODS.push({
                        vod_id: encodeURIComponent(apiUrl),
                        vod_name: "🎤 歌手：" + name,
                        vod_pic: pic,
                        type_name: "歌手/乐团",
                        vod_actor: name,
                        vod_remarks: [songNum, albNum].filter(Boolean).join(" · ") || "音乐人/团队"
                    });
                }
            } catch(e1) {}
            try {
                var songSearchUrl = "https://api.xiaohai.org/search/song?f=json&page_no=1&page_size=100&q=" + wd;
                var h2 = request(songSearchUrl).trim();
                var obj2 = JSON.parse(h2);
                var items2 = (obj2 && obj2.mItems) || [];
                for (var j = 0; j < items2.length; j++) {
                    var s = items2[j];
                    if (!s) continue;
                    var songTitle = String(s.mTitle || "未命名歌曲").trim();
                    var author = String(s.mAuthor || "未知艺术家").trim();
                    var albumTitle = String(s.mAlbumTitle || "").trim();
                    var albumId = s.mAlbumId;
                    var artistId = s.mArtistId || s.mUid;
                    var pic = s.mPicSmall || s.mPicBig || "";
                    if (!pic) { pic = "https://s2.loli.net/2024/01/28/VuH1K4WXTZaUn75.gif"; }
                    var apiUrl = "";
                    if (albumId) { apiUrl = "https://api.xiaohai.org/album/info?album_id=" + albumId; }
                    else if (artistId) { apiUrl = "https://api.xiaohai.org/artist/SongList?offset=0&limit=0&uid=" + artistId; }
                    if (apiUrl) {
                        VODS.push({
                            vod_id: encodeURIComponent(apiUrl),
                            vod_name: "🎵 " + songTitle,
                            vod_pic: pic,
                            type_name: "单曲",
                            vod_actor: author,
                            vod_remarks: albumTitle ? ("《" + albumTitle + "》· " + author) : author
                        });
                    }
                }
            } catch(e2) {}
            try {
                var videoSearchUrl = "https://api.xiaohai.org/search/video?f=json&page_no=1&page_size=20&q=" + wd;
                var h3 = request(videoSearchUrl).trim();
                var obj3 = JSON.parse(h3);
                var items3 = (obj3 && obj3.mItems) || [];
                for (var v = 0; v < items3.length; v++) {
                    var mv = items3[v];
                    if (!mv || !mv.videoId) continue;
                    var mvId = mv.videoId;
                    var mvName = String(mv.videoName || "MV视频").trim();
                    var mvAuthor = String(mv.artistName || "爱赞美事工").trim();
                    var mvPic = mv.videoCover || "";
                    var mvDur = String(mv.duration || "MV视频").trim();
                    var mvHits = mv.videoHits ? ("🔥 " + mv.videoHits) : "";
                    var mvPageUrl = "https://wozan.org/video/" + mvId + ".html";
                    var mvPackedId = mvPageUrl + "||" + mvName + "||" + mvPic + "||" + mvAuthor + "||" + mvDur;
                    VODS.push({
                        vod_id: encodeURIComponent(mvPackedId),
                        vod_name: "🎬 " + mvName + "【MV】",
                        vod_pic: mvPic,
                        type_name: "MV视频",
                        vod_actor: mvAuthor,
                        vod_year: "",
                        vod_area: "",
                        vod_remarks: [mvAuthor, mvHits, mvDur].filter(Boolean).join(" · ")
                    });
                }
            } catch(e3) {}
        } catch(e) {}
    `,

    // 4. 二级详情页
    二级: `js:
        try {
            var rawInput = String(input || "").trim();
            try {
                if (rawInput.indexOf("%3A") >= 0 || rawInput.indexOf("%2F") >= 0) {
                    rawInput = decodeURIComponent(rawInput);
                }
            } catch(e_dec) {}

            if (rawInput.indexOf("||") >= 0 || rawInput.indexOf("wozan.org/video") >= 0) {
                var parts = rawInput.split("||");
                var reqUrl = parts[0];
                var vTitle = parts[1] || "MV视频";
                var vPic = parts[2] || "";
                var vActor = parts[3] || "爱赞美事工";
                var vDuration = parts[4] || "MV视频";

                var h = request(reqUrl).trim();
                function safeName(s){ return String(s).replace(/[#%@]/g,"").trim(); }
                function collectQualities(html, title) {
                    var rows = [];
                    var sm = html.match(/<source[^>]+>/gi) || [];
                    for (var q = 0; q < sm.length; q++) {
                        var sM = sm[q].match(/src=["']([^"']+)["']/i);
                        var zM = sm[q].match(/size=["']([^"']+)["']/i);
                        if (sM && sM[1]) {
                            var ql = (zM && zM[1]) ? (zM[1] + "P") : ("播放源" + (q + 1));
                            rows.push(safeName(title) + "_" + ql + "$" + encodeURI(sM[1].trim()));
                        }
                    }
                    return rows.join("#");
                }
                var playList = [];
                var currentPlay = collectQualities(h, "01." + safeName(vTitle));
                var albumLines = [];
                var albumVideoIds = {};

                // 途径B：通过 search/song 接口按"标题+作者"反查所属专辑ID
                function findAlbumIdByVideo(title, author) {
                    var albumId = "";
                    try {
                        var qUrl = "https://api.xiaohai.org/search/song?f=json&page_no=1&page_size=20&q=" + encodeURIComponent(title || "");
                        var sObj = JSON.parse(request(qUrl).trim());
                        var sItems = (sObj && sObj.mItems) || [];
                        for (var k = 0; k < sItems.length; k++) {
                            var sIt = sItems[k];
                            var sAuthor = String(sIt.mAuthor || "").trim();
                            if (author && sAuthor && sAuthor == author && sIt.mAlbumId) { return sIt.mAlbumId; }
                        }
                        for (var k2 = 0; k2 < sItems.length; k2++) {
                            if (sItems[k2].mAlbumId) { return sItems[k2].mAlbumId; }
                        }
                    } catch(e_fa) {}
                    return albumId;
                }

                var albumMeta = {};
                try {
                    var albumId = findAlbumIdByVideo(vTitle, vActor);

                    // 反查专辑详情，获取发行年份/类型/语言/曲风等元数据
                    if (albumId) {
                        try {
                            var amObj = JSON.parse(request("https://api.xiaohai.org/album/info?album_id=" + albumId).trim());
                            albumMeta = amObj || {};
                        } catch(e_am) { albumMeta = {}; }
                    }

                    // 线路2：同专辑全部视频（限流抓取，避免逐条拖慢）
                    if (albumId) {
                        var avRes = request("https://api.xiaohai.org/album/VideoList?albumid=" + albumId + "&offset=0&limit=100").trim();
                        var avObj = JSON.parse(avRes);
                        var avItems = (avObj && avObj.mItems) || [];
                        var albumLimit = 8;
                        var albumPicked = 0;
                        for (var a = 0; a < avItems.length; a++) {
                            if (albumPicked >= albumLimit) break;
                            var av = avItems[a];
                            var avId = av.videoId || av.mVideoId;
                            if (!avId) continue;
                            var avTitle = String(av.videoName || av.mTitle || ("MV " + avId)).trim();
                            albumVideoIds[avId] = true;
                            albumPicked++;
                            var avHtml = request("https://www.wozan.org/video/" + avId + ".html").trim();
                            albumLines.push(collectQualities(avHtml, (a+1) + "." + safeName(avTitle)));
                        }
                    }
                } catch(e_alb) {
                    log("反查同专辑视频失败: " + e_alb.message);
                }

                // ---- 从专辑元数据组装视频详情（年份/类型/语言/曲风/备注/简介） ----
                var mY = "";
                var mType = "";
                var mArea = "";
                var mHits = "";
                var mFavs = "";
                var mTotal = "";
                if (albumMeta) {
                    var rawPub = String(albumMeta.mPublishTime || albumMeta.mPublishMonth || albumMeta.mYear || "").trim();
                    mY = rawPub ? rawPub.substring(0, 4) : "";
                    mType = String(albumMeta.mAlbumType || "MV视频").trim();
                    mArea = String(albumMeta.mAlbumLang || albumMeta.mAlbumGenre || "").trim() || "华语赞美诗";
                    mHits = albumMeta.mAlbumHits ? ("🔥 " + albumMeta.mAlbumHits) : "";
                    mFavs = albumMeta.mAlbumFavs ? ("❤️ " + albumMeta.mAlbumFavs) : "";
                    mTotal = albumMeta.mSongsTotal ? ("共" + albumMeta.mSongsTotal + "首") : "";
                }
                var vYear = mY || "2026";
                var vType = mType || "MV视频";
                var vRemarks = [vDuration, mTotal, mHits, mFavs].filter(Boolean).join(" · ");
                var vContentParts = [vTitle];
                if (vActor) { vContentParts.push("演唱：" + vActor); }
                if (albumMeta && albumMeta.mTitle) { vContentParts.push("收录专辑《" + albumMeta.mTitle + "》"); }
                if (mArea) { vContentParts.push(mArea); }
                var vContent = vContentParts.join("；") + "。（在线高清MV视频）";

                var from = [];
                var urls = [];
                var albumVideoCount = 0;

                if (currentPlay) {
                    from.push(safeName(vActor) || "爱赞美视频");
                    urls.push(currentPlay);
                }
                if (albumLines.length > 0) {
                    var albumFlat = albumLines.join("#");
                    albumVideoCount = albumLines.length;
                    from.push("本专辑全曲" + albumVideoCount + "首");
                    urls.push(albumFlat);
                }
                if (urls.length == 0) {
                    from.push("爱赞美视频");
                    urls.push("暂无可播放视频$https://invalid.url/none.mp4");
                }

                VOD = {
                    vod_id: input,
                    vod_name: vTitle,
                    vod_pic: vPic,
                    type_name: vType,
                    vod_actor: vActor,
                    vod_director: (albumMeta && albumMeta.mAuthor) ? albumMeta.mAuthor : "赞美事工团队",
                    vod_year: vYear,
                    vod_area: mArea,
                    vod_remarks: vRemarks,
                    vod_content: vContent,
                    vod_play_from: from.join("$$$"),
                    vod_play_url: urls.join("$$$")
                };

            } else {
                var reqUrl2 = rawInput;
                var h2 = request(reqUrl2).trim();
                var d = JSON.parse(h2);

                var songs = (d && d.mItems) || [];
                var playList = [];
                for (var j = 0; j < songs.length; j++) {
                    var x = songs[j];
                    if (!x) continue;
                    var playUrl = String(x.mFileLink || x.mUrl || x.mPlayUrl || "").trim();
                    if (!playUrl || playUrl.indexOf("http") !== 0) continue;
                    var sTitle = String(x.mTitle || ("Track " + (j + 1))).replace(/[#$@$\\r\\n]/g, "").trim();
                    var albTitle = String(x.mAlbumTitle || "").trim();
                    var ord = x.mSongOrder || (j + 1);
                    var numStr = (ord < 10) ? ("0" + ord) : String(ord);
                    var showTitle = numStr + ". " + sTitle + (albTitle ? (" 《" + albTitle + "》") : "");
                    playList.push(showTitle + "$" + playUrl);
                }

                var titleName = String(d.mTitle || "").replace(/[#$@#]/g, "").trim();
                var coverPic = d.mPicBig || d.mPicSmall || d.mAuthorPic || "";
                var typeName = [d.mAlbumType, d.mAlbumGenre].filter(Boolean).join(" · ");
                var actorName = String(d.mAuthor || "").replace(/feat.*/i, "").trim();
                var directorName = d.mComposer || d.mProducer || d.mLyricist || actorName || "赞美事工团队";
                var rawYear = String(d.mPublishTime || d.mYear || "").trim();
                var vodArea = String(d.mAlbumLang || d.mLanguage || "").trim();
                var infoDetail = String(d.mInfo || d.mDetail || "").replace(/[#$@#]/g, "").trim();
                var songTotalNum = d.mSongsTotal || playList.length;
                var hitsStr = d.mAlbumHits ? ("🔥" + d.mAlbumHits) : "";
                var favsStr = d.mAlbumFavs ? ("❤️" + d.mAlbumFavs) : "";

                var isFromSingerSongList = (reqUrl2.indexOf("artist/SongList") >= 0);
                if (isFromSingerSongList && songs.length > 0) {
                    var targetAlbumId = "";
                    for (var k = 0; k < songs.length; k++) {
                        if (songs[k] && songs[k].mAlbumId) { targetAlbumId = songs[k].mAlbumId; break; }
                    }
                    if (targetAlbumId) {
                        try {
                            var albumRes = request("https://api.xiaohai.org/album/info?album_id=" + targetAlbumId).trim();
                            var albumObj = JSON.parse(albumRes);
                            if (albumObj) {
                                if (!coverPic) { coverPic = albumObj.mPicBig || albumObj.mPicSmall || albumObj.mAuthorPic || ""; }
                                if (!infoDetail && (albumObj.mInfo || albumObj.mDetail)) {
                                    infoDetail = "【代表专辑：《" + (albumObj.mTitle || "") + "》】" + String(albumObj.mInfo || albumObj.mDetail).replace(/[#$@#]/g, "").trim();
                                }
                                if (!rawYear) { rawYear = String(albumObj.mPublishTime || albumObj.mYear || "").trim(); }
                                if (!typeName) { typeName = [albumObj.mAlbumType, albumObj.mAlbumGenre].filter(Boolean).join(" · "); }
                                if (!vodArea) { vodArea = String(albumObj.mAlbumLang || albumObj.mLanguage || "").trim(); }
                                if (!hitsStr && albumObj.mAlbumHits) { hitsStr = "🔥" + albumObj.mAlbumHits; }
                                if (!favsStr && albumObj.mAlbumFavs) { favsStr = "❤️" + albumObj.mAlbumFavs; }
                            }
                        } catch(e_album2) {}
                    }
                }

                if (!titleName || titleName === "音乐合集") {
                    if (songs.length > 0 && songs[0].mAuthor) { titleName = String(songs[0].mAuthor).split(" feat")[0]; }
                    else { titleName = "热门单曲合集"; }
                }
                if (!coverPic && songs.length > 0) { coverPic = songs[0].mPicBig || songs[0].mPicSmall || songs[0].mAuthorPic || ""; }
                if (!actorName && songs.length > 0) { actorName = String(songs[0].mAuthor || "爱赞美合唱团").replace(/feat.*/i, "").trim(); }
                if (!typeName) { typeName = "精选专辑"; }
                if (!vodArea) { vodArea = "华语赞美诗"; }
                var vodYear = rawYear ? rawYear.substring(0, 4) : "2026";
                if (!infoDetail) {
                    infoDetail = "收录该音乐人/歌手的精选优质音频资源，全辑共 " + playList.length + " 首曲目。";
                }
                var finalRemarks = ["全辑共 " + songTotalNum + " 首", hitsStr, favsStr].filter(Boolean).join(" · ");

                VOD = {
                    vod_id: input,
                    vod_name: titleName,
                    vod_pic: coverPic,
                    type_name: typeName,
                    vod_actor: actorName,
                    vod_director: directorName,
                    vod_year: vodYear,
                    vod_area: vodArea,
                    vod_remarks: finalRemarks,
                    vod_content: infoDetail,
                    vod_play_from: "音频播放",
                    vod_play_url: playList.join("#")
                };
            }

        } catch(e) { log("二级解析失败: " + e.message); }
    `
};