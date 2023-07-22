import fs from 'fs/promises'
import { getCurrentDirectory } from './helper.js';

export async function logger(str) {
    try {
        await fs.appendFile(
            getCurrentDirectory() + '/LOG',
            '\n' + new Date().toLocaleString() + (str ? ' '+str : '')
        );
        console.log('SAVED');
    } catch (error) {
        console.log(error.message);
    }
}
