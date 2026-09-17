const fs = require('fs');

async function testExtraction(url) {
  console.log(`\n========================================`);
  console.log(`Testing extraction for: ${url}`);
  console.log(`========================================`);

  const res = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
      'Accept-Language': 'en-US,en;q=0.9'
    }
  });

  const html = await res.text();
  console.log(`Fetched HTML length: ${html.length}`);

  // Test extraction logic
  const { extractMediaFromHtml } = require('./engine-code.js');
  const result = extractMediaFromHtml(html, url, '5564412259');

  console.log(`Total Images Found: ${result.totalImages}`);
  console.log(`Total Videos Found: ${result.totalVideos}`);
  console.log(`Total Albums: ${result.totalAlbums}`);

  if (result.albums.length > 0) {
    console.log(`Sample Album 1 (Photos: ${result.albums[0].length}):`);
    for (const p of result.albums[0].slice(0, 3)) {
      console.log(`  - ${p.media}`);
    }
  }

  return result;
}

async function main() {
  await testExtraction('https://www.aman.com/destinations/country/asia');
  await testExtraction('https://www.palazzosogni.com/');
}

main().catch(console.error);
