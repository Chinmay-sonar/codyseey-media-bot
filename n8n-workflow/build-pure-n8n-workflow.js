const fs = require('fs');
const path = require('path');

const BOT_TOKEN = '8803662701:AAFz3AcMvJCDHNyIiL4zxmO4yiItPNOgvU0';
const DEFAULT_CHAT_ID = '5564412259';

// Read engine code
const engineCode = fs.readFileSync(path.join(__dirname, 'engine-code.js'), 'utf8');

const workflow = {
  name: 'Universal High-Res Media Extractor Agent',
  nodes: [
    // 1. Chat Trigger (n8n Web UI Chat)
    {
      parameters: {
        options: {}
      },
      id: 'chat-trigger',
      name: 'When chat message received',
      type: '@n8n/n8n-nodes-langchain.chatTrigger',
      typeVersion: 1.1,
      position: [100, 200]
    },
    // 2. Interval Trigger (Polls Telegram every 5 seconds - 100% inside n8n)
    {
      parameters: {
        interval: 5,
        unit: 'seconds'
      },
      id: 'interval-trigger',
      name: 'Telegram Polling Trigger',
      type: 'n8n-nodes-base.interval',
      typeVersion: 1,
      position: [100, 420]
    },
    // 3. Get Updates from Telegram Bot API
    {
      parameters: {
        url: `https://api.telegram.org/bot${BOT_TOKEN}/getUpdates`,
        options: {
          timeout: 10000
        }
      },
      id: 'get-telegram-updates',
      name: 'Get Telegram Updates',
      type: 'n8n-nodes-base.httpRequest',
      typeVersion: 4.2,
      position: [320, 420]
    },
    // 4. Extract & Clean URL (Normalizes inputs from Chat Trigger, Telegram Polling, or Webhook)
    {
      parameters: {
        jsCode: `
// Extract URL & Chat ID from Telegram Poll OR n8n Chat Trigger
const items = $input.all();
const results = [];

for (const item of items) {
  const data = item.json;
  
  // Case A: From Telegram getUpdates polling
  if (data.ok && Array.isArray(data.result) && data.result.length > 0) {
    for (const update of data.result) {
      const msg = update.message;
      if (msg && msg.text) {
        const urlMatch = msg.text.match(/https?:\\/\\/[^\\s"'<>]+/i);
        results.push({
          targetUrl: urlMatch ? urlMatch[0] : '',
          chatId: String(msg.chat.id),
          hasUrl: !!urlMatch,
          updateId: update.update_id,
          source: 'telegram_poll'
        });
      }
    }
  } 
  // Case B: From n8n Chat Trigger (When chat message received)
  else if (data.chatInput || data.action || data.message) {
    const rawText = data.chatInput || data.action || data.message || '';
    const urlMatch = String(rawText).match(/https?:\\/\\/[^\\s"'<>]+/i);
    results.push({
      targetUrl: urlMatch ? urlMatch[0] : '',
      chatId: '${DEFAULT_CHAT_ID}',
      hasUrl: !!urlMatch,
      updateId: null,
      source: 'n8n_chat'
    });
  }
}

if (results.length === 0) {
  return [];
}

return results.map(r => ({ json: r }));
`
      },
      id: 'extract-clean-url',
      name: 'Extract & Clean URL',
      type: 'n8n-nodes-base.code',
      typeVersion: 2,
      position: [560, 300]
    },
    // 5. If Valid URL
    {
      parameters: {
        conditions: {
          options: {
            caseSensitive: true,
            leftValue: '',
            typeValidation: 'strict',
            version: 2
          },
          conditions: [
            {
              id: 'check-url',
              leftValue: '={{ $json.hasUrl }}',
              rightValue: true,
              operator: {
                type: 'boolean',
                operation: 'equals'
              }
            }
          ],
          combinator: 'and'
        }
      },
      id: 'if-has-url',
      name: 'Has Valid URL?',
      type: 'n8n-nodes-base.if',
      typeVersion: 2,
      position: [780, 300]
    },
    // 6. Fetch Webpage (Desktop Emulation)
    {
      parameters: {
        url: '={{ $json.targetUrl }}',
        options: {
          redirect: {
            redirect: {
              followRedirects: true,
              maxRedirects: 5
            }
          },
          response: {
            response: {
              responseFormat: 'text'
            }
          },
          timeout: 35000
        },
        headers: {
          headers: [
            {
              name: 'User-Agent',
              value: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36'
            },
            {
              name: 'Accept',
              value: 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8'
            },
            {
              name: 'Accept-Language',
              value: 'en-US,en;q=0.9'
            }
          ]
        }
      },
      id: 'fetch-html',
      name: 'Fetch Webpage (Desktop Emulation)',
      type: 'n8n-nodes-base.httpRequest',
      typeVersion: 4.2,
      position: [1020, 200]
    },
    // 7. Universal Media Extractor & Showcase Engine
    {
      parameters: {
        jsCode: engineCode
      },
      id: 'media-engine',
      name: 'Universal Media Extractor & Showcase Engine',
      type: 'n8n-nodes-base.code',
      typeVersion: 2,
      position: [1260, 200]
    },
    // 8. Format Albums for Telegram Batch Dispatch
    {
      parameters: {
        jsCode: `
// Format photo albums for native n8n HTTP Request iteration
const item = $input.first().json;
const albums = item.albums || [];
const chatId = item.chatId || '${DEFAULT_CHAT_ID}';

if (albums.length === 0) {
  return [];
}

return albums.map((album, idx) => ({
  json: {
    chat_id: chatId,
    media: album,
    albumIndex: idx + 1,
    totalAlbums: albums.length,
    isSingle: album.length === 1,
    singlePhoto: album[0]?.media || ''
  }
}));
`
      },
      id: 'format-albums',
      name: 'Format Albums for Telegram',
      type: 'n8n-nodes-base.code',
      typeVersion: 2,
      position: [1500, 120]
    },
    // 9. Send Photo Albums to Telegram (Iterates automatically over every album)
    {
      parameters: {
        method: 'POST',
        url: `https://api.telegram.org/bot${BOT_TOKEN}/sendMediaGroup`,
        sendBody: true,
        specifyBody: 'json',
        jsonBody: '={{ { chat_id: $json.chat_id, media: $json.media } }}',
        options: {
          timeout: 25000
        }
      },
      id: 'send-telegram-albums',
      name: 'Send Photo Albums (Pure Media)',
      type: 'n8n-nodes-base.httpRequest',
      typeVersion: 4.2,
      position: [1740, 120]
    },
    // 10. Format Videos for Telegram
    {
      parameters: {
        jsCode: `
const item = $input.first().json;
const videos = item.videos || [];
const chatId = item.chatId || '${DEFAULT_CHAT_ID}';

if (videos.length === 0) {
  return [];
}

return videos.map(vid => ({
  json: {
    chat_id: chatId,
    text: vid
  }
}));
`
      },
      id: 'format-videos',
      name: 'Format Videos for Telegram',
      type: 'n8n-nodes-base.code',
      typeVersion: 2,
      position: [1500, 320]
    },
    // 11. Send Videos to Telegram
    {
      parameters: {
        method: 'POST',
        url: `https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`,
        sendBody: true,
        specifyBody: 'json',
        jsonBody: '={{ { chat_id: $json.chat_id, text: $json.text } }}',
        options: {
          timeout: 15000
        }
      },
      id: 'send-telegram-videos',
      name: 'Send Videos to Telegram',
      type: 'n8n-nodes-base.httpRequest',
      typeVersion: 4.2,
      position: [1740, 320]
    },
    // 12. Acknowledge Telegram Polling Offset (Clears processed updates so they are not repeated)
    {
      parameters: {
        method: 'GET',
        url: `={{ $json.updateId ? 'https://api.telegram.org/bot${BOT_TOKEN}/getUpdates?offset=' + ($json.updateId + 1) : 'https://api.telegram.org/bot${BOT_TOKEN}/getMe' }}`,
        options: {}
      },
      id: 'ack-telegram-offset',
      name: 'Acknowledge Processed Messages',
      type: 'n8n-nodes-base.httpRequest',
      typeVersion: 4.2,
      position: [1020, 440]
    }
  ],
  connections: {
    'When chat message received': {
      main: [
        [
          {
            node: 'Extract & Clean URL',
            type: 'main',
            index: 0
          }
        ]
      ]
    },
    'Telegram Polling Trigger': {
      main: [
        [
          {
            node: 'Get Telegram Updates',
            type: 'main',
            index: 0
          }
        ]
      ]
    },
    'Get Telegram Updates': {
      main: [
        [
          {
            node: 'Extract & Clean URL',
            type: 'main',
            index: 0
          }
        ]
      ]
    },
    'Extract & Clean URL': {
      main: [
        [
          {
            node: 'Has Valid URL?',
            type: 'main',
            index: 0
          }
        ]
      ]
    },
    'Has Valid URL?': {
      main: [
        // True branch: Fetch webpage & Acknowledge Telegram offset
        [
          {
            node: 'Fetch Webpage (Desktop Emulation)',
            type: 'main',
            index: 0
          },
          {
            node: 'Acknowledge Processed Messages',
            type: 'main',
            index: 0
          }
        ],
        // False branch: Acknowledge non-URL message
        [
          {
            node: 'Acknowledge Processed Messages',
            type: 'main',
            index: 0
          }
        ]
      ]
    },
    'Fetch Webpage (Desktop Emulation)': {
      main: [
        [
          {
            node: 'Universal Media Extractor & Showcase Engine',
            type: 'main',
            index: 0
          }
        ]
      ]
    },
    'Universal Media Extractor & Showcase Engine': {
      main: [
        // Branch 1: Send Photo Albums
        [
          {
            node: 'Format Albums for Telegram',
            type: 'main',
            index: 0
          },
          // Branch 2: Send Videos
          {
            node: 'Format Videos for Telegram',
            type: 'main',
            index: 0
          }
        ]
      ]
    },
    'Format Albums for Telegram': {
      main: [
        [
          {
            node: 'Send Photo Albums (Pure Media)',
            type: 'main',
            index: 0
          }
        ]
      ]
    },
    'Format Videos for Telegram': {
      main: [
        [
          {
            node: 'Send Videos to Telegram',
            type: 'main',
            index: 0
          }
        ]
      ]
    }
  }
};

fs.writeFileSync(
  path.join(__dirname, 'media-extractor-workflow.json'),
  JSON.stringify(workflow, null, 2),
  'utf8'
);
console.log('✅ Generated 100% Pure n8n Workflow JSON with', workflow.nodes.length, 'nodes');
