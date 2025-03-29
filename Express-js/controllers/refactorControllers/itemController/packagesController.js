const models = require('../../../models')
const { $or, $like } = require('../../../lib/sequelize-operators')

class PackageController {
    /**
     * Getting all Package Categories from PackageCategory Table
     */
    static getPackageCategories () {
        return models.PackageCategory.findAll({
            attributes: ['id', 'name', 'code']
        })
    }

    /**
     * Getting all the Packages based on the filters provided with pagination implemented.
     * @param {Object} filters Filters Object currently contain locationId (Required), packageCategoryId, searchTerm
     * @param {Int} offset
     * @param {Int} limit
     */
    static async getPackages (filters, offset, limit) {
        let sequelizeSearchOp = {}
        if (filters.searchTerm) {
            sequelizeSearchOp = {
                [$or]: [{
                    name: {
                        [$like]: `%${filters.searchTerm}%`
                    }
                }, {
                    code: {
                        [$like]: `%${filters.searchTerm}%`
                    }
                }]
            }
        }
        if (filters.locationId) {
            sequelizeSearchOp.locationId = filters.locationId
        }
        if (filters.packageCategoryId) {
            sequelizeSearchOp.packageCategoryId = filters.packageCategoryId
        }
        delete filters.searchTerm
        const res = await models.Package.findAndCountAll({
            where: {
                // ...filters,
                ...sequelizeSearchOp
            },
            distinct: true,
            offset: Number(offset),
            limit: Number(limit),
            include: [
                {
                    model: models.ItemImages,
                    where: {
                        resourceType: 'Package',
                        deletedAt: null,
                        deletedBy: null
                    },
                    as: 'itemImages',
                    required: false
                }
            ]
        })
        return res
    }

    /**
     * Get all Items in a single package
     * @param {number} packageId Required
     * @param {number} offset
     * @param {number} limit
     */
    static getPackageItems (packageId, offset, limit) {
        return models.sequelize.query(`SELECT pi.packageId, pi.locationItemId, pi.quantity, 
              li.price, i.code, i.name FROM ${models.PackageLocationItem.tableName} pi INNER JOIN
              ${models.LocationItem.tableName} li ON pi.locationItemId=li.id
              INNER JOIN ${models.Item.tableName} i ON li.itemId=i.id WHERE pi.isActive=1 AND pi.packageId=${packageId}
              ORDER BY pi.id `, {
            replacements: {
                offset: Number(offset),
                limit: Number(limit)
            }
        })
    }
}

module.exports = PackageController
