const { sendErrorResponse } = require('../../lib/errorResponse')
const AddressController = require('../../controllers/refactorControllers/addressController/addressController')
const OrganizationController = require('../../controllers/refactorControllers/addressController/organizationController')

async function createOrEditPlace (req, res, next) {
    try {
        const userId = req.currentUser.id
        const place = await AddressController.managePlace(req.body.place, '', userId)
        res.status(200).json({
            place
        })
    } catch (error) {
        sendErrorResponse(error, res)
    }
}

async function searchPlace (req, res, next) {
    try {
        const result = await OrganizationController.search(req.query)
        res.status(200).json(result)
    } catch (error) {
        sendErrorResponse(error, res)
    }
}

async function searchCallerOfPlace (req, res, next) {
    try {
        const organizationController = new OrganizationController(req.params.id)
        let result = await organizationController.searchCallers()
        res.status(200).json({
            result
        })
    } catch (error) {
        sendErrorResponse(error, res)
    }
}
async function fetchAndUpdatePrimaryOrg (req, res) {
    try {
        let result = await OrganizationController.removeDuplicateOrgAndUpdateWithPrimaryOrg(req.body)
        res.status(200).json({
            result
        })
    } catch (error) {
        sendErrorResponse(error, res)
    }
}

module.exports = {
    createOrEditPlace,
    searchPlace,
    searchCallerOfPlace,
    fetchAndUpdatePrimaryOrg
}
