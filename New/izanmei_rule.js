/**
 * 爱在M站（izanmei）影视仓 JS 爬虫 —— 引擎版（drpy2 规则格式）
 *
 * @name        爱在M站(引擎版)
 * @description 需配合 drpy2.min.js 引擎使用：影视仓站点 api 填 drpy2.min.js 地址，ext 填本文件地址
 * @version     1.0 (2026-08-07)
 * @format      drpy2 规则型（var rule + js: 解析），饭太硬系配置同款
 *
 * 配置写法（影视仓配置.json 的 sites 里）：
 * {
 *   "key": "izanmei_js",
 *   "name": "爱在M站(引擎版)",
 *   "type": 3,
 *   "api": "https://你的托管地址/drpy2.min.js",
 *   "ext": "https://你的托管地址/izanmei_rule.js",
 *   "searchable": 1,
 *   "quickSearch": 0,
 *   "filterable": 0
 * }
 *
 * 接口依赖（2026-08-07 实测）：
 *   GET https://api.xiaohai.org/album/list?f=json&page_no=N     专辑墙/分类
 *   GET https://api.xiaohai.org/album/info?album_id=ID          专辑详情 -> 歌单
 *   GET https://api.xiaohai.org/search/song?f=json&q=关键词     单曲搜索（无图）
 *   GET https://api.xiaohai.org/song/info?song_id=ID            单曲详情（有封面）
 *   GET https://play.j53.net/song/p/{id}.mp3                    播放直链
 */

var rule = {
    title: '爱在M站',
    host: 'https://api.xiaohai.org',
    url: '/album/list?f=json&page_no=fypage',
    searchUrl: '/search/song?f=json&page_no=1&page_size=20&q=**',
    searchable: 1,
    quickSearch: 0,
    filterable: 0,
    timeout: 10000,
    play_parse: true,
    limit: 20,
    headers: {
        'User-Agent': 'Mozilla/5.0'
    },
    // 首页推荐：专辑墙第一页
    推荐: 'js:let _d=[];let _r=JSON.parse(request("https://api.xiaohai.org/album/list?f=json&page_no=1"));let _it=(_r&&_r.mItems)||[];for(let _i=0;_i<_it.length;_i++){let _o=_it[_i];_d.push({vod_id:"ALBUM##"+_o.mAlbumId,vod_name:String(_o.mTitle||"").replace(/[$#]/g," "),vod_pic:_o.mPicSmall||"",vod_remarks:(_o.mAuthor||"")+(_o.mSongsTotal?(" · 共"+_o.mSongsTotal+"首"):"")})}VODS=_d;',
    // 专辑墙分页
    一级: 'js:let _pg=Number(MY_PAGE)||1;let _res=JSON.parse(request("https://api.xiaohai.org/album/list?f=json&page_no="+_pg));let _items=(_res&&_res.mItems)||[];let _list=[];for(let _i=0;_i<_items.length;_i++){let _o=_items[_i];_list.push({vod_id:"ALBUM##"+_o.mAlbumId,vod_name:String(_o.mTitle||"").replace(/[$#]/g," "),vod_pic:_o.mPicSmall||"",vod_remarks:(_o.mAuthor||"")+(_o.mSongsTotal?(" · 共"+_o.mSongsTotal+"首"):""),vod_time:_o.mPublishTime||""})}setResult2({page:_pg,pagecount:_list.length>0?_pg+1:_pg,limit:_list.length,total:_list.length,list:_list});',
    // 详情：ALBUM##id -> 专辑歌单；SONG##id -> 单曲直放
    二级: 'js:let _tid=String(input||"");let _v={vod_id:_tid,vod_name:"",vod_pic:"",vod_content:"",vod_play_from:"爱在M站",vod_play_url:"",vod_remarks:""};try{if(_tid.indexOf("ALBUM##")===0){let _aid=_tid.split("##")[1];let _d=JSON.parse(request("https://api.xiaohai.org/album/info?album_id="+_aid));if(_d){_v.vod_name=String(_d.mTitle||"").replace(/[$#]/g," ");_v.vod_pic=_d.mPicBig||_d.mPicSmall||"";_v.vod_content=_d.mDetail||_d.mInfo||"";_v.vod_remarks=(_d.mAuthor||"")+(_d.mSongsTotal?(" · 共"+_d.mSongsTotal+"首"):"");let _arr=(_d.mItems)||[];let _u=[];for(let _i=0;_i<_arr.length;_i++){let _s=_arr[_i];let _link=_s.mFileLink||("https://play.j53.net/song/p/"+_s.mSongId+".mp3");_u.push(String(_s.mTitle||("曲目"+(_i+1))).replace(/[$#]/g," ")+"$"+_link)}_v.vod_play_url=_u.join("#")}}else if(_tid.indexOf("SONG##")===0){let _sid=_tid.split("##")[1];let _d=JSON.parse(request("https://api.xiaohai.org/song/info?song_id="+_sid));if(_d){_v.vod_name=String(_d.mTitle||("歌曲"+_sid)).replace(/[$#]/g," ");_v.vod_pic=_d.mPicBig||_d.mPicSmall||"";_v.vod_content=_d.mAlbumTitle?("专辑："+_d.mAlbumTitle):"";_v.vod_remarks=_d.mAuthor||""}_v.vod_play_url="播放$https://play.j53.net/song/p/"+_sid+".mp3"}else{_v.vod_name="未知内容";_v.vod_remarks="该条目无法解析"}}catch(e){_v.vod_name="加载失败";_v.vod_remarks="请求异常";print("izanmei detail error: "+e.message)}VOD=_v;',
    // 单曲搜索（搜索接口无图，vod_pic 留空由客户端兜底）
    搜索: 'js:let _kw="";try{if(typeof KEY!=="undefined"&&KEY){_kw=String(KEY)}else{let _m=String(input||"").match(/[?&]q=([^&]*)/);_kw=_m?decodeURIComponent(_m[1]):""}}catch(e){_kw=""}let _r=JSON.parse(request("https://api.xiaohai.org/search/song?f=json&page_no=1&page_size=20&q="+encodeURIComponent(_kw)));let _items=(_r&&_r.mItems)||[];let _list=[];for(let _i=0;_i<_items.length;_i++){let _o=_items[_i];_list.push({vod_id:"SONG##"+_o.mSongId,vod_name:String(_o.mTitle||"").replace(/[$#]/g," "),vod_pic:"",vod_remarks:_o.mAuthor||_o.mAlbumTitle||""})}VODS=_list;',
    // 播放：mp3 直链强制直放（parse:0，不送解析器）
    lazy: 'js:input={parse:0,url:input};'
};
