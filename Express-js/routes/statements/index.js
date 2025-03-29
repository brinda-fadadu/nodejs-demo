const router = require('express').Router()

// validations
const { agreementPerson, validateQueryParams, validateRouteParams } = require('../../lib/validations/agreementPersons/create')
const { createStatement, validateSaleType } = require('../../lib/validations/statement/create')
const { validateEditReqBody } = require('../../lib/validations/statement/editStatement')
const { validateReqBody } = require('../../lib/validations/statement/addItemsToStatement')
const { validateManageProperties } = require('../../lib/validations/statement/manageProperties')

// api handlers
const authentication = require('../../middleware/authentication')
const agreementPersonHandler = require('./agreementPersonHandler')
const { createStatementHandler,
    getStatementHandler,
    putStatementHandler,
    getsaleTypesHandler,
    getStatementItemsHanlder,
    addOrRemovePackageHandler,
    checkoutStatementHandler,
    addOrRemoveItemsHandler } = require('./statementHandler')
const { addItemsToStatement } = require('./items/statementItemsHandler')

const propertyHandler = require('./propertiesHandler')

router.use(authentication)
router.post('/', createStatement, createStatementHandler)
router.get('/:onePortalId/saleTypes', validateSaleType, getsaleTypesHandler)
router.get('/:statementId', getStatementHandler)
router.put('/:statementId', validateEditReqBody, putStatementHandler)
router.post('/:statementId/agreementPersons', agreementPerson, agreementPersonHandler.create)
// NOTE: we are not using the below route any where
router.get('/:statementId/agreementPersons', validateRouteParams, validateQueryParams, agreementPersonHandler.list)
router.get('/:statementId/payors', validateRouteParams, validateQueryParams, agreementPersonHandler.getPayors)
router.delete('/:statementId/payors/:agreementPersonId', validateRouteParams, agreementPersonHandler.deletePayor)
router.post('/:statementId/properties', validateManageProperties, propertyHandler.manageReservations)
router.get('/:statementId/properties', validateRouteParams, propertyHandler.getProperties)

// statement items related API's

router.put('/:statementId/packages/:action', addOrRemovePackageHandler)
router.put('/:statementId/items', validateReqBody, addItemsToStatement)
router.put('/:statementId/checkout', checkoutStatementHandler)
router.get('/:statementId/items', getStatementItemsHanlder)
router.put('/:statementId/items/:action', addOrRemoveItemsHandler)

module.exports = router
