import { wait } from "../lib/helper.js"
import MongoConnection from "../lib/mongoConnection.js"

export default async function main(browser) {
    try {
        const url = `https://instagram.com/gotchubro`
        await runPuppet({ browser, url })

    } catch (error) {
        console.error(error)
        throw error
    }
    finally {
        await Promise.allSettled([
        ])
    }
}

async function runPuppet({ browser, url }) {
    const mongo = new MongoConnection('blog', 'insta')
    try {
        const page = await browser.newPage();
        await page.goto(url, { waitUntil: 'load' });
        await wait(1000)
        const links = await page.evaluate(
            () => [...document.querySelectorAll('article  a')].map(link => link.getAttribute('href'))
        )

        const connection = await mongo.getConnection()
        const posts = await connection.find().toArray()
        for (const link of links) {
            const post = await processLink(link)
            const { photos } = post
            if (!photos.length) throw new Error('No Photos ' + link)
            const found = posts.find(post => post.link === link)
            if (!found || found.photos.length !== photos.length) await connection.insertOne(post)

        }

        async function processLink(link) {
            const p = await browser.newPage()
            await p.goto(`https://instagram.com${link}`, { waitUntil: 'load' });
            await wait(1000)
            return await p.evaluate(
                async () => {
                    function wait(time) {
                        return new Promise((resolve, reject) => {
                            setTimeout(() => {
                                resolve()
                            }, time)
                        })
                    }
                    function getTime() {
                        const times = document.querySelectorAll('time._aaqe')
                        if (times.length !== 1) throw new Error("Can't find post time")
                        return times[0].getAttribute('datetime')
                    }
                    function getLocation() {
                        const locs = [...document.querySelectorAll('header a')]
                        const loc = locs.find(loc => /^\/explore\/locations/i.test(loc.getAttribute('href')))
                        return loc?.textContent
                    }
                    function getTags() {
                        const tags = [...document.querySelectorAll('article ul li:first-child h1 a')]
                        return tags.map(tag => {
                            const test = /^\/explore\/tags/i.test(tag.getAttribute('href'))
                            if (!test) throw new Error('Not a Tag')
                            return tag.textContent.replace('#', '')
                        })

                    }
                    const time = getTime()
                    const location = getLocation()
                    const tags = getTags()

                    const photos = []
                    let lastLength = 0
                    let nextBtn = document.querySelector('button[aria-label=Next]')
                    if (!nextBtn) {
                        const imgs = document.querySelectorAll('img[decoding=auto]')
                        if (imgs.length !== 1) throw new Error('Should only have 1 image')
                        photos.push(imgs[0].src)

                    }
                    while (nextBtn) {
                        const imgs = [...nextBtn.parentElement.querySelectorAll('img')]
                        let newImgCount = imgs.length - lastLength
                        if (imgs.length && imgs.length === lastLength) newImgCount = 1
                        for (let i = imgs.length - newImgCount; i < imgs.length; i++) {
                            photos.push(imgs[i].src)
                        }
                        lastLength = imgs.length

                        nextBtn.click()
                        await wait(500)
                        nextBtn = document.querySelector('button[aria-label=Next]')
                    }
                    return { photos, time, location, tags }
                }
            )
        }

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