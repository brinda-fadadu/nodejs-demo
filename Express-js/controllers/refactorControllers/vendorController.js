const models = require('../../models')
const { $or, $like } = require('../../lib/sequelize-operators')

class VendorController {
    /**
     * @param {Object} payload
     * @param {Number} payload.offset Number of elements to be skip
     * @param {Number} payload.limit Number of elements to be limit
     * @param {String} payload.searchTerm The term used to search
     * @returns {Object[]} vendors[] The list of vendors based on query
     * @returns {String} vendors[].name Name of the vendor
     * @returns {String} vendors[].code Code of the vendor
     * @returns {String} vendors[].email Email of the vendor
     */
    static async getVendorsList (payload = {}) {
        try {
            let { searchTerm, offset = 0, limit = 10 } = payload
            offset = Number(offset)
            limit = Number(limit)
            let searchQuery = {}
            if (searchTerm) {
                searchQuery = {
                    [$or]: [{
                        name: { [$like]: `%${searchTerm}%` }
                    }, {
                        code: { [$like]: `%${searchTerm}%` }
                    }, {
                        email: { [$like]: `%${searchTerm}%` }
                    }]
                }
            }
            const result = await models.Vendor.findAndCountAll({
                where: {
                    ...searchQuery
                },
                offset,
                limit
            })
            let vendors = result.rows.map(ele => {
                return ele.toJSON()
            })
            return {
                total: result.count,
                vendors
            }
        } catch (err) {
            throw err
        }
    }
}

module.exports = VendorController
