/**
 * 爱在M站（izanmei）影视仓/TVBox JS 爬虫
 *
 * @name        爱在M站
 * @description 专辑墙浏览 + 单曲搜索 + 专辑歌单 + mp3 直链播放
 * @version     1.0 (2026-08-07)
 * @format      drpy2 / TVBox 系 JS 爬虫（openlist-tvbox 同款格式）
 *
 * 部署方式：
 *   1. 将本文件上传到任意静态托管（GitHub/Gitee/cnb.cool/网盘直链等）
 *   2. 影视仓配置 JSON 的 sites 里加一条：
 *      {
 *        "key": "izanmei",
 *        "name": "爱在M站",
 *        "type": 3,
 *        "api": "https://你的托管地址/izanmei.js",
 *        "searchable": 1,
 *        "quickSearch": 0,
 *        "filterable": 0
 *      }
 *   3. 把配置 JSON 的链接填进影视仓「配置地址」即可。
 *
 * 接口依赖（2026-08-07 实测）：
 *   GET https://api.xiaohai.org/album/list?f=json&page_no=N     专辑墙/分类
 *   GET https://api.xiaohai.org/album/info?album_id=ID          专辑详情 -> 歌单
 *   GET https://api.xiaohai.org/search/song?f=json&q=关键词     单曲搜索（无图）
 *   GET https://api.xiaohai.org/song/info?song_id=ID            单曲详情（有封面）
 *   GET https://play.j53.net/song/p/{id}.mp3                    播放直链
 */

const VERSION = 'izanmei v1.0 20260807';
const API_HOST = 'https://api.xiaohai.org';
const PLAY_HOST = 'https://play.j53.net';
const UA = 'Mozilla/5.0';
const request_timeout = 10000;

// 搜索接口无图片字段，用 1x1 透明占位封面兜底
const PicPlaceholder = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==';

function print(any) {
  any = any || '';
  if (typeof (any) == 'object' && Object.keys(any).length > 0) {
    try { console.log(JSON.stringify(any)); } catch (e) { console.log(typeof (any)); }
  } else {
    console.log(any);
  }
}

/**
 * 请求封装，基于引擎内置 req()，返回带 .json()/.text() 的响应对象
 */
const http = function (url, options = {}) {
  options.timeout = request_timeout;
  if (!options.headers) options.headers = {};
  const keys = Object.keys(options.headers).map(function (it) { return it.toLowerCase(); });
  if (!keys.includes('referer')) options.headers['Referer'] = 'https://www.xiaohai.org/';
  if (!keys.includes('user-agent')) options.headers['User-Agent'] = UA;
  try {
    const res = req(url, options);
    res.json = function () { return res && res.content ? JSON.parse(res.content) : null; };
    res.text = function () { return res && res.content ? res.content : ''; };
    return res;
  } catch (e) {
    console.log('http error: ' + e.message);
    return { json: function () { return null; }, text: function () { return ''; } };
  }
};
http.get = function (url, options) { return http(url, Object.assign(options || {}, { method: 'GET' })); };

function getJson(url) {
  const res = http.get(url);
  return res.json();
}

function cleanName(s) {
  return String(s == null ? '' : s).replace(/[$#]/g, ' ').trim();
}

function listOf(data) {
  return (data && Array.isArray(data.mItems)) ? data.mItems : [];
}

function init(ext) {
  print(VERSION + ' init, ext=' + (typeof ext === 'string' ? ext : 'object'));
}

function home(filter) {
  return JSON.stringify({
    class: [
      { type_id: 'album', type_name: '专辑' }
    ],
    filters: {}
  });
}

function homeVod(params) {
  return JSON.stringify({ list: [] });
}

/**
 * 专辑墙（分页）
 */
function category(tid, pg, filter, extend) {
  const page = parseInt(pg) || 1;
  const data = getJson(API_HOST + '/album/list?f=json&page_no=' + page);
  const list = listOf(data).map(function (it) {
    const remark = [it.mAuthor, it.mSongsTotal ? '共' + it.mSongsTotal + '首' : ''].filter(Boolean).join(' · ');
    return {
      vod_id: 'ALBUM##' + it.mAlbumId,
      vod_name: cleanName(it.mTitle),
      vod_pic: it.mPicSmall || PicPlaceholder,
      vod_remarks: remark,
      vod_time: it.mPublishTime || ''
    };
  });
  return JSON.stringify({
    page: page,
    pagecount: list.length > 0 ? page + 1 : page,
    limit: list.length,
    total: list.length,
    list: list
  });
}

/**
 * 详情：
 *   ALBUM##{albumId}  -> 专辑歌单（多曲目一集播完的形式：歌名$直链#...）
 *   SONG##{songId}@@{直链} -> 单曲直放
 */
function detail(tid) {
  tid = String(tid || '');
  if (tid.indexOf('ALBUM##') === 0) {
    const albumId = tid.split('##')[1];
    const data = getJson(API_HOST + '/album/info?album_id=' + albumId);
    if (!data) {
      return JSON.stringify({ list: [{ vod_id: tid, vod_name: '专辑加载失败', vod_remarks: '请检查网络或稍后重试', vod_pic: PicPlaceholder }] });
    }
    const songs = listOf(data).map(function (it) {
      const url = it.mFileLink || (PLAY_HOST + '/song/p/' + it.mSongId + '.mp3');
      return cleanName(it.mTitle) + '$' + url;
    });
    return JSON.stringify({ list: [{
      vod_id: tid,
      vod_name: cleanName(data.mTitle),
      vod_pic: data.mPicBig || data.mPicSmall || PicPlaceholder,
      vod_content: data.mDetail || data.mInfo || '',
      vod_play_from: '爱在M站',
      vod_play_url: songs.join('#'),
      vod_remarks: (data.mAuthor || '') + (data.mSongsTotal ? ' · 共' + data.mSongsTotal + '首' : '')
    }] });
  }
  if (tid.indexOf('SONG##') === 0) {
    const body = tid.slice(6);
    const sep = body.indexOf('@@');
    const songId = sep >= 0 ? body.slice(0, sep) : body;
    const link = sep >= 0 ? body.slice(sep + 2) : '';
    const info = getJson(API_HOST + '/song/info?song_id=' + songId);
    const name = (info && info.mTitle) ? info.mTitle : '歌曲 ' + songId;
    const pic = (info && (info.mPicBig || info.mPicSmall)) || PicPlaceholder;
    const album = (info && info.mAlbumTitle) ? '专辑：' + info.mAlbumTitle : '';
    const url = link || (PLAY_HOST + '/song/p/' + songId + '.mp3');
    return JSON.stringify({ list: [{
      vod_id: tid,
      vod_name: cleanName(name),
      vod_pic: pic,
      vod_content: album,
      vod_play_from: '爱在M站',
      vod_play_url: '播放$' + url,
      vod_remarks: (info && info.mAuthor) || ''
    }] });
  }
  return JSON.stringify({ list: [] });
}

/**
 * 播放：mp3 直链直接返回（parse:0，无需解析）
 */
function play(flag, id, flags) {
  return id;
}

/**
 * 单曲搜索
 */
function search(wd, quick, pg) {
  const kw = encodeURIComponent(String(wd || ''));
  const data = getJson(API_HOST + '/search/song?f=json&page_no=1&page_size=20&q=' + kw);
  const list = listOf(data).map(function (it) {
    return {
      vod_id: 'SONG##' + it.mSongId + '@@' + (it.mFileLink || ''),
      vod_name: cleanName(it.mTitle),
      vod_pic: PicPlaceholder,
      vod_remarks: it.mAuthor || it.mAlbumTitle || ''
    };
  });
  return JSON.stringify({ page: 1, pagecount: 1, limit: list.length, total: list.length, list: list });
}

export default {
  init: init,
  home: home,
  homeVod: homeVod,
  category: category,
  detail: detail,
  play: play,
  search: search
};
