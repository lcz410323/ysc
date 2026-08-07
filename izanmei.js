// ============================================================
// 爱赞美 drpy2 蜘蛛脚本
// 对接 爱赞美 新版 JSON API（已全流程实测通过）
//
// 接口：
//   搜索: https://api.xiaohai.org/search/song?f=json&page_no=<页>&page_size=<条>&q=<关键词>
//   详情: https://api.xiaohai.org/song/info?song_id=<ID>
//   歌词: https://api.xiaohai.org/song/lrc/<ID>.lrc
//   播放: https://play.j53.net/song/p/<ID>.mp3
//
// 影视仓站点条目（config 里）：
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

    // 搜索：** 占位会被 drpy2 替换为关键词（js 内不使用 MY_URL，自行编码）
    searchUrl: 'https://api.xiaohai.org/search/song?f=json&page_no=1&page_size=20&q=**',

    searchable: 2,
    quickSearch: 1,
    filterable: 0,
    timeout: 20000,
    play_parse: true,

    headers: {
        'User-Agent': 'Mozilla/5.0',
        'Accept': 'application/json'
    },

    // ===== 搜索：纯 JS 解析 JSON =====
    // 搜索 js 上下文可用：KEY(关键词)、MY_URL、HOST、request()
    // 结果赋给 VODS 数组。
    // vod_id = mp3完整链接 + @@歌曲名 + @@封面，配合"二级:'*'" 直接嗅探播放
    搜索: 'js:' +
        'var PLAY = "https://play.j53.net/song/p/";' +
        'var q = encodeURIComponent(KEY || "");' +
        'var u = "https://api.xiaohai.org/search/song?f=json&page_no=1&page_size=20&q=" + q;' +
        'var h = request(u).trim();' +
        'var obj = JSON.parse(h);' +
        'var items = (obj && obj.mItems) || [];' +
        'VODS = [];' +
        'for (var i=0;i<items.length;i++){var it=items[i];if(!it||!it.mSongId)continue;' +
        'var name=it.mTitle||"";var author=it.mAuthor||"";' +
        'var pic=it.mPicSmall||it.mPicBig||"";' +
        'var link=PLAY+it.mSongId+".mp3";' +
        'VODS.push({vod_id:link+"@@"+name+"@@"+pic,vod_name:name,vod_pic:pic,vod_remarks:author});}',

    // 二级：* 表示不专门解析详情，直接使用一级链接（mp3）嗅探播放
    二级: '*',

    // 播放：直接返回 mp3 链接，免解析
    lazy: 'js:input={parse:0,url:input,jx:0,header:{"User-Agent":"Mozilla/5.0","Referer":"https://www.izanmei.cc/"}}'
};