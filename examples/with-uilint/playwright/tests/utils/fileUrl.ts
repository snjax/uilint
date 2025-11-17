import path from 'node:path';
import { pathToFileURL } from 'node:url';

export function fileUrl(...segments: string[]): string {
  const absolute = path.resolve(__dirname, '..', '..', '..', 'frontend', ...segments);
  return pathToFileURL(absolute).toString();
}

