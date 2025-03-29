const {
    sendErrorResponse
} = require('../../lib/errorResponse')
const {
    customResponse
} = require('../../lib/custom-response')
const QuotationController = require('../../controllers/refactorControllers/quotationController/quotationController')

async function listOfQuotations (req, res) {
    try {
        let data = await QuotationController.listOfQuotations(req.query)
        customResponse(200, data, res)
    } catch (error) {
        sendErrorResponse(error, res)
    }
}

async function getQuotation (req, res) {
    try {
        let quotationController = new QuotationController(req.params.quotationId)
        let quotation = await quotationController.getQuotation()
        customResponse(200, quotation, res)
    } catch (error) {
        sendErrorResponse(error, res)
    }
}

async function upsertQuotation (req, res) {
    try {
        req.body.userId = req.currentUser.id
        let quotation = await QuotationController.upsertQuotation(req.body)
        customResponse(200, {
            message: req.body.id ? 'Quotation updated successfully.' : 'Quotation created successfully.',
            quotation
        }, res)
    } catch (error) {
        sendErrorResponse(error, res)
    }
}

async function deleteQuotation (req, res) {
    try {
        let quotationController = new QuotationController(req.params.quotationId)
        await quotationController.deleteQuotation(req.currentUser.id)
        customResponse(200, {
            message: 'Quotation deleted successfully.'
        }, res)
    } catch (error) {
        sendErrorResponse(error, res)
    }
}

async function shareQuotation (req, res) {
    try {
        let quotationController = new QuotationController(req.params.quotationId)
        let message = await quotationController.shareQuotation(req.body, req.currentUser)
        customResponse(200, {
            message
        }, res)
    } catch (error) {
        sendErrorResponse(error, res)
    }
}

async function previewQuotation (req, res) {
    try {
        let quotationController = new QuotationController(req.params.quotationId)
        let message = await quotationController.previewQuotation(req.body, req.currentUser)
        customResponse(200, {
            message
        }, res)
    } catch (error) {
        sendErrorResponse(error, res)
    }
}

async function covertToCase (req, res) {
    try {
        let quotationController = new QuotationController(req.params.quotationId)
        let message = await quotationController.covertToCase(req.currentUser.id)
        customResponse(200, {
            message
        }, res)
    } catch (error) {
        sendErrorResponse(error, res)
    }
}

async function addPerson (req, res) {
    try {
        let quotationController = new QuotationController(req.params.quotationId)
        req.body.userId = req.currentUser.id
        req.body.createdAtApp = true
        req.body.isVerified = false
        let quotation = await quotationController.addPerson(req.body)
        customResponse(200, {
            quotation
        }, res)
    } catch (error) {
        sendErrorResponse(error, res)
    }
}
async function upsertCasePerson (req, res) {
    try {
        req.body.userId = req.currentUser.id
        req.body.createdAtApp = true
        let data = await QuotationController.upsertCasePerson(req.body)
        customResponse(200, data, res)
    } catch (error) {
        sendErrorResponse(error, res)
    }
}

module.exports = {
    listOfQuotations,
    upsertQuotation,
    deleteQuotation,
    getQuotation,
    shareQuotation,
    covertToCase,
    addPerson,
    previewQuotation,
    upsertCasePerson
}
