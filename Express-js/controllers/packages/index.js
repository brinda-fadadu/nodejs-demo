const {
    Package,
    PackageCategory,
    PackageItem
} = require('../../models')

async function getPackageCategories () {
    try {
        let packageCategories = await PackageCategory.findAll({
            where: {

            }
        })
        packageCategories = JSON.parse(JSON.stringify(packageCategories))
        return packageCategories
    } catch (err) {
        throw err
    }
}

async function getPackages (filters, offset, limit) {
    try {
        const result = await Package.getPackagesByLocationAndCategory(filters, offset, limit)
        return {
            total: result.count,
            packages: result.rows
        }
    } catch (err) {
        throw err
    }
}

async function getPackageItems (packageId, offset, limit) {
    try {
        const result = await PackageItem.getListByPackage(packageId, offset, limit)
        if (result && result.length) {
            return {
                total: result[0].total,
                packageItems: result
            }
        } else {
            return {
                total: 0,
                packageItems: []
            }
        }
    } catch (err) {
        throw err
    }
}

module.exports = {
    getPackageCategories,
    getPackages,
    getPackageItems
}
