import fs from 'fs';
import path from 'path';

const files = [
    'api/academies/[id].ts',
    'api/football-players.ts',
    'api/football-players/[id].ts',
    'api/football-players/search.ts'
];

files.forEach(file => {
    const fullPath = path.join(process.cwd(), file);
    if (!fs.existsSync(fullPath)) return;
    
    let content = fs.readFileSync(fullPath, 'utf8');
    const fixedContent = content.replace(/Buffer\.from\((value|player\.dob_cipher|player\.first_name_cipher|player\.last_name_cipher)\)/g, 'Buffer.from($1 as any)');
    
    fs.writeFileSync(fullPath, fixedContent);
    console.log(`Fixed Buffer.from in ${file}`);
});
