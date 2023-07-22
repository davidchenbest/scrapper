import { fileURLToPath } from 'url';
import { dirname } from 'path';

export function getCurrentDirectory() {
    const currentFileUrl = import.meta.url;
    const currentFilePath = fileURLToPath(currentFileUrl);
    return dirname(currentFilePath);
}

export async function wait(time) {
    return new Promise((resolve, reject) => {
        setTimeout(() => {
            resolve()
        }, time)
    })
}

export const toNumber = (x) => +(x.replace(/[^0-9.]/g, ""))