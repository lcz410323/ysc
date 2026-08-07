// ============================================================
// 爱赞美 drpy2 蜘蛛脚本（增强版·播放修复）
// 对接 爱赞美 新版 JSON API（搜索/播放/专辑/歌词 已实测）
//
// 接口：
//   搜索:   https://api.xiaohai.org/search/song?f=json&q=<关键词>
//   详情:   https://api.xiaohai.org/song/info?song_id=<ID>
//   歌词:   https://api.xiaohai.org/song/lrc/<ID>.lrc
//   专辑列表: https://api.xiaohai.org/album/list?f=json&page_no=<页>
//   专辑详情: https://api.xiaohai.org/album/info?album_id=<ID>
//   播放:   https://play.j53.net/song/p/<ID>.mp3
//
// 影视仓站点条目（config 里）：
//   { "key":"izanmei","name":"爱赞美","type":3,
//     "api":"https://gh-proxy.com/https://raw.githubusercontent.com/lcz410323/ysc/main/drpy2.min.js",
//     "ext":"https://gh-proxy.com/https://raw.githubusercontent.com/lcz410323/ysc/main/izanmei.js",
//     "searchable":1,"quickSearch":1,"filterable":0,"timeout":20 }
//
// ===== 播放结构说明 =====
// 所有"歌曲"条目的 vod_id 直接放【完整 mp3 直链@@歌名@@封面】，
// 与旧版已验证能播的格式一致：播放器可对 mp3 直链直接嗅探/播放。
// 专辑条目的 vod_id 用前缀 "ALBUM##" 标记，二级负责展开成歌曲列表。
// 歌曲二级返回带 vod_play_from/vod_play_url 的详情对象，供详情页播放 + 展示歌词。
// ============================================================

var rule = {
    title: '爱赞美',
    host: 'https://api.xiaohai.org',

    // ===== 分类（主页入口：专辑浏览）=====
    class_name: '全部专辑@@新专辑',
    class_url: 'album/list@@album/new',

    // ===== 搜索 =====
    searchUrl: 'https://api.xiaohai.org/search/song?f=json&page_no=1&page_size=15&q=**',

    searchable: 2,
    quickSearch: 1,
    filterable: 0,
    timeout: 25000,
    play_parse: true,

    headers: {
        'User-Agent': 'Mozilla/5.0',
        'Accept': 'application/json'
    },

    // ===== 推荐/首页：新专辑墙 =====
    推荐: 'js:' +
        'var host="https://api.xiaohai.org/";' +
        'var obj=JSON.parse(request(host+"album/list?f=json&page_no=1").trim());' +
        'var items=(obj&&obj.mItems)||[];' +
        'VODS=[];' +
        'for(var i=0;i<items.length;i++){' +
        '  var it=items[i]||{};' +
        '  var id=it.mAlbumId; if(!id)continue;' +
        '  var pic=it.mPicSmall||it.mPicBig||"";' +
        '  var info=(it.mAuthor||"")+"  "+(it.mSongsTotal?("共"+it.mSongsTotal+"首"):"")+"  "+(it.mPublishTime||"");' +
        '  VODS.push({vod_id:"ALBUM##"+id+"@@0",vod_name:it.mTitle||"",vod_pic:pic,vod_remarks:info});' +
        '}',

    // ===== 分类页：专辑列表（input = "album/<name>@@fypage"）=====
    一级: 'js:' +
        'var host="https://api.xiaohai.org/";' +
        'var parts=String(input).split("@@");' +
        'var pg=parts[1]||1;' +
        'var u=host+"album/list?f=json&page_no="+pg;' +
        'var obj=JSON.parse(request(u).trim());' +
        'var items=(obj&&obj.mItems)||[];' +
        'VODS=[];' +
        'for(var i=0;i<items.length;i++){' +
        '  var it=items[i]||{};' +
        '  var id=it.mAlbumId; if(!id)continue;' +
        '  var pic=it.mPicSmall||it.mPicBig||"";' +
        '  var info=(it.mAuthor||"")+"  "+(it.mSongsTotal?("共"+it.mSongsTotal+"首"):"")+"  "+(it.mPublishTime||"");' +
        '  VODS.push({vod_id:"ALBUM##"+id+"@@0",vod_name:it.mTitle||"",vod_pic:pic,vod_remarks:info});' +
        '}',

    // ===== 搜索：歌曲，vod_id = 完整mp3直链@@歌名@@封面（直接可播）=====
    搜索: 'js:' +
        'var host="https://api.xiaohai.org/";' +
        'var PLAY="https://play.j53.net/song/p/";' +
        'var q=encodeURIComponent(KEY||"");' +
        'var obj=JSON.parse(request(host+"search/song?f=json&page_no=1&page_size=15&q="+q).trim());' +
        'var items=(obj&&obj.mItems)||[];' +
        'VODS=[];' +
        'for(var i=0;i<items.length;i++){' +
        '  var it=items[i]||{};' +
        '  var id=it.mSongId; if(!id)continue;' +
        '  var pic="";' +
        '  try{var d=JSON.parse(request(host+"song/info?song_id="+id).trim());pic=d.mPicBig||d.mPicSmall||"";}catch(e){pic="";}' +
        '  var link=PLAY+id+".mp3";' +
        '  VODS.push({vod_id:link+"@@"+(it.mTitle||"")+"@@"+pic,vod_name:it.mTitle||"",vod_pic:pic,vod_remarks:(it.mAuthor||"")+" - "+(it.mAlbumTitle||"")});' +
        '}',

    // ===== 二级：区分 专辑(ALBUM##) 与 歌曲（详情+歌词），均保证可播放 =====
    二级: 'js:' +
        'var host="https://api.xiaohai.org/";' +
        'var PLAY="https://play.j53.net/song/p/";' +
        'var raw=String(input||"");' +
        'if(raw.indexOf("ALBUM##")===0){' +
        '   var aid=raw.split("##")[1].split("@@")[0];' +
        '   var d=JSON.parse(request(host+"album/info?album_id="+aid).trim());' +
        '   var items=(d&&d.mItems)||[];' +
        '   VODS=[];' +
        '   for(var i=0;i<items.length;i++){' +
        '     var x=items[i]||{}; if(!x.mSongId)continue;' +
        '     var pic=x.mPicBig||x.mPicSmall||"";' +
        '     var link=PLAY+x.mSongId+".mp3";' +
        '     var title=(x.mSongOrder?x.mSongOrder+". ":"")+(x.mTitle||"");' +
        '     VODS.push({vod_id:link+"@@"+title+"@@"+pic,vod_name:title,vod_pic:pic,vod_remarks:x.mAuthor||""});' +
        '   }' +
        '}else{' +
        '   var vparts=raw.split("@@");' +
        '   var url0=vparts[0]||"";' +
        '   var name0=vparts[1]||"";' +
        '   var idm=url0.replace(/^.*\\/([0-9]+)\\.mp3$/,"$1");' +
        '   var d=JSON.parse(request(host+"song/info?song_id="+idm).trim());' +
        '   var name=d.mTitle||name0; var author=d.mAuthor||""; var album=d.mAlbumTitle||"";' +
        '   var pic=d.mPicBig||d.mPicSmall||"";' +
        '   var lrc="";' +
        '   try{lrc=request(d.mLrcLink||(host+"song/lrc/"+idm+".lrc")).trim();}catch(e){lrc="";}' +
        '   var info="艺人："+author+"\\n专辑："+album+"\\n点击量："+(d.mHits||"")+"\\n\\n— 歌词 —\\n"+lrc;' +
        '   VODS=[{' +
        '     vod_id:url0,' +
        '     vod_name:name,' +
        '     vod_pic:pic,' +
        '     vod_time:author,' +
        '     vod_remarks:author+" - "+album,' +
        '     vod_actor:author,' +
        '     vod_area:album,' +
        '     vod_score:"爱赞美",' +
        '     vod_plot:info,' +
        '     vod_blurb:author+" / "+album,' +
        '     vod_play_from:"mp3",' +
        '     vod_play_url:name+"$"+url0' +
        '   }];' +
        '}',

    // ===== 播放：ur0 已经是 mp3 直链，直接返回 =====
    lazy: 'js:var link=String(input||"");if(link.indexOf("@@")>-1)link=link.split("@@")[0];if(link.indexOf("|")>-1){link="https://play.j53.net/song/p/"+link.split("|")[1].split("@@")[0]+".mp3";}input={parse:0,url:link,jx:0,header:{"User-Agent":"Mozilla/5.0","Referer":"https://www.izanmei.cc/"}}'
};