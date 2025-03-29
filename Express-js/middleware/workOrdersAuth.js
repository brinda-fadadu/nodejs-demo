const WorkOrderController = require('../controllers/refactorControllers/workOrderController/workOrderController')

async function createOrUpdateWorkOrdersAuth (req, res, next) {
    try {
        const workOrderDetails = await WorkOrderController.getWorkOrderDetails(req.params.workOrderId)
        if (workOrderDetails.resourceType === 'ScheduledFuneralService' && req.body.serviceType === 'Funeral') {
          req.module = 'Funeral_WorkOrders'
        } else if (workOrderDetails.resourceType === 'ScheduledCemeteryService' && req.body.serviceType === 'Cemetry') {
          req.module = 'Cemetery_WorkOrders'
        }
        next()
    } catch (error) {
        next(error)
    }
}

module.exports = {
    createOrUpdateWorkOrdersAuth
}
