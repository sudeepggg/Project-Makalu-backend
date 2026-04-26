import fs from 'fs';
import path from 'path';

const LOG_DIR = path.join(process.cwd(), 'logs');
if (!fs.existsSync(LOG_DIR)) fs.mkdirSync(LOG_DIR, { recursive: true });

export const logger = {
  info: (msg: string, meta?: any) => {
    const out = `[${new Date().toISOString()}] [INFO] ${msg} ${meta ? JSON.stringify(meta) : ''}`;
    console.log(out);
    fs.appendFileSync(path.join(LOG_DIR, 'info.log'), out + '\n');
  },
  warn: (msg: string, meta?: any) => {
    const out = `[${new Date().toISOString()}] [WARN] ${msg} ${meta ? JSON.stringify(meta) : ''}`;
    console.warn(out);
    fs.appendFileSync(path.join(LOG_DIR, 'warn.log'), out + '\n');
  },
  error: (msg: string, meta?: any) => {
    const out = `[${new Date().toISOString()}] [ERROR] ${msg} ${meta ? JSON.stringify(meta) : ''}`;
    console.error(out);
    fs.appendFileSync(path.join(LOG_DIR, 'error.log'), out + '\n');
  },
  debug: (msg: string, meta?: any) => {
    const out = `[${new Date().toISOString()}] [DEBUG] ${msg} ${meta ? JSON.stringify(meta) : ''}`;
    if (process.env.NODE_ENV !== 'production') console.debug(out);
    fs.appendFileSync(path.join(LOG_DIR, 'debug.log'), out + '\n');
  },
};