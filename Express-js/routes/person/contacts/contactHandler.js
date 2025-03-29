const { customResponse } = require('../../../lib/custom-response')
const { sendErrorResponse } = require('../../../lib/errorResponse')
const VerifiedPersonController = require('../../../controllers/refactorControllers/personController/verifiedPersonController')
const { getContactRoles } = require('../../../controllers/refactorControllers/utils')
const seedValues = require('../../../config/seed').seed
const _ = require('lodash')
async function createOrEditContact (req, res, next) {
    try {
        const reqBody = {
            ...req.body,
            userId: req.currentUser.id
        }
        if (req.method === 'PUT') {
            reqBody.id = req.params.contactId
        }
        const verifiedPersonController = new VerifiedPersonController(req.params.personId)
        const contactDetails = await verifiedPersonController.addOrUpdateContactsWithRoles(reqBody)
        customResponse(200, contactDetails, res)
    } catch (error) {
        sendErrorResponse(error, res)
    }
}

async function getContactInfo (req, res, next) {
    try {
        const verifiedPersonController = new VerifiedPersonController(req.params.personId)
        const contactDetails = await verifiedPersonController.getContactDetails(req.params.contactId)
        customResponse(200, contactDetails, res)
    } catch (error) {
        sendErrorResponse(error, res)
    }
}

async function getContactsList (req, res, next) {
    try {
        const verifiedPersonController = new VerifiedPersonController(req.params.personId)
        const listOfContacts = await verifiedPersonController.getListOfContacts(req.query)
        customResponse(200, listOfContacts, res)
    } catch (error) {
        sendErrorResponse(error, res)
    }
}

async function deleteContact (req, res, next) {
    try {
        const verifiedPersonController = new VerifiedPersonController(req.params.personId)
        const deletedContact = await verifiedPersonController.deleteContact(req.params.contactId, req.currentUser.id)
        if (deletedContact[0] === 0) {
            throw new Error('CONTACT_NOT_FOUND')
        }
        customResponse(200, { message: 'Contact is deleted successfully' }, res)
    } catch (error) {
        sendErrorResponse(error, res)
    }
}

async function fetchRoles (req, res, next) {
    try {
        const contactType = req.query.contactType || _.findKey(seedValues.ContactType, (type) => {
            return type === 'Family'
        })
        const roles = await getContactRoles(contactType, [], 'map')
        customResponse(200, roles, res)
    } catch (error) {
        sendErrorResponse(error, res)
    }
}

module.exports = {
    createOrEditContact,
    getContactInfo,
    getContactsList,
    deleteContact,
    fetchRoles
}
