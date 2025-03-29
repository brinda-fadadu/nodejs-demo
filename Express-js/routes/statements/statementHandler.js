const models = require('../../models')
const { createStatement, getStatement, getStatementItems, getSaleTypes, checkoutStatement, getStatementPackages } = require('../../controllers/statement/createStatement')
const { updateStatement } = require('../../controllers/statement/updateStatement')
const { sendErrorResponse } = require('../../lib/errorResponse')
const { validateAgreementPersons, validateMultipleSameCoPurchasers } = require('./validatingAgreementPersons')
const { getRoleIdsForStatements } = require('../../lib/util')
const _ = require('underscore')
const logger = require('../../lib/logger')

async function createStatementHandler (req, res, next) {
    try {
        const agreementPersonIds = req.body.agreementPersons.map(e => {
            return e.personId
        })
        let rolesObj = await getRoleIdsForStatements()
        await validateMultipleSameCoPurchasers(req.body.agreementPersons, rolesObj['Co-purchaser']) // to check if there are same co purchasers
        await validateAgreementPersons(agreementPersonIds) // to validate if the agreementPerson in the req body exist and are verified
        const data = {
            ...req.body,
            userId: req.currentUser.id
        }
        const result = await createStatement(data)
        res.status(201).send({
            ...result
        })
    } catch (err) {
        sendErrorResponse(err, res)
    }
}

async function getStatementHandler (req, res, next) {
    try {
        const query = {
            id: req.params.statementId
        }
        const result = await getStatement(query)
        res.status(200).send(result)
    } catch (err) {
        sendErrorResponse(err, res)
    }
}

async function putStatementHandler (req, res, next) {
    let t
    try {
        const statement = await models.Statement.findOne({
            where: {
                id: req.params.statementId
            }
        })
        if (statement) {
            const agreementPersonIds = req.body.agreementPersons.map(e => {
                return e.personId
            })
            const data = req.body
            data.statementId = req.params.statementId
            data.userId = req.currentUser.id
            let rolesObj = await getRoleIdsForStatements()
            let beneficiaryRoleId = rolesObj['Beneficiary']
            if (data.agreementType === 'funeral') {
                delete rolesObj['Beneficiary']
            }

            let roleIds = Object.entries(rolesObj).map(e => {
                return e[1]
            })
            let deleted = _.filter(data.agreementPersons, (e) => {
                return e.isDeleted && roleIds.includes(e.roleId) && e.primaryAgreementPerson === false
            })
            let toDeleteIds = _.pluck(deleted, 'personId')
            const insertPersons = _.filter(data.agreementPersons, (e) => {
                return !e.id && !e.isDeleted
            })
            const updatePersons = _.filter(data.agreementPersons, (e) => {
                return e.id && e.roleId !== beneficiaryRoleId && !e.isDeleted
            })

            const toUpdateIds = _.pluck(updatePersons, 'id')
            t = await models.sequelize.transaction()
            await validateAgreementPersons(agreementPersonIds, t) // to validate if the agreementPerson in the req body exist and are verified
            await validateMultipleSameCoPurchasers(req.body.agreementPersons, rolesObj['Co-purchaser']) // to check if there are same co purchasers
            const result = await updateStatement(data, toDeleteIds, insertPersons, toUpdateIds, updatePersons, t)
            await t.commit()
            res.status(201).send({
                result
            })
        } else {
            res.status(400).send({ message: 'STATEMENT_NOT_FOUND' })
        }
    } catch (err) {
        await t.rollback()
        sendErrorResponse(err, res)
    }
}

async function getStatementItemsHanlder (req, res, next) {
    try {
        const params = req.params
        const outcome = getStatementItems(params)
        const statementPackages = getStatementPackages(params.statementId)
        const result = await Promise.all([statementPackages, outcome])
        res.status(200).send({
            sumOfPropertiesAndItems: result[1].sumOfPropertiesAndItems,
            statementItems: result[1].result,
            statementPackages: result[0]
        })
    } catch (err) {
        logger.log('error', err)
        sendErrorResponse(err, res)
    }
}

async function addOrRemovePackageHandler (req, res, next) {
    const t = await models.sequelize.transaction()
    try {
        const action = req.params.action
        const data = req.body
        let result
        data.userId = req.currentUser.id
        data.statementId = req.params.statementId
        if (action === 'add') {
            result = await models.StatementPackage.addPackage(data, t)
        } else {
            result = await models.StatementPackage.removePackage(data, t)
        }
        await t.commit()
        res.status(201).send(result)
    } catch (err) {
        logger.log('error', err)
        t.rollback()
    }
}
async function getsaleTypesHandler (req, res, next) {
    try {
        const onePortalId = req.params.onePortalId
        const agreementType = req.query.agreementType
        const result = await getSaleTypes(onePortalId, agreementType)
        res.status(200).send({
            saleTypes: result
        })
    } catch (err) {
        sendErrorResponse(err, res)
    }
}

async function addOrRemoveItemsHandler (req, res, next) {
    let t
    try {
        t = await models.sequelize.transaction()
        const action = req.params.action
        const data = req.body
        let result
        data.userId = req.currentUser.id
        data.statementId = req.params.statementId
        if (action === 'add') {
            result = await models.StatementLocationItem.addLocationItem(data, t)
        } else {
            result = await models.StatementLocationItem.removeLocationItem(data, t)
        }
        t.commit()
        res.status(201).send(result)
    } catch (err) {
        t.rollback()
        sendErrorResponse(err, res)
    }
}

async function checkoutStatementHandler (req, res, next) {
    try {
        const data = req.params
        data.personId = req.body.personId
        data.userId = req.currentUser.id
        const result = await checkoutStatement(data)
        res.status(200).send(result)
    } catch (err) {
        sendErrorResponse(err, res)
    }
}

module.exports = {
    createStatementHandler,
    getStatementHandler,
    putStatementHandler,
    getStatementItemsHanlder,
    addOrRemovePackageHandler,
    getsaleTypesHandler,
    addOrRemoveItemsHandler,
    checkoutStatementHandler
}
