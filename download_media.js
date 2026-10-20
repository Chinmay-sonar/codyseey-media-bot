const fs = require('fs');
const path = require('path');
const { extractMediaFromHtml, extractMediaDeep } = require('./engine.js');

async function downloadMedia(targetUrl, outputDir = './downloads') {
  if (!targetUrl) {
    console.log('Usage: node download_media.js "<WEBSITE_URL>"');
    process.exit(1);
  }

  console.log(`\n======================================================`);
  console.log(`  CODYSEEY DEEP PENETRATION MEDIA DOWNLOADER`);
  console.log(`  Target: ${targetUrl}`);
  console.log(`======================================================\n`);

  try {
    const response = await fetch(targetUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9'
      },
      redirect: 'follow',
      signal: AbortSignal.timeout(30000)
    });

    if (!response.ok) {
      throw new Error(`Failed to load webpage: HTTP ${response.status}`);
    }

    const html = await response.text();
    const result = await extractMediaDeep(html, targetUrl);

    let cleanHost = 'media_export';
    try {
      cleanHost = new URL(targetUrl).hostname.replace(/[^a-zA-Z0-9]/g, '_');
    } catch (_) {}

    const timestamp = new Date().toISOString().slice(0, 10);
    const saveDir = path.resolve(outputDir, `${cleanHost}_${timestamp}`);
    if (!fs.existsSync(saveDir)) {
      fs.mkdirSync(saveDir, { recursive: true });
    }

    const allPhotoUrls = result.allImages && result.allImages.length > 0 
      ? result.allImages 
      : result.albums.flatMap(a => a.map(i => i.media));

    console.log(`[INFO] Deep Penetration uncovered ${allPhotoUrls.length} high-res photos and ${result.totalVideos} videos.`);
    console.log(`[INFO] Saving directly to folder: ${saveDir}\n`);

    let savedImgCount = 0;
    // Download top 50 photos to prevent overwhelming the local drive
    const downloadQueue = allPhotoUrls.slice(0, 50);
    for (let i = 0; i < downloadQueue.length; i++) {
      const imgUrl = downloadQueue[i];
      try {
        const imgRes = await fetch(imgUrl, { signal: AbortSignal.timeout(15000) });
        if (imgRes.ok) {
          const buffer = Buffer.from(await imgRes.arrayBuffer());
          let ext = path.extname(imgUrl.split('?')[0]) || '.jpg';
          if (!['.jpg', '.jpeg', '.png', '.webp', '.gif'].includes(ext.toLowerCase())) {
            ext = '.jpg';
          }
          const fileName = `image_${String(i + 1).padStart(3, '0')}${ext}`;
          const filePath = path.join(saveDir, fileName);
          fs.writeFileSync(filePath, buffer);
          savedImgCount++;
          console.log(`  [IMG ${savedImgCount}/${downloadQueue.length}] ${fileName} (${Math.round(buffer.length / 1024)} KB)`);
        }
      } catch (e) {
        console.warn(`  [SKIP] Image ${i + 1} (${e.message})`);
      }
    }

    // Download direct MP4 / WebM video files
    let savedVidCount = 0;
    if (result.videos && result.videos.length > 0) {
      console.log(`\n[INFO] Downloading direct video files (top 5)...`);
      const directVideos = result.videos.filter(v => /\.(mp4|webm)/i.test(v)).slice(0, 5);
      for (let j = 0; j < directVideos.length; j++) {
        const vidUrl = directVideos[j];
        try {
          const vRes = await fetch(vidUrl, { signal: AbortSignal.timeout(35000) });
          if (vRes.ok) {
            const vBuf = Buffer.from(await vRes.arrayBuffer());
            const ext = path.extname(vidUrl.split('?')[0]) || '.mp4';
            const vName = `video_${String(j + 1).padStart(2, '0')}${ext}`;
            fs.writeFileSync(path.join(saveDir, vName), vBuf);
            savedVidCount++;
            console.log(`  [VID ${savedVidCount}] Downloaded: ${vName} (${Math.round(vBuf.length / (1024 * 1024) * 10) / 10} MB)`);
          }
        } catch (e) {
          console.warn(`  [SKIP] Video ${j + 1} (${e.message})`);
        }
      }

      const vidFile = path.join(saveDir, 'video_urls.txt');
      fs.writeFileSync(vidFile, result.videos.join('\n'), 'utf8');
      console.log(`  [LINKS] Saved all ${result.videos.length} video streams to video_urls.txt`);
    }

    console.log(`\n======================================================`);
    console.log(`  SUCCESS! Downloaded ${savedImgCount} photos + ${savedVidCount} videos!`);
    console.log(`  Folder: ${saveDir}`);
    console.log(`======================================================\n`);
  } catch (err) {
    console.error(`\n[FATAL] Extraction failed: ${err.message}\n`);
  }
}

const target = process.argv[2];
downloadMedia(target);

