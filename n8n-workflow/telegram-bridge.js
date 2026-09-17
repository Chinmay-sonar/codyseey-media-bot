/**
 * Telegram High-Res Media Extractor Bridge
 * Real-time 2-way Telegram media agent: Receives website links on Telegram and delivers maximum-resolution media albums directly back to Telegram.
 */

const fs = require('fs');
const path = require('path');
const { extractMediaFromHtml } = require('./engine-code.js');

const BOT_TOKEN = '8803662701:AAFz3AcMvJCDHNyIiL4zxmO4yiItPNOgvU0';
const BASE_TELEGRAM_URL = `https://api.telegram.org/bot${BOT_TOKEN}`;
const N8N_PROD_WEBHOOK = 'http://localhost:5678/webhook/telegram-agent';
const N8N_TEST_WEBHOOK = 'http://localhost:5678/webhook-test/telegram-agent';

let offset = 0;
let isPolling = false;

console.log('===================================================');
console.log('🚀 Telegram High-Res Media Agent is ACTIVE');
console.log(`📡 Bot: @CodyseeyMediabot`);
console.log(`⚡ Extraction Engine: Universal Multi-CMS High-Res v2`);
console.log('===================================================\n');

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Deliver extracted albums and videos directly to Telegram (Pure Media, Zero Text)
async function deliverToTelegram(data, targetChatId) {
  if (!data) return;
  const chatId = targetChatId || data.chatId || '5564412259';

  // 1. Send all photo albums (batches of 10, no text captions)
  if (Array.isArray(data.albums) && data.albums.length > 0) {
    console.log(`📸 Delivering ${data.totalImages || 'all'} images in ${data.albums.length} albums to Telegram (Chat ID: ${chatId})...`);

    for (let i = 0; i < data.albums.length; i++) {
      const album = data.albums[i];
      try {
        if (album.length >= 2) {
          const res = await fetch(`${BASE_TELEGRAM_URL}/sendMediaGroup`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              chat_id: chatId,
              media: album
            })
          });
          const json = await res.json();
          if (json.ok) {
            console.log(`  ✅ Delivered album ${i + 1}/${data.albums.length} (${album.length} photos)`);
          } else {
            console.warn(`  ⚠️ Album ${i + 1} warning: ${json.description}`);
            // Fallback: If Telegram rejected one image in group, send working photos individually
            if (json.description && json.description.includes('IMAGE_PROCESS_FAILED')) {
              console.log('  🔄 Retrying photos individually...');
              for (const p of album) {
                try {
                  await fetch(`${BASE_TELEGRAM_URL}/sendPhoto`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ chat_id: chatId, photo: p.media })
                  });
                } catch (e) {}
              }
            }
          }
        } else if (album.length === 1) {
          const res = await fetch(`${BASE_TELEGRAM_URL}/sendPhoto`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              chat_id: chatId,
              photo: album[0].media
            })
          });
          const json = await res.json();
          if (json.ok) {
            console.log(`  ✅ Delivered single photo (${i + 1}/${data.albums.length})`);
          }
        }
      } catch (err) {
        console.error(`  ❌ Network error on album ${i + 1}:`, err.message);
      }

      if (i < data.albums.length - 1) {
        await sleep(1200); // Rate limit pause between albums
      }
    }
    console.log(`🎉 All ${data.albums.length} photo albums successfully sent to Telegram!`);
  } else {
    console.log('ℹ️ No images found to deliver.');
  }

  // 2. Send videos (pure playable links, zero extra text)
  if (Array.isArray(data.videos) && data.videos.length > 0) {
    console.log(`🎬 Delivering ${data.videos.length} videos to Telegram...`);
    for (let i = 0; i < data.videos.length; i++) {
      const videoUrl = data.videos[i];
      try {
        if (/\.(mp4|webm)($|\?)/i.test(videoUrl)) {
          await fetch(`${BASE_TELEGRAM_URL}/sendVideo`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              chat_id: chatId,
              video: videoUrl
            })
          });
        } else {
          // Playable external video link (Vimeo / YouTube)
          await fetch(`${BASE_TELEGRAM_URL}/sendMessage`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              chat_id: chatId,
              text: videoUrl
            })
          });
        }
        console.log(`  ✅ Delivered video ${i + 1}/${data.videos.length}`);
      } catch (err) {
        console.error(`  ❌ Network error on video:`, err.message);
      }
      if (i < data.videos.length - 1) {
        await sleep(800);
      }
    }
  }
}

// Forward update to n8n if running
async function forwardToN8n(update) {
  const payload = JSON.stringify(update);
  try {
    await fetch(N8N_TEST_WEBHOOK, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: payload,
    });
  } catch (e) {}

  try {
    await fetch(N8N_PROD_WEBHOOK, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: payload,
    });
  } catch (e) {}
}

async function handleMessage(msg) {
  if (!msg) return;
  const chatId = msg.chat.id;
  const sender = msg.from ? (msg.from.username || msg.from.first_name) : 'User';
  const text = (msg.text || '').trim();

  // Check if text contains a website URL
  const urlMatch = text.match(/https?:\/\/[^\s"'<>]+/i);
  if (urlMatch) {
    const targetUrl = urlMatch[0];
    console.log(`\n📩 [Telegram Message] From @${sender} (Chat ID: ${chatId}): "${targetUrl}"`);
    console.log(`⚡ Fetching & extracting high-res media from: ${targetUrl}...`);

    try {
      const res = await fetch(targetUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.9'
        }
      });

      const html = await res.text();
      console.log(`📄 Page fetched (${html.length} bytes). Running High-Res Extraction Engine...`);
      
      const mediaData = extractMediaFromHtml(html, targetUrl, chatId);
      console.log(`✅ Extracted: ${mediaData.totalImages} images and ${mediaData.totalVideos} videos across ${mediaData.totalAlbums} albums.`);

      await deliverToTelegram(mediaData, chatId);
    } catch (err) {
      console.error(`❌ Error processing ${targetUrl}:`, err.message);
    }
  } else {
    console.log(`\n📩 [Telegram Message] From @${sender}: "${text}" (Non-URL)`);
    try {
      await fetch(`${BASE_TELEGRAM_URL}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: chatId,
          text: '👋 Send me any website link, and I will extract and deliver all high-resolution photos and videos directly here as media albums!'
        })
      });
    } catch (e) {}
  }
}

async function pollUpdates() {
  if (isPolling) return;
  isPolling = true;

  try {
    const url = `${BASE_TELEGRAM_URL}/getUpdates?offset=${offset}&timeout=15`;
    const res = await fetch(url);
    const data = await res.json();

    if (data.ok && Array.isArray(data.result)) {
      for (const update of data.result) {
        offset = update.update_id + 1;
        if (update.message) {
          await handleMessage(update.message);
          forwardToN8n(update).catch(() => {});
        }
      }
    } else if (!data.ok) {
      console.error('Telegram API Error:', data.description);
      await sleep(4000);
    }
  } catch (err) {
    // Normal connection reset or momentary glitch — sleep and resume cleanly
    await sleep(1500);
  } finally {
    isPolling = false;
  }
}

async function main() {
  // Clear any existing webhook so long-polling works cleanly
  try {
    const delRes = await fetch(`${BASE_TELEGRAM_URL}/deleteWebhook`);
    const delData = await delRes.json();
    if (delData.ok) {
      console.log('ℹ️ Webhook cleared. Telegram long-polling is active.');
    }
  } catch (e) {}

  console.log('🚀 Listening for messages on Telegram! Send any website link to @CodyseeyMediabot\n');

  while (true) {
    await pollUpdates();
    await sleep(200);
  }
}

main().catch(err => {
  console.error('Fatal error in bridge:', err);
});
