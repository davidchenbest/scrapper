main()
async function main() {
    const products = []
    const outputs = []
    for (const { name, size, minPrice } of products) {
        const results = await runPuppet(name)
        outputs.push({ name, results })
        const max = findMaxPrice(results)
        const sizePrice = results.find(r => r?.size === size)
        const min = minPrice && statisfyMinPrice({ minPrice, results, size })
        if (sizePrice.price === max.price) console.log('MAX', { price: max.price, name: product, size, results })
        else if (min) console.log('MIN', { price: min.price, name: product, size, results })
    }
    console.log(outputs);
}
async function runPuppet(product) {
    const newWindow = window.open('https://stockx.com/sell/' + product, '_blank');
    await wait(3000)
    clickIUnderstand(newWindow)
    await wait(1000)
    clickIHaveThisOne(newWindow, product)
    await wait(1000)
    const prices = getPrices(newWindow)
    newWindow.close()
    return prices
}

async function wait(time) {
    return new Promise((resolve, reject) => {
        setTimeout(() => {
            resolve()
        }, time)
    })
}

function clickIUnderstand(window) {
    const buttons = window.document.querySelectorAll('button')
    for (const button of buttons) {
        if (button.innerHTML.includes('I Understand')) button.click()
    }
}

function clickIHaveThisOne(window, product) {
    const buttons = window.document.querySelectorAll('button')
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
}

function getPrices(window) {
    const cells = window.document.querySelectorAll('.tile-inner')
    const prices = []
    for (const cell of cells) {
        const p = cell.querySelectorAll('p')
        const size = p[0].innerText.match(/\d+(\.\d+)?/)[0]
        const price = p[1].innerText
        prices.push({ size, price })
    }
    return prices

}

function toNumber(x) { return +(x.replace(/[^0-9.]/g, "")) }
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