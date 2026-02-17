import express from "express";
const router = express.Router();
import path from "path";
import { Client } from "soundcloud-scraper";
const scClient = new Client();

router.get("/", (req, res) => {
  res.render("music/home", { tracks: [], query: [] });
});

router.get("/s", async (req, res) => {
  const query = req.query.q;
  if (!query) return res.status(400).send("Search query is required");

  try {
    const searchResults = await scClient.search(query, "track");

    const tracks = searchResults.slice(0, 10).map((track) => ({
      id: track.id,
      title: track.title,
      username: track.author.name,
      artwork_url: track.artworkURL || "https://via.placeholder.com/500",
      url: track.url,
    }));
    console.log(await scClient.search(query, "track"));
    res.render("music/home", { tracks, query });
  } catch (err) {
    console.error("Error occurred while searching:", err);
    res.status(500).send("えらー。あらら");
  }
});

router.get("/f", (req, res) => {
  res.render("music/favorite");
});

export default router;
