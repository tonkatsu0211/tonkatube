import express from "express";
const router = express.Router();
import path from "path";

router.get("/", (req, res) => {
  res.render("tools/home");
});

router.get("/tool/:id", (req, res) => {
  res.render(`tools/tool/${req.params.id}`);
});

import inv from "../controllers/tool/src/inv.js"
import html from "../controllers/tool/src/get.js"

router.use("/inv", inv);
router.use("/html", html);

export default router;
