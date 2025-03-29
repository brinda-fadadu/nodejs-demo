const VehiclesController = require('../../controllers/refactorControllers/vehiclesController')
const { customResponse } = require('../../lib/custom-response')

async function getVehicles (req, res, next) {
    try {
        let response = await VehiclesController.getVehicles(req.query.vehicleType)
        res.status(200).json({
            data: response,
            success: true
        })
    } catch (err) {
        customResponse(400, err, res)
    }
}

module.exports = exports = { getVehicles }
