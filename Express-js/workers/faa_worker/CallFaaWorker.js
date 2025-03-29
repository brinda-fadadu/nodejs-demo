const { CallSendInvitation } = require('../../lib/FamilyAdvisorAssistant')
const CremationSyncController = require('../../controllers/refactorControllers/familyPortalController/cremationSyncController')
const BaseWorker = require('../base_worker')
const QueueName = require('../QueueName')

class CallFaaWorker extends BaseWorker {
    getQueueName () {
        return QueueName.faa_queue
    }
}

const faaWorker = new CallFaaWorker()
faaWorker.processJobs(async (job, done) => {
    try {
        switch (job.data.faaWorker_event) {
        case 'sendInvitation':
            await CallSendInvitation.sendInvitation(job.data)
            done(null, { success: true })
            break
        case 'syncCremationData':
            const cremationController = new CremationSyncController(job.data.personId)
            await cremationController.updateCremationServices()
            done(null, { success: true })
            break
        case 'default':
            console.log('Default case')
            break
        }
    } catch (error) {
        done(error)
    }
})

module.exports = faaWorker
