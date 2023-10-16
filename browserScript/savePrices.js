import MongoConnection from "../lib/mongoConnection.js"
import dotenv from "dotenv"
dotenv.config({ path: '../.env' })


savePrices()
async function savePrices(outputs) {
    const mongo = new MongoConnection('scrapper', 'stockx')
    try {
        const connection = await mongo.getConnection()
        for (const { name, results } of outputs) {
            await connection.updateOne(
                { name },
                { $push: { "prices": { price: results, date: new Date() } } }
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