// ============================================================
// 爱赞美 drpy2 蜘蛛脚本（修正为 mVideoHits 点击量版）
// ============================================================

var rule = {
    title: '爱赞美',
    host: 'https://api.xiaohai.org',

    // 分类入口
    class_name: 'MV视频&全部专辑&长专辑&单曲EP&现场Live&精选集&原创集&伴奏集&诗歌本&经文诗歌&有声读物',
    class_url: 'is_video=1&type=0&type=1201&type=1202&type=1203&type=1204&type=1205&type=1206&type=1207&type=1208&type=1209',
    url: 'https://api.xiaohai.org/album/filterlist?f=json&size=15&page=fypage&fyclass',

    searchUrl: 'https://api.xiaohai.org/search/singer?f=json&page_no=1&page_size=20&q=**',

    searchable: 2,
    quickSearch: 1,
    filterable: 0,
    timeout: 15000,
    play_parse: true,

    headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'application/json, text/plain, */*'
    },

    // 1. 首页推荐：100%原封不动
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

    // 2. 一级分类：已更新为读取 mVideoHits
    一级: `js:
        var u = input;
        var isVideo = false;

        var pageNo = "1";
        if (typeof MY_PAGE !== "undefined" && MY_PAGE) {
            pageNo = String(MY_PAGE);
        } else if (typeof FYPAGE !== "undefined" && FYPAGE) {
            pageNo = String(FYPAGE);
        } else {
            var pgMatch = u.match(/page=(\d+)/);
            pageNo = pgMatch ? pgMatch[1] : "1";
        }

        if (u.indexOf("is_video=1") >= 0) {
            isVideo = true;
            u = "https://api.xiaohai.org/video/filterlist?f=json&size=20&page=" + pageNo + "&sort=0&type=0";
        } else if (u.indexOf("http") < 0) {
            u = "https://api.xiaohai.org/" + u;
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
                    
                    // 正确提取视频播放量 mVideoHits
                    var hitsCount = it.mVideoHits ? ("🔥 " + it.mVideoHits) : "";

                    var packedId = pageUrl + "||" + title + "||" + pic + "||" + author + "||" + duration;

                    VODS.push({
                        vod_id: encodeURIComponent(packedId),
                        vod_name: title + " · [MV]",
                        vod_pic: pic,
                        type_name: "MV视频",
                        vod_actor: author,
                        vod_year: "2026",
                        vod_remarks: [author, hitsCount, duration].filter(Boolean).join(" · ")           // 右下角展示时长
                        
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

    // 3. 搜索页：100%原封不动
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
            } catch(e1) { log("歌手搜索解析失败: " + e1.message); }

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
                    if (!pic) {
                        pic = "https://s2.loli.net/2024/01/28/VuH1K4WXTZaUn75.gif";
                    }

                    var apiUrl = "";
                    if (albumId) {
                        apiUrl = "https://api.xiaohai.org/album/info?album_id=" + albumId;
                    } else if (artistId) {
                        apiUrl = "https://api.xiaohai.org/artist/SongList?offset=0&limit=0&uid=" + artistId;
                    }

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
            } catch(e2) { log("单曲搜索解析失败: " + e2.message); }

        } catch(e) { log("搜索全局处理失败: " + e.message); }
    `,

    // 4. 二级详情页：100%原封不动
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
                var playList = [];
                var sourceMatches = h.match(/<source[^>]+>/gi) || [];

                for (var k = 0; k < sourceMatches.length; k++) {
                    var item = sourceMatches[k];
                    var srcM = item.match(/src=["']([^"']+)["']/i);
                    var sizeM = item.match(/size=["']([^"']+)["']/i);
                    if (srcM && srcM[1]) {
                        var cleanSrc = encodeURI(srcM[1].trim());
                        var quality = (sizeM && sizeM[1]) ? (sizeM[1] + "P") : ("播放源 " + (k + 1));
                        playList.push(quality + "$" + cleanSrc);
                    }
                }

                var finalPlayUrl = playList.join("#");
                if (!finalPlayUrl) {
                    finalPlayUrl = "暂无可播放视频$https://invalid.url/none.mp4";
                }

                VOD = {
                    vod_id: input,
                    vod_name: vTitle,
                    vod_pic: vPic,
                    type_name: "MV视频",
                    vod_actor: vActor,
                    vod_director: "赞美事工团队",
                    vod_year: "2026",
                    vod_area: "华语赞美诗",
                    vod_remarks: vDuration,
                    vod_content: vTitle + " - " + vActor + " (在线高清MV视频)",
                    vod_play_from: "爱赞美视频",
                    vod_play_url: finalPlayUrl
                };

            } else {
                var reqUrl = rawInput;
                var h = request(reqUrl).trim();
                var d = JSON.parse(h);
                
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

                var titleName = String(d.mTitle || "音乐合集").replace(/[#$@#]/g, "").trim();
                if (titleName === "音乐合集" && songs.length > 0 && songs[0].mAuthor) {
                    titleName = String(songs[0].mAuthor).split(" feat")[0];
                }

                var coverPic = d.mPicBig || d.mPicSmall || (songs.length > 0 ? (songs[0].mPicBig || songs[0].mPicSmall) : "");
                var typeName = d.mAlbumType || d.mAlbumGenre || (reqUrl.indexOf("SongList") >= 0 ? "热门单曲" : "精选专辑");
                var actorName = String(d.mAuthor || (songs.length > 0 ? songs[0].mAuthor : "爱赞美合唱团")).replace(/feat.*/i, "").trim();
                var directorName = d.mComposer || d.mProducer || d.mLyricist || actorName || "赞美事工团队";
                var rawYear = String(d.mPublishTime || d.mYear || (songs.length > 0 ? songs[0].mPublishTime : "")).trim();
                var vodYear = rawYear ? rawYear.substring(0, 4) : "未知年份";
                var vodArea = d.mAlbumLang || d.mLanguage || "华语赞美诗";
                var infoDetail = String(d.mInfo || d.mDetail || "收录该专辑/音乐人的精选优质音频资源。").replace(/[#$@#]/g, "").trim();

                var finalPlayUrl = playList.join("#");
                if (!finalPlayUrl) {
                    finalPlayUrl = "未找到可播放音频$https://invalid.url/none.mp3";
                }

                VOD = {
                    vod_id: input,
                    vod_name: titleName,
                    vod_pic: coverPic,
                    type_name: typeName,
                    vod_actor: actorName,
                    vod_director: directorName,
                    vod_year: vodYear,
                    vod_area: vodArea,
                    vod_remarks: "全辑共 " + playList.length + " 首曲目",
                    vod_content: infoDetail,
                    vod_play_from: "爱赞美音频",
                    vod_play_url: finalPlayUrl
                };
            }

        } catch(e) { 
            log("二级全字段解析异常: " + e.message); 
            VOD = { 
                vod_id: input, 
                vod_name: "加载失败", 
                type_name: "错误",
                vod_actor: "未知",
                vod_director: "未知",
                vod_year: "未知",
                vod_area: "未知",
                vod_play_from: "系统提示", 
                vod_play_url: "接口解析发生错误: " + e.message + "$https://invalid.url/none.mp3" 
            };
        }
    `,

    // 5. 播放配置：100%原封不动
    lazy: 'js:input={parse:0,url:input,jx:0,header:{"User-Agent":"Mozilla/5.0","Referer":"https://www.izanmei.cc/"}}'
};
