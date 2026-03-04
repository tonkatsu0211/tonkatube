import axios from "axios";
import express from "express";
const router = express.Router();
import fs from "fs";
import path from "path";
import http from "http";
import fetch from "node-fetch";
import {
  infoGet,
  setClient,
  search,
  getComments,
  getChannel,
  getPlayNext
} from "../../server/youtube.js";
import { ggvideo, getapis, getYouTube } from "../../server/tonkatsu.js";
const JPath = path.join(process.cwd(), "Info.json");

const user_agent =
  process.env.USER_AGENT ||
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/86.0.4240.198 Safari/537.36";
const serverUrls = ["direct"];

router.get("/streams/:id", async (req, res) => {
  const videoId = req.params.id;
  try {
    const videoData = await getYouTube(videoId);
    res.status(200).send(videoData);
  } catch (error) {
    console.error(error);
    res.status(500).send("cannot get streams");
  }
});

router.get("/:id", async (req, res) => {
  console.time("total");
  const videoId = req.params.id;
  const cookies = parseCookies(req);
  const wakames = cookies.playbackMode;
  if (wakames == "edu") {
    return res.redirect(`/tkt/yt/edu/${videoId}`);
  }
  if (wakames == "nocookie") {
    return res.redirect(`/tkt/yt/nocookie/${videoId}`);
  }
  let baseUrl = "direct";
  if (!/^[a-zA-Z0-9_-]{11}$/.test(videoId)) {
    return res.status(400).send("videoIDが正しくありません");
  }
  try {
    //const [videoData, Info] = await Promise.all([getYouTube(videoId), infoGet(videoId)]);
    console.time("getYoutube");
    const videoData = await getYouTube(videoId);
    console.timeEnd("getYoutube");
    console.time("infoGet");
    const Info = await infoGet(videoId);
    console.timeEnd("infoGet");
    //fs.writeFileSync(JPath, JSON.stringify(Info.secondary_info, null, 2));
    const playlistId = req.query.playlist || null;

    let watchNext = [...(Info.watch_next_feed || [])];

    if (playlistId) {
      const nextVideo = await getPlayNext(playlistId, videoId);
      if (nextVideo) {
        nextVideo._source = "playlist";
        nextVideo.playlistId = playlistId;
        watchNext = watchNext.filter(v => v.id !== nextVideo.id && v.content_id !== nextVideo.id);
        watchNext.unshift(nextVideo);
      }
    }

    const isCollaborating = (!Info.secondary_info.owner?.author?.id || (Info.secondary_info.owner.author.id == "N/A")) ? true : false;
    console.time("getChannel");
    const channelData = await getChannel((isCollaborating ? Info.basic_info?.channel?.id : Info.secondary_info.owner?.author?.id) || Info.basic_info?.channel?.id || Info.secondary_info?.owner?.author?.endpoint?.payload?.panelLoadingStrategy?.inlineContent?.dialogViewModel?.customContent?.listViewModel?.listItems?.[0]?.listItemViewModel?.title?.commandRuns?.[0]?.onTap?.innertubeCommand?.browseEndpoint?.browseId || "");
    console.timeEnd("getChannel");
    //fs.promises.write(JPath, JSON.stringify(channelData, null, 2));
    const videoInfo = {
      title: Info.primary_info.title.text || "",
      channelId: (isCollaborating ? Info.basic_info?.channel?.id : Info.secondary_info.owner?.author?.id) || Info.basic_info?.channel?.id || Info.secondary_info?.owner?.author?.endpoint?.payload?.panelLoadingStrategy?.inlineContent?.dialogViewModel?.customContent?.listViewModel?.listItems?.[0]?.listItemViewModel?.title?.commandRuns?.[0]?.onTap?.innertubeCommand?.browseEndpoint?.browseId || "error",
      channelIcon: (isCollaborating ? Info.secondary_info.owner.author.endpoint?.payload?.panelLoadingStrategy?.inlineContent?.dialogViewModel?.customContent?.listViewModel?.listItems?.[0]?.listItemViewModel?.leadingAccessory?.avatarViewModel?.image?.sources?.[0]?.url || channelData?.channel?.header?.content?.image?.avatar?.image?.[0]?.url || "" : Info.secondary_info.owner.author.thumbnails?.[0]?.url) || "",
      channelName: (isCollaborating ? Info.basic_info.channel?.name : Info.secondary_info.owner?.author?.name) || Info.secondary_info?.owner?.author?.endpoint?.payload?.panelLoadingStrategy?.inlineContent?.dialogViewModel?.customContent?.listViewModel?.listItems?.[0]?.listItemViewModel?.title?.content || "N/A",
      channelSubsc: (isCollaborating ? channelData.channel.header?.content?.metadata?.metadata_rows?.[1]?.metadata_parts?.[0]?.text || "" : Info.secondary_info?.owner?.subscriber_count?.text || "") || "",
      published: Info.primary_info.published,
      viewCount:
        Info.primary_info.view_count.short_view_count?.text ||
        Info.primary_info.view_count.view_count?.text ||
        "",
      likeCount:
        Info.primary_info.menu.top_level_buttons.short_like_count ||
        Info.primary_info.menu.top_level_buttons.like_count ||
        Info.basic_info.like_count ||
        "",
      description: videoData.description || "",
      watch_next_feed: watchNext || "",
    };
    //console.log(`Info.watch_next_feed: ${Info.watch_next_feed}`)
    //fs.promises.write(JPath, JSON.stringify(Info, null, 2));
    const pl = playlistId != null ? true: false;
    console.time("render");
    res.render("tube/watch.ejs", { videoData, videoInfo, videoId, baseUrl, pl });
    console.timeEnd("render");
    console.timeEnd("total");
  } catch (error) {
    console.log(error);
    const shufServerUrls = shuffleArray([...serverUrls]);
    res.status(500).render("tube/mattev.ejs", {
      videoId,
      baseUrl,
      serverUrls: shufServerUrls,
      error: "動画を取得できません",
      details: error.message,
    });
  }
});

/*router.get("/:id", async (req, res) => {
  const videoId = req.params.id;
  const cookies = parseCookies(req);
  const wakames = cookies.playbackMode;
  if (wakames == "edu") {
    return res.redirect(`/tkt/yt/edu/${videoId}`);
  }
  if (wakames == "nocookie") {
    return res.redirect(`/tkt/yt/nocookie/${videoId}`);
  }
  let baseUrl = "direct";
  if (!/^[a-zA-Z0-9_-]{11}$/.test(videoId)) {
    return res.status(400).send("videoIDが正しくありません");
  }
  try{
    res.write(`
    <!DOCTYPE html>
    <html lang="ja">
      <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>読み込み中…</title>
        <link rel="stylesheet" href="/css/page.css" />
        <script src="/js/tailwindcss.js"></script>
        <link
          rel="stylesheet"
          href="https://code.jquery.com/ui/1.12.1/themes/base/jquery-ui.css"
        />
        <script src="https://code.jquery.com/jquery-3.5.1.js"></script>
        <script src="https://code.jquery.com/ui/1.12.1/jquery-ui.js"></script>
        <script src="/js/tube.js"></script>
        <script src="/js/watch.js"></script>
        <link
          rel="apple-touch-icon"
          href="/tkt/back/vi/<%= videoId %>/maxresdefault.jpg"
        />
      </head>
      <body>
        <div class="bg-gray-900 text-white" style="display: none;">
          <p class="text-base text-gray-300 mt-1">読み込み中…</p>
        </div>
    `);
    const [videoData, Info] = Promise.all([getYouTube(videoId), infoGet(videoId)]);
    //fs.writeFileSync(JPath, JSON.stringify(Info.secondary_info, null, 2));
    const playlistId = req.query.playlist || null;

    let watchNext = [...(Info.watch_next_feed || [])];

    if (playlistId) {
      const nextVideo = await getPlayNext(playlistId, videoId);
      if (nextVideo) {
        nextVideo._source = "playlist";
        nextVideo.playlistId = playlistId;
        watchNext = watchNext.filter(v => v.id !== nextVideo.id && v.content_id !== nextVideo.id);
        watchNext.unshift(nextVideo);
      }
    }

    const isCollaborating = (!Info.secondary_info.owner?.author?.id || (Info.secondary_info.owner.author.id == "N/A")) ? true : false;
    const channelData = await getChannel((isCollaborating ? Info.basic_info?.channel?.id : Info.secondary_info.owner?.author?.id) || Info.basic_info?.channel?.id || Info.secondary_info?.owner?.author?.endpoint?.payload?.panelLoadingStrategy?.inlineContent?.dialogViewModel?.customContent?.listViewModel?.listItems?.[0]?.listItemViewModel?.title?.commandRuns?.[0]?.onTap?.innertubeCommand?.browseEndpoint?.browseId || "");
    //fs.writeFileSync(JPath, JSON.stringify(channelData, null, 2));
    const videoInfo = {
      title: Info.primary_info.title.text || "",
      channelId: (isCollaborating ? Info.basic_info?.channel?.id : Info.secondary_info.owner?.author?.id) || Info.basic_info?.channel?.id || Info.secondary_info?.owner?.author?.endpoint?.payload?.panelLoadingStrategy?.inlineContent?.dialogViewModel?.customContent?.listViewModel?.listItems?.[0]?.listItemViewModel?.title?.commandRuns?.[0]?.onTap?.innertubeCommand?.browseEndpoint?.browseId || "error",
      channelIcon: (isCollaborating ? Info.secondary_info.owner.author.endpoint?.payload?.panelLoadingStrategy?.inlineContent?.dialogViewModel?.customContent?.listViewModel?.listItems?.[0]?.listItemViewModel?.leadingAccessory?.avatarViewModel?.image?.sources?.[0]?.url || channelData?.channel?.header?.content?.image?.avatar?.image?.[0]?.url || "" : Info.secondary_info.owner.author.thumbnails?.[0]?.url) || "",
      channelName: (isCollaborating ? Info.basic_info.channel?.name : Info.secondary_info.owner?.author?.name) || Info.secondary_info?.owner?.author?.endpoint?.payload?.panelLoadingStrategy?.inlineContent?.dialogViewModel?.customContent?.listViewModel?.listItems?.[0]?.listItemViewModel?.title?.content || "N/A",
      channelSubsc: (isCollaborating ? channelData.channel.header?.content?.metadata?.metadata_rows?.[1]?.metadata_parts?.[0]?.text || "" : Info.secondary_info?.owner?.subscriber_count?.text || "") || "",
      published: Info.primary_info.published,
      viewCount:
        Info.primary_info.view_count.short_view_count?.text ||
        Info.primary_info.view_count.view_count?.text ||
        "",
      likeCount:
        Info.primary_info.menu.top_level_buttons.short_like_count ||
        Info.primary_info.menu.top_level_buttons.like_count ||
        Info.basic_info.like_count ||
        "",
      description: Info.secondary_info.description.runs || "",
      watch_next_feed: watchNext || "",
    };
    //console.log(`Info.watch_next_feed: ${Info.watch_next_feed}`)
    //await fs.promises.writeFile(JPath, JSON.stringify(Info, null, 2));
    const pl = playlistId != null ? true: false;
    const html = await new Promise((resolve, reject) => {
      req.app.render("tube/watch.ejs", {
        videoData,
        Info,
        videoId: req.params.id
      }, (err, rendered) => {
        if (err) reject(err);
        else resolve(rendered);
      });
    });
  
    res.write(`
      <script>
        document.open();
        document.write(${JSON.stringify(html)});
        document.close();
      </script>
    `);
  
    res.end(`
        </body>
      </html>
    `);
    //res.render("tube/watch.ejs", { videoData, videoInfo, videoId, baseUrl, pl });
  } catch (error) {
    console.log(error);
    const shufServerUrls = shuffleArray([...serverUrls]);
    res.status(500).render("tube/mattev.ejs", {
      videoId,
      baseUrl,
      serverUrls: shufServerUrls,
      error: "動画を取得できません",
      details: error.message,
    });
  }
});*/

function parseCookies(request) {
  const list = {};
  const cookieHeader = request.headers.cookie;

  if (cookieHeader) {
    cookieHeader.split(";").forEach((cookie) => {
      let parts = cookie.split("=");
      list[parts.shift().trim()] = decodeURI(parts.join("="));
    });
  }

  return list;
}

function shuffleArray(array) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
}

export default router;
