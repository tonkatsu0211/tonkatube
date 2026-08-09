import { Innertube } from "youtubei.js";
import { google } from "googleapis";
import fs from "fs";
import path from "path";
const inv = ["https://qssx73-3000.csb.app", "https://qwn8gt-3000.csb.app"];
const JPath = path.join(process.cwd(), "Info.json");

const youtube = google.youtube({
  version: "v3",
  auth: process.env.youtubeAPI
});


let client;
let TVClient;

async function setClient() {
  if (!client) client = await Innertube.create({ lang: "ja", country: "JP", client_type: "WEB" });
}

async function setTVClient() {
  if (!TVClient) TVClient = await Innertube.create({ lang: "ja", country: "JP", client_type: "TVHTML5" });
}

async function infoGet(videoId) {
  await setClient();
  try {
    const video = await client.getInfo(videoId);
    return video;
  } catch (err) {
    console.error("動画情報取得失敗:", err);
    return null;
  }
}

async function search(q, p = 1, limit = 50) {
  if (!q) return { results: [] };

  await setClient();

  try {
      let res = await client.search(q, { type: "all", limit });
      
      for (let i = 1; i < p; i++) {
          if (!res.has_continuation) break;
          res = await res.getContinuation();
      }
      //fs.writeFileSync(JPath, JSON.stringify(res, null, 2));
      return { results: res.results };
  } catch (err) {
      console.error("検索失敗:", err);
      return { results: [] };
  }
}

/*async function search(q, p, limit = 50) {
  if (!q) return { results: [] };
  await setClient();

  try {
    const results = await client.search(q, { type: "all", limit, page: p });
    return { results };
  } catch (err) {
    console.error("検索失敗:", err);
    return { results: [] };
  }
}*/

async function getComments(videoId) {
  if (!videoId) return { contents: [] };
  await setClient();
  let lastError = [];
  for (let i = 0; i < 4; i++) {
    try {
      const comments = await client.getComments(videoId);
      //fs.writeFileSync(JPath, JSON.stringify(comments, null, 2));
      //console.log("comments.contents[0].comment:", comments.contents[0].comment);
      return { contents: comments };
    } catch (err) {
      console.error(`youtubeiエラー(${i + 1}/4):`, err);
      lastError[0] = err;
    }
    if (i < 3) {
      console.log("waiting 2 seconds");
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
    if ((i + 1) % 2 == 0 && i < 3) {
      console.log("recreate client");
      await setClient();
    }
  }
  console.error("youtubei.jsコメント取得失敗:", lastError[0]);
  for (let i = 0; i < 2; i++) {
    try {
      const r = await fetch(`${inv[i]}/api/v1/comments/${videoId}?hl=ja&lang=ja`);
      //fs.writeFileSync(JPath, JSON.stringify(comments, null, 2));
      const cm = await r.json();
      const {comments, ...cmts} = cm;
      console.dir(cm, { depth: null });
      if (comments) {
        const response = await youtube.commentThreads.list({
          part: ["snippet", "replies"],
          videoId,
          maxResults: 50,
          textFormat: "plainText"
        });
        console.dir(response, { depth: null });
        return { ...cmts, contents: comments };
      } else {
        throw new Error(cm.error);
      }
    } catch (err) {
      console.error(`Invエラー(${i + 1}/2):`, err);
      lastError[1] = err;
    }
  }
  console.error("Invidiousコメント取得失敗:", lastError[1]);
  try {
    const response = await youtube.commentThreads.list({
      part: ["snippet", "replies"],
      videoId,
      maxResults: 50,
      textFormat: "plainText",
      order: "relevance"
    });
  
    const contents = response.data.items.map(item => {
      const comment = item.snippet.topLevelComment.snippet;
  
      return {
        commentId: item.snippet.topLevelComment.id,
        author: {
          id: comment.authorChannelId?.value || "",
          name: comment.authorDisplayName,
          thumbnails: comment.authorProfileImageUrl
            ? [{ url: comment.authorProfileImageUrl }]
            : []
        },
        content: {
          runs: [
            {
              text: comment.textDisplay
            }
          ]
        },
        contentHtml: comment.textDisplay,
        published_time: formatRelativeTime(comment.publishedAt),
        updated_time: comment.updatedAt,
        likeCount: comment.likeCount,
        replyCount: item.snippet.totalReplyCount,
        creatorHeart: null,
        isSponsor: false,
        authorIsChannelOwner: false
      };
    });
    console.dir(response, { depth: null });
    return { contents };
  } catch (err) {
    console.error("YouTube Data APIコメント取得失敗:", err);
    lastError[2] = err;
  }
  
  console.error("コメント取得失敗:", lastError);
  throw new Error(`コメント取得失敗: ${lastError}`);
}

/*async function getRecentVideos(channelId, max) {
  const maxResults = max ? max : 500;
  function formatDuration(isoDuration) {
    if (!isoDuration) return "";
    const match = isoDuration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
    if (!match) return "";
    const hours = parseInt(match[1] || 0);
    const minutes = parseInt(match[2] || 0);
    const seconds = parseInt(match[3] || 0);
    if (hours > 0) return `${hours}:${minutes.toString().padStart(2,"0")}:${seconds.toString().padStart(2,"0")}`;
    return `${minutes}:${seconds.toString().padStart(2,"0")}`;
  }
  
  try {
    const channelRes = await youtube.channels.list({
      part: "contentDetails",
      id: channelId
    });

    const uploadsPlaylistId =
      channelRes.data.items?.[0]?.contentDetails?.relatedPlaylists?.uploads;

    if (!uploadsPlaylistId) return [];

    const playlistRes = await youtube.playlistItems.list({
      part: "snippet,contentDetails",
      playlistId: uploadsPlaylistId,
      maxResults
    });

    const videos = playlistRes.data.items?.map(item => ({
      id: item.snippet.resourceId.videoId,
      title: item.snippet.title,
      publishedAt: item.snippet.publishedAt,
      thumbnail: item.snippet.thumbnails?.high?.url || item.snippet.thumbnails?.default?.url,
      duration: null
    })) || [];

    const videoIds = videos.map(v => v.id).join(",");
    if (videoIds) {
      const detailsRes = await youtube.videos.list({
        part: "contentDetails",
        id: videoIds
      });

      const durationMap = {};
      for (const item of detailsRes.data.items || []) {
        durationMap[item.id] = item.contentDetails.duration;
      }

      videos.forEach(v => {
        v.duration = formatDuration(durationMap[v.id] || null);
      });
    }

    return videos;

  } catch (err) {
    console.error("動画取得失敗:", err);
    return [];
  }
}*/

async function getRecentVideos(channelId, max) {
  const maxResults = max ? max : 200;

  function formatDuration(isoDuration) {
    if (!isoDuration) return "";
    const match = isoDuration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
    if (!match) return "";
    const hours = parseInt(match[1] || 0);
    const minutes = parseInt(match[2] || 0);
    const seconds = parseInt(match[3] || 0);
    if (hours > 0) return `${hours}:${minutes.toString().padStart(2,"0")}:${seconds.toString().padStart(2,"0")}`;
    return `${minutes}:${seconds.toString().padStart(2,"0")}`;
  }

  try {
    const channelRes = await youtube.channels.list({
      part: "contentDetails",
      id: channelId
    });

    const uploadsPlaylistId =
      channelRes.data.items?.[0]?.contentDetails?.relatedPlaylists?.uploads;

    if (!uploadsPlaylistId) return [];

    let videos = [];
    let pageToken = null;

    while (videos.length < maxResults) {
      const playlistRes = await youtube.playlistItems.list({
        part: "snippet,contentDetails",
        playlistId: uploadsPlaylistId,
        maxResults: 50,
        pageToken
      });
      //fs.writeFileSync(JPath, JSON.stringify(playlistRes.data, null, 2));
      const items = playlistRes.data.items || [];

      for (const item of items) {
        if (videos.length >= maxResults) break;
        videos.push({
          id: item.snippet.resourceId.videoId,
          title: item.snippet.title,
          publishedAt: item.snippet.publishedAt,
          thumbnail: item.snippet.thumbnails?.high?.url || item.snippet.thumbnails?.default?.url,
          duration: null
        });
      }

      pageToken = playlistRes.data.nextPageToken;
      if (!pageToken) break;
    }

    for (let i = 0; i < videos.length; i += 50) {
      const chunk = videos.slice(i, i + 50);
      const videoIds = chunk.map(v => v.id).join(",");

      const detailsRes = await youtube.videos.list({
        part: "contentDetails",
        id: videoIds
      });

      const durationMap = {};
      for (const item of detailsRes.data.items || []) {
        durationMap[item.id] = item.contentDetails.duration;
      }

      chunk.forEach(v => {
        v.duration = formatDuration(durationMap[v.id] || null);
      });
    }

    return videos;

  } catch (err) {
    console.error("動画取得失敗:", err);
    return [];
  }
}

async function resolveChannelId(input) {
  await setClient();

  if (/^UC[0-9A-Za-z_-]{22}$/.test(input)) {
    return input;
  }

  const q = input
    .replace(/^https?:\/\/(www\.)?youtube\.com\//, "")
    .replace(/^@/, "")
    .replace(/^c\//, "");

  const result = await client.search(q, { type: "channel" });
  if (!result.channels?.length) {
    throw new Error("Channel not found");
  }

  return result.channels[0].id;
}

async function getChannel(id, cl) {
  if (cl == "TV") {
    await setTVClient();
  } else {
    await setClient();
  }

  let channelId;
  try {
    channelId = await resolveChannelId(id);
  } catch (err) {
    console.error("チャンネルID解決失敗:", err);
    return null;
  }

  let channel = null;
  let recentVideos = null;
  try {
    if (cl == "TV") {
      channel = await TVClient.actions.execute("/browse", { browseId: channelId });
    } else {
      channel = await client.getChannel(channelId, 500);
    }
  } catch (err) {
    console.error("チャンネル取得失敗:", err);
    return null;
  }

  try {
     recentVideos = await getRecentVideos(channelId);
  } catch (err) {
    console.error("recentVideos取得失敗:", err);
  }
  if (!channel && !recentVideos) {
    return null;
  }

  return { channel, recentVideos };
}

function strToInt(text) {
  try {
    const m = text.match(/\d+/);
    return m ? Number(m[0]) : 0;
  } catch (e) {
    console.error(`strToIntError: ${JSON.stringify(e.message)}`);
    return text;
  }
}

async function getPlaylist(id, p = 1) {
  if (!id) return {};

  await setClient();

  try {
      let res = await client.getPlaylist(id);
      
      let currentPage = 1;
      while (currentPage < p && res.has_continuation) {
        res = await res.getContinuation();
        currentPage++;
      };
      const videoCount = res.video_count || res.info.video_count || res.info.total_items || "";
      const rtn = {
        id,
        title: res.info.title || "",
        videoCount: strToInt(videoCount),
        videos: res.videos || []
      };
      //fs.writeFileSync(JPath, JSON.stringify(res, null, 2));
      return rtn;
  } catch (err) {
      console.error("プレイリスト取得失敗:", err);
      return {};
  }
}

async function getPlayNext(playlistId, videoId, page = 1) {
  const playlist = await getPlaylist(playlistId, page);
  if (!playlist?.videos) return null;
  //fs.writeFileSync(JPath, JSON.stringify(playlist, null, 2));
  const idx = playlist.videos.findIndex(v => v.id === videoId);
  if (idx !== -1 && playlist.videos[idx + 1] && playlist.videoCount != idx + 1) {
    playlist.videos[idx + 1].playlistName = playlist.title;
    return playlist.videos[idx + 1] || null;
  }
  return null;
}

function formatRelativeTime(date) {
  const diff = Date.now() - new Date(date).getTime();

  const seconds = Math.floor(diff / 1000);
  if (seconds < 60) {
    return `${seconds}秒前`;
  }

  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) {
    return `${minutes}分前`;
  }

  const hours = Math.floor(minutes / 60);
  if (hours < 24) {
    return `${hours}時間前`;
  }

  const days = Math.floor(hours / 24);
  if (days < 30) {
    return `${days}日前`;
  }

  const months = Math.floor(days / 30);
  if (months < 12) {
    return `${months}か月前`;
  }
  
  const years = Math.floor(months / 12);
  return `${years}年前`;
}

export { infoGet, search, setClient, getComments, getChannel, getPlaylist, getPlayNext };



/*
  console.log("channel.current_tab.content.contents[1].contents:", channel.current_tab.content.contents[1].contents)

  const videos = channel.current_tab?.content?.contents[0]?.contents[0]?.content?.items || [];
  const searchResult = await client.search({ query: "", channelId: id });
  const recentVideos = searchResult.results
  .filter(r => r.type === "Video")  
  .sort((a, b) => {
    function toDays(text) {
      if (!text) return 0;
      const str = text.text;
      if (str.includes("年")) return parseInt(str) * 365 * 24 * 60 * 60;
      if (str.includes("か月")) return parseInt(str) * 30 * 24 * 60 * 60;
      if (str.includes("週")) return parseInt(str) * 7 * 24 * 60 * 60;
      if (str.includes("日")) return parseInt(str) * 24 * 60 * 60;
      if (str.includes("時間")) return parseInt(str) * 60 * 60;
      if (str.includes("分")) return parseInt(str) * 60;
      if (str.includes("秒")) return parseInt(str);
      return 0;
    }
    return toDays(a.published) - toDays(b.published);
  })
*/
