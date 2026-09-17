const fs = require('fs');

async function testPalazzo() {
  const url = 'https://www.palazzosogni.com/';
  console.log('Fetching:', url);
  const res = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36'
    }
  });
  const html = await res.text();
  console.log('HTML length:', html.length);

  const $input = {
    first: () => ({
      json: { data: html }
    })
  };
  const $ = () => ({
    first: () => ({
      json: { targetUrl: url, chatId: '5564412259' }
    })
  });

  const engineCode = fs.readFileSync('engine-code.js', 'utf8');
  const runFn = new Function('$input', '$', engineCode);
  const result = runFn($input, $);
  const json = result[0].json;

  console.log('Total Images Extracted:', json.totalImages);
  console.log('Total Videos Extracted:', json.totalVideos);
  console.log('Total Albums Formed:', json.totalAlbums);
  console.log('Sample Photos from Album 1:');
  if (json.albums.length > 0) {
    for (const p of json.albums[0].slice(0, 8)) {
      console.log(' ', p.media);
    }
  }

  // Verify HEAD requests on first 3 images
  if (json.albums.length > 0 && json.albums[0].length > 0) {
    console.log('\nVerifying HTTP response for first 3 images:');
    for (const p of json.albums[0].slice(0, 3)) {
      const h = await fetch(p.media, { method: 'HEAD' });
      console.log(`  [${h.status}] ${h.headers.get('content-type')} (${(h.headers.get('content-length')/1024).toFixed(1)} KB) - ${p.media.slice(-60)}`);
    }
  }
}

testPalazzo().catch(console.error);
