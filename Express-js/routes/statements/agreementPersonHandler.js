const {
    agreementPersonCreate,
    agreementPersonsByAgreement,
    agreementPersonsByPayors,
    getResponseBody,
    deleteAgreementPayor
} = require('../../controllers/agreementPerson')
const { sendErrorResponse } = require('../../lib/errorResponse')
const { validatePersonAndStatement } = require('../../utils/commonCreateAndUpdate')
const logger = require('../../lib/logger')

async function create (req, res, next) {
    try {
        const data = {
            ...req.params,
            ...req.body,
            userId: req.currentUser.id
        }
        const statementValid = await validatePersonAndStatement(data.statementId)
        if (!statementValid) {
            throw new Error('INVALID_PERSON_STATEMENT')
        }
        const result = await agreementPersonCreate(data)
        data.id = result.id
        data.personId = result.personId
        res.status(201).send(data)
    } catch (err) {
        logger.log('error', err)
        sendErrorResponse(err, res)
    }
}

async function list (req, res, next) {
    try {
        const data = {
            ...req.params,
            ...req.query
        }
        const result = await agreementPersonsByAgreement(data)
        const agreementPersons = await getResponseBody(result.rows)
        res.status(200).send({
            total: result.count,
            agreementPersons
        })
    } catch (err) {
        logger.log('error', err)
        sendErrorResponse(err, res)
    }
}

async function getPayors (req, res, next) {
    try {
        const data = {
            ...req.params,
            ...req.query
        }
        const result = await agreementPersonsByPayors(data)
        res.status(200).send({
            payors: result
        })
    } catch (err) {
        sendErrorResponse(err, res)
    }
}

async function deletePayor (req, res, next) {
    try {
        const data = {
            ...req.params,
            userId: req.currentUser.id
        }
        const result = await deleteAgreementPayor(data)
        if (result) {
            res.status(200).send({
                id: req.params.agreementPersonId,
                status: true
            })
        } else {
            throw new Error('SOMETHING_WENT_WRONG')
        }
    } catch (err) {
        sendErrorResponse(err, res)
    }
}

module.exports = {
    create,
    list,
    getPayors,
    deletePayor
}
