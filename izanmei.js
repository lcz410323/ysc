// ============================================================
// 爱赞美 drpy2 蜘蛛脚本（增强版）
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
// ============================================================

var rule = {
    title: '爱赞美',
    host: 'https://api.xiaohai.org',

    // ===== 分类（主页入口，专辑浏览）=====
    // 均走 album/list（已实测可用），可分页浏览专辑
    class_name: '全部专辑@@新专辑',
    class_url: 'album/list@@album/list',

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

    // ===== 分类页：专辑列表（js 解析 JSON）=====
    // input 形如 "album/list@@fypage"。vod_id 用前缀 A| 标记专辑页
    一级: 'js:' +
        'var host="https://api.xiaohai.org/";' +
        'var parts=String(input).split("@@");' +
        'var cat=parts[0]||"album/list";' +
        'var pg=parts[1]||1;' +
        'var u=host+cat+"?f=json&page_no="+pg;' +
        'var obj=JSON.parse(request(u).trim());' +
        'var items=(obj&&obj.mItems)||[];' +
        'VODS=[];' +
        'for(var i=0;i<items.length;i++){' +
        '  var it=items[i]||{};' +
        '  var id=it.mAlbumId; if(!id)continue;' +
        '  var name=it.mTitle||""; var pic=it.mPicSmall||it.mPicBig||"";' +
        '  var info=(it.mAuthor||"")+"  "+(it.mSongsTotal?("共"+it.mSongsTotal+"首"):"")+"  "+(it.mPublishTime||"");' +
        '  VODS.push({vod_id:"A|"+id+"@@0",vod_name:name,vod_pic:pic,vod_remarks:info});' +
        '}',

    推荐: '*',

    // ===== 搜索：逐条补封面（详情接口 song/info），vod_id 用前缀 L| 标记歌曲 =====
    搜索: 'js:' +
        'var host="https://api.xiaohai.org/";' +
        'var q=encodeURIComponent(KEY||"");' +
        'var u=host+"search/song?f=json&page_no=1&page_size=15&q="+q;' +
        'var obj=JSON.parse(request(u).trim());' +
        'var items=(obj&&obj.mItems)||[];' +
        'VODS=[];' +
        'for(var i=0;i<items.length;i++){' +
        '  var it=items[i]||{};' +
        '  var id=it.mSongId; if(!id)continue;' +
        '  var name=it.mTitle||""; var author=it.mAuthor||""; var album=it.mAlbumTitle||"";' +
        '  var pic="";' +
        '  try{' +
        '    var d=JSON.parse(request(host+"song/info?song_id="+id).trim());' +
        '    pic=d.mPicBig||d.mPicSmall||"";' +
        '  }catch(e){pic="";}' +
        '  VODS.push({vod_id:"L|"+id+"@@0",vod_name:name,vod_pic:pic,vod_remarks:author+" - "+album});' +
        '}',

    // ===== 二级：区分 专辑页(A|) 与 歌曲详情页(L|) =====
    二级: 'js:' +
        'var host="https://api.xiaohai.org/";' +
        'var raw=String(input||"");' +
        'var tag=raw.split("|")[0];' +
        'var sid=raw.split("|")[1]||"";' +
        'if(tag=="A"){' +
        '   var d=JSON.parse(request(host+"album/info?album_id="+(sid.split("@@")[0])).trim());' +
        '   var items=(d&&d.mItems)||[];' +
        '   VODS=[];' +
        '   for(var i=0;i<items.length;i++){' +
        '     var x=items[i]||{}; if(!x.mSongId)continue;' +
        '     var pic=x.mPicBig||x.mPicSmall||"";' +
        '     var title=(x.mSongOrder?x.mSongOrder+". ":"")+(x.mTitle||"");' +
        '     VODS.push({vod_id:"L|"+x.mSongId+"@@0",vod_name:title,vod_pic:pic,vod_remarks:x.mAuthor||""});' +
        '   }' +
        '}else{' +
        '   var d=JSON.parse(request(host+"song/info?song_id="+(sid.split("@@")[0])).trim());' +
        '   var name=d.mTitle||""; var author=d.mAuthor||""; var album=d.mAlbumTitle||"";' +
        '   var pic=d.mPicBig||d.mPicSmall||"";' +
        '   var lrc="";' +
        '   try{lrc=request(d.mLrcLink||(host+"song/lrc/"+sid+".lrc")).trim();}catch(e){lrc="";}' +
        '   var info="艺人："+author+"\\n专辑："+album+"\\n点击量："+(d.mHits||"")+"\\n\\n— 歌词 —\\n"+lrc;' +
        '   VODS=[{' +
        '     vod_id:"L|"+sid+"@@"+name,' +
        '     vod_name:name,' +
        '     vod_pic:pic,' +
        '     vod_time:author,' +
        '     vod_remarks:author+" - "+album,' +
        '     vod_actor:author,' +
        '     vod_area:album,' +
        '     vod_score:"爱赞美",' +
        '     vod_plot:info,' +
        '     vod_blurb:author+" / "+album' +
        '   }];' +
        '}',

    // ===== 播放：从 vod_id 提取 mp3 直链 =====
    lazy: 'js:var id=String(input).split("|")[1].split("@@")[0];var url="https://play.j53.net/song/p/"+id+".mp3";input={parse:0,url:url,jx:0,header:{"User-Agent":"Mozilla/5.0","Referer":"https://www.izanmei.cc/"}}'
};