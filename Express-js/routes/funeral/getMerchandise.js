const getMerchandise = require('../../controllers/Funeral/getMerchandise')

async function getAllMerchandiseHandler (req, res, next) {
    try {
        const allMerchandise = await getMerchandise(req.query.page, req.query.limit)
        res.status(200).json({
            results: allMerchandise.merchandiseRes,
            totalResults: allMerchandise.merchandiseCount
        })
    } catch (error) {
        res.status(404).json({
            error
        })
    }
}

module.exports = exports = getAllMerchandiseHandler
