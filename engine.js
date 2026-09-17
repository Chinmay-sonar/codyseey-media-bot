// --- UNIVERSAL MEDIA EXTRACTION & VISUAL SHOWCASE ENGINE v2 ---
// HIGH-RES ONLY | NO TEXT | ALL IMAGES | BATCH ALBUMS

function parseUrl(urlStr) {
  if (!urlStr || typeof urlStr !== 'string') return null;
  let str = urlStr.trim();
  let proto = 'https://';
  let rest = str;
  if (str.startsWith('http://')) {
    proto = 'http://';
    rest = str.slice(7);
  } else if (str.startsWith('https://')) {
    proto = 'https://';
    rest = str.slice(8);
  } else if (str.startsWith('//')) {
    proto = 'https://';
    rest = str.slice(2);
  }
  let slashIdx = rest.indexOf('/');
  let qIdx = rest.indexOf('?');
  let hIdx = rest.indexOf('#');
  let endHost = rest.length;
  if (slashIdx !== -1 && slashIdx < endHost) endHost = slashIdx;
  if (qIdx !== -1 && qIdx < endHost) endHost = qIdx;
  if (hIdx !== -1 && hIdx < endHost) endHost = hIdx;
  
  let host = rest.slice(0, endHost);
  let pathWithQuery = slashIdx !== -1 ? rest.slice(slashIdx) : '/';
  let endPath = pathWithQuery.length;
  let qP = pathWithQuery.indexOf('?');
  let hP = pathWithQuery.indexOf('#');
  if (qP !== -1 && qP < endPath) endPath = qP;
  if (hP !== -1 && hP < endPath) endPath = hP;
  let path = pathWithQuery.slice(0, endPath);
  let pathParts = path.split('/');
  pathParts.pop();
  let basePath = pathParts.join('/') || '';
  return { proto, host, origin: proto + host, basePath };
}

// ====================================================================
// >>> HIGH-RES UPGRADE: Convert CMS-styled URLs to MAXIMUM full-res
// ====================================================================
function upgradeToHighRes(url) {
  if (!url || typeof url !== 'string') return url;
  
  // Drupal: Upgrade style to maximum resolution style
  // e.g. listing_teaser_slim_small -> listing_teaser_slim_extra_large_2x
  // e.g. carousel_cards_plus -> carousel_cards_extra_large_2x
  // e.g. media_text_side_by_side_x_wide -> media_text_side_by_side_x_wide_2x
  if (url.includes('/sites/default/files/styles/')) {
    return url.replace(/\/styles\/([^/]+)\/public\//, (match, style) => {
      if (style.includes('carousel_cards')) {
        return '/styles/carousel_cards_extra_large_2x/public/';
      }
      if (style.includes('listing_teaser')) {
        return '/styles/listing_teaser_slim_extra_large_2x/public/';
      }
      if (style.includes('media_text')) {
        return '/styles/media_text_side_by_side_x_wide_2x/public/';
      }
      if (!style.includes('2x')) {
        return `/styles/${style}_2x/public/`;
      }
      return match;
    });
  }
  
  // WordPress: remove -WxH suffix before extension (e.g. image-1024x768.jpg → image.jpg)
  const wpMatch = url.match(/-\d+x\d+(\.(jpg|jpeg|png|webp))(\?|$)/i);
  if (wpMatch) {
    return url.replace(/-\d+x\d+(\.(jpg|jpeg|png|webp))/i, '$1');
  }
  
  // Shopify/CDN: Remove _WxH or size params
  if (url.includes('cdn.shopify.com')) {
    return url.replace(/_\d+x\d*\./g, '.').replace(/&width=\d+/g, '').replace(/\?width=\d+/, '');
  }
  
  // Squarespace: upgrade to 2500w max quality
  if (url.includes('squarespace-cdn.com') || url.includes('images.squarespace-cdn.com')) {
    return url.replace(/\?format=\d+w/i, '?format=2500w');
  }

  // Contentful: remove ?w=xxx&h=yyy
  if (url.includes('ctfassets.net') || url.includes('contentful.com')) {
    return url.replace(/\?.*$/, '');
  }

  // Next.js: unpack inner URL
  if (url.includes('/_next/image')) {
    const match = url.match(/[?&]url=([^&]+)/);
    if (match) {
      try {
        const decoded = decodeURIComponent(match[1]);
        if (decoded.startsWith('http://') || decoded.startsWith('https://')) {
          return decoded;
        }
      } catch (e) {}
    }
  }

  // Decode HTML entities
  url = url.replace(/&amp;/g, '&');

  // Framer CDN (framerusercontent.com):
  // Stripping all downscale query parameters (?scale-down-to=...&width=...) returns
  // the 100% original full-resolution master image!
  if (url.includes('framerusercontent.com/images/')) {
    return url.split('?')[0];
  }

  // Webflow CDN (website-files.com): strip responsive downscaled thumbnails (-p-500, -p-800, etc.)
  if (url.includes('website-files.com')) {
    url = url.replace(/-p-\d+(\.(?:jpg|jpeg|png|webp|avif))(\?|$)/i, '$1');
  }

  // Telegram Photo API ONLY supports jpg, jpeg, png, and webp (it rejects .avif with WEBPAGE_CURL_FAILED).
  // Webflow & modern CDNs serve .jpg if .avif is replaced by .jpg.
  if (url.includes('.avif')) {
    url = url.replace(/\.avif(\?|$)/i, '.jpg$1');
  }
  
  // Generic: strip downscaling params while preserving security tokens (like itok)
  return url.replace(/([?&])(w|width|h|height|resize|crop)=[^&]*/gi, '$1')
            .replace(/\?&/, '?').replace(/\?$/, '').replace(/&&+/g, '&');
}

function extractMediaFromHtml(html, targetUrl = '', chatId = '5564412259') {
  if (!html || html.length < 50) {
    return {
      output: 'Could not load webpage content.',
      chatId: chatId,
      targetUrl: targetUrl,
      albums: [],
      videos: [],
      hasAlbum: false,
      hasVideos: false,
      totalImages: 0,
      totalVideos: 0,
      totalAlbums: 0
    };
  }

  let parsed = parseUrl(targetUrl);
  if (!parsed || !parsed.host) {
    const canMatch = html.match(/<link\b[^>]*rel=["']canonical["'][^>]*href=["']([^"']+)["']/i) ||
                     html.match(/<meta\b[^>]*property=["']og:url["'][^>]*content=["']([^"']+)["']/i);
    if (canMatch) parsed = parseUrl(canMatch[1]);
  }
  if (!parsed) parsed = { proto: 'https://', host: '', origin: '', basePath: '' };

  function toAbsolute(link) {
    if (!link || typeof link !== 'string') return null;
    let clean = link.trim().replace(/^['"\s]+|['"\s]+$/g, '').replace(/\\/g, '').replace(/&amp;/g, '&');
    if (!clean || clean.length < 4) return null;
    if (clean.includes('about:blank') || clean.includes('javascript:') || clean.includes('void(0)')) return null;
    if (clean.startsWith('data:') || clean.startsWith('blob:')) return null;
    if (clean.includes('1x1') || clean.includes('blank.gif') || clean.includes('spacer.gif')) return null;

    if (clean.startsWith('http://') || clean.startsWith('https://')) {
      return clean;
    }
    if (clean.startsWith('//')) {
      return parsed.proto + clean.slice(2);
    }
    if (clean.startsWith('/')) {
      return parsed.origin ? (parsed.origin + clean) : ('https:/' + clean);
    }
    let relPath = clean.startsWith('./') ? clean.slice(2) : clean;
    return parsed.origin + (parsed.basePath ? parsed.basePath + '/' : '/') + relPath;
  }

  const rawImages = new Set();
  const rawVideos = new Set();
  const videoPosters = new Map();

  // 1. Img tags (Standard, Lazy, and Responsive)
  const imgTagRegex = /<img\b([^>]*)>/gi;
  let tagMatch;
  while ((tagMatch = imgTagRegex.exec(html)) !== null) {
    const attrs = tagMatch[1];
    const srcAttrRegex = /\b(?:src|data-src|data-original|data-lazy|data-lazy-src|data-high-res|data-zoom-src|data-fallback-src)=["']([^"']+)["']/gi;
    let attrMatch;
    while ((attrMatch = srcAttrRegex.exec(attrs)) !== null) {
      const full = toAbsolute(attrMatch[1]);
      if (full) rawImages.add(full);
    }
    const srcsetAttrRegex = /\b(?:srcset|data-srcset|data-lazy-srcset)=["']([^"']+)["']/gi;
    let srcsetMatch;
    while ((srcsetMatch = srcsetAttrRegex.exec(attrs)) !== null) {
      const parts = srcsetMatch[1].split(',');
      for (const p of parts) {
        const candidate = p.trim().split(/\s+/)[0];
        const full = toAbsolute(candidate);
        if (full) rawImages.add(full);
      }
    }
  }

  // 2. Picture & Source tags
  const sourceRegex = /<source\b([^>]*)>/gi;
  while ((tagMatch = sourceRegex.exec(html)) !== null) {
    const attrs = tagMatch[1];
    const isVideo = attrs.toLowerCase().includes('video');
    const srcRegex = /\b(?:src|data-src)=["']([^"']+)["']/gi;
    let sm;
    while ((sm = srcRegex.exec(attrs)) !== null) {
      const full = toAbsolute(sm[1]);
      if (full) {
        if (isVideo || /\.(mp4|webm|ogv|mov|m3u8)($|\?)/i.test(full)) {
          rawVideos.add(full);
        } else {
          rawImages.add(full);
        }
      }
    }
    const srcsetRegex = /\b(?:srcset|data-srcset|data-lazy-srcset)=["']([^"']+)["']/gi;
    let ssm;
    while ((ssm = srcsetRegex.exec(attrs)) !== null) {
      const parts = ssm[1].split(',');
      for (const p of parts) {
        const candidate = p.trim().split(/\s+/)[0];
        const full = toAbsolute(candidate);
        if (full) rawImages.add(full);
      }
    }
  }

  // 3. CSS Background Images
  const bgRegex = /url\(\s*['"]?([^'")\s]+)['"]?\s*\)/gi;
  let bgMatch;
  while ((bgMatch = bgRegex.exec(html)) !== null) {
    const candidate = bgMatch[1];
    if (/\.(jpg|jpeg|png|webp|avif|gif)($|\?)/i.test(candidate)) {
      const full = toAbsolute(candidate);
      if (full) rawImages.add(full);
    }
  }

  // 4. Meta tags (og:image, og:video, twitter)
  const metaRegex = /<meta\b[^>]*(?:property|name)=["'](og:image|og:image:secure_url|og:video|og:video:url|twitter:image|twitter:player)["'][^>]*content=["']([^"']+)["']/gi;
  let metaMatch;
  while ((metaMatch = metaRegex.exec(html)) !== null) {
    const type = metaMatch[1].toLowerCase();
    const full = toAbsolute(metaMatch[2]);
    if (full) {
      if (type.includes('video') || type.includes('player')) {
        rawVideos.add(full);
      } else {
        rawImages.add(full);
      }
    }
  }

  // 5. Video tags & Posters
  const videoTagRegex = /<video\b([^>]*)>/gi;
  while ((tagMatch = videoTagRegex.exec(html)) !== null) {
    const attrs = tagMatch[1];
    const srcMatch = /\bsrc=["']([^"']+)["']/i.exec(attrs);
    const posterMatch = /\bposter=["']([^"']+)["']/i.exec(attrs);
    const posterFull = posterMatch ? toAbsolute(posterMatch[1]) : null;
    if (posterFull) rawImages.add(posterFull);

    if (srcMatch) {
      const full = toAbsolute(srcMatch[1]);
      if (full) {
        rawVideos.add(full);
        if (posterFull) videoPosters.set(full, posterFull);
      }
    }
  }

  // 6. Video Iframes (YouTube, Vimeo, oEmbed, etc.)
  const iframeRegex = /<iframe\b[^>]*\bsrc=["']([^"']+)["'][^>]*>/gi;
  let ifrMatch;
  while ((ifrMatch = iframeRegex.exec(html)) !== null) {
    const src = ifrMatch[1];
    if (['youtube.com', 'youtu.be', 'vimeo.com', 'wistia.com', 'tiktok.com', 'dailymotion.com', 'loom.com', 'oembed'].some(d => src.toLowerCase().includes(d))) {
      const full = toAbsolute(src);
      if (full) rawVideos.add(full);
    }
  }

  // 7. Embedded JSON state & Script Blocks
  const scriptSplitRegex = /<\/script>/i;
  const scriptBlocks = html.split(scriptSplitRegex);
  const mediaUrlRegex = /https?:\/\/[^"'\s\\]+\.(?:jpg|jpeg|png|webp|avif|gif|mp4|webm|m3u8)(?:\?[^"'\s\\]*)?/gi;
  for (const block of scriptBlocks) {
    const lower = block.toLowerCase();
    if (lower.includes('__next_data__') || lower.includes('application/ld+json') || lower.includes('drupalsettings') || lower.includes('window.')) {
      const gt = block.indexOf('>');
      if (gt !== -1) {
        const rawScript = block.slice(gt + 1);
        let jsonMedia;
        while ((jsonMedia = mediaUrlRegex.exec(rawScript)) !== null) {
          const url = jsonMedia[0].replace(/\\/g, '');
          if (/\.(mp4|webm|m3u8)($|\?)/i.test(url)) {
            rawVideos.add(url);
          } else {
            rawImages.add(url);
          }
        }
      }
    }
  }

  // --- INTELLIGENT MEDIA DEDUPLICATION & HIGHEST RESOLUTION SELECTION ---
  function deduplicateMedia(urls) {
    const upgraded = urls.map(u => upgradeToHighRes(u));
    const uniqueMap = new Map();

    function getScore(url) {
      let score = 0;
      const lower = url.toLowerCase();

      // Prioritize maximum resolution versions
      if (lower.includes('x_wide_2x') || lower.includes('x_wide')) score += 70;
      if (lower.includes('extra_large_2x') || lower.includes('@3x') || lower.includes('3x') || lower.includes('2500w') || lower.includes('2048w') || lower.includes('3840w')) score += 60;
      if (lower.includes('extra_large') || lower.includes('xlarge') || lower.includes('xxl') || lower.includes('@2x') || lower.includes('2x')) score += 40;
      if (lower.includes('large_2x')) score += 30;
      if (lower.includes('large') || lower.includes('high_res') || lower.includes('highres')) score += 20;
      if (lower.includes('original') || lower.includes('master')) score += 30;
      if (lower.includes('medium')) score += 10;
      if (lower.includes('small') || lower.includes('thumb') || lower.includes('teaser')) score -= 30;

      const wMatch = lower.match(/(?:[?&](?:w|width)=|[-_])(\d{3,4})(?:[x&]|$)/);
      if (wMatch) {
        score += parseInt(wMatch[1], 10) / 100;
      }

      // Format preference
      if (lower.includes('.jpg') || lower.includes('.jpeg')) score += 5;
      if (lower.includes('.png')) score += 4;
      if (lower.includes('.webp')) score += 3;

      return score;
    }

    function getFingerprint(url) {
      try {
        if (url.includes('/_next/image')) {
          const match = url.match(/[?&]url=([^&]+)/);
          if (match) url = decodeURIComponent(match[1]);
        }

        const qIdx = url.indexOf('?');
        const hIdx = url.indexOf('#');
        let endPath = url.length;
        if (qIdx !== -1) endPath = Math.min(endPath, qIdx);
        if (hIdx !== -1) endPath = Math.min(endPath, hIdx);
        
        const pathOnly = url.slice(0, endPath);
        const queryOnly = qIdx !== -1 ? url.slice(qIdx + 1, hIdx !== -1 ? hIdx : undefined) : '';

        const hasExt = /\.(jpg|jpeg|png|webp|avif|gif)$/i.test(pathOnly);
        if (!hasExt) {
          const cleanQuery = queryOnly.replace(/(?:w|width|h|height|size|quality|q)=\d+&?/gi, '').replace(/&$/, '');
          return (pathOnly + (cleanQuery ? '?' + cleanQuery : '')).toLowerCase();
        }

        let corePath = decodeURIComponent(pathOnly).toLowerCase();
        
        // Strip Drupal styles path BEFORE fingerprinting
        corePath = corePath.replace(/\/styles\/[^/]+\/public\//, '/');
        
        const cmsMarkers = ['/public/', '/uploads/', '/wp-content/uploads/', '/media/', '/assets/images/', '/sites/default/files/'];
        for (const marker of cmsMarkers) {
          const idx = corePath.indexOf(marker);
          if (idx !== -1) {
            corePath = corePath.slice(idx + marker.length);
            break;
          }
        }

        const parts = corePath.split('/');
        let filename = parts.pop() || '';
        const folder = parts.join('/');

        let base = filename.replace(/\.(jpg|jpeg|png|webp|avif|gif)$/i, '');
        base = base.replace(/[-_]\d+x\d*$/i, '');
        base = base.replace(/[-_]\d+x$/i, '');
        base = base.replace(/[-_]?(?:thumb|thumbnail|small|medium|large|extra_large|xlarge|2x|3x)$/i, '');
        base = base.replace(/@\d+x$/i, '');
        base = base.replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');

        return (folder ? folder + '/' : '') + base;
      } catch (e) {
        return url.toLowerCase();
      }
    }

    for (const url of upgraded) {
      const fp = getFingerprint(url);
      const score = getScore(url);

      if (!uniqueMap.has(fp)) {
        uniqueMap.set(fp, { url, score });
      } else {
        const existing = uniqueMap.get(fp);
        if (score > existing.score) {
          uniqueMap.set(fp, { url, score });
        }
      }
    }

    return Array.from(uniqueMap.values()).map(item => item.url);
  }

  // Clean and format videos
  function cleanVideo(rawVid) {
    let cleanUrl = rawVid.trim();
    if (cleanUrl.includes('oembed') && cleanUrl.includes('url=')) {
      const match = cleanUrl.match(/[?&]url=([^&]+)/);
      if (match) cleanUrl = decodeURIComponent(match[1]);
    }

    let thumb = videoPosters.get(rawVid) || null;
    let title = 'Watch Video';

    const vimeoMatch = cleanUrl.match(/vimeo\.com\/(?:video\/)?(\d+)/i);
    if (vimeoMatch) {
      const vimeoId = vimeoMatch[1];
      cleanUrl = `https://vimeo.com/${vimeoId}`;
      thumb = `https://vumbnail.com/${vimeoId}.jpg`;
      title = 'Watch Video on Vimeo';
    }

    const ytMatch = cleanUrl.match(/(?:youtube\.com\/(?:watch\?v=|embed\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/i);
    if (ytMatch) {
      const ytId = ytMatch[1];
      cleanUrl = `https://www.youtube.com/watch?v=${ytId}`;
      thumb = `https://img.youtube.com/vi/${ytId}/hqdefault.jpg`;
      title = 'Watch Video on YouTube';
    }

    return { cleanUrl, thumb, title };
  }

  function deduplicateVideos(urls) {
    const uniqueMap = new Map();
    for (const rawUrl of urls) {
      const videoObj = cleanVideo(rawUrl);
      const key = videoObj.cleanUrl.toLowerCase().split('?')[0].split('#')[0];
      if (!uniqueMap.has(key)) {
        uniqueMap.set(key, videoObj);
      }
    }
    return Array.from(uniqueMap.values());
  }

  const uniqueImages = deduplicateMedia(Array.from(rawImages));
  const uniqueVideos = deduplicateVideos(Array.from(rawVideos));

  // Filter: only raster images supported by Telegram Bot API (jpg, jpeg, png, webp)
  // No SVGs, no unconverted AVIFs, no logos/icons/favicons/decorative brushes
  const validPhotos = uniqueImages.filter(url => {
    const lower = url.toLowerCase().split('?')[0];
    if (lower.endsWith('.svg') || lower.endsWith('.avif')) return false;
    if (lower.includes('logo') || lower.includes('icon') || lower.includes('favicon')) return false;
    if (lower.includes('sprite') || lower.includes('arrow') || lower.includes('chevron')) return false;
    if (lower.includes('/brushes/') || lower.includes('/brush/') || lower.includes('/divider/') || lower.includes('/separator/')) return false;
    return /\.(jpg|jpeg|png|webp)$/i.test(lower);
  });

  // ====================================================================
  // >>> BUILD ALBUMS: Split ALL valid photos into batches of 2-10
  // >>> NO TEXT CAPTIONS — pure media only
  // ====================================================================
  const BATCH_SIZE = 10;
  const albums = [];
  for (let i = 0; i < validPhotos.length; i += BATCH_SIZE) {
    const batch = validPhotos.slice(i, i + BATCH_SIZE);
    if (batch.length >= 2) {
      const mediaGroup = batch.map(url => ({
        type: 'photo',
        media: url
      }));
      albums.push(mediaGroup);
    } else if (batch.length === 1 && albums.length > 0) {
      const lastAlbum = albums[albums.length - 1];
      if (lastAlbum.length < 10) {
        lastAlbum.push({ type: 'photo', media: batch[0] });
      } else {
        // Telegram requires at least 2 items per sendMediaGroup.
        // Balance by moving 1 item from previous album so both have >= 2 items.
        const borrowed = lastAlbum.pop();
        albums.push([borrowed, { type: 'photo', media: batch[0] }]);
      }
    } else if (batch.length === 1 && albums.length === 0) {
      albums.push([{ type: 'photo', media: batch[0] }]);
    }
  }

  // Build video links (direct playable URLs)
  const videoUrls = uniqueVideos.map(v => v.cleanUrl);

  // Visual output for n8n chat UI
  let visualShowcase = '';
  for (const img of uniqueImages) {
    visualShowcase += `![Image](${img})\n\n`;
  }
  for (const vid of uniqueVideos) {
    if (vid.thumb) {
      visualShowcase += `[![▶ ${vid.title}](${vid.thumb})](${vid.cleanUrl})\n\n`;
    } else {
      visualShowcase += `[▶ ${vid.title}](${vid.cleanUrl})\n\n`;
    }
  }
  if (!visualShowcase.trim()) {
    visualShowcase = 'No images or videos found on the provided webpage.';
  }

  return {
    output: visualShowcase.trim(),
    chatId: chatId,
    targetUrl: targetUrl,
    albums: albums,
    videos: videoUrls,
    hasAlbum: albums.length > 0,
    hasVideos: uniqueVideos.length > 0,
    totalImages: validPhotos.length,
    totalVideos: uniqueVideos.length,
    totalAlbums: albums.length
  };
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { extractMediaFromHtml, upgradeToHighRes, parseUrl };
}

// Support n8n Code node execution:
if (typeof $input !== 'undefined') {
  const inputItem = $input.first().json;
  const rawHtml = typeof inputItem.data === 'string' 
    ? inputItem.data 
    : (typeof inputItem === 'string' ? inputItem : JSON.stringify(inputItem));
  let url = '';
  let cid = '5564412259';
  try {
    const cleanNode = $('Extract & Clean URL').first().json;
    url = cleanNode.targetUrl || '';
    if (cleanNode.chatId) cid = String(cleanNode.chatId);
  } catch (e) {}
  return [{ json: extractMediaFromHtml(rawHtml, url, cid) }];
}
