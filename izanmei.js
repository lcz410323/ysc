// ============================================================
// 爱赞美 drpy2 蜘蛛脚本 · 专辑无封面版
// 基于"最初嗅探版"，新增[专辑浏览]功能，但[不显示专辑封面]
// ============================================================
// 接口：
//   搜索: https://api.xiaohai.org/search/song?f=json&page_no=<页>&q=<关键词>
//   专辑列表: https://api.xiaohai.org/album/list?f=json&page_no=<页>
//   专辑详情: https://api.xiaohai.org/album/info?album_id=<专辑ID>
//   歌曲详情: https://api.xiaohai.org/song/info?song_id=<歌曲ID>
//   播放: https://play.j53.net/song/p/<歌曲ID>.mp3  (直链可播)
// ============================================================
var rule = {
    title: '爱赞美',
    host: 'https://api.xiaohai.org',
    url: 'https://api.xiaohai.org/album/list?f=json&page_no=fypage',
    detailUrl: 'fyid',
    class_name: '专辑',
    class_url: 'album/list',
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
    // ===== 推荐/首页：专辑列表(纯文字,不显示封面) =====
    推荐: 'js:' +
        'var host="https://api.xiaohai.org/";' +
        'var obj=JSON.parse(request(host+"album/list?f=json&page_no=1").trim());' +
        'var items=(obj&&obj.mItems)||[];VODS=[];' +
        'for(var i=0;i<items.length;i++){var it=items[i]||{};var id=it.mAlbumId;if(!id)continue;' +
        'var name=String(it.mTitle||"").replace(/[#$@]/g,"");' +
        'var info=(String(it.mAuthor||"").replace(/[#$@]/g,""))+"-"+(it.mSongsTotal?("共"+it.mSongsTotal+"首"):"")+"-"+(it.mPublishTime||"");' +
'VODS.push({vod_id:"ALBUM##"+id,vod_name:name,vod_pic:"",vod_remarks:info});}',
    // ===== 分类页：专辑列表(纯文字,不显示封面) =====
    一级: 'js:' +
        'var host="https://api.xiaohai.org/";' +
        'var u=String(input||"");if(u.indexOf("http")<0){u=host+u;}' +
        'var obj=JSON.parse(request(u).trim());' +
        'var items=(obj&&obj.mItems)||[];VODS=[];' +
        'for(var i=0;i<items.length;i++){var it=items[i]||{};var id=it.mAlbumId;if(!id)continue;' +
        'var name=String(it.mTitle||"").replace(/[#$@]/g,"");' +
        'var info=(String(it.mAuthor||"").replace(/[#$@]/g,""))+"-"+(it.mSongsTotal?("共"+it.mSongsTotal+"首"):"")+"-"+(it.mPublishTime||"");' +
'VODS.push({vod_id:"ALBUM##"+id,vod_name:name,vod_pic:"",vod_remarks:info});}',
    // ===== 搜索：歌曲(直链嗅探) =====
    搜索: 'js:' +
        'var PLAY="https://play.j53.net/song/p/";' +
        'var q=encodeURIComponent(KEY||"");' +
        'var u="https://api.xiaohai.org/search/song?f=json&page_no=1&page_size=20&q="+q;' +
        'var h=request(u).trim();' +
        'var obj=JSON.parse(h);' +
        'var items=(obj&&obj.mItems)||[];' +
        'VODS=[];' +
        'for(var i=0;i<items.length;i++){var it=items[i];if(!it||!it.mSongId)continue;' +
        'var name=it.mTitle||"";var author=it.mAuthor||"";' +
        'var pic=it.mPicSmall||it.mPicBig||"";' +
        'var link=PLAY+it.mSongId+".mp3";' +
'VODS.push({vod_id:link+"@@"+name+"@@"+pic,vod_name:name,vod_pic:pic,vod_remarks:author});}',
    // ===== 二级：专辑展开 / 单曲直链 =====
    二级: 'js:' +
        'var host="https://api.xiaohai.org/";var PLAY="https://play.j53.net/song/p/";' +
        'var raw=String(input||"").replace(/@@.*$/,"");' +
        'var cln=function(s){return String(s||"").replace(/[#$@]/g,"").replace(/\\s+$/,"");};' +
        'if(raw.indexOf("ALBUM##")===0){' +
        'var d=JSON.parse(request(host+"album/info?album_id="+raw.split("##")[1]).trim());' +
        'var its=(d&&d.mItems)||[];var al=[];' +
        'for(var ii=0;ii<its.length;ii++){var x=its[ii]||{};if(!x.mSongId)continue;var nm=cln(x.mTitle);al.push(nm+"$"+PLAY+x.mSongId+".mp3");}' +
        'VOD={vod_id:"ALBUM##"+raw.split("##")[1],vod_name:cln(d.mAlbumTitle||d.mTitle),vod_pic:"",' +
        'vod_remarks:(cln(d.mAuthor))+"-"+(its.length?("共"+its.length+"首"):""),vod_actor:cln(d.mAuthor),vod_area:(d.mPublishTime||""),' +
        'vod_play_from:"爱赞美专辑",vod_play_url:al.join("#")};' +
        '}else{' +
        'var sid=raw.indexOf("SONG##")===0?raw.split("##")[1]:raw;' +
        'var s=JSON.parse(request(host+"song/info?song_id="+sid).trim());' +
        'var name=cln(s.mTitle);var author=cln(s.mAuthor);var album=cln(s.mAlbumTitle);' +
        'var pic=s.mPicBig||s.mPicSmall||"";' +
        'var info="演唱："+author+"\n专辑："+album+"\n点击量："+(s.mHits||"");' +
        'VOD={vod_id:"SONG##"+sid,vod_name:name,vod_pic:pic,vod_remarks:author+" - "+album,' +
        'vod_actor:author,vod_area:album,vod_director:album,vod_score:"爱赞美",vod_content:info,' +
        'vod_play_from:"爱赞美",vod_play_url:name+"$"+PLAY+sid+".mp3"};' +
        '}',
    // ===== 播放：直接返回 mp3 直链，免解析 =====
    lazy: 'js:input={parse:0,url:input,jx:0,header:{"User-Agent":"Mozilla/5.0","Referer":"https://www.izanmei.cc/"}}'
};
