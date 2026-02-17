import express from "express";
const router = express.Router();
import path from "path";

router.get("/", (req, res) => {
  res.render("tools/home");
});

router.get("/page/:id", (req, res) => {
  res.render(`sandbox/page/${req.params.id}`);
});

export default router;
