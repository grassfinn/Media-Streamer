import fs from "fs/promises";
import { renameSync } from "fs";
import path from "path";
import Ffmpeg from "fluent-ffmpeg";
Ffmpeg.setFfmpegPath("C:/ffmpeg/bin/ffmpeg.exe");
Ffmpeg.setFfprobePath("C:/ffmpeg/bin/ffprobe.exe");

export class FileStats {
  constructor(folder = "public/media") {
    this.parentDir = folder;
    this.children = null;
    this.media = {};
    this.recent = [];
  }
  async init() {
    this.children = await fs.readdir(this.parentDir);
    for (const folder of this.children) {
      const data = await this.listFiles(folder);

      this.media[folder] = data;
    }
    this.recent = this.mostRecent();
    await this.createThumbnails("videos");
    await this.createThumbnails("lectures");
    return this;
  }

  async listFolders() {
    const folders = await fs.readdir(this.parentDir);
    this.children = folders;
    return folders;
  }
  async listFiles(folder) {
    const dirPath = path.join(this.parentDir, folder);
    const files = await fs.readdir(path.join(this.parentDir, folder));
    const fileData = await Promise.all(
      files.map(async (file) => {
        const createdAt = await this.whenCreated(path.join(dirPath, file));
        return { dirPath, createdAt, file };
      }),
    );
    return fileData;
  }
  async whenCreated(filepath) {
    const file = await fs.stat(filepath);
    return parseInt(file.birthtimeMs);
  }
  findFileInFolder(name, folder) {
    const search = this.media[folder].filter((item) =>
      item.file.toLowerCase().includes(name.toLowerCase()),
    );

    if (search.length) {
      const filepaths = search.map(async (item) => {
        const { dirPath, file } = item;
        const filepath = path.join(dirPath, file);
        const createdAt = await this.whenCreated(filepath);
        const obj = { filepath, createdAt, title: file };

        return obj;
      });

      return filepaths;
    }
    return false;
  }
  findFile(name) {
    const found = [];
    for (const folder of this.children) {
      if (this.findFileInFolder(name, folder)) {
        found.push(this.findFileInFolder(name, folder));
      }
    }
    if (!found.length) {
      return "File not found";
    }
    return found;
  }
  mostRecent() {
    const { podcasts, videos, lectures } = this.media;
    const podcastTimes = podcasts.sort((a, b) => b.createdAt - a.createdAt);
    const videoTimes = videos.sort((a, b) => b.createdAt - a.createdAt);
    const lectureTime = lectures.sort((a, b) => b.createdAt - a.createdAt);

    return [
      podcastTimes[0],
      videoTimes.length ? videoTimes[0] : {},
      lectureTime.length ? lectureTime[0] : {},
    ];
  }

  // Turn into own class?

  createThumbnail(videoPath) {
    const outputDir = path.join(
      import.meta.dirname,
      "..",
      "public",
      "media",
      "image",
    );

    // 1. Isolate the filename without its video extension (.webm)
    const baseNameWithoutExt = path.basename(
      videoPath,
      path.extname(videoPath),
    );

    // 2. Strips out URL-breaking symbols but preserves spaces as requested
    const cleanBaseName = baseNameWithoutExt
      .replace(/[#?%]/g, "")
      .replace(/\s+/g, " "); // Kept as a clean space character

    const outputFile = path.join(outputDir, `${cleanBaseName}.png`);

    Ffmpeg(videoPath)
      .seekInput("00:00:01")
      .outputOptions(["-vframes 1", "-q:v 2", "-s 300x200"])
      .output(outputFile)
      .on("end", () => {
        console.log(`[SUCCESS] Generated thumbnail: ${cleanBaseName}.png`);
      })
      .on("error", (err) => {
        console.error(`[FFMPEG ERROR] on "${cleanBaseName}":`, err.message);
      })
      .run();
  }

  async createThumbnails(folder) {
    const filenames = await this.listFiles(folder);

    for (const file of filenames) {
      const oldFilepath = path.join(file.dirPath, file.file);

      // 1. Safe & native extraction: gets the filename with absolutely NO extension
      // This stops the '.webm.webm.webm' duplicate stacking bug forever!
      const baseNameWithoutExt = path.basename(
        file.file,
        path.extname(file.file),
      );

      // 2. Sanitize characters safely using your clean web-safe regex layout
      const cleanBaseName = baseNameWithoutExt
        .replace(/[#?%]/g, "") // Strips out URL-breaking characters completely
        .replace(/\s+/g, " "); // Replaces spaces with clean dashes

      // 3. Directly append path.extname(file.file) to prevent "undefined" reference errors
      const newFilepath = path.join(
        file.dirPath,
        `${cleanBaseName}${path.extname(file.file)}`,
      );

      // 4. Automatically rename the video file on disk if it isn't safe yet
      if (oldFilepath !== newFilepath) {
        try {
          renameSync(oldFilepath, newFilepath);
          console.log(
            `Renamed Video file: "${file.file}" -> "${cleanBaseName}${path.extname(file.file)}"`,
          );
        } catch (err) {
          console.error(`Could not rename file ${file.file}:`, err.message);
          continue; // Skip processing this thumbnail if the file is currently locked
        }
      }

      // 5. Pass the cleanly named video path into your thumbnail method
      this.createThumbnail(newFilepath);
    }
  }
}

// Usage must be inside an async context (like an async IIFE or top-level await)
// (async () => {
//   const fileStats = new FileStats()
//   await fileStats.init()
//   // const path = String.raw`C:\Users\Andrew Harper\Desktop\Current Projects\Media Streamer\public\media\videos\CSS Tutorial – Full Course for Beginners.mp4`

//   // fileStats.createThumbnail(path)

//   // console.log(fileStats.findFile('I'));
//   // console.log(fileStats);

// })()
