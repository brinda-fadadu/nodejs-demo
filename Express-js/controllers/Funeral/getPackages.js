const models = require('../../models/index')
const logger = require('../../lib/logger')
const loweringFirstLetter = require('../../utils/loweringFirstLetter')
const { seed } = require('../../config/seed')

async function fetchPackages () {
    try {
        const categories = await models.PackageCategory.findAll({
            attributes: ['id', 'Name', 'ContractType']
        })
        const packages = await models.Package.findAll({
            attributes: ['id', 'Code', 'Name', 'PackageCategoryId', 'Price'],
            include: [
                {
                    model: models.PackageItem,
                    as: 'items',
                    attributes: ['id', 'Quantity'],
                    include: [
                        {
                            model: models.Item,
                            as: 'item',
                            attributes: {
                                exclude: ['IsDisabled', 'CreatedAt', 'UpdatedAt']
                            }
                        }
                    ]
                },
                {
                    model: models.PackageItem,
                    as: 'services',
                    attributes: ['id', 'Quantity'],
                    include: [
                        {
                            model: models.Service,
                            as: 'service',
                            attributes: {
                                exclude: ['IsDisabled', 'CreatedAt', 'UpdatedAt']
                            }
                        }
                    ]
                }
            ]
        })
        const categoriesRes = categories.map((eachCategory) => {
            eachCategory = loweringFirstLetter(eachCategory)
            eachCategory.contractType = seed.ContractType[eachCategory.contractType]
            return eachCategory
        })
        let packagesRes = packages.map((eachPackage) => {
            return loweringFirstLetter(eachPackage)
        })
        packagesRes = packagesRes.map((eachPackage) => {
            eachPackage.items = eachPackage.items.map((eachItem) => {
                eachItem.item.contractType = seed.ContractType[eachItem.item.contractType]
                return eachItem
            })
            eachPackage.services = eachPackage.services.map((eachService) => {
                eachService.item = eachService.service
                eachService.item.contractType = seed.ContractType[eachService.item.contractType]
                delete eachService.service
                return eachService
            })
            return eachPackage
        })
        return { categoriesRes, packagesRes }
    } catch (error) {
        let errorMessage
        errorMessage = error.message || error
        logger.error(errorMessage)
        throw errorMessage
    }
}

module.exports = exports = fetchPackages
