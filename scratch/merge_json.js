
import fs from 'fs';
import path from 'path';

const filePath = 'locales/pt/translation.json';
const content = fs.readFileSync(filePath, 'utf8');

// We can't just JSON.parse because of duplicate keys.
// We want to find all root keys and merge them.

function extractRootKeys(jsonStr) {
    const lines = jsonStr.split('\n');
    const rootKeys = {};
    let currentKey = null;
    let braceLevel = 0;
    let buffer = '';

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const trimmed = line.trim();

        if (braceLevel === 1) {
            // Check for a key at root level
            const match = trimmed.match(/^"([^"]+)":\s*\{/);
            if (match) {
                currentKey = match[1];
                if (!rootKeys[currentKey]) rootKeys[currentKey] = [];
                buffer = '{';
                braceLevel++;
                continue;
            }
        }

        if (trimmed.includes('{')) braceLevel += (trimmed.match(/\{/g) || []).length;
        if (trimmed.includes('}')) braceLevel -= (trimmed.match(/\}/g) || []).length;

        if (currentKey) {
            buffer += line + '\n';
            if (braceLevel === 1) {
                // Key block ended
                rootKeys[currentKey].push(JSON.parse(buffer));
                currentKey = null;
                buffer = '';
            }
        } else if (trimmed === '{') {
            braceLevel = 1;
        }
    }
    return rootKeys;
}

try {
    const keys = extractRootKeys(content);
    const merged = {};

    for (const [key, blocks] of Object.entries(keys)) {
        merged[key] = {};
        for (const block of blocks) {
            // Deep merge logic would be better, but for now flat merge of blocks
            Object.assign(merged[key], block);
        }
    }

    // Special handling for lang key if it exists
    const langMatch = content.match(/"lang":\s*"([^"]+)"/);
    if (langMatch) {
        merged.lang = langMatch[1];
    }

    fs.writeFileSync(filePath, JSON.stringify(merged, null, 2), 'utf8');
    console.log('Successfully merged translation.json');
} catch (e) {
    console.error('Failed to merge:', e);
}
