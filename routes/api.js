import express from "express";
const router = express.Router();
import { infoGet, search, getComments, getChannel, getPlaylist } from "../server/youtube.js";

export default router;
