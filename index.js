import { fileURLToPath } from 'url';
import { dirname } from 'path';
import dotenv from "dotenv"
import puppeteer from 'puppeteer-extra'
import StealthPlugin from 'puppeteer-extra-plugin-stealth'
puppeteer.use(StealthPlugin())
import { executablePath } from 'puppeteer'
import { logger } from "./lib/logger.js"
import runStockx from './modules/stockx.js'
import runInsta from './modules/insta.js'

configENV()
main()
async function main() {
    const browser = await puppeteer.launch({
        executablePath: executablePath(),
        headless: 'new',
        defaultViewport: {
            width: 1700,
            height: 1080
        }
    });
    try {
        await runStockx(browser)
        // await runInsta(browser)

    } catch (error) {
        console.error(error)
        await logger(error.message)
    }
    finally {
        await Promise.allSettled([
            browser.close(),
        ])
    }
}

function configENV() {
    const currentFileUrl = import.meta.url;
    const currentFilePath = fileURLToPath(currentFileUrl);
    const root = dirname(currentFilePath)
    dotenv.config({ path: root + '/.env' })
}