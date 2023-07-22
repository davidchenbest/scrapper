import dotenv from "dotenv"
dotenv.config()
import puppeteer from 'puppeteer-extra'
import StealthPlugin from 'puppeteer-extra-plugin-stealth'
puppeteer.use(StealthPlugin())
import { executablePath } from 'puppeteer'
import { logger } from "./lib/logger.js"
import runStockx from './modules/stockx.js'

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