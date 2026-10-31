import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const projectRoot = path.resolve(__dirname, '../..');
const publicDataDir = path.resolve(__dirname, '../public/data');

fs.mkdirSync(publicDataDir, { recursive: true });

const filesToCopy = [
  {
    src: path.join(projectRoot, 'exports/schedule.json'),
    dest: path.join(publicDataDir, 'schedule.json')
  },
  {
    src: path.join(projectRoot, 'data/cit_public.json'),
    dest: path.join(publicDataDir, 'cit_public.json')
  }
];

for (const { src, dest } of filesToCopy) {
  if (fs.existsSync(src)) {
    fs.copyFileSync(src, dest);
    console.log(`Synced: ${path.relative(projectRoot, src)} -> ${path.relative(projectRoot, dest)}`);
  } else {
    console.warn(`Warning: Source file not found: ${src}`);
  }
}
