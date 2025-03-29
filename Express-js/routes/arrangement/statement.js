const createStatementController = require('../../controllers/statement/createStatement')
const getStatementController = require('../../controllers/statement/getStatement')
const listStatementsController = require('../../controllers/statement/listStatements')
const models = require('../../models')
const sendResponse = require('../../lib/custom-response')
const { sendErrorResponse } = require('../../lib/errorResponse')

async function create (req, res, next) {
    const t = await models.sequelize.transaction()

    try {
        const statement = await createStatementController.createStatement(
            req.currentUser.id,
            req.params.arrangementId,
            req.body,
            t
        )

        await t.commit()
        await statement.getStatementItems()
        res.status(201).json({ success: true, statement: statement })
    } catch (error) {
        await t.rollback()
        sendErrorResponse(error, res)
    }
}

async function get (req, res, next) {
    try {
        const result = await getStatementController.getStatement(
            req.params.arrangementId,
            req.params.statementId
        )

        sendResponse(200, result, res)
    } catch (error) {
        sendErrorResponse(error, res)
    }
}

async function list (req, res, next) {
    try {
        const result = await listStatementsController.listStatements(
            req.params.arrangementId
        )

        sendResponse(200, result, res)
    } catch (error) {
        sendErrorResponse(error, res)
    }
}

module.exports = {
    create,
    get,
    list
}
