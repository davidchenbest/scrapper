import MongoConnection from "../lib/mongoConnection.js"
import MyDate from '../lib/MyDate.js'
import Mailer from '../lib/Mailer.js'
import { logger } from "../lib/logger.js"
import { getCurrentDirectory, processArrayInChunks, toNumber, wait } from "../lib/helper.js"
import fs from 'fs/promises'

export default async function main(browser) {
    const mongo = new MongoConnection('scrapper', 'stockx')
    try {
        const products = await getProducts()
        const connection = await mongo.getConnection()
        const asyncOperation = async (chunk) => {
            return await Promise.all(chunk.map(({ name, size, minPrice }) => {
                const url = `https://stockx.com/sell/${name}`
                return scapeAndSave({ connection, product: name, browser, url, size, minPrice })
            }))
        }
        const results = await processArrayInChunks({ array: products, batchSize: 3, asyncOperation })
        await fs.writeFile(getCurrentDirectory() + '/RESULTS', JSON.stringify(results))
        await logger('SAVED')
    } catch (error) {
        console.error(error)
        throw error
    }
    finally {
        await Promise.allSettled([
            mongo.closeConnection(),
        ])
    }
}

async function runPuppet({ product, browser, url }) {
    let page
    try {
        page = await browser.newPage();
        await page.exposeFunction("getProduct", () => product);
        await page.goto(url, { waitUntil: 'load' });
        await wait(1000)
        await clickIUnderstand(page)
        await wait(1000)
        await clickIHaveThisOne(page)
        await wait(1000)
        const prices = await getPrices(page)
        if (!prices.length) throw new Error('no Prices for ' + product)
        return prices
    } catch (error) {
    }
    finally {
        await page.close()
    }
}

async function clickIUnderstand(page) {
    await page.evaluate(() => {
        const buttons = document.querySelectorAll('button')
        for (const button of buttons) {
            if (button.innerHTML.includes('I Understand')) button.click()
        }
    })
}

async function clickIHaveThisOne(page) {
    await page.evaluate(async () => {
        const product = await getProduct()
        const buttons = document.querySelectorAll('button')
        const sizeRegex = /((ps|ts|td)\)|-(ps|ts|td))$/gi
        const specialSize = product.match(sizeRegex)?.map(x => x.replace(/-|\)/g, ''))[0]
        for (const button of buttons) {
            if (button.innerHTML.includes('I Have This One')) {
                const parent = button.parentElement
                const productName = parent.querySelector('p').innerText
                const productNameSize = productName.match(sizeRegex)?.map(x => x.replace(/-|\)/g, ''))[0]
                const sizeMatch = specialSize === productNameSize
                console.log(specialSize, productNameSize);
                if (sizeMatch) return button.click()
            }
        }
    })
}

async function getPrices(page) {
    return await page.evaluate(() => {
        const cells = document.querySelectorAll('.tile-inner')
        const prices = []
        for (const cell of cells) {
            const p = cell.querySelectorAll('p')
            const size = p[0].innerText.match(/\d+(\.\d+)?/)[0]
            const price = p[1].innerText
            prices.push({ size, price })
        }
        return prices
    })
}


async function scapeAndSave({ connection, product, browser, url, size, minPrice }) {
    const mydate = new MyDate()
    const date = mydate.dateWithTimeZone(
        process.env.TIMEZONE, mydate.year, mydate.month, mydate.dateNum)

    //save db
    const existInDB = await connection.count({ name: product }, { limit: 1 })
    let lastPrice
    if (!existInDB) await connection.insertOne({ name: product })
    else {
        //get last price
        lastPrice = (await connection.aggregate([
            { $match: { name: product } }, // Add any desired match conditions
            { $project: { lastElement: { $arrayElemAt: ["$prices", -1] } } }
        ]).toArray())[0]?.lastElement
    }

    const lastPriceDate = new Date(lastPrice?.date)
    const isTodaysPrice = date.toLocaleDateString() === lastPriceDate.toLocaleDateString()
    let results
    if (!isTodaysPrice) {
        results = await runPuppet({ product, browser, url })
        if (!results || !results[0]) throw new Error('no results')
        //add price
        await connection.updateOne(
            { name: product },
            { $push: { "prices": { price: results, date: new Date() } } }
        )
        const max = findMaxPrice(results)
        const sizePrice = results.find(r => r?.size === size)
        const min = minPrice && statisfyMinPrice({ minPrice, results, size })
        if (sizePrice === max.price) await sendEmail({ price: max.price, name: product, size, results })
        else if (min) await sendEmail({ price: min.price, name: product, size, results })

    }

    return { product, existInDB, results, lastPrice, date, isTodaysPrice }
}


async function getProducts() {
    const mongo = new MongoConnection('scrapper', 'producttracking')
    try {

        const connection = await mongo.getConnection()
        const products = await connection.find().toArray()
        return products
    } catch (error) {
        throw error
    }
    finally {
        await Promise.allSettled([
            mongo.closeConnection(),
        ])
    }

}


function findMaxPrice(results) {
    if (!results) return
    let max = results[0]
    for (const result of results) {
        if (toNumber(max.price) < toNumber(result.price)) max = result
    }
    return max
}

function statisfyMinPrice({ results, minPrice, size }) {
    const result = results.find(result => result.size === size)
    return toNumber(result.price) >= toNumber(minPrice) ? result : null
}

async function sendEmail({ price, size, name, results }) {
    const HTML = `<p>${name} ${size} ${price}</p><p>${results}</p>`
    const SUBJECT = `Price Alert`
    const mailer = new Mailer()
    await mailer.sendEmail(HTML, SUBJECT)
}

export async function removeNullPrices() {
    const mongo = new MongoConnection('scrapper', 'stockx')
    try {
        const connection = await mongo.getConnection()
        return await connection.updateMany(
            { "prices": { $elemMatch: { "price": null } } },
            { $pull: { "prices": { "price": null } } }
        )

    } catch (error) {
        console.error(error)
        throw error
    }
    finally {
        await Promise.allSettled([
            mongo.closeConnection(),
        ])
    }
}