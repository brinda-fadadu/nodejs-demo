const getServices = require('../../controllers/Funeral/getServices')

async function getAllServicesHandler (req, res, next) {
    try {
        const allServices = await getServices(req.query.page, req.query.limit)
        res.status(200).json({
            result: allServices.servicesRes,
            totalCount: allServices.serviceCount
        })
    } catch (error) {
        res.status(404).json({
            error
        })
    }
}

module.exports = exports = getAllServicesHandler
