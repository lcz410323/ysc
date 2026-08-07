// 爱赞美 drpy2 蜘蛛（播放修复v3 · 全流程验证通过）
// 关键机制（见 drpy2.min.js 源码）：
//   搜索 / 一级 / 推荐 → js 段用全局 VODS（复数）返回列表
//   二级（详情）→ js 段用全局 VOD（单数）返回单个详情对象  ★必用VOD非VODS
//   专辑条目在详情页用 vod_play_url 携带"#"分隔的歌曲选集，可逐首播放
var rule = {
    title: '爱赞美',
    host: 'https://api.xiaohai.org',
    url: 'https://api.xiaohai.org/album/list?f=json&page_no=fypage',
    class_name: '全部专辑',
    class_url: 'album/list',
    searchUrl: 'https://api.xiaohai.org/search/song?f=json&page_no=1&page_size=15&q=**',
    searchable: 2,
    quickSearch: 1,
    filterable: 0,
    timeout: 25000,
    play_parse: true,
    headers: { 'User-Agent': 'Mozilla/5.0', 'Accept': 'application/json' },

    // 推荐/首页：新专辑墙（VODS）
    推荐: 'js:var obj=JSON.parse(request("https://api.xiaohai.org/album/list?f=json&page_no=1").trim());var items=(obj&&obj.mItems)||[];VODS=[];for(var i=0;i<items.length;i++){var it=items[i]||{};var id=it.mAlbumId;if(!id)continue;var pic=it.mPicSmall||it.mPicBig||"";var info=(it.mAuthor||"")+"-"+(it.mSongsTotal?("共"+it.mSongsTotal+"首"):"")+"-"+(it.mPublishTime||"");VODS.push({vod_id:"ALBUM##"+id,vod_name:it.mTitle||"",vod_pic:pic,vod_remarks:info});}',

    // 分类页：专辑列表（VODS，input=已含页码的分类URL）
    一级: 'js:var u=String(input||"");if(u.indexOf("http")<0){u="https://api.xiaohai.org/"+u;}var obj=JSON.parse(request(u).trim());var items=(obj&&obj.mItems)||[];VODS=[];for(var i=0;i<items.length;i++){var it=items[i]||{};var id=it.mAlbumId;if(!id)continue;var pic=it.mPicSmall||it.mPicBig||"";var info=(it.mAuthor||"")+"-"+(it.mSongsTotal?("共"+it.mSongsTotal+"首"):"")+"-"+(it.mPublishTime||"");VODS.push({vod_id:"ALBUM##"+id,vod_name:it.mTitle||"",vod_pic:pic,vod_remarks:info});}',

    // 搜索：歌曲（VODS）
    搜索: 'js:var host="https://api.xiaohai.org/";var q=encodeURIComponent(KEY||"");var obj=JSON.parse(request(host+"search/song?f=json&page_no=1&page_size=15&q="+q).trim());var items=(obj&&obj.mItems)||[];VODS=[];for(var i=0;i<items.length;i++){var it=items[i]||{};var id=it.mSongId;if(!id)continue;var pic="";try{var d=JSON.parse(request(host+"song/info?song_id="+id).trim());pic=d.mPicBig||d.mPicSmall||"";}catch(e){pic="";}VODS.push({vod_id:"SONG##"+id,vod_name:it.mTitle||"",vod_pic:pic,vod_remarks:(it.mAuthor||"")+" - "+(it.mAlbumTitle||"")});}',

    // 二级 详情：VOD 单数
    // SONG##<id> → 单曲详情+歌词；ALBUM##<id> → 专辑歌曲选集
    二级: 'js:var host="https://api.xiaohai.org/";var PLAY="https://play.j53.net/song/p/";var raw=String(input||"").replace(/@@.*$/,"");if(raw.indexOf("ALBUM##")===0){var aid=raw.split("##")[1];var d=JSON.parse(request(host+"album/info?album_id="+aid).trim());var items=(d&&d.mItems)||[];var al=[];for(var i=0;i<items.length;i++){var x=items[i]||{};if(!x.mSongId)continue;var t=(x.mSongOrder?x.mSongOrder+". ":"")+(x.mTitle||"");al.push(t+"$"+PLAY+x.mSongId+".mp3");}VOD={vod_id:"ALBUM##"+aid,vod_name:(d.mAlbumTitle||d.mTitle)||"",vod_pic:(d.mPicBig||d.mPicSmall)||"",vod_remarks:(d.mAuthor||"")+"-"+(items.length?("共"+items.length+"首"):""),vod_actor:(d.mAuthor||""),vod_area:(d.mPublishTime||""),vod_play_from:"爱赞美-专辑",vod_play_url:al.join("#")};}else{var sid=raw.indexOf("SONG##")===0?raw.split("##")[1]:raw;var s=JSON.parse(request(host+"song/info?song_id="+sid).trim());var name=s.mTitle||"";var author=s.mAuthor||"";var album=s.mAlbumTitle||"";var pic=s.mPicBig||s.mPicSmall||"";var lrc="";try{lrc=request(s.mLrcLink||(host+"song/lrc/"+sid+".lrc")).trim();}catch(e){lrc="";}if(lrc)lrc="\\n\\n— 歌词 —\\n"+lrc;var info="演唱："+author+"\\n专辑："+album+"\\n点击量："+(s.mHits||"")+lrc;VOD={vod_id:"SONG##"+sid,vod_name:name,vod_pic:pic,vod_remarks:author+" - "+album,vod_actor:author,vod_area:album,vod_director:album,vod_score:"爱赞美",vod_content:info,vod_play_from:"爱赞美",vod_play_url:name+"$"+PLAY+sid+".mp3"}}',

    // 播放：ur+ 已是 mp3 直链，返回 header 保证可播
    lazy: 'js:var link=String(input||"");if(link.indexOf("@@")>-1)link=link.split("@@")[0];if(link.indexOf("|")>-1){link="https://play.j53.net/song/p/"+link.split("|")[1].split("@@")[0]+".mp3";}input={parse:0,url:link,jx:0,header:{"User-Agent":"Mozilla/5.0","Referer":"https://www.izanmei.cc/"}}'
};