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
    // 筛选配置：包含 MV视频筛选 与 专辑多维筛选（语言/曲风/首字母/排序/类型）
    // 动态拉取远程两个筛选接口（支持自动识别 name 为字符串或对象的情况）
    // 动态拉取远程筛选接口（已过滤专辑中的“专辑类型”重复筛选项）
    filter: (function() {
        // 通用解析器：支持排除指定 category (如 excludeCats = ["type"])
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

                    // 👈 智能过滤掉指定的排除分类（例如专辑的 type）
                    if (excludeCats && excludeCats.indexOf(cat) >= 0) continue;

                    // 首次遇到新分类时进行初始化，保持原始出现顺序
                    if (!groups[cat]) {
                        groups[cat] = {
                            key: cat,
                            name: (categoryNameMap && categoryNameMap[cat]) || cat,
                            value: []
                        };
                        groupOrder.push(cat);
                    }

                    // 智能提取名称（兼容 name 是字符串还是嵌套对象）
                    var label = "";
                    if (typeof item.name === "object" && item.name !== null) {
                        label = item.name.name || item.name.key || String(item.id);
                    } else {
                        label = String(item.name || "");
                    }

                    groups[cat].value.push({
                        n: label,
                        v: String(item.id)
                    });
                }

                // 组装为标准数组返回
                var result = [];
                for (var j = 0; j < groupOrder.length; j++) {
                    result.push(groups[groupOrder[j]]);
                }
                return result;

            } catch(e) {
                log("解析动态筛选 JSON 失败: " + e.message);
                return [];
            }
        }

        var myFilter = {};

        // 1. 请求并解析【MV视频】筛选接口（保留视频类型）
        try {
            var vRes = request("https://api.xiaohai.org/video/getfilter").trim();
            var vCatNames = { "type": "视频类型", "sort": "排序依据" };
            myFilter["is_video=1"] = parseFilterJson(vRes, vCatNames, []);
        } catch(eV) {
            log("请求 MV 视频筛选接口失败: " + eV.message);
        }

        // 2. 请求并解析【全部专辑/音频】筛选接口（传入 ["type"] 排除“专辑类型”）
        try {
            var aRes = request("https://api.xiaohai.org/album/getfilter").trim();
            var aCatNames = {
                "lang": "语言分类",
                "genre": "音乐曲风",
                "initial": "首字母",
                "sort": "排序依据"
            };
            // 👈 传入 ["type"] 参数，直接剔除全长专辑/单曲EP等重复项
            var albumFilterArray = parseFilterJson(aRes, aCatNames, ["type"]);

            // 绑定到所有音频/专辑分类入口
            var albumKeys = [
                "type=0", "type=1201", "type=1202", "type=1203", 
                "type=1204", "type=1205", "type=1206", "type=1207", 
                "type=1208", "type=1209"
            ];
            for (var k = 0; k < albumKeys.length; k++) {
                myFilter[albumKeys[k]] = albumFilterArray;
            }
        } catch(eA) {
            log("请求专辑筛选接口失败: " + eA.message);
        }

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
    // 2. 一级分类：全方位提取多维筛选参数（支持 sort/type/lang/genre/initial 自由组合）
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

        // 提取全局筛选对象 (MY_FL) 中的多维属性
        var sortVal = "";
        var typeVal = "";
        var langVal = "";
        var genreVal = "";
        var initialVal = "";

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
            if (u.indexOf("http") < 0) {
                u = "https://api.xiaohai.org/" + u;
            }
            
            // 自动补齐 URL 参数（若筛选器中选择了对应维度，则智能拼接到 API 参数中）
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

                    var packedId = pageUrl + "||" + title + "||" + pic + "||" + author + "||" + duration;

                    VODS.push({
                        vod_id: encodeURIComponent(packedId),
                        vod_name: title + "【MV】",
                        vod_pic: pic,
                        type_name: "MV视频",
                        vod_actor: author,
                        vod_year: "2026",
                        vod_remarks: [author, hitsCount, duration].filter(Boolean).join(" · ")
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

    // 4. 二级详情页（对应 JSON 补全专辑元数据）
    // 4. 二级详情页（对应 JSON 完整体现 vodArea 提取）
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

                // 1. 保留原有逻辑：遍历所有单曲，确保所有曲目全部能加载出来
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

                // 2. 基础 VOD 元数据读取（直接提取 vodArea 语言/地区）
                var titleName = String(d.mTitle || "").replace(/[#$@#]/g, "").trim();
                var coverPic = d.mPicBig || d.mPicSmall || d.mAuthorPic || "";
                
                // 拼接完整类型 (如: "全长专辑 · 现代流行 中国风")
                var typeName = [d.mAlbumType, d.mAlbumGenre].filter(Boolean).join(" · ");
                
                var actorName = String(d.mAuthor || "").replace(/feat.*/i, "").trim();
                var directorName = d.mComposer || d.mProducer || d.mLyricist || actorName || "赞美事工团队";
                var rawYear = String(d.mPublishTime || d.mYear || "").trim();
                var vodArea = String(d.mAlbumLang || d.mLanguage || "").trim(); // 👈 步骤2：直接提取语言/地区
                var infoDetail = String(d.mInfo || d.mDetail || "").replace(/[#$@#]/g, "").trim();

                // 提取 JSON 中的热度与收藏等角标统计信息
                var songTotalNum = d.mSongsTotal || playList.length;
                var hitsStr = d.mAlbumHits ? ("🔥" + d.mAlbumHits) : "";
                var favsStr = d.mAlbumFavs ? ("❤️" + d.mAlbumFavs) : "";

                // 3. ✨ 判断是否来自“搜索歌手单曲”接口，并动态提取关联专辑信息
                var isFromSingerSongList = (reqUrl.indexOf("artist/SongList") >= 0);

                if (isFromSingerSongList && songs.length > 0) {
                    var targetAlbumId = "";
                    for (var k = 0; k < songs.length; k++) {
                        if (songs[k] && songs[k].mAlbumId) {
                            targetAlbumId = songs[k].mAlbumId;
                            break;
                        }
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
                                if (!vodArea) { vodArea = String(albumObj.mAlbumLang || albumObj.mLanguage || "").trim(); } // 👈 步骤3：优先补充关联专辑的语言/地区
                                if (!hitsStr && albumObj.mAlbumHits) { hitsStr = "🔥" + albumObj.mAlbumHits; }
                                if (!favsStr && albumObj.mAlbumFavs) { favsStr = "❤️" + albumObj.mAlbumFavs; }
                            }
                        } catch(e_album) {
                            log("搜索歌手关联专辑 VOD 信息提取失败: " + e_album.message);
                        }
                    }
                }

                // 4. 兜底补全，保证 VOD 字段完整
                if (!titleName || titleName === "音乐合集") {
                    if (songs.length > 0 && songs[0].mAuthor) {
                        titleName = String(songs[0].mAuthor).split(" feat")[0];
                    } else {
                        titleName = "热门单曲合集";
                    }
                }
                if (!coverPic && songs.length > 0) {
                    coverPic = songs[0].mPicBig || songs[0].mPicSmall || songs[0].mAuthorPic || "";
                }
                if (!actorName && songs.length > 0) {
                    actorName = String(songs[0].mAuthor || "爱赞美合唱团").replace(/feat.*/i, "").trim();
                }
                if (!typeName) { typeName = "精选专辑"; }
                if (!vodArea) { vodArea = "华语赞美诗"; } // 👈 步骤4：前两步均未拿到值时，进行最后兜底

                var vodYear = rawYear ? rawYear.substring(0, 4) : "2026";

                if (!infoDetail) {
                    infoDetail = "收录该音乐人/歌手的精选优质音频资源，全辑共 " + playList.length + " 首曲目。";
                }

                // 组合构建全息角标 (例如: "全辑共 10 首 · 🔥149.5K · ❤️181")
                var finalRemarks = ["全辑共 " + songTotalNum + " 首", hitsStr, favsStr].filter(Boolean).join(" · ");

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
                    vod_remarks: finalRemarks,
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


    // 5. 播放配置
    lazy: 'js:input={parse:0,url:input,jx:0,header:{"User-Agent":"Mozilla/5.0","Referer":"https://www.izanmei.cc/"}}'
};
