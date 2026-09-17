// Script to inject the engine code into the workflow JSON
const fs = require('fs');
const path = require('path');

const dir = __dirname;
const engineCode = fs.readFileSync(path.join(dir, 'engine-code.js'), 'utf8');
const workflowStr = fs.readFileSync(path.join(dir, 'media-extractor-workflow.json'), 'utf8');

const workflow = JSON.parse(workflowStr);

// Find the media-engine node and inject the engine code
for (const node of workflow.nodes) {
  if (node.id === 'media-engine') {
    node.parameters.jsCode = engineCode;
    console.log('✅ Injected engine code into "Universal Media Extractor & Showcase Engine" node');
    console.log(`   Code length: ${engineCode.length} chars`);
    break;
  }
}

fs.writeFileSync(path.join(dir, 'media-extractor-workflow.json'), JSON.stringify(workflow, null, 2), 'utf8');
console.log('✅ Workflow JSON updated and saved');

// Verify
const verify = JSON.parse(fs.readFileSync(path.join(dir, 'media-extractor-workflow.json'), 'utf8'));
const engineNode = verify.nodes.find(n => n.id === 'media-engine');
console.log(`✅ Verification: engine code length = ${engineNode.parameters.jsCode.length}`);
console.log(`   Total nodes: ${verify.nodes.length}`);
console.log(`   Node names: ${verify.nodes.map(n => n.name).join(', ')}`);
