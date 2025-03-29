const express = require('express')
const router = express.Router({ mergeParams: true })
const authentication = require('../../../middleware/authentication')

// Validations
const { personIdValidation } = require('../../../lib/validations/personIdValidation')
const { funeralArrangementDetailsValidation, scheduledFuneralServiceValidaton, createOrUpdateScheduledFuneralServiceValidator, createOrUpdateScheduledCemeteryServiceValidator, scheduledCemeteryServiceValidaton, updateScheduledDateTimeValidator } = require('../../../lib/validations/scheduling/scheduling')

// Handlers
const { getFuneralArrangementDetails, getSchedulableServices, getScheduledFuneralServiceDetails, createOrUpdateScheduledFuneralService, createOrUpdateScheduledCemeteryService, getScheduledCemeteryServiceDetails, getConsumedProperties, getTemporaryProperties, updateScheduledDateTime, getMiscSalesDetails } = require('../../scheduling/scheduling')

const roleBasedAccess = require('../../../middleware/roleAuth')
const { cemeterySchedulingAuth } = require('../../../middleware/cemeterySchedulingAuth')

router.use(authentication)

router.get('/schedulable-services', personIdValidation, getSchedulableServices)
router.get('/card-display', getMiscSalesDetails)

// Scheduling cemetery APIs
const cemeterySchedRouter = express.Router({ mergeParams: true })
router.use('/cemetery', cemeterySchedulingAuth, roleBasedAccess(), cemeterySchedRouter)
cemeterySchedRouter.get('/get-funeral-arrangement-details', personIdValidation, funeralArrangementDetailsValidation, getFuneralArrangementDetails)
cemeterySchedRouter.get('/fetch-properties', getConsumedProperties)
cemeterySchedRouter.get('/fetch-temporary-properties', getTemporaryProperties)
cemeterySchedRouter.get('/:scheduledCemeteryServiceId', scheduledCemeteryServiceValidaton, getScheduledCemeteryServiceDetails)
cemeterySchedRouter.put('/', createOrUpdateScheduledCemeteryServiceValidator, createOrUpdateScheduledCemeteryService)

router.use(cemeterySchedulingAuth, roleBasedAccess())
// Scheduling funeral APIs
router.get('/funeral/:scheduledFuneralServiceId', scheduledFuneralServiceValidaton, getScheduledFuneralServiceDetails)
router.put('/funeral', createOrUpdateScheduledFuneralServiceValidator, createOrUpdateScheduledFuneralService)
router.put('/scheduled-datetime', updateScheduledDateTimeValidator, updateScheduledDateTime)

module.exports = router
