// 爱赞美 drpy2 蜘蛛（播放修复v4 · 修复详情页崩溃Bug）
// =========================================================================
// ★ 关键修复：vod_id 用 "SONG##id"/"ALBUM##id" 命名（不含 /、非 http），
//   drpy2 的 detail() 会走 rule.detailUrl.replaceAll("fyid",...) 分支；
//   若不定义 detailUrl 字段则直接 throw 崩溃，导致 详情无法打开→选集看不到→播放失败。
//   因此必须提供 detailUrl 占位（'fyid'），让 detail() 正常把 vod_id 传给二级。
// =========================================================================
// 机制（见 drpy2.min.js 源码）：
//   搜索/一级/推荐 → js 段用全局 VODS（复数）返回列表
//   二级（详情）→ js 段用全局 VOD（单数）返回单个详情对象
//   detail(): orId=vod_url; detailUrl=vod_url.split("@@")[0];
//     若 detailUrl 不含"/"且非http → url=rule.detailUrl.replaceAll("fyid",detailUrl)
var rule = {
    title: '爱赞美',
    host: 'https://api.xiaohai.org',
    url: 'https://api.xiaohai.org/album/list?f=json&page_no=fypage',
    // ★ 必填：vod_id为纯标识时让 detail() 不崩溃，'fyid' 占位原样回传
    detailUrl: 'fyid',
    class_name: '全部专辑',
    class_url: 'album/list',
    searchUrl: 'https://api.xiaohai.org/search/song?f=json&page_no=1&page_size=15&q=**',
    searchable: 2,
    quickSearch: 1,
    filterable: 0,
    timeout: 25000,
    // mp3 直链无防盗链（已实测 200/206 正常），关闭解析直接直链最稳
    play_parse: false,
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