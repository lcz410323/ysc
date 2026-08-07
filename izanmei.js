// ============================================================
// 爱赞美 drpy2 蜘蛛脚本 · 最终版 v6
// 对接 爱赞美APK 新版 JSON API（全流程实测通过）
// ============================================================
// 接口：
//   搜索: https://api.xiaohai.org/search/song?f=json&page_no=<页>&page_size=<条>&q=<关键词>
//   详情: https://api.xiaohai.org/song/info?song_id=<歌曲ID>
//   专辑: https://api.xiaohai.org/album/info?album_id=<专辑ID>
//   歌词: https://api.xiaohai.org/song/lrc/<歌曲ID>.lrc
//   播放: https://play.j53.net/song/p/<歌曲ID>.mp3   (直链 200/206 可播，无防盗链)
//
// ★ v6 播放加固说明（drpy2 playParse 反劫持）：
//   drpy2 的 playParse() 结尾在「rule.play_json 为空/未定义」时会强制 set parse=1，
//   把直链 mp3 误判成"待解析"，导致影视仓提示"暂无播放数据"。
//   解法：play_parse=true + lazy 用 input 直接返回纯直链对象，
//   且 play_json 用【非空数组】显式 {parse:0,jx:0} 走 assign 分支，
//   100% 保住 parse=0（不再依赖"空数组不覆盖"这种易漂移的边界行为）。
//
// 站点注册（izanmei.json 里）：
//   { "key":"izanmei","name":"爱赞美","type":3, "playerType":2,
//     "api":"<drpy2.min.js 的URL>","ext":"<本文件 izanmei.js 的URL>",
//     "searchable":1,"quickSearch":1,"filterable":0,"timeout":20 }
// ============================================================

var rule = {
    title: '爱赞美',
    host: 'https://api.xiaohai.org',
    url: 'https://api.xiaohai.org/album/list?f=json&page_no=fypage',
    // ★ 必填：vod_id 为纯标识（SONG##id / ALBUM##id）时让 detail() 不崩溃，'fyid' 占位原样回传
    detailUrl: 'fyid',
    class_name: '全部专辑',
    class_url: 'album/list',
    searchUrl: 'https://api.xiaohai.org/search/song?f=json&page_no=1&page_size=15&q=**',
    searchable: 2,
    quickSearch: 1,
    filterable: 0,
    timeout: 25000,
    // ★ v6 播放加固：parse 铁定 0，直链 mp3 直接播放
    play_parse: true,
    lazy: 'js:input={parse:0,url:input,jx:0};',
    play_json: [ { re: "*", json: { parse: 0, jx: 0 } } ],
    headers: { 'User-Agent': 'Mozilla/5.0', 'Accept': 'application/json' },

    // 推荐/首页：新专辑墙（VODS）
    推荐: 'js:var host="https://api.xiaohai.org/";var obj=JSON.parse(request(host+"album/list?f=json&page_no=1").trim());var items=(obj&&obj.mItems)||[];VODS=[];var i,it,id,pic,info;for(i=0;i<items.length;i++){it=items[i]||{};id=it.mAlbumId;if(!id)continue;pic=it.mPicSmall||it.mPicBig||"";info=(it.mAuthor||"").replace(/[#$@]/g,"")+"-"+(it.mSongsTotal?("共"+it.mSongsTotal+"首"):"")+"-"+(it.mPublishTime||"");VODS.push({vod_id:"ALBUM##"+id,vod_name:String(it.mTitle||"").replace(/[#$@]/g,""),vod_pic:pic,vod_remarks:info});}',

    // 分类页：专辑列表（VODS，input=已含页码的分类URL）
    一级: 'js:var host="https://api.xiaohai.org/";var u=String(input||"");if(u.indexOf("http")<0){u=host+u;}var obj=JSON.parse(request(u).trim());var items=(obj&&obj.mItems)||[];VODS=[];var i,it,id,pic,info;for(i=0;i<items.length;i++){it=items[i]||{};id=it.mAlbumId;if(!id)continue;pic=it.mPicSmall||it.mPicBig||"";info=(it.mAuthor||"").replace(/[#$@]/g,"")+"-"+(it.mSongsTotal?("共"+it.mSongsTotal+"首"):"")+"-"+(it.mPublishTime||"");VODS.push({vod_id:"ALBUM##"+id,vod_name:String(it.mTitle||"").replace(/[#$@]/g,""),vod_pic:pic,vod_remarks:info});}',

    // 搜索：歌曲（VODS）
    搜索: 'js:var host="https://api.xiaohai.org/";var q=encodeURIComponent(KEY||"");var obj=JSON.parse(request(host+"search/song?f=json&page_no=1&page_size=15&q="+q).trim());var items=(obj&&obj.mItems)||[];VODS=[];var i,it,id,pic;for(i=0;i<items.length;i++){it=items[i]||{};id=it.mSongId;if(!id)continue;pic="";try{var d=JSON.parse(request(host+"song/info?song_id="+id).trim());pic=d.mPicBig||d.mPicSmall||"";}catch(e){pic="";}VODS.push({vod_id:"SONG##"+id,vod_name:String(it.mTitle||"").replace(/[#$@]/g,""),vod_pic:pic,vod_remarks:String(it.mAuthor||"").replace(/[#$@]/g,"")+" - "+String(it.mAlbumTitle||"").replace(/[#$@]/g,"")});}',

    // 二级 详情：VOD 单数（input=vod_id，如 SONG##id / ALBUM##id）
    二级: 'js:var host="https://api.xiaohai.org/";var PLAY="https://play.j53.net/song/p/";var raw=String(input||"").replace(/@@.*$/,"");var cln=function(s){return String(s||"").replace(/[#$@]/g,"").replace(/\\s+$/,"");};if(raw.indexOf("ALBUM##")===0){var d=JSON.parse(request(host+"album/info?album_id="+raw.split("##")[1]).trim());var items=(d&&d.mItems)||[];var al=[];for(var i=0;i<items.length;i++){var x=items[i]||{};if(!x.mSongId)continue;var nm=cln(x.mTitle);var t=(x.mSongOrder?x.mSongOrder+". ":"")+nm;al.push(t+"$"+PLAY+x.mSongId+".mp3");}VOD={vod_id:"ALBUM##"+raw.split("##")[1],vod_name:cln(d.mAlbumTitle||d.mTitle),vod_pic:(d.mPicBig||d.mPicSmall)||"",vod_remarks:(cln(d.mAuthor))+"-"+(items.length?("共"+items.length+"首"):""),vod_actor:cln(d.mAuthor),vod_area:(d.mPublishTime||""),vod_play_from:"爱赞美-专辑",vod_play_url:al.join("#")};}else{var sid=raw.indexOf("SONG##")===0?raw.split("##")[1]:raw;var s=JSON.parse(request(host+"song/info?song_id="+sid).trim());var name=cln(s.mTitle);var author=cln(s.mAuthor);var album=cln(s.mAlbumTitle);var pic=s.mPicBig||s.mPicSmall||"";var info="演唱："+author+"\\n专辑："+album+"\\n点击量："+(s.mHits||"");VOD={vod_id:"SONG##"+sid,vod_name:name,vod_pic:pic,vod_remarks:author+" - "+album,vod_actor:author,vod_area:album,vod_director:album,vod_score:"爱赞美",vod_content:info,vod_play_from:"爱赞美",vod_play_url:name+"$"+PLAY+sid+".mp3"}}'
};