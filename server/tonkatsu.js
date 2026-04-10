import axios from "axios";
import bodyParser from "body-parser";
import fs from "fs";
import path from "path";
const inv = ["https://8xxzdw-3000.csb.app"]
const JPath = path.join(process.cwd(), "Info.json");

const user_agent =
  process.env.USER_AGENT ||
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/86.0.4240.198 Safari/537.36";

let apis = null;
const MAX_API_WAIT_TIME = 3000;
const MAX_TIME = 15000;

async function getapis() {
  try {
    const response = await axios.get(
      "https://raw.githubusercontent.com/wakame02/wktopu/refs/heads/main/inv.json"
    );
    apis = await response.data;
    console.log("データを取得しました:", apis);
  } catch (error) {
    console.error("データの取得に失敗しました:", error);
    await getapisgit();
  }
}

async function getapisgit() {
  try {
    const response = await axios.get(
      "https://raw.githubusercontent.com/wakame02/wktopu/refs/heads/main/inv.json"
    );
    apis = await response.data;
    console.log("データを取得しました:", apis);
  } catch (error) {
    console.error("データの取得に失敗しました:", error);
  }
}

async function ggvideo(videoId, num) {
  const startTime = Date.now();
  const instanceErrors = new Set();
  /*
  for (let i = 0; i < 20; i++) {
    if (Math.floor(Math.random() * 20) === 0) {
      await getapis();
    }
  }
  if (!apis) {
    await getapisgit();
  }
  for (const instance of apis) {*/
  if (!inv[num] || (num < 0 || num > 1)) throw new Error("numが不正です");
  for (let i = 0; i < 3; i++) {
    try {/*
      const response = await axios.get(`${instance}/api/v1/videos/${videoId}`, {
        timeout: MAX_API_WAIT_TIME,
        user_agent
      });
      console.log(`使ってみたURL: ${instance}/api/v1/videos/${videoId}、response: ${JSON.stringify(response.data)}`);

      if (response.data && (response.data.formatStreams || response.data.adaptiveFormats)) {
        return response.data;
      } else {
        console.error(`formatStreamsとadaptiveFormatsが存在しない: ${instance}`);
      }*/
      console.log(i);
      let response = [null, null];
      for (let i2 = 0; i2 < 2; i2++){
        const res = await axios.get(`${inv[num]}/api/v1/videos/${videoId}`, {
          timeout: MAX_API_WAIT_TIME,
          user_agent
        });
        if (res.data && (res.data.formatStreams || res.data.adaptiveFormats)) {
          response[i2] = res.data;
        } else {
          throw new Error("返答データが不正です");
        }
      }
      console.log(`使ってみたURL: ${inv[num]}/api/v1/videos/${videoId}`);
      return response;
    } catch (error) {/*
      console.error(`エラーだよ: ${instance} - ${error.message}`);*/
      console.error(`エラーだよ: ${inv[num]} - ${error.message}`)
      instanceErrors.add(inv[num]);
    }
    if (Date.now() - startTime >= MAX_TIME) {
      throw new Error("接続がタイムアウトしました");
    }
  }
  if (num == 0) {
    return await ggvideo(videoId, 1);
  } else {
    throw new Error("動画を取得する方法が見つかりません");
  }
}

async function getYouTube(videoId) {
  try {
    const videoInfo = await ggvideo(videoId, 0);
    const streamUrl = [videoInfo[0].formatStreams?.[0]?.url, videoInfo[1].formatStreams?.[0]?.url] || [];
    /*const isFormatStreams = formatStreams == videoInfo.formatStreams;
    let streamUrl = formatStreams.find(stream => stream.itag === 18)?.url;
    if (!streamUrl) {
      streamUrl = formatStreams.map(stream => stream.url)[0];
    }
    const streamItag = formatStreams.find(stream => stream.url == streamUrl)?.itag;
    let baseHost = "";
    if (streamUrl) {
          const m = streamUrl.match(/^https:\/\/([^\/]+)/);
          if (m) baseHost = m[1];
    }
    let fixedHlsUrl = null;
    if (videoInfo.hlsUrl && videoInfo.liveNow) {
      if (videoInfo.hlsUrl.startsWith("http")) {
        fixedHlsUrl = videoInfo.hlsUrl;
      } else {
        fixedHlsUrl = `${inv}${videoInfo.hlsUrl}`;
      }
    }*/
    const audioStreams = (videoInfo[0].adaptiveFormats) || [];
    let highstreamUrl = audioStreams
      .filter(
        (stream) => stream.container === "webm" && (stream.resolution === "1080p" || stream.resolution === "1920p")
      )
      .map((stream) => stream.url)[0];
    const audioUrl = audioStreams
      .filter(
        (stream) =>
          stream.container === "m4a" &&
          stream.audioQuality === "AUDIO_QUALITY_MEDIUM"
      )
      .map((stream) => stream.url)[0];
    const streamUrls = audioStreams
      .filter((stream) => stream.container === "webm" && stream.resolution)
      .map((stream) => ({
        url: stream.url,
        resolution: stream.resolution,
      }));

    /*
    if (videoInfo.hlsUrl) {
      streamUrl = `/tkt/live/s/${videoId}`;
    }
    


    if (videoInfo.liveNow) {
      streamUrl = fixedHlsUrl;
    }*/
    //fs.writeFileSync(JPath, JSON.stringify(videoInfo, null, 2));
    const templateData = {
      stream_url: streamUrl,
      highstreamUrl: highstreamUrl,
      audioUrl: audioUrl,
      //liveNow: videoInfo.liveNow,
      videoId: videoId,
      channelId: videoInfo.authorId,
      channelName: videoInfo.author,
      channelImage:
        videoInfo.authorThumbnails?.[videoInfo.authorThumbnails.length - 1]
          ?.url || "",
      videoTitle: videoInfo.title,
      videoDes: videoInfo.descriptionHtml,
      videoViews: videoInfo.viewCount,
      likeCount: videoInfo.likeCount,
      streamUrls: streamUrls,
    };

    return templateData;
  } catch (error) {
    console.error(`エラーだよ: ${error.message}`)
    return error;
  }
}

export { ggvideo, getapis, getYouTube };
