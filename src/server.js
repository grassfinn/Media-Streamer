import express from "express";
import cors from "cors";
import path from "path";
import { FileStats } from "./Stat.js";
import { MediaStreamer } from "./MediaStreamer.js";

const app = express();
const publicPath = path.join(import.meta.dirname, "..", "public");
const mediaPath = path.join(publicPath, "media");
const contents = new FileStats(mediaPath);

app.use(express.static(publicPath, { index: false }));
app.use(cors());

app.get("/", async (req, res) => {
  try {
    res.sendFile(path.join(publicPath, "index.html"));
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

app.get("/api/media/:content", async (req, res) => {
  const content = req.params.content;
  const search = req.query.search;

  // find videos with search
  console.log({ search });

  const found = await Promise.all(
    contents.findFileInFolder(search.toLowerCase(), content),
  );

  // display them on page
  res.send(found);
});

app.listen(3500, async () => {
  console.log(`listening on http://192.168.1.45:3500`);
  await contents.init();
  console.log("Content has been loaded!");
});
