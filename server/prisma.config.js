import { defineConfig } from '@prisma/config';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default defineConfig({
    datasource: {
        url: process.env.DATABASE_URL || `file:${path.resolve(__dirname, 'prisma/dev.db')}`,
    },
});
