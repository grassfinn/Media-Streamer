import express from "express";
import cors from "cors";
import path from "path";
import { FileStats } from "./Stat.js";
import { MediaStreamer } from "./MediaStreamer.js";

const app = express();
const publicPath = path.join(import.meta.dirname, "..", "public");
const mediaPath = path.join(publicPath, "media");
const contents = new FileStats(mediaPath);
const address = process.env.IP;
const port = process.env.PORT;

app.use(express.static(publicPath, { index: false }));
app.use(cors());

app.set("view engine", "pug");
app.set("views", path.join(publicPath, "views"));

app.get("/", async (req, res) => {
  const locations = {
    videoSrc: `${address}/api/media/recentvideo`,
    podcastSrc: `${address}/api/media/recentpodcast`,
    lectureSrc: `${address}/api/media/recentlecture`,
  };
  try {
    // res.sendFile(path.join(publicPath, "index.html"));
    res.render("index", { locations });
  } catch (error) {}
});
app.get("/:filestats", async (req, res) => {
  return res.send(contents[req.params.filestats]);
});
// Media
app.get("/api/media/recentpodcast", async (req, res) => {
  console.log("Getting Vid");

  const recent = contents.recent[0];
  const { dirPath, file } = recent;
  const filePath = path.join(dirPath, file);
  const streamer = new MediaStreamer(filePath, "audio/mpeg");
  await streamer.stream(req, res);
});
app.get("/api/media/recentvideo", async (req, res) => {
  console.log("Getting cast");

  const recent = contents.recent[1];
  const { dirPath, file } = recent;
  const filePath = path.join(dirPath, file);
  const streamer = new MediaStreamer(filePath, "video/mp4");
  await streamer.stream(req, res);
});
app.get("/api/media/recentlecture", async (req, res) => {
  console.log("Getting lecture");

  const recent = contents.recent[2];
  const { dirPath, file } = recent;
  const filePath = path.join(dirPath, file);
  const streamer = new MediaStreamer(filePath, "video/mp4");
  await streamer.stream(req, res);
});

app.get("/api/media/:content", async (req, res) => {
  const content = req.params.content;
  const search = req.query.search;

  // find videos with search
  console.log({ search, content }, "searching for...");

  const found = await Promise.all(
    contents.findFileInFolder(search.toLowerCase(), content),
  );
console.log(found);

  // display them on page
  if (found) {
    res.send(found);
  }
});

app.listen(port, async () => {
  console.log(`listening on ${address}`);
  await contents.init();
  console.log("Content has been loaded!");
});
