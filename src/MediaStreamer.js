import fs from 'fs/promises'
import { createReadStream } from 'fs'
import { pipeline } from 'stream/promises';

export class MediaStreamer {
    constructor(filepath, mimeType) {
        this.filePath = filepath;
        this.mimeType = mimeType;
    }
    async stream(req, res) {
        let stream = null;

        try {
            const stats = await fs.stat(this.filePath);
            const totalSize = stats.size;
            const range = req.headers.range;

            // Handle non-range requests
            if (!range) {
                res.writeHead(200, {
                    'Content-Length': totalSize,
                    'Content-Type': this.mimeType,
                    'Accept-Ranges': 'bytes',
                });
                stream = createReadStream(this.filePath);
                return await this._safePipe(req, res, stream);
            }

            // Parse Range Header
            const { start, end, chunkSize } = this._parseRange(range, totalSize);

            // Out-of-bounds byte range check
            if (start >= totalSize || end >= totalSize || start > end) {
                res.writeHead(416, { 'Content-Range': `bytes */${totalSize}` });
                return res.end();
            }

            // Write 206 Partial Content headers
            res.writeHead(206, {
                'Content-Range': `bytes ${start}-${end}/${totalSize}`,
                'Accept-Ranges': 'bytes',
                'Content-Length': chunkSize,
                'Content-Type': this.mimeType,
            });

            stream = createReadStream(this.filePath, { start, end });
            await this._safePipe(req, res, stream);

        } catch (error) {
            // Ignore ERR_STREAM_PREMATURE_CLOSE caused by normal client aborts/scrubbing
            if (error.code !== 'ERR_STREAM_PREMATURE_CLOSE') {
                console.error('Streaming error:', error);
                if (!res.headersSent) {
                    res.writeHead(error.code === 'ENOENT' ? 404 : 500, { 'Content-Type': 'text/plain' });
                    res.end(error.code === 'ENOENT' ? 'File Not Found' : 'Server Error');
                }
            }
        } finally {
            // Ensure file handles are closed regardless of outcome
            if (stream && !stream.destroyed) {
                stream.destroy();
            }
        }
    }

    _parseRange(rangeHeader, totalSize) {
        const parts = rangeHeader.replace(/bytes=/, '').split('-')
        const start = parseInt(parts[0], 10)
        const end = parts[1] ? parseInt(parts[1], 10) : totalSize - 1
        const chunkSize = end - start + 1
        return { start, end, chunkSize }
    }

    async _safePipe(req, res, stream) {
        // 1. Cleanup on premature client disconnect or HTTP abort
        const onDisconnect = () => {
            console.log('Disconnecting...');

            if (!stream.destroyed) {
                stream.destroy();
            }
        };

        req.on('close', onDisconnect);
        res.on('close', onDisconnect);

        try {
            // 2. pipeline automatically handles teardown across linked streams
            await pipeline(stream, res);
        } finally {
            req.off('close', onDisconnect);
            res.off('close', onDisconnect);
        }
    }
}