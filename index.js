const http = require('http');
const { extractMediaFromHtml } = require('./engine.js');

// Configuration
const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || '8803662701:AAFz3AcMvJCDHNyIiL4zxmO4yiItPNOgvU0';
const TG_API = `https://api.telegram.org/bot${BOT_TOKEN}`;
const PORT = process.env.PORT || 3000;

// 1. HTTP Healthcheck Server (Keeps Cloud Host like Render happy & alive)
const server = http.createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({
    status: 'online',
    bot: 'CodyseeyMediaBot',
    uptime: Math.floor(process.uptime()),
    timestamp: new Date().toISOString()
  }));
});

server.listen(PORT, () => {
  console.log(`[HealthCheck] Server active on port ${PORT}`);
  console.log(`[Bot] Codyseey Media Bot is listening for links 24/7...`);

  // KeepAlive: Ping external URL every 10 minutes to prevent Render free instance from sleeping
  const pingUrl = process.env.RENDER_EXTERNAL_URL || 'https://codyseey-web-media-extractor.onrender.com';
  setInterval(() => {
    fetch(pingUrl)
      .then(r => console.log(`[KeepAlive] Pinged ${pingUrl} (HTTP ${r.status}) - 24/7 active`))
      .catch(e => console.log(`[KeepAlive] Ping sent:`, e.message));
  }, 10 * 60 * 1000);
});

// Helper: Sleep
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// Helper: Telegram API Request
async function tgRequest(method, payload = {}) {
  try {
    const res = await fetch(`${TG_API}/${method}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    return await res.json();
  } catch (err) {
    console.error(`[Telegram] ${method} Network Error:`, err.message);
    return { ok: false, description: err.message };
  }
}

// 2. Continuous Telegram Long-Polling Loop
let offset = 0;

async function pollTelegram() {
  while (true) {
    try {
      const url = `${TG_API}/getUpdates?offset=${offset}&timeout=25&allowed_updates=["message"]`;
      const res = await fetch(url, { signal: AbortSignal.timeout(35000) });
      const data = await res.json();

      if (data.ok && Array.isArray(data.result) && data.result.length > 0) {
        for (const update of data.result) {
          offset = update.update_id + 1;
          const msg = update.message;
          if (!msg || !msg.text) continue;

          const chatId = msg.chat.id;
          const text = msg.text.trim();
          console.log(`[Incoming] Message from ${chatId}: "${text.slice(0, 80)}"`);

          // Extract URL
          const urlMatch = text.match(/https?:\/\/[^\s"'<>]+/i);
          if (!urlMatch) {
            continue;
          }

          const targetUrl = urlMatch[0];
          console.log(`[Processing] Extracting high-res media from: ${targetUrl}`);

          // Process in background asynchronously so polling doesn't freeze
          processLink(targetUrl, chatId).catch(e => {
            console.error('[Error] Processing link failed:', e.message);
          });
        }
      }
    } catch (err) {
      // Long-polling timeout or temporary network hiccup - retry safely
      if (err.name !== 'TimeoutError' && !err.message.includes('abort')) {
        console.warn('[Polling] Notice:', err.message);
      }
      await sleep(2000);
    }
  }
}

// 3. Process URL & Send Photo Albums
async function processLink(targetUrl, chatId) {
  try {
    // Desktop Emulation Webpage Fetch
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
      console.warn(`[Fetch] Failed to load webpage: HTTP ${response.status}`);
      return;
    }

    const html = await response.text();
    const result = extractMediaFromHtml(html, targetUrl, String(chatId));

    console.log(`[Extracted] Found ${result.totalImages} images (${result.totalAlbums} albums), ${result.totalVideos} videos`);

    // Deliver Photo Albums
    for (let i = 0; i < result.albums.length; i++) {
      const album = result.albums[i];
      if (album.length >= 2) {
        const sendRes = await tgRequest('sendMediaGroup', {
          chat_id: chatId,
          media: album
        });
        if (sendRes.ok) {
          console.log(`[Delivered] Album ${i + 1}/${result.totalAlbums} (${album.length} photos)`);
        } else {
          console.warn(`[Send Error] Album ${i + 1} failed:`, sendRes.description);
          if (sendRes.error_code === 429 && sendRes.parameters && sendRes.parameters.retry_after) {
            const waitSec = sendRes.parameters.retry_after;
            console.log(`[RateLimit] Waiting ${waitSec}s before retrying album...`);
            await sleep((waitSec + 1) * 1000);
            const retryRes = await tgRequest('sendMediaGroup', { chat_id: chatId, media: album });
            if (retryRes.ok) {
              console.log(`[Delivered] Album ${i + 1}/${result.totalAlbums} delivered after wait!`);
            }
          } else {
            // Fallback: Try delivering valid photos individually if album had an unresolvable URL
            for (const item of album) {
              await tgRequest('sendPhoto', { chat_id: chatId, photo: item.media });
              await sleep(400);
            }
          }
        }
      } else if (album.length === 1) {
        await tgRequest('sendPhoto', {
          chat_id: chatId,
          photo: album[0].media
        });
        console.log(`[Delivered] Single photo`);
      }
      await sleep(800); // Respect Telegram rate limits
    }

    // Deliver Video Links
    for (const videoUrl of result.videos) {
      await tgRequest('sendMessage', {
        chat_id: chatId,
        text: videoUrl
      });
      await sleep(500);
    }

    console.log(`[Complete] Finished processing ${targetUrl}`);
  } catch (err) {
    console.error(`[Error] Execution error on ${targetUrl}:`, err.message);
  }
}

// Start polling
pollTelegram();
