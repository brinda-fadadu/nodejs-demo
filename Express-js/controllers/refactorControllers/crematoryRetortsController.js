const models = require('../../models/index')

class CrematoryRetortsController {
    /**
     * This method returns all crematory retorts
     */
    static async getCrematoryRetorts () {
        let crematoryRetorts = await models.CrematoryRetorts.findAll({})
        return crematoryRetorts
    }
}

module.exports = CrematoryRetortsController
