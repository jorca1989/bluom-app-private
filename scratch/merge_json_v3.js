
import fs from 'fs';

const filePath = 'locales/pt/translation.json';
const content = fs.readFileSync(filePath, 'utf8');

// We will find all root keys and their contents without full JSON parsing of each block.
// We assume root keys start with a line like   "key": {

function extractAllBlocks(jsonStr) {
    const lines = jsonStr.split('\n');
    const rootData = {};
    let currentKey = null;
    let braceLevel = 0;
    let blockLines = [];

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const trimmed = line.trim();

        if (braceLevel === 0 && trimmed === '{') {
            braceLevel = 1;
            continue;
        }

        if (braceLevel === 1) {
            // Check for "key": {
            const match = trimmed.match(/^"([^"]+)":\s*\{/);
            if (match) {
                currentKey = match[1];
                braceLevel++;
                blockLines = ['{'];
                continue;
            }
            // Check for "key": "value"
            const simpleMatch = trimmed.match(/^"([^"]+)":\s*"([^"]*)"/);
            if (simpleMatch) {
                rootData[simpleMatch[1]] = simpleMatch[2];
                continue;
            }
        } else if (braceLevel > 1) {
            blockLines.push(line);
            const open = (line.match(/\{/g) || []).length;
            const close = (line.match(/\}/g) || []).length;
            braceLevel += open;
            braceLevel -= close;

            if (braceLevel === 1) {
                // End of block. We need to handle the trailing comma if it exists in the last line.
                let lastLine = blockLines[blockLines.length - 1];
                if (lastLine.trim().endsWith(',')) {
                    // It shouldn't end with a comma inside the block, but it might if it was part of the root list.
                    // Actually, blockLines ends with the line that closed the block.
                }

                const blockStr = blockLines.join('\n').trim().replace(/,$/, '');
                try {
                    const block = JSON.parse(blockStr);
                    if (!rootData[currentKey]) {
                        rootData[currentKey] = block;
                    } else {
                        console.log('Merging duplicate key:', currentKey);
                        // Deep merge would be safer, but let's do a shallow merge first
                        rootData[currentKey] = { ...rootData[currentKey], ...block };
                    }
                } catch (e) {
                    console.error('Failed to parse block for key:', currentKey);
                }
                currentKey = null;
                blockLines = [];
            }
        }
    }
    return rootData;
}

try {
    const merged = extractAllBlocks(content);
    fs.writeFileSync(filePath, JSON.stringify(merged, null, 2), 'utf8');
    console.log('Successfully merged translation.json');
} catch (e) {
    console.error('Fatal error:', e);
}
