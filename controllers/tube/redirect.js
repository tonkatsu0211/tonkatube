import express from "express";
const router = express.Router();
import path from "path";
import http from "http";

router.get("/mode/:id", (req, res) => {
  const mode = req.query.mode;
  const videoId = req.params.id;
  if (mode === "normal") {
    res.redirect(`/tkt/watch/${videoId}`);
  } else if (mode === "edu") {
    res.redirect(`/tkt/yt/edu/${videoId}`);
  } else if (mode === "nocookie") {
    res.redirect(`/tkt/yt/nocookie/${videoId}`);
  } else {
    res.redirect(`/tkt/watch/${videoId}`);
  }
});

export default router;
