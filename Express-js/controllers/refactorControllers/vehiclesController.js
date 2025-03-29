const models = require('../../models/index')

class VehiclesController {
/**
   *
   * @param {String} vehicleType
   *
   */
    static async getVehicles (vehicleType) {
        let vehicles = []
        if (vehicleType) {
            vehicles = await models.Vehicles.findAll({
                where: {
                    type: vehicleType
                }
            })
        } else {
            vehicles = await models.Vehicles.findAll({})
        }
        return vehicles
    }
}

module.exports = VehiclesController
