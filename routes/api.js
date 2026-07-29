import express from "express";
const router = express.Router();
import { infoGet, search, getComments, getChannel, getPlaylist } from "../server/youtube.js";

router.get("/updatevideoinfo/:id", async (req, res) => {
  console.time("total");
  const videoId = req.params.id;
  if (!/^[a-zA-Z0-9_-]{11}$/.test(videoId)) {
    return res.status(400).send("videoID invailed");
  }
  try {
    console.time("infoGet");
    const Info = await infoGet(videoId);
    console.timeEnd("infoGet");

    const videoInfo = {
      title: Info.primary_info.title.text || "",
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
      videoId
    };
    console.time("send");
    res.json(videoInfo)
    console.timeEnd("send");
    console.timeEnd("total");
  } catch (error) {
    console.log(error);
    res.status(500).json(error);
  }
});

export default router;
