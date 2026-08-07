// ============================================================
// 爱赞美 · drpy2 蜘蛛脚本（正式发布版 v3：带封面 + 修复播放）
// 对接 爱赞美 新版 JSON 接口
//   专辑搜索: /search/album?f=json&page_no=<页>&page_size=<条>&q=<关键词>
//   专辑详情: /album/info?album_id=<ID>
//   歌曲播放: 专辑详情里每首的 mFileLink
//
// 展示逻辑：
//   一级=专辑卡片（官方专辑封面 mPicBig/mPicSmall，自带图、零额外请求）
//   二级=该专辑内歌曲列表，点击直接播放 mp3
//
// 播放修复：drpy2 在未配置 play_json 时会强制 parse:1（走解析流程），
//   导致 .mp3 直链被解析器错误接管而无法播放。
//   故增加 play_json:[{re:"*",json:{parse:0,jx:0}}] 强制直接播放 mp3。
//
// 使用方式：作为 影视仓 站点条目中的 ext 蜘蛛脚本
//   { "key":"izanmei","name":"爱赞美","type":3,
//     "api":"https://gh-proxy.com/https://raw.githubusercontent.com/lcz410323/ysc/main/drpy2.min.js",
//     "ext":"https://gh-proxy.com/https://raw.githubusercontent.com/lcz410323/ysc/main/izanmei.js",
//     "searchable":1,"quickSearch":1,"filterable":0,"timeout":20 }
// ============================================================

var rule = {
    title: '爱赞美',
    host: 'https://api.xiaohai.org',

    // 分类（主页入口，实际以搜索为主）
    class_name: '爱赞美',
    class_url: 'hot',

    // 搜索：专辑搜索自带封面图
    searchUrl: 'https://api.xiaohai.org/search/album?f=json&page_no=1&page_size=20&q=**',

    searchable: 2,
    quickSearch: 1,
    filterable: 0,
    timeout: 20000,
    play_parse: true,

    headers: {
        'User-Agent': 'Mozilla/5.0',
        'Accept': 'application/json'
    },

    // ===== 搜索：按专辑搜索，结果带封面 =====
    // drpy2 搜索 js 上下文可用：KEY(关键词)、MY_URL、HOST、request()
    // 结果赋给全局 VODS 数组。
    // vod_id = 专辑ID（供二级读取）；vod_pic = 专辑封面
    搜索: 'js:' +
        'var q = encodeURIComponent(KEY || "");' +
        'var u = "https://api.xiaohai.org/search/album?f=json&page_no=1&page_size=20&q=" + q;' +
        'var obj = JSON.parse(request(u).trim());' +
        'var items = (obj && obj.mItems) || [];' +
        'VODS = [];' +
        'for (var i=0;i<items.length;i++){var it=items[i];if(!it||!it.mAlbumId)continue;' +
        'VODS.push({vod_id:it.mAlbumId,vod_name:it.mTitle||"",' +
        'vod_pic:it.mPicSmall||it.mPicBig||"",vod_remarks:it.mAuthor||""});}',

    // ===== 二级：请求专辑详情，列出该专辑内歌曲供播放 =====
    // drpy2 二级 js 上下文：input(=MY_URL=vod_id=专辑ID)、request()，结果赋给全局 VOD
    二级: 'js:' +
        'var obj = JSON.parse(request("https://api.xiaohai.org/album/info?album_id=" + input).trim());' +
        'var songs = (obj && obj.mItems) || [];' +
        'var urls = [];' +
        'for (var i=0;i<songs.length;i++){var s=songs[i];if(!s||!s.mTitle)continue;' +
        'var src = s.mFileLink || ("https://play.j53.net/song/p/" + s.mSongId + ".mp3");' +
        'urls.push(s.mTitle + "$" + src);}' +
        'VOD = {vod_id:input,vod_name:obj.mTitle||"",' +
        'vod_pic:obj.mPicBig||obj.mPicSmall||"",' +
        'vod_play_from:"爱赞美",vod_play_url:urls.join("#"),' +
        'vod_remarks:obj.mAuthor||"",vod_year:obj.mPublishTime||""};',

    // ===== 播放：强制直接播放 mp3，不走解析 =====
    // 关键修复：不加 play_json 时 drpy2 会强制 parse:1（解析），mp3 直链因此播放失败。
    // play_json 数组分支对任何 url(re="*") 应用 parse:0、jx:0，直接播放原链接。
    play_json: [{ re: '*', json: { parse: 0, jx: 0 } }],

    lazy: 'js:input={parse:0,url:input,jx:0,header:{"User-Agent":"Mozilla/5.0","Referer":"https://www.izanmei.cc/"}}'
};