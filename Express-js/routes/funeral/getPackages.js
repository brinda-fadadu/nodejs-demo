const getPackages = require('../../controllers/Funeral/getPackages')

async function getAllPackagesHandler (req, res, next) {
    try {
        const allPackages = await getPackages()
        res.status(200).json({
            categories: allPackages.categoriesRes,
            packages: allPackages.packagesRes
        })
    } catch (error) {
        res.status(404).json({
            error
        })
    }
}

module.exports = exports = getAllPackagesHandler
