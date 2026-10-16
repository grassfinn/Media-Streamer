import fs from "fs/promises";
import path from "path";
import Ffmpeg from "fluent-ffmpeg";

export class FileStats {
  constructor(folder = 'public/media') {
    this.parentDir = folder;
    this.children = null;
    this.media = {}
    this.recent = []
  }
  async init() {
    this.children = await fs.readdir(this.parentDir)
    for (const folder of this.children) {
      const data = await this.listFiles(folder)

      this.media[folder] = data
    }
    this.recent = this.mostRecent()
    await this.createThumbnails()
    return this
  }

  async listFolders() {
    const folders = await fs.readdir(this.parentDir);
    this.children = folders;
    return folders;
  }
  async listFiles(folder) {
    const dirPath = path.join(this.parentDir, folder)
    const files = await fs.readdir(path.join(this.parentDir, folder))
    const fileData = await Promise.all(files.map(async file => {
      const createdAt = await this.whenCreated(path.join(dirPath, file))
      return { dirPath, createdAt, file }
    })
    )
    return fileData
  }
  async whenCreated(filepath) {
    const file = await fs.stat(filepath)
    return parseInt(file.birthtimeMs)
  }
  findFileInFolder(name, folder) {
    const search = this.media[folder].filter(item => item.file.toLowerCase().includes(name.toLowerCase()))

    if (search.length) {
      const filepaths = search.map(async item => {
        const { dirPath, file } = item
        const filepath = path.join(dirPath, file)
        const createdAt = await this.whenCreated(filepath)
        const obj = { filepath, createdAt, title: file }

        return obj
      })

      return filepaths
    }
    return false
  }
  findFile(name) {
    const found = []
    for (const folder of this.children) {
      if (this.findFileInFolder(name, folder)) {
        found.push(this.findFileInFolder(name, folder))
      }
    }
    if (!found.length) {
      return 'File not found'
    }
    return found
  }
  mostRecent() {
    const { podcasts, videos } = this.media
    const podcastTimes = (podcasts.sort((a, b) => b.createdAt - a.createdAt));
    const videoTimes = (videos.sort((a, b) => b.createdAt - a.createdAt));

    return [podcastTimes[0], videoTimes.length ? videoTimes[0] : {}]
  }

  // Turn into own class?

  createThumbnail(videoPath) {
    const outputDir = path.join(import.meta.dirname, '..', 'public', 'media', 'image');
    // Extract just the file name to avoid nested path issues in the filename template
    const baseName = path.basename(videoPath).replace('.mp4','');
    

    Ffmpeg(videoPath)
      .on('filenames', (filenames) => {
        // 2. Fix: Removed the stray '+' sign that was causing 'Generating NaN'
        console.log('Generating:', filenames.join(', '));
      })
      .on('end', () => {
        console.log('Generated!');
      })
      .on('error', (err) => {
        console.error('ERROR:', err.message);
      })
      .screenshots({
        // 3. Fix: Changed from 60 seconds to 1 second so it works on short test videos.
        // Use '1' or '10%' to ensure it hits a valid frame.
        timestamps: ['10%'],
        folder: outputDir,
        size: '300x200',
        // Simplifies output file name to 'filename.mp4.png'
        filename: `${baseName}.png`,
      });
  }
  async createThumbnails() {
    const filenames = await this.listFiles('videos')
    // console.log(filenames);
    filenames.forEach(file => {
      const filepath = path.join(file.dirPath, file.file)      
      this.createThumbnail(filepath)
    })

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
