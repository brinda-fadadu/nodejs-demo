const models = require('../../../models')
const { upsert } = require('../utils')

async function createQuotationNumber (t) {
    const year = (new Date()).getFullYear()
    let quotationsNumber = [year]
    quotationsNumber.push('Q')
    let quotationCounter = await models.QuotationCounter.findOne({
        where: {
            year: year
        },
        transaction: t
    })
    let value = 0
    if (quotationCounter) {
        value = quotationCounter.value
        await quotationCounter.increment('value')
    } else {
        await upsert('QuotationCounter', { year: year, value: 1 }, t)
    }
    quotationsNumber.push(
        String(parseInt(value) + 1).padStart(5, '0')
    )
    let quotationsNo = quotationsNumber.join('')
    return quotationsNo
}
module.exports = {
    createQuotationNumber
}
