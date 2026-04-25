
import fs from 'fs';

const filePath = 'locales/pt/translation.json';
const content = fs.readFileSync(filePath, 'utf8');

// Custom parser to handle duplicate keys at the root level by merging them
function parseAndMerge(jsonStr) {
    // This is tricky. Let's try to split by root-level keys.
    // A root level key looks like:   "key": {
    
    const lines = jsonStr.split('\n');
    const rootData = {};
    let currentKey = null;
    let braceLevel = 0;
    let buffer = '';

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const trimmed = line.trim();

        if (braceLevel === 0 && trimmed === '{') {
            braceLevel = 1;
            continue;
        }

        if (braceLevel === 1) {
            const match = trimmed.match(/^"([^"]+)":\s*(\{)/);
            if (match) {
                currentKey = match[1];
                braceLevel++;
                buffer = '{';
                continue;
            }
            const simpleMatch = trimmed.match(/^"([^"]+)":\s*"([^"]*)"/);
            if (simpleMatch) {
                rootData[simpleMatch[1]] = simpleMatch[2];
                continue;
            }
        } else if (braceLevel > 1) {
            buffer += line + '\n';
            const open = (line.match(/\{/g) || []).length;
            const close = (line.match(/\}/g) || []).length;
            braceLevel += open;
            braceLevel -= close;

            if (braceLevel === 1) {
                // End of block
                try {
                    const block = JSON.parse(buffer);
                    if (!rootData[currentKey]) {
                        rootData[currentKey] = block;
                    } else {
                        // Merge
                        console.log('Merging duplicate key:', currentKey);
                        rootData[currentKey] = { ...rootData[currentKey], ...block };
                    }
                } catch (e) {
                    console.error('Failed to parse block for key:', currentKey, 'at line', i);
                    // Try to fix common trailing comma issue in buffer
                    try {
                        const fixedBuffer = buffer.trim().replace(/,$/, '');
                        const block = JSON.parse(fixedBuffer);
                        if (!rootData[currentKey]) {
                            rootData[currentKey] = block;
                        } else {
                            rootData[currentKey] = { ...rootData[currentKey], ...block };
                        }
                    } catch (e2) {
                        console.error('Still failed after fix');
                    }
                }
                currentKey = null;
                buffer = '';
            }
        }
    }
    return rootData;
}

try {
    const merged = parseAndMerge(content);
    fs.writeFileSync(filePath, JSON.stringify(merged, null, 2), 'utf8');
    console.log('Successfully merged translation.json');
} catch (e) {
    console.error('Fatal error:', e);
}
