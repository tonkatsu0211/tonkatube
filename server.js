"use strict";
import fs from "fs";
import express from "express";
import path from "path";
import session from "express-session";
import compression from "compression";
import bodyParser from "body-parser";
import { Innertube } from "youtubei.js";
import {
  infoGet,
  setClient,
  search,
  getComments,
  getChannel,
} from "./server/youtube.js";
import cors from "cors";
import cookieParser from "cookie-parser";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const logPath = path.join(__dirname, "logs", "access.log");

let app = express();
let client = null;

app.use(compression());
app.use(express.static(__dirname + "/public"));
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));
app.use(bodyParser.urlencoded({ extended: true }));
app.use(cors());
app.set("trust proxy", 1);
app.use(cookieParser());

app.use((req, res, next) => {
  /*const now = new Date();
  const timestamp = now.toISOString();
  const logLine = `[${timestamp}] ${req.ip} ${req.method} ${req.originalUrl}\n`;

  fs.appendFile(logPath, logLine, (err) => {
    if (err) console.error("ログ書き込みエラー:", err);
  });*/

  res.removeHeader("X-Frame-Options");
  res.setHeader(
    "Content-Security-Policy",
    "frame-ancestors 'self' https://wf8xw3-3000.csb.app"
  );

  next();
});

app.use(
  session({
    secret: "keyboard cat",
    resave: false,
    saveUninitialized: true,
    cookie: {
      secure: true,
      sameSite: "none",
    },
  })
);

app.use((req, res) => {
  if (!req.get("host").includes("vercel")) return res.redirect(`https://tonkatube.vercel.app${req.url}`);
});

app.use((req, res, next) => {
  if (
    req.cookies.loginok !== "ok" &&
    !req.path.includes("login") &&
    !req.path.includes("back")
  ) {
    return res.redirect("/login");
  } else {
    next();
  }
});

app.get("*", (req, res, next) => {
  if (!req.originalUrl.startsWith("/tkt/back/")) console.log("access:", decodeURIComponent(req.originalUrl));
  next();
});

app.get("/", (req, res) => {
  if (req.query.r === "y") {
    res.render("home/index");
  } else {
    res.redirect("/tkt");
  }
});

app.get("/app", (req, res) => {
  res.render("app/list");
});

import tktSv from "./routes/tonkatube.js";
import gameSv from "./routes/game.js";
import toolsSv from "./routes/tools.js";
import ppSv from "./routes/proxy.js";
import wakamsSv from "./routes/music.js";
import blogSv from "./routes/blog.js";
import sandboxSv from "./routes/sandbox.js";

app.use("/tkt", tktSv);
app.use("/game", gameSv);
app.use("/tools", toolsSv);
app.use("/pp", ppSv);
app.use("/wakams", wakamsSv);
app.use("/blog", blogSv);

app.use("/wkt", (req, res) => {
  console.log(`/tkt${req.originalUrl.slice(4)}`);
  res.redirect(`/tkt${req.originalUrl.slice(4)}`);
});

app.get("/login", (req, res) => {
  res.render("home/login");
});

app.get("/watch", (req, res) => {
  const videoId = req.query.v;
  if (videoId) {
    res.redirect(`/tkt/watch/${videoId}`);
  } else {
    res.redirect(`/tkt/trend`);
  }
});

app.get("/channel/:id", (req, res) => {
  const id = req.params.id;
  res.redirect(`/tkt/c/${id}`);
});
app.get("/live/:id", (req, res) => {
  const id = req.params.id;
  res.redirect(`/tkt/watch/${id}`);
});
app.get("/channel/:id/join", (req, res) => {
  const id = req.params.id;
  res.redirect(`/tkt/c/${id}`);
});
app.get("/hashtag/:des", (req, res) => {
  const des = encodeURIComponent(`#${req.params.des}`);
  res.redirect(`/tkt/s?q=${des}`);
});
app.get("/s", (req, res) => {
  const q = encodeURIComponent(req.query.q);
  res.redirect(`/tkt/s?q=${q}`);
});

app.use("/sandbox", sandboxSv);

app.use((req, res) => {
  res.status(404).render("error.ejs", {
    title: "404 Not found",
    content: "そのページは存在しません。",
  });
});

app.on("error", console.error);

async function initInnerTube() {
  try {
    client = await Innertube.create({ lang: "ja", country: "JP" });
    setClient(client);

    const PORT = process.env.PORT || 3000;
    console.log("starting in PORT", PORT + "...")
    const listener = app.listen(PORT, () => {
      console.log(process.pid, "Ready.", listener.address().port);
    });
  } catch (e) {
    console.error(e);
    setTimeout(initInnerTube, 10000);
  }
}

process.on("unhandledRejection", console.error);
await initInnerTube();


import { spawn } from "child_process";

function runGit(args) {
    return new Promise((resolve, reject) => {
        const git = spawn("/opt/git/bin/git", args, { cwd: "/workspace" });

        git.on("error", err => {
          console.error("git起動エラー:", err);
        });

        git.stdout.on("data", d => console.log(d.toString()));
        git.stderr.on("data", d => console.error(d.toString()));

        git.on("close", code => {
            if (code === 0) resolve();
            else reject(new Error("git " + args.join(" ") + " failed"));
        });
    });
}

async function autoPush() {
    try {
        await runGit(["add", "."]);
        await runGit(["commit", "-m", "auto backup"]);
        await runGit(["push", "origin", "main"]);
        console.log("backup complete");
    } catch (e) {
        console.error(e.message);
    }
}

//setInterval(autoPush, 900000);
