const fs = require('fs');
const path = require('path');

const wfPath = path.join(__dirname, 'media-extractor-workflow.json');
const wf = JSON.parse(fs.readFileSync(wfPath, 'utf8'));

// 1. Update telegram-webhook to responseMode: "responseNode"
const webhookNode = wf.nodes.find(n => n.id === 'telegram-webhook');
if (webhookNode) {
  webhookNode.parameters.responseMode = 'responseNode';
  console.log('✅ Updated telegram-webhook responseMode to "responseNode"');
}

// 2. Add Respond to Webhook node
const respondNode = {
  parameters: {
    respondWith: 'allIncomingItems',
    options: {}
  },
  id: 'respond-to-webhook',
  name: 'Respond to Webhook',
  type: 'n8n-nodes-base.respondToWebhook',
  typeVersion: 1.1,
  position: [1700, 180]
};

// Remove any existing respond-to-webhook node
wf.nodes = wf.nodes.filter(n => n.id !== 'respond-to-webhook');
wf.nodes.push(respondNode);
console.log('✅ Added Respond to Webhook node');

// 3. Connect Universal Media Extractor to Respond to Webhook
wf.connections['Universal Media Extractor & Showcase Engine'] = {
  main: [
    [
      {
        node: 'Respond to Webhook',
        type: 'main',
        index: 0
      }
    ]
  ]
};
console.log('✅ Connected Universal Media Extractor -> Respond to Webhook');

fs.writeFileSync(wfPath, JSON.stringify(wf, null, 2), 'utf8');
console.log('✅ Saved updated media-extractor-workflow.json');
