import axios from "axios";
import express from "express";
const router = express.Router();
import path from "path";

router.get("/history", (req, res) => {
  res.render("tube/cl/history.ejs");
});

router.get("/fav", (req, res) => {
  res.render("tube/cl/fav.ejs");
});

router.get("/setting", (req, res) => {
  res.render("tube/cl/setting.ejs");
});

router.get("/shistory", (req, res) => {
  res.render("tube/cl/serhistory.ejs");
});

export default router;
