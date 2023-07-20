import { fileURLToPath } from 'url';
import { dirname } from 'path';

export function getCurrentDirectory() {
    const currentFileUrl = import.meta.url;
    const currentFilePath = fileURLToPath(currentFileUrl);
    return dirname(currentFilePath);
}