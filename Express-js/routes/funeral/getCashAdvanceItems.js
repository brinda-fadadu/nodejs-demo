const getCashAdvanceItems = require('../../controllers/Funeral/getCashAdvanceItems')

async function getAllCashAdvanceItems (req, res, next) {
    try {
        const allCashAdvanceItems = await getCashAdvanceItems(req.query.page, req.query.limit)
        res.status(200).json({
            result: allCashAdvanceItems.cashAdvanceItemRes,
            totalResults: allCashAdvanceItems.cashAdvanceItemCount
        })
    } catch (error) {
        res.status(404).json({
            error
        })
    }
}

module.exports = exports = getAllCashAdvanceItems
