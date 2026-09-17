<div align="center">

  <img src="./assets/codyseey_poster.png" alt="Codyseey Media Extractor" width="100%" style="border-radius: 12px;" />

  <br/><br/>

  # 🛰️ Codyseey Media Bot
  ### *The Autonomous 24/7 Cloud Engine That Un-Compresses the Modern Web*

  <p align="center">
    <b>Stop saving blurry 400px thumbnails.</b> Drop any webpage link into Telegram, and Codyseey automatically hunts down the highest-resolution master assets across any CMS, strips out tracking junk, and delivers gallery-grade photo albums straight to your chat.
  </p>

  <p align="center">
    <a href="https://nodejs.org/"><img src="https://img.shields.io/badge/Node.js-v18+-339933?style=for-the-badge&logo=node.js&logoColor=white" alt="Node.js 18+" /></a>
    <a href="https://core.telegram.org/bots/api"><img src="https://img.shields.io/badge/Telegram-Bot%20API-2CA5E0?style=for-the-badge&logo=telegram&logoColor=white" alt="Telegram Bot" /></a>
    <a href="https://render.com/"><img src="https://img.shields.io/badge/Uptime-24%2F7%20Cloud-46E3B7?style=for-the-badge&logo=render&logoColor=black" alt="24/7 Cloud Uptime" /></a>
    <img src="https://img.shields.io/badge/Multi--CMS-Universal%20De--obfuscation-FFB300?style=for-the-badge" alt="Universal CMS" />
    <img src="https://img.shields.io/badge/Output-Pure%20Media%20Albums-FF4081?style=for-the-badge" alt="Pure Media Albums" />
    <a href="./LICENSE"><img src="https://img.shields.io/badge/License-MIT-blue?style=for-the-badge" alt="MIT License" /></a>
  </p>

</div>

---

## 💥 The Problem: Modern Websites Hate Clean Image Downloads

If you have ever tried collecting design inspiration, architectural photography, product references, or lookbooks from the web, you already know the frustration:

<table>
  <tr>
    <td width="50%" valign="top">
      <h4>🚫 The Typical Nightmare</h4>
      <ul>
        <li><b>Right-Click Disabled:</b> JavaScript overlays and transparent protective divs blocking simple saves.</li>
        <li><b>The Thumbnail Trap:</b> You inspect element, copy the image source, and end up with a blurry <code>400x260</code> downscaled preview.</li>
        <li><b>Srcset Labyrinths:</b> Images buried inside responsive pyramids, dynamic URL encoders, and CDN quality clamps (<code>?width=600&quality=60</code>).</li>
        <li><b>The Format Barrier:</b> Webflow and modern stacks serving raw <code>.avif</code> files that Telegram and mobile viewers can't even preview.</li>
        <li><b>Chat-Spamming Scrapers:</b> Existing scraper bots dump 500 lines of raw JSON, tracker pixels, and site logos into your DM.</li>
      </ul>
    </td>
    <td width="50%" valign="top">
      <h4>✨ The Codyseey Way</h4>
      <ul>
        <li><b>Zero Effort:</b> Just paste or share any link directly into Telegram.</li>
        <li><b>Reverse-Resolution Engine:</b> Bypasses CDN thumbnail limits and reconstructs original <code>2500w</code> or <code>2x</code> master files.</li>
        <li><b>Format Auto-Upgrading:</b> Automatically converts obscure web formats into crisp, universal JPEGs.</li>
        <li><b>Intelligent Junk Filter:</b> Discards tracking pixels, 1x1 spacer GIFs, SVGs, avatars, and site chrome.</li>
        <li><b>Pure Visual Albums:</b> Batches media into native Telegram photo albums (up to 10 photos each) with <b>zero spam text</b>.</li>
      </ul>
    </td>
  </tr>
</table>

---

## 🧬 Reverse-Resolution Engineering: How It Outsmarts Every Major CMS

Most platforms dynamically clamp image resolution for bandwidth savings. Codyseey’s extraction engine uses reverse URL heuristics to bypass these constraints and reach the raw uncompressed origin files:

```
[ Incoming Webpage Link ]
          │
          ▼
[ Fetch & Parse DOM / Srcset / Meta ]
          │
          ├──► Drupal Style Rewriter     ──► Converts /listing_teaser_slim/ ➔ /extra_large_2x/
          ├──► WordPress Suffix Stripper ──► Removes -1024x768.jpg ➔ raw uncompressed origin
          ├──► Shopify CDN Normalizer    ──► Strips _WxH clamps & width query params
          ├──► Squarespace Format Force  ──► Forces ?format=2500w master canvas
          ├──► Next.js Unpacker          ──► Decodes /_next/image?url=... into raw upstream asset
          └──► Webflow Format Converter  ──► Converts .avif ➔ native .jpg for Telegram
          │
          ▼
[ Clean, Deduplicated High-Res Media Stream ]
          │
          ▼
[ Telegram MediaGroup Dispatcher (Albums of 10) ]
```

| CMS / Framework | What the Browser Gives You | What Codyseey Extracts |
| :--- | :--- | :--- |
| **Drupal** | `/styles/listing_teaser_slim/public/img.jpg` | `/styles/listing_teaser_slim_extra_large_2x/public/img.jpg` *(Full uncompressed)* |
| **WordPress** | `photo-768x512.jpg` (Thumbnail crop) | `photo.jpg` *(Original camera master)* |
| **Shopify** | `product_400x400.jpg?width=400` | `product.jpg` *(Unclamped high-res asset)* |
| **Squarespace** | `image.jpg?format=500w` | `image.jpg?format=2500w` *(Maximum studio quality)* |
| **Next.js** | `/_next/image?url=%2Fstatic%2Fimg.png&w=640` | `https://site.com/static/img.png` *(Direct asset)* |
| **Webflow** | `hero.avif` *(Refuses to preview in chat)* | `hero.jpg` *(Universal high-res delivery)* |

---

## ⚡ Key Highlights

<p align="center">
  <img src="./assets/astronaut.png" width="130" align="right" alt="Codyseey Astronaut Mascot" style="margin-left: 20px;" />
</p>

- 🚀 **24/7 Cloud Autonomy:** Runs continuously on free cloud tiers (Render, Railway, Koyeb) using a built-in HTTP healthcheck server and a 10-minute self-keepalive ping.
- 📦 **Native Album Deliveries:** Groups extracted media into native Telegram photo collections (up to 10 photos per album) so your chat stays clean and organized.
- 🧹 **Anti-Junk Telemetry:** Filters out tracking pixels, company logos, SVG icons, favicons, and low-res avatars. If it’s not real content, Codyseey ignores it.
- ⚡ **Zero-Config Deployment:** Pure Node.js runtime with zero heavy dependencies (no Puppeteer bloat, no headless browser overhead). Lightning fast and light on RAM.

---

## 🛠️ Quick Start & Cloud Deployment

### 1. One-Click Cloud Deployment (Render.com)

1. Fork or push this repository to your GitHub account: `codyseey-media-bot`.
2. Go to [Render.com](https://render.com) and click **New + ➔ Web Service**.
3. Select your repository `codyseey-media-bot`.
4. Configure the service:
   - **Environment:** `Node`
   - **Build Command:** `npm install` (or leave empty)
   - **Start Command:** `node index.js`
   - **Plan:** Free
5. Under **Environment Variables**, add:
   ```bash
   TELEGRAM_BOT_TOKEN = your_bot_token_from_botfather
   PORT               = 3000
   ```
6. Click **Deploy Web Service**. Your bot is now live and extracting media 24/7!

---

### 2. Running Locally

```bash
# 1. Clone the repository
git clone https://github.com/Chinmay-sonar/codyseey-media-bot.git
cd codyseey-media-bot

# 2. Copy the environment template
cp .env.example .env

# 3. Add your Telegram Bot Token in .env
TELEGRAM_BOT_TOKEN="your_token_here"

# 4. Start the bot
npm start
```

Once running, simply send any webpage link to your Telegram bot. Codyseey will instantly process the page and reply with the full-resolution photo albums.

---

## 🛡️ Security & Privacy First

- **Never Commit Secrets:** Bot tokens must always be supplied via environment variables (`TELEGRAM_BOT_TOKEN`). 
- **Sample Template Provided:** Use `.env.example` as a starting point. Never check your real `.env` file into version control.

---

## 👨‍💻 Engineering & Pedigree

Built by **[Chinmay Sonar](https://github.com/Chinmay-sonar)** as part of the **Codyseey Intelligence Suite** (Winner, AMD Developer Hackathon ACT II). 

Crafted for designers, visual researchers, curators, and creative technologists who demand master-resolution assets without the digital junk.

```
Distributed under the MIT License. Feel free to fork, adapt, and build upon this engine.
```
