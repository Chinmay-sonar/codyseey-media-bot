const fs = require('fs');
const sqlite3 = require('/usr/local/lib/node_modules/n8n/node_modules/sqlite3').verbose();
const db = new sqlite3.Database('/home/node/.n8n/database.sqlite');

const wf = JSON.parse(fs.readFileSync('/tmp/workflow.json', 'utf8'));
const nodesJson = JSON.stringify(wf.nodes);
const connJson = JSON.stringify(wf.connections);

db.serialize(() => {
  db.run(
    'UPDATE workflow_entity SET nodes = ?, connections = ?, active = 1, updatedAt = datetime("now") WHERE id = ?',
    [nodesJson, connJson, '1v93fSECGPhW5GTy'],
    function(err) {
      if (err) console.error('Error updating workflow_entity:', err);
      else console.log('workflow_entity updated:', this.changes);
    }
  );

  db.run(
    'UPDATE workflow_history SET nodes = ?, connections = ?, updatedAt = datetime("now") WHERE workflowId = ? AND versionId = ?',
    [nodesJson, connJson, '1v93fSECGPhW5GTy', 'cc00b63a-ee5e-444d-9b0f-cba86cb153be'],
    function(err) {
      if (err) console.error('Error updating workflow_history:', err);
      else console.log('workflow_history updated:', this.changes);
    }
  );

  db.run(
    'INSERT OR REPLACE INTO webhook_entity (workflowId, webhookPath, method, node, webhookId, pathLength) VALUES (?, ?, ?, ?, ?, ?)',
    ['1v93fSECGPhW5GTy', 'telegram-agent', 'POST', 'Telegram Webhook (Local Bridge)', 'telegram-agent', 1],
    function(err) {
      if (err) console.error('Error updating webhook_entity:', err);
      else console.log('webhook_entity updated:', this.changes);
    }
  );
});

db.close();
