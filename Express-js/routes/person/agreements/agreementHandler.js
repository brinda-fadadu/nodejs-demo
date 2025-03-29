// const _ = require('lodash')
const { customResponse } = require('../../../lib/custom-response')
const { sendErrorResponse } = require('../../../lib/errorResponse')
const AgreementController = require('../../../controllers/refactorControllers/agreementController/agreementController')
const FinanceController = require('../../../controllers/refactorControllers/financeController/financeOptionController')
const VerifiedPersonController = require('../../../controllers/refactorControllers/personController/verifiedPersonController')
const { getAgreementRoles } = require('../../../controllers/refactorControllers/utils')
const PurchaseOrderController = require('../../../controllers/refactorControllers/purchaseOrderController/purchaseOrderController')
const models = require('../../../models')
const AddendumController = require('../../../controllers/refactorControllers/agreementController/addendum')
const Json2csvParser = require('json2csv').Parser
const ApprovalsController = require('../../../controllers/refactorControllers/adjustmentController/approvalsController')

async function createOrEditAgreement (req, res, next) {
    try {
        req.body.userId = req.currentUser.id
        let reqBody = {
            ...req.body
        }

        if (!reqBody.apiType) {
            const verifiedPersonController = new VerifiedPersonController(req.params.personId)
            await verifiedPersonController.getVerifiedPerson()
        }
        let agreement
        if (req.method === 'PUT') {
            let agreementController
            if (!reqBody.apiType) {
                reqBody.id = Number(req.params.agreementId)
            }
            agreementController = new AgreementController(reqBody.id)
            agreement = await agreementController.editAgreement(Number(req.params.personId), reqBody, req.currentUser.id)
        } else {
            agreement = await AgreementController.createOrEditAgreement(Number(req.params.personId), reqBody, req.currentUser.id, Number(req.params.quotationId))
        }
        customResponse(200, agreement, res)
    } catch (error) {
        sendErrorResponse(error, res)
    }
}

async function getAgreementsOfPerson (req, res, next) {
    try {
        const verifiedPersonController = new VerifiedPersonController(req.params.personId)
        await verifiedPersonController.getVerifiedPerson()
        const agreements = await AgreementController.getListOfAgreements(req.params.personId, req.query.type)
        customResponse(200, agreements, res)
    } catch (error) {
        sendErrorResponse(error, res)
    }
}

async function getAgreementDetails (req, res, next) {
    try {
        const agreementController = new AgreementController(req.params.agreementId)
        const agreement = await agreementController.getAgreementDetails()
        customResponse(200, agreement, res)
    } catch (error) {
        sendErrorResponse(error, res)
    }
}

async function fetchRoles (req, res, next) {
    try {
        const roles = await getAgreementRoles('map')
        customResponse(200, roles, res)
    } catch (error) {
        sendErrorResponse(error, res)
    }
}

async function getSaleTypes (req, res, next) {
    try {
        const verifiedPersonController = new VerifiedPersonController(req.params.personId)
        const saleTypes = await verifiedPersonController.getSaleTypeOnArrangement(req.query.agreementType)
        customResponse(200, saleTypes, res)
    } catch (error) {
        sendErrorResponse(error, res)
    }
}

async function checkoutAgreement (req, res, next) {
    let transaction = await models.sequelize.transaction()
    try {
        const agreementController = new AgreementController(req.params.agreementId)
        let agreementDetails = await agreementController.getAgreementDetails(transaction)
        let updatedAgreement = await agreementController.checkoutAgreement(req.params.agreementId, req.params.personId, transaction)
        // Checking if an agreement is AN or PN
        /**
         * TODO: Need a proper way to find the owner of the contract.
         * TODO: Need to implement the creation of the purchase orders for PN turn AN funeral agreements.
         */
        // const owner = agreementDetails.beneficiary.find(val => val.isOwner === true)
        // if ((agreementDetails.needType === AgreementController.NEED_TYPES['AN'] && agreementDetails.type === 1) || !_.get(owner, 'person.isAlive', false) || agreementDetails.type === AgreementController.TYPES['Miscellaneous Sales']) {
        // Note: Purchase orders for miscellaneous sales, irrespective of their type will be created from here.
        if ((agreementDetails.needType === AgreementController.NEED_TYPES['AN'] && agreementDetails.type === 1) || agreementDetails.type === AgreementController.TYPES['Miscellaneous Sales']) {
            // Creating purchase order for merchandises and packages
            await PurchaseOrderController.createOrEditPurchaseOrderHandler(req, transaction)
        }
        const addendumController = new AddendumController(req.params.agreementId)
        const addendum = await addendumController.getInProgressAddendum(transaction)
        updatedAgreement = updatedAgreement.toJSON()
        if (addendum) {
            updatedAgreement.addendumNumber = addendum.addendumNumber
        }
        await transaction.commit()
        customResponse(200, updatedAgreement, res)
    } catch (error) {
        await transaction.rollback()
        sendErrorResponse(error, res)
    }
}

async function finaliseFinanceOptions (req, res, next) {
    try {
        const data = req.body
        data.currentUser = req.currentUser
        const financeController = new FinanceController(req.params.agreementId, data.addendumId)
        await financeController.checkAgreementType(data.apiType)
        const finalizeFinanceRes = await financeController.finalizeFinance(data)
        customResponse(200, finalizeFinanceRes, res)
    } catch (err) {
        sendErrorResponse(err, res)
    }
}

async function getFinanceDetails (req, res, next) {
    try {
        const financeController = new FinanceController(req.params.agreementId)
        await financeController.checkAgreementType(req.query.apiType)
        let financeDetails = await financeController.getAgreementFinance(true)
        if (financeDetails) {
            financeDetails = {
                ...financeDetails.toJSON()
            }
            financeDetails.status = financeDetails.approval ? ApprovalsController.ApprovalStatusStr(financeDetails.approval.status) : 'Approved'
            financeDetails.financedTotal = financeDetails.financedAmount + financeDetails.downPaymentAmount
            financeDetails.downPaymentAmount = financeDetails.downPaymentAmount - financeDetails.ppifAmount
        }
        customResponse(200, financeDetails, res)
    } catch (err) {
        sendErrorResponse(err, res)
    }
}

async function refinancing (req, res, next) {
    try {
        const data = req.body
        const financeController = new FinanceController(req.params.agreementId, data.addendumId)
        await financeController.checkAgreementType(req.body.apiType)
        const refinance = await financeController.refinancing(data)
        customResponse(200, refinance, res)
    } catch (err) {
        sendErrorResponse(err, res)
    }
}

async function specialFinancing (req, res, next) {
    try {
        const data = req.body
        data.currentUser = req.currentUser
        const financeController = new FinanceController(req.params.agreementId, data.addendumId)
        await financeController.checkAgreementType(req.body.apiType)
        const specialFinance = await financeController.specialFinance(data)
        customResponse(200, specialFinance, res)
    } catch (err) {
        sendErrorResponse(err, res)
    }
}

async function getNewPrincipalRefinance (req, res, next) {
    try {
        const { addendumId } = req.query
        const user = req.currentUser
        const financeController = new FinanceController(req.params.agreementId, addendumId)
        await financeController.checkAgreementType()
        const newPrincipal = await financeController.changedPrincipal(user.id)
        customResponse(200, newPrincipal, res)
    } catch (err) {
        sendErrorResponse(err, res)
    }
}

async function revokeFinancing (req, res, next) {
    try {
        const financeController = new FinanceController(req.params.agreementId)
        await financeController.checkAgreementType(req.body.apiType)
        const revokeFinance = await financeController.revokeFinance(req.currentUser.id)
        customResponse(200, revokeFinance, res)
    } catch (err) {
        sendErrorResponse(err, res)
    }
}

async function downloadUnequalSchedule (req, res, next) {
    try {
        const financeController = new FinanceController(req.params.agreementId)
        await financeController.checkAgreementType(req.query.apiType)
        const agreementFinance = await financeController.getAgreementFinance(true)
        if (agreementFinance && agreementFinance.agreementFinanceSchedule.length) {
            let exportRes = agreementFinance.agreementFinanceSchedule.map((installment) => {
                return {
                    'Repayment number': installment.paymentIndex,
                    'Repayment Date': installment.expectedPaymentDate,
                    'Repayment Amount': installment.expectedPaymentAmount,
                    'Balance': installment.balance
                }
            })
            const json2csvParser = new Json2csvParser()
            const csv = json2csvParser.parse(exportRes)
            res.attachment('finance-scheduling.csv')
            res.send(Buffer.from(csv))
        } else {
            res.json({
                success: true,
                msg: 'No records found'
            })
        }
    } catch (error) {
        sendErrorResponse(error, res)
    }
}
async function voidAgreementHandler (req, res, next) {
    try {
        const agreementController = new AgreementController(req.params.agreementId)
        const result = await agreementController.voidAgreement(req.currentUser)
        customResponse(200, result, res)
    } catch (error) {
        sendErrorResponse(error, res)
    }
}

module.exports = {
    createOrEditAgreement,
    getAgreementsOfPerson,
    getAgreementDetails,
    fetchRoles,
    getSaleTypes,
    checkoutAgreement,
    finaliseFinanceOptions,
    getFinanceDetails,
    refinancing,
    specialFinancing,
    revokeFinancing,
    getNewPrincipalRefinance,
    downloadUnequalSchedule,
    voidAgreementHandler
}
