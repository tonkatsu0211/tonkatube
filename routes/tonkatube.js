import express from "express";
import fs from "fs";
import path from "path";
import { execFile } from "child_process";
import fetch from "node-fetch";
import os from "os";
const router = express.Router();
import { infoGet, search, getComments, getChannel, getPlaylist } from "../server/youtube.js";
const JPath = path.join(process.cwd(), "Info.json");

import watch from "../controllers/tube/getvideo.js";
import live from "../controllers/tube/live.js";
//import yt from "../controllers/tube/youtube.js";

router.use(["/watch", "/yt"], watch);
router.use("/w", watch);
router.use("/live", live);
//router.use("/yt", yt);

router.get("/", (req, res) => {
  res.render("tube/home");
});

router.get(["/shorts/:id", "/short/:id"], (req, res) => {
  res.redirect(`/tkt/watch/${req.params.id}`);
});

function sanitizeMeta(str) {
    return String(str || "").replace(/[\r\n]/g, " ");
}

router.get("/download", async (req, res) => {
    const url = req.query.url;
    const title = decodeURIComponent(req.query.title || "videoplayback");
    const author = decodeURIComponent(req.query.author || "");
    const thumbnailUrl = `https://mszqhf-3000.csb.app/tkt/back/vi/${req.query.id}/maxresdefault.jpg`;

    if (!url || !thumbnailUrl) {
        return res.status(400).end();
    }

    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "download-"));
    const videoPath = path.join(tmpDir, "input.mp4");
    const thumbPath = path.join(tmpDir, "thumb.jpg");
    const outputPath = path.join(tmpDir, "output.mp4");

    const cleanup = () => {
        try {
            fs.rmSync(tmpDir, { recursive: true, force: true });
        } catch {}
    };

    res.on("finish", cleanup);
    res.on("close", cleanup);

    try {
        const videoRes = await fetch(url);
        if (!videoRes.ok) throw new Error("video fetch failed");

        await new Promise((resolve, reject) => {
            const ws = fs.createWriteStream(videoPath);
            videoRes.body.pipe(ws);
            ws.on("finish", resolve);
            ws.on("error", reject);
        });

        const thumbRes = await fetch(thumbnailUrl);
        if (!thumbRes.ok) throw new Error("thumbnail fetch failed");

        await new Promise((resolve, reject) => {
            const ws = fs.createWriteStream(thumbPath);
            thumbRes.body.pipe(ws);
            ws.on("finish", resolve);
            ws.on("error", reject);
        });

        await new Promise((resolve, reject) => {
            execFile(
                "ffmpeg",
                [
                    "-y",
                    "-i", videoPath,
                    "-i", thumbPath,
                    "-map", "0",
                    "-map", "1",
                    "-c", "copy",
                    "-metadata", `title=${sanitizeMeta(title)}`,
                    "-disposition:v:1", "attached_pic",
                    "-movflags", "+faststart",
                    outputPath
                ],
                err => err ? reject(err) : resolve()
            );
        });

        res.setHeader("Content-Type", "application/octet-stream");
        res.setHeader(
            "Content-Disposition",
            `attachment; filename="${decodeURIComponent(title)}.mp4";`
        );

        fs.createReadStream(outputPath).pipe(res);
    } catch {
        cleanup();
        res.status(500).end();
    }
});

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

async function getVideoData(videoId) {
  const res = await fetch(`https://k22gwc-3000.csb.app/${videoId}`);
  const vData = await res.json()
  if (res.status < 200 || res.status >= 300) {
    throw new Error("API取得失敗");
  }

  return vData;
}

router.get("/watch2/:id", async (req, res) => {
  const serverUrls = ["direct"];
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
    const videoData = await getVideoData(videoId);
    const Info = await infoGet(videoId);
    const videoInfo = {
      title: Info.primary_info.title.text || "",
      channelId: Info.secondary_info.owner.author.id || "",
      channelIcon: Info.secondary_info.owner.author.thumbnails[0].url || "",
      channelName: Info.secondary_info.owner.author.name || "",
      channelSubsc: Info.secondary_info.owner.subscriber_count.text || "",
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
      watch_next_feed: Info.related_videos || "",
    };
    res.render("tube/watch.ejs", { videoId, videoInfo, videoData, baseUrl });
  } catch (error) {
    const shufServerUrls = shuffleArray([...serverUrls]);
    console.log(error.message);
    res.status(500).render("tube/mattev.ejs", {
      videoId,
      baseUrl,
      serverUrls: shufServerUrls,
      error: "動画を取得できません",
      details: error.message,
    });
  }
});

router.get("/s", async (req, res) => {
  const query = decodeURIComponent(req.query.q) || "";
  const page = Number(req.query.p || 1);

  try {
      const results = await search(query, page, 50);
      //fs.writeFileSync(JPath, JSON.stringify(results, null, 2));
      res.render("tube/search.ejs", {
          res: results,
          query,
          page
      });
  } catch (error) {
      console.error(error);
      res.status(500).render("error.ejs", {
          title: "Search Error",
          content: error.toString()
      });
  }
});

/*router.get("/s", async (req, res) => {
  const query = req.query.q;
  const page = Number(req.query.p || 1);
  console.log(page);
  try {
    const results = await search(query, page, 50);
    res.render("tube/search.ejs", {
      res: results,
      query,
      page,
    });
  } catch (error) {
    console.error(error);
    res.status(500).render("error.ejs", {
      title: "Search Error",
      content: error.toString(),
    });
  }
});*/

router.get("/ss", (req, res) => {
  res.redirect("/tkt/s");
});

router.get(["/c/:id", "/channel/:id"], async (req, res) => {
  try {
    let url;
    const id = req.params.id
    if (id.startsWith("@")) {
      url = `https://www.youtube.com/c/${id.slice(1, id.length).trim()}`
    } else {
      url = id;
    }
    console.log(`url: ${url}`);
    const data = await getChannel(req.params.id, "");
    const TVData = await getChannel(req.params.id, "TV");
    const about = await data.channel.getAbout();
    if (!data) throw new Error("Channel not found");
    //fs.writeFileSync(JPath, JSON.stringify(data.recentVideos, null, 2));
    res.render("tube/channel.ejs", { data, about, TVData });
  } catch (err) {
    console.error("Failed to fetch channel", req.params.id, err);
    res.status(500).render("error.ejs", {
      title: "Channel Error",
      content: err.toString(),
    });
  }
});

router.get(["/p/:id", "/playlist/:id", "/playlists/:id"], async (req, res) => {
  const playlistId = req.params.id;
  const page = Number(req.query.p || 1);
  try {
    if (playlistId == "error") throw new Error("Playlist error");
    const data = await getPlaylist(playlistId, page);
    if (!data) throw new Error("Playlist not found");
    console.log(`playlistData: ${data}`);
    res.render("tube/playlist.ejs", { data, page });
  } catch (err) {
    console.error("Failed to fetch playlist", playlistId, err);
    res.status(500).render("error.ejs", {
      title: "Playlist Error",
      content: err.toString(),
    });
  }
});

import back from "../controllers/tube/back.js";
import redirect from "../controllers/tube/redirect.js";
import trend from "../controllers/tube/trend.js";
import cl from "../controllers/tube/cl.js";

router.use("/back", back);
router.use("/redirect", redirect);
router.use("/trend", trend);
router.use("/cl", cl);

export default router;
