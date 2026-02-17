import express from "express";
const router = express.Router();
import path from "path";

router.get("/", (req, res) => {
  res.end(JSON.stringify(process.versions, null, 2));
});

router.get("/b/:id", (req, res) => {
  res.render(`blog/${req.params.id}`);
});

import getblog from "../controllers/blog/getblog.js"
router.use("/n", getblog);

export default router;
