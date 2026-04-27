import fs from 'fs';
import path from 'path';

const i18nPath = path.join(process.cwd(), 'client', 'lib', 'i18n.tsx');
let content = fs.readFileSync(i18nPath, 'utf8');

// Find the translations object
const translationsMatch = content.match(/(const\s+translations:\s+Record<LanguageCode,\s+Partial<Record<TranslationKey,\s+string>>>\s+=\s+\{)([\s\S]*?)(\};)/);

if (translationsMatch) {
    const [fullMatch, prefix, body, suffix] = translationsMatch;
    
    // Split the body into language blocks
    // Language blocks look like: en: { ... },
    const languageBlocks = body.split(/(\w+):\s+\{/);
    
    let newBody = languageBlocks[0]; // The part before the first language key
    
    for (let i = 1; i < languageBlocks.length; i += 2) {
        const lang = languageBlocks[i];
        const langBodyWithRest = languageBlocks[i+1];
        
        // We need to find the end of this language block's object
        // This is tricky because of nested braces, but translations usually don't have nested objects
        const endOfObjectMatch = langBodyWithRest.match(/\}[\s,]*(?=\w+:\s+\{|$)/);
        if (endOfObjectMatch) {
            const endIdx = endOfObjectMatch.index!;
            const langBody = langBodyWithRest.substring(0, endIdx);
            const rest = langBodyWithRest.substring(endIdx);
            
            const lines = langBody.split('\n');
            const seenKeys = new Set<string>();
            const cleanedLines = lines.filter(line => {
                const keyMatch = line.match(/^\s*['"](.+?)['"]\s*:/);
                if (keyMatch) {
                    const key = keyMatch[1];
                    if (seenKeys.has(key)) return false;
                    seenKeys.add(key);
                }
                return true;
            });
            
            newBody += lang + ': {' + cleanedLines.join('\n') + rest;
        } else {
            newBody += lang + ': {' + langBodyWithRest;
        }
    }
    
    const newContent = content.replace(fullMatch, prefix + newBody + suffix);
    fs.writeFileSync(i18nPath, newContent);
    console.log('Duplicates removed from i18n.tsx per language block (nested version)');
} else {
    console.log('Could not find translations object');
}
