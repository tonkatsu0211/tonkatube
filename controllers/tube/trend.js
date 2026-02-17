import axios from "axios";
import express from "express";
const router = express.Router();
import path from "path";
import http from "http";

router.get("/", async (req, res) => {
  try {
    const response = await axios.get(
      "https://wataamee.glitch.me/topvideos/apiv2"
    );
    const topVideos = await response.data;
    res.render("tube/trend.ejs", { topVideos });
  } catch (error) {
    console.error("エラーが発生しました:", error);
    res.render("tube/trend", { topVideos: [] });
  }
});

export default router;
