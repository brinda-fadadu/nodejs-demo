const models = require('../../models/index')
const logger = require('../../lib/logger')
const loweringFirstLetter = require('../../utils/loweringFirstLetter')

async function fetchCashAdvanceItems (page, limit) {
    try {
        const cashAdvanceItemCount = await models.Item.count({
            include: [
                {
                    model: models.ItemCategory,
                    where: {
                        Name: 'CashAdvanced Item'
                    }
                }
            ]
        })
        const cashAdvanceItems = await models.Item.findAll({
            attributes: ['id', 'Name', 'Code'],
            include: [
                {
                    model: models.ItemCategory,
                    attributes: [],
                    where: {
                        Name: 'CashAdvanced Item'
                    }
                }
            ],
            limit: limit,
            offset: (page - 1) * limit
        })
        const cashAdvanceItemRes = cashAdvanceItems.map((eachItem) => {
            return loweringFirstLetter(eachItem)
        })
        return { cashAdvanceItemCount, cashAdvanceItemRes }
    } catch (error) {
        let errorMessage
        errorMessage = error.message || error
        logger.error(errorMessage)
        throw errorMessage
    }
}

module.exports = exports = fetchCashAdvanceItems
