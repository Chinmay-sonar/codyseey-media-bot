const fs = require('fs');
const path = require('path');
const { extractMediaFromHtml } = require('./engine.js');

async function downloadMedia(targetUrl, outputDir = './downloads') {
  if (!targetUrl) {
    console.log('Usage: node download_media.js "<WEBSITE_URL>"');
    process.exit(1);
  }

  console.log(`\n======================================================`);
  console.log(`  CODYSEEY LOCAL MEDIA DOWNLOADER (Direct to Disk)`);
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
    const result = extractMediaFromHtml(html, targetUrl);

    let cleanHost = 'media_export';
    try {
      cleanHost = new URL(targetUrl).hostname.replace(/[^a-zA-Z0-9]/g, '_');
    } catch (_) {}

    const timestamp = new Date().toISOString().slice(0, 10);
    const saveDir = path.resolve(outputDir, `${cleanHost}_${timestamp}`);
    if (!fs.existsSync(saveDir)) {
      fs.mkdirSync(saveDir, { recursive: true });
    }

    console.log(`[INFO] Detected ${result.totalImages} high-res photos and ${result.totalVideos} videos.`);
    console.log(`[INFO] Saving directly to folder: ${saveDir}\n`);

    let savedCount = 0;
    const allPhotoUrls = [];
    for (const album of result.albums) {
      for (const item of album) {
        allPhotoUrls.push(item.media);
      }
    }

    for (let i = 0; i < allPhotoUrls.length; i++) {
      const imgUrl = allPhotoUrls[i];
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
          savedCount++;
          console.log(`  [${savedCount}/${allPhotoUrls.length}] Downloaded: ${fileName} (${Math.round(buffer.length / 1024)} KB)`);
        } else {
          console.warn(`  [SKIP] HTTP ${imgRes.status} on ${imgUrl}`);
        }
      } catch (e) {
        console.warn(`  [ERROR] Failed to fetch image ${i + 1}: ${e.message}`);
      }
    }

    if (result.videos && result.videos.length > 0) {
      const vidFile = path.join(saveDir, 'video_urls.txt');
      fs.writeFileSync(vidFile, result.videos.join('\n'), 'utf8');
      console.log(`\n  [VIDEOS] Saved ${result.videos.length} video stream URLs to video_urls.txt`);
    }

    console.log(`\n======================================================`);
    console.log(`  SUCCESS! ${savedCount} high-res media files saved!`);
    console.log(`  Folder: ${saveDir}`);
    console.log(`======================================================\n`);
  } catch (err) {
    console.error(`\n[FATAL] Extraction failed: ${err.message}\n`);
  }
}

const target = process.argv[2];
downloadMedia(target);
