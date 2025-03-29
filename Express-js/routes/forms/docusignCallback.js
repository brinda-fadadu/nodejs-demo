const logger = require('../../lib/logger')
const models = require('../../models')
const { queueNames, queues } = require('../../appQueues')

async function callbackHandler (req, res, next) {
    logger.info(`Just came into callback api`)
    try {
        logger.info(`started try block of callback api`)
        const docusignEmailWorker = queues[queueNames.docusign_email_queue]
        const docusignCompletedEmailWorker = queues[queueNames.docusign_completed_email_queue]
        const docusignAutomaticEmailWorker = queues[queueNames.docusign_automatic_email_queue]
        const envelopStatus = (req.body && req.body.DocuSignEnvelopeInformation && req.body.DocuSignEnvelopeInformation.EnvelopeStatus) ? req.body.DocuSignEnvelopeInformation.EnvelopeStatus : ''

        if (!envelopStatus || envelopStatus === '') {
            logger.info(`Invalid Docusign Callback, request body required, returned with 422`)
            return res.send('Invalid Docusign Callback, request body required').status(422)
        }

        const caseInfoForm = await models.CaseInfoForm.findOne({
            where: { envelopeId: envelopStatus.EnvelopeID },
            attributes: ['id', 'status', 'envelopeId', 'createdBy']
        })
        if (caseInfoForm) {
            if (caseInfoForm && envelopStatus.Status !== 'Sent') {
                caseInfoForm.status = envelopStatus.Status
                await caseInfoForm.save()
            }
            let recipientStatuses = []
            if (Array.isArray(envelopStatus.RecipientStatuses.RecipientStatus)) {
                recipientStatuses = envelopStatus.RecipientStatuses.RecipientStatus.filter(r => { return r.Type === 'Signer' })
            } else {
                recipientStatuses.push(envelopStatus.RecipientStatuses.RecipientStatus)
            }

            if (recipientStatuses.length) {
                await Promise.all(recipientStatuses.map(async (s) => {
                    if (!['Created', 'Delivered'].includes(s.Status)) {
                        await models.CaseInfoFormRecipient.update(
                            {
                                status: s.Status
                            },
                            {
                                where: { caseInfoFormId: caseInfoForm.id, docusignClientUserId: s.ClientUserId }
                            }
                        )
                    }
                }))
                // Job for sending email after each recipient has signed the document
                const dataToSend = { caseInfoForm, recipientStatuses }
                docusignEmailWorker.add('docusignEmailWorker', dataToSend)

                // Job for sending email after the document signing is completed by all signers
                if (caseInfoForm.status.toLowerCase() === 'completed') {
                    docusignCompletedEmailWorker.add('docusignCompletedEmailWorker', { caseInfoForm })
                }

                // Job for sending mail to the next recipient automatically after 5 mins
                docusignAutomaticEmailWorker.add('docusignAutomaticEmailWorker', dataToSend, {
                    delay: 300 * 1000
                })

                logger.info(`Docusign webhook returned with 200 and got success ${envelopStatus.EnvelopeID}`)
                res.status(200).json({ ok: true })
            } else {
                logger.info(`Caseinfoform recipients not found OR Docusign did not sent reciepient and their statuses for ${envelopStatus.EnvelopeID}`)
                res.status(200).json({ message: `Caseinfoform recipients not found OR Docusign did not sent reciepient and their statuses for ${envelopStatus.EnvelopeID}` })
            }
        } else {
            logger.info(`Caseinfoform not found for ${envelopStatus.EnvelopeID} In ${process.env.NODE_ENV} Environment. Docusign webhook returned with success in else case`)
            res.status(200).json({ message: `caseinfoform not found for ${envelopStatus.EnvelopeID}` }) // sending 200 because: may be the form sent from QA env. if we put 400 docusign retries for it.
        }
    } catch (err) {
        logger.error(err)
        logger.info(`Docusign webhook failed and retured with error, ${err}`)
        res.status(400)
    }
}

module.exports = callbackHandler
