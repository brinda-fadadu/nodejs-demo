const BaseWorker = require('./base_worker')
const QueueName = require('./QueueName')
const {
    Form,
    CaseInfoForm
} = require('../models')
const docuSignFormSender = require('../controllers/forms/docuSignFormSender')
const logger = require('../lib/logger')

class DocuSignWorker extends BaseWorker {
    getQueueName () {
        return QueueName.docusign_queue
    }
}

const docuSignWorker = new DocuSignWorker()

docuSignWorker.processJobs(async (job, done) => {
    const data = job.data

    try {
        const caseInfoForm = await CaseInfoForm.findByPk(data.id, {
            include: [ Form ]
        })

        const result = await docuSignFormSender.send(caseInfoForm.Form, caseInfoForm, 'sent')
        done(null, { envelopeId: result.envelopeId, id: caseInfoForm.id })
    } catch (e) {
        logger.error(e)
        done(e)
    }
})

module.exports = docuSignWorker
