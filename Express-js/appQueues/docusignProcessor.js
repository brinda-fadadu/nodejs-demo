const models = require('../models')
const logger = require('../lib/logger')
const Email = require('../lib/Emailer/core')
const FormController = require('../controllers/refactorControllers/formsController/formsController')
const { docuSignClient } = require('../services').docusign
const moment = require('moment')
const _ = require('lodash')
const Op = require('sequelize').Op
const fs = require('fs')
const util = require('util')
const { isTableExist } = require('../controllers/refactorControllers/utils')
const realpath = util.promisify(fs.realpath)
const unlink = util.promisify(fs.unlink)

async function processRecepients (caseInfoForm, docusignResult, signerRecipients, carbonCopyRecipients, result, done) {
    const signersResult = caseInfoForm.recipients.filter(recipient => recipient.availableInPerson === false)
    signersResult.map(srecipient => {
        const recipientDetails = caseInfoForm.recipients.find(r => r.id === srecipient.id)
        const envelopeRecipientSigners = docusignResult.caseInfoFormRecipientData ? (docusignResult.caseInfoFormRecipientData.signers ? docusignResult.caseInfoFormRecipientData.signers : []) : []
        const envelopeRecipientCarbonCopy = docusignResult.caseInfoFormRecipientData ? (docusignResult.caseInfoFormRecipientData.carbonCopies ? docusignResult.caseInfoFormRecipientData.carbonCopies : []) : []
        const recipientIdGuidFromDocusignToUpdate = envelopeRecipientSigners.find(envelopeRecipientSigner => envelopeRecipientSigner.roleName === recipientDetails.recipientRole.docusignRole)
        const recipientIdGuidFromDocusignToUpdateCarbonCopy = envelopeRecipientCarbonCopy.find(envelopeRecipientSigner => envelopeRecipientSigner.roleName === recipientDetails.recipientRole.docusignRole)
        const recipientNameDetails = recipientDetails.employee ||
            (recipientDetails.personContact ? recipientDetails.personContact.person : '') ||
            recipientDetails.otherRecipient ||
            (recipientDetails.agreementPerson ? recipientDetails.agreementPerson.person : '') ||
            (recipientDetails.agreementPropertyOwner ? recipientDetails.agreementPropertyOwner.person : '') ||
            (recipientDetails.certifier ? recipientDetails.certifier.certifierPerson : '') ||
            (recipientDetails.formRecipientRoleCarboncopyEmail ? { email: recipientDetails.formRecipientRoleCarboncopyEmail.email, name: recipientDetails.recipientRole.docusignRole } : '')

        let name = recipientNameDetails.name
        if (!name) {
            name = [recipientNameDetails.firstName, recipientNameDetails.middleName, recipientNameDetails.lastName].join(' ').trim()
        }
        if (recipientIdGuidFromDocusignToUpdate) {
            signerRecipients.push({
                email: recipientNameDetails.email,
                name: name,
                recipientId: recipientIdGuidFromDocusignToUpdate.recipientId,
                recipientIdGuid: recipientIdGuidFromDocusignToUpdate.recipientIdGuid,
                roleName: recipientDetails.recipientRole.docusignRole,
                status: 'created'
            })
        }
        if (recipientIdGuidFromDocusignToUpdateCarbonCopy) {
            carbonCopyRecipients.push({
                email: recipientNameDetails.email,
                recipientId: recipientIdGuidFromDocusignToUpdateCarbonCopy.recipientId,
                recipientIdGuid: recipientIdGuidFromDocusignToUpdateCarbonCopy.recipientIdGuid,
                roleName: recipientDetails.recipientRole.docusignRole,
                status: 'created'
            })
        }
    })

    // step: 3 update recipients(in person signers) of envelope in Docusign based on recipientId and recipientIdGuid
    // inPersonRecipients array of inperson signing
    const updateRecipientsResult = await docuSignClient.updatingRecipientsInDocusign(docusignResult.createdEnvelopeResult.envelopeId, { inPersonSigners: null, signers: signerRecipients, carbonCopies: carbonCopyRecipients })

    if (updateRecipientsResult && updateRecipientsResult.recipientUpdateResults && updateRecipientsResult.recipientUpdateResults.length) {
        const recipientsToDelete = docusignResult.caseInfoFormRecipientData.signers.filter(comparer(caseInfoForm.recipients.map(r => r.recipientRole)))
        const carbonCopyToDelete = docusignResult.caseInfoFormRecipientData.carbonCopies.filter(r => r.roleName === 'EmbalmingTeam' && r.email === '')
        let input = []
        if (recipientsToDelete && recipientsToDelete.length && recipientsToDelete[0].name !== 'Crematory Operator') {
            recipientsToDelete.map(r => { input.push({ recipientId: r.recipientId }) })
            const deletedResult = await docuSignClient.deleteRecipientsInDocusign(docusignResult.createdEnvelopeResult.envelopeId, { 'signers': input })
            if (deletedResult && deletedResult.signers && (deletedResult.signers.length === input.length)) {
                // step:4 update envelope status as 'sent' to send emails to host(in person) and other recipients(signers)
                result = await docuSignClient.updatingStatusOfEnvelopeInDocusign(docusignResult.createdEnvelopeResult.envelopeId, { status: 'sent' })

                // updating status in caseInfoForm and caseInfoFormRecipient tables.
                await models.CaseInfoForm.update({
                    status: 'sent',
                    envelopeId: docusignResult.createdEnvelopeResult.envelopeId
                }, {
                    where: { id: caseInfoForm.id }
                })

                await models.CaseInfoFormRecipient.update({
                    status: 'sent'
                }, {
                    where: { caseInfoFormId: caseInfoForm.id }
                })
                result.envelopeId = docusignResult.createdEnvelopeResult.envelopeId
                logger.info(`Done job #' + ${JSON.stringify(job.id)} + ' ----> ' + ${JSON.stringify(job.data.id)}`)
                done(null, { envelopeId: result.envelopeId, id: caseInfoForm.id })
            } else {
                logger.error(e)
                done(e)
            }
        } else if (carbonCopyToDelete && carbonCopyToDelete.length) {
            let carbonCopyInput = []
            carbonCopyToDelete.map(r => {
                carbonCopyInput.push({ recipientId: r.recipientId })
            })
            const deletedResult = await docuSignClient.deleteRecipientsInDocusign(docusignResult.createdEnvelopeResult.envelopeId, { 'signers': carbonCopyInput })
            if (deletedResult && deletedResult.carbonCopies && (deletedResult.carbonCopies.length === carbonCopyInput.length)) {
                // step:4 update envelope status as 'sent' to send emails to host(in person) and other recipients(signers)
                result = await docuSignClient.updatingStatusOfEnvelopeInDocusign(docusignResult.createdEnvelopeResult.envelopeId, { status: 'sent' })

                // updating status in caseInfoForm and caseInfoFormRecipient tables.
                await models.CaseInfoForm.update({
                    status: 'sent',
                    envelopeId: docusignResult.createdEnvelopeResult.envelopeId
                }, {
                    where: { id: caseInfoForm.id }
                })

                await models.CaseInfoFormRecipient.update({
                    status: 'sent'
                }, {
                    where: { caseInfoFormId: caseInfoForm.id }
                })
                result.envelopeId = docusignResult.createdEnvelopeResult.envelopeId
                logger.info(`Done job #' + ${JSON.stringify(job.id)} + ' ----> ' + ${JSON.stringify(job.data.id)}`)
                done(null, { envelopeId: result.envelopeId, id: caseInfoForm.id })
            } else {
                logger.error(e)
                done(e)
            }
        } else {
            result = await docuSignClient.updatingStatusOfEnvelopeInDocusign(docusignResult.createdEnvelopeResult.envelopeId, { status: 'sent' })

            // updating status in caseInfoForm and caseInfoFormRecipient tables.
            await models.CaseInfoForm.update({
                status: 'sent',
                envelopeId: docusignResult.createdEnvelopeResult.envelopeId
            }, {
                where: { id: caseInfoForm.id }
            })

            await models.CaseInfoFormRecipient.update({
                status: 'sent'
            }, {
                where: { caseInfoFormId: caseInfoForm.id }
            })
            result.envelopeId = docusignResult.createdEnvelopeResult.envelopeId
            logger.info(`Done job #' + ${JSON.stringify(job.id)} + ' ----> ' + ${JSON.stringify(job.data.id)}`)
            done(null, { envelopeId: result.envelopeId, id: caseInfoForm.id })
        }
    } else {
        logger.error(e)
        done(e)
    }
}

async function newSendForm (job, done) {
    logger.info(`Processing job #' + ${JSON.stringify(job.id)} + ' ----> ' + ${JSON.stringify(job.data.id)}`)
    try {
        const data = job.data
        let caseInfoForm = await models.CaseInfoForm.scope('form', 'recipients', 'personInfo').findByPk(data.id)
        const docusignResult = await FormController.sendFormToDocusignClient(caseInfoForm.form, caseInfoForm, 'created')
        let inavlidSigners = []
        let receipientsDelete = docusignResult.caseInfoFormRecipientData.signers.filter(comparer(caseInfoForm.recipients.map(r => r.recipientRole)))
        const carbonCopyToDelete = docusignResult.caseInfoFormRecipientData.carbonCopies.filter(r => r.roleName === 'EmbalmingTeam' && r.email === '')
        if (receipientsDelete && receipientsDelete.length > 0) {
            receipientsDelete.forEach(r => {
                inavlidSigners.push({ recipientId: r.recipientId })
            })
        }
        if (carbonCopyToDelete && carbonCopyToDelete.length > 0) {
            carbonCopyToDelete.forEach(r => {
                inavlidSigners.push({ recipientId: r.recipientId })
            })
        }
        if (inavlidSigners && inavlidSigners.length > 0) {
            try {
                await docuSignClient.deleteRecipientsInDocusign(docusignResult.createdEnvelopeResult.envelopeId, { 'signers': inavlidSigners })
            } catch (e) {
                logger.info(`Error job #' + ${JSON.stringify(job.id)} + ' ----> ' + ${JSON.stringify(job.data.id)}`)
                logger.error(e)
                done(e)
            }
        }
        logger.info(`Done job #' + ${JSON.stringify(job.id)} + ' ----> ' + ${JSON.stringify(job.data.id)}`)
        done(null, { envelopeId: caseInfoForm.envelopeId, id: caseInfoForm.id })
    } catch (e) {
        logger.error(e)
        done(e)
    }
}

function comparer (otherArray) {
    return function (current) {
        return otherArray.filter(function (other) {
            return other.docusignRole === current.roleName
        }).length === 0
    }
}

// old implementation and can be used for reff
async function sendForm (job, done) {
    logger.info(`Processing job #' + ${JSON.stringify(job.id)} + ' ----> ' + ${JSON.stringify(job.data.id)}`)
    try {
        const data = job.data
        const caseInfoForm = await models.CaseInfoForm.scope('form', 'recipients', 'personInfo').findByPk(data.id)
        const docusignResult = await FormController.sendFormToDocusignClient(caseInfoForm.form, caseInfoForm, 'created')
        // checking for in person signers
        const availableInPersonResult = caseInfoForm.recipients.filter(recipient => recipient.availableInPerson === true)
        let result
        if (availableInPersonResult.length) { // if in person signers available
            // step:1 Created envelope with created (created status envelopes avialable in draft tab at docusign web) status

            let inPersonRecipients = [] // in personRecipients which needs to update in docusign
            let signerRecipients = []
            let carbonCopyRecipients = []
            availableInPersonResult.map(recipient => {
                // step: 2(a) getting in person recipient
                const recipientDetails = caseInfoForm.recipients.find(r => r.id === recipient.id)
                // step: 2(b) getting envelope signer recipients from step 2
                const envelopeRecipientSigners = docusignResult.caseInfoFormRecipientData ? (docusignResult.caseInfoFormRecipientData.signers ? docusignResult.caseInfoFormRecipientData.signers : []) : []
                // step: 2(c) getting matching recipient from step: 2(a) and step: 2(b)
                const recipientIdGuidFromDocusignToUpdate = envelopeRecipientSigners.find(envelopeRecipientSigner => envelopeRecipientSigner.roleName === recipientDetails.recipientRole.docusignRole)
                const recipientNameDetails = recipientDetails.employee ||
                    (recipientDetails.personContact ? recipientDetails.personContact.person : '') ||
                    recipientDetails.otherRecipient ||
                    (recipientDetails.agreementPerson ? recipientDetails.agreementPerson.person : '') ||
                    (recipientDetails.agreementPropertyOwner ? recipientDetails.agreementPropertyOwner.person : '') ||
                    (recipientDetails.certifier ? recipientDetails.certifier.certifierPerson : '')

                let name = recipientNameDetails.name
                if (!name) {
                    name = [recipientNameDetails.firstName, recipientNameDetails.middleName, recipientNameDetails.lastName].join(' ').trim()
                }

                let hostEmail = recipient.inPersonHost.email // recipientDetails.createdByUser.email
                let hostName = recipient.inPersonHost.displayName // recipientDetails.createdByUser.name
                inPersonRecipients.push({
                    hostEmail: hostEmail,
                    hostName: hostName,
                    recipientId: recipientIdGuidFromDocusignToUpdate.recipientId,
                    recipientIdGuid: recipientIdGuidFromDocusignToUpdate.recipientIdGuid,
                    roleName: recipientDetails.recipientRole.docusignRole,
                    signerEmail: recipientNameDetails.email,
                    signerName: name,
                    status: 'created'
                })
            })

            const signersResult = caseInfoForm.recipients.filter(recipient => recipient.availableInPerson === false)
            signersResult.map(srecipient => {
                const recipientDetails = caseInfoForm.recipients.find(r => r.id === srecipient.id)
                const envelopeRecipientSigners = docusignResult.caseInfoFormRecipientData ? (docusignResult.caseInfoFormRecipientData.signers ? docusignResult.caseInfoFormRecipientData.signers : []) : []
                const envelopeRecipientCarbonCopy = docusignResult.caseInfoFormRecipientData ? (docusignResult.caseInfoFormRecipientData.carbonCopies ? docusignResult.caseInfoFormRecipientData.carbonCopies : []) : []
                const recipientIdGuidFromDocusignToUpdate = envelopeRecipientSigners.find(envelopeRecipientSigner => envelopeRecipientSigner.roleName === recipientDetails.recipientRole.docusignRole)
                const recipientIdGuidFromDocusignToUpdateCarbonCopy = envelopeRecipientCarbonCopy.find(envelopeRecipientSigner => envelopeRecipientSigner.roleName === recipientDetails.recipientRole.docusignRole)
                const recipientNameDetails = recipientDetails.employee ||
                    (recipientDetails.personContact ? recipientDetails.personContact.person : '') ||
                    recipientDetails.otherRecipient ||
                    (recipientDetails.agreementPerson ? recipientDetails.agreementPerson.person : '') ||
                    (recipientDetails.agreementPropertyOwner ? recipientDetails.agreementPropertyOwner.person : '') ||
                    (recipientDetails.certifier ? recipientDetails.certifier.certifierPerson : '') ||
                    (recipientDetails.formRecipientRoleCarboncopyEmail ? { email: recipientDetails.formRecipientRoleCarboncopyEmail.email, name: recipientDetails.recipientRole.docusignRole } : '')

                let name = recipientNameDetails.name
                if (!name) {
                    name = [recipientNameDetails.firstName, recipientNameDetails.middleName, recipientNameDetails.lastName].join(' ').trim()
                }
                if (recipientIdGuidFromDocusignToUpdate) {
                    signerRecipients.push({
                        email: recipientNameDetails.email,
                        name: name,
                        recipientId: recipientIdGuidFromDocusignToUpdate.recipientId,
                        recipientIdGuid: recipientIdGuidFromDocusignToUpdate.recipientIdGuid,
                        roleName: recipientDetails.recipientRole.docusignRole,
                        status: 'created'
                    })
                }
                if (recipientIdGuidFromDocusignToUpdateCarbonCopy) {
                    carbonCopyRecipients.push({
                        email: recipientNameDetails.email,
                        recipientId: recipientIdGuidFromDocusignToUpdateCarbonCopy.recipientId,
                        recipientIdGuid: recipientIdGuidFromDocusignToUpdateCarbonCopy.recipientIdGuid,
                        roleName: recipientDetails.recipientRole.docusignRole,
                        status: 'created'
                    })
                }
            })

            // step: 3 update recipients(in person signers) of envelope in Docusign based on recipientId and recipientIdGuid
            const updateRecipientsResult = await docuSignClient.updatingRecipientsInDocusign(docusignResult.createdEnvelopeResult.envelopeId, { inPersonSigners: inPersonRecipients, signers: signerRecipients, carbonCopies: carbonCopyRecipients })

            if (updateRecipientsResult && updateRecipientsResult.recipientUpdateResults && updateRecipientsResult.recipientUpdateResults.length) {
                const recipientsToDelete = docusignResult.caseInfoFormRecipientData.signers.filter(comparer(caseInfoForm.recipients.map(r => r.recipientRole)))
                const carbonCopyToDelete = docusignResult.caseInfoFormRecipientData.carbonCopies.filter(r => r.roleName === 'EmbalmingTeam' && r.email === '')
                let input = []
                if (recipientsToDelete && recipientsToDelete.length && recipientsToDelete[0].name !== 'Crematory Operator') {
                    recipientsToDelete.map(r => { input.push({ recipientId: r.recipientId }) })
                    const deletedResult = await docuSignClient.deleteRecipientsInDocusign(docusignResult.createdEnvelopeResult.envelopeId, { 'signers': input })
                    if (deletedResult && deletedResult.signers && (deletedResult.signers.length === input.length)) {
                        // step:4 update envelope status as 'sent' to send emails to host(in person) and other recipients(signers)
                        result = await docuSignClient.updatingStatusOfEnvelopeInDocusign(docusignResult.createdEnvelopeResult.envelopeId, { status: 'sent' })

                        // updating status in caseInfoForm and caseInfoFormRecipient tables.
                        await models.CaseInfoForm.update({
                            status: 'sent',
                            envelopeId: docusignResult.createdEnvelopeResult.envelopeId
                        }, {
                            where: { id: caseInfoForm.id }
                        })

                        await models.CaseInfoFormRecipient.update({
                            status: 'sent'
                        }, {
                            where: { caseInfoFormId: caseInfoForm.id }
                        })
                        result.envelopeId = docusignResult.createdEnvelopeResult.envelopeId
                        logger.info(`Done job #' + ${JSON.stringify(job.id)} + ' ----> ' + ${JSON.stringify(job.data.id)}`)
                        done(null, { envelopeId: result.envelopeId, id: caseInfoForm.id })
                    } else {
                        logger.error(e)
                        done(e)
                    }
                } else if (carbonCopyToDelete && carbonCopyToDelete.length) {
                    let carbonCopyInput = []
                    carbonCopyToDelete.map(r => {
                        carbonCopyInput.push({ recipientId: r.recipientId })
                    })
                    const deletedResult = await docuSignClient.deleteRecipientsInDocusign(docusignResult.createdEnvelopeResult.envelopeId, { 'signers': carbonCopyInput })
                    if (deletedResult && deletedResult.carbonCopies && (deletedResult.carbonCopies.length === carbonCopyInput.length)) {
                        // step:4 update envelope status as 'sent' to send emails to host(in person) and other recipients(signers)
                        result = await docuSignClient.updatingStatusOfEnvelopeInDocusign(docusignResult.createdEnvelopeResult.envelopeId, { status: 'sent' })

                        // updating status in caseInfoForm and caseInfoFormRecipient tables.
                        await models.CaseInfoForm.update({
                            status: 'sent',
                            envelopeId: docusignResult.createdEnvelopeResult.envelopeId
                        }, {
                            where: { id: caseInfoForm.id }
                        })

                        await models.CaseInfoFormRecipient.update({
                            status: 'sent'
                        }, {
                            where: { caseInfoFormId: caseInfoForm.id }
                        })
                        result.envelopeId = docusignResult.createdEnvelopeResult.envelopeId
                        logger.info(`Done job #' + ${JSON.stringify(job.id)} + ' ----> ' + ${JSON.stringify(job.data.id)}`)
                        done(null, { envelopeId: result.envelopeId, id: caseInfoForm.id })
                    } else {
                        logger.error(e)
                        done(e)
                    }
                } else {
                    result = await docuSignClient.updatingStatusOfEnvelopeInDocusign(docusignResult.createdEnvelopeResult.envelopeId, { status: 'sent' })

                    // updating status in caseInfoForm and caseInfoFormRecipient tables.
                    await models.CaseInfoForm.update({
                        status: 'sent',
                        envelopeId: docusignResult.createdEnvelopeResult.envelopeId
                    }, {
                        where: { id: caseInfoForm.id }
                    })

                    await models.CaseInfoFormRecipient.update({
                        status: 'sent'
                    }, {
                        where: { caseInfoFormId: caseInfoForm.id }
                    })
                    result.envelopeId = docusignResult.createdEnvelopeResult.envelopeId
                    logger.info(`Done job #' + ${JSON.stringify(job.id)} + ' ----> ' + ${JSON.stringify(job.data.id)}`)
                    done(null, { envelopeId: result.envelopeId, id: caseInfoForm.id })
                }
            } else {
                logger.error(e)
                done(e)
            }
        } else {
            const carbonCopyToDelete = docusignResult.caseInfoFormRecipientData.carbonCopies.filter(r => r.roleName === 'EmbalmingTeam' && r.email === '')
            if (carbonCopyToDelete && carbonCopyToDelete.length) {
                let carbonCopyInput = []
                carbonCopyToDelete.map(r => {
                    carbonCopyInput.push({ recipientId: r.recipientId })
                })
                const deletedResult = await docuSignClient.deleteRecipientsInDocusign(docusignResult.createdEnvelopeResult.envelopeId, { 'signers': carbonCopyInput })
                if (deletedResult && deletedResult.carbonCopies && (deletedResult.carbonCopies.length === carbonCopyInput.length)) {
                    // step:4 update envelope status as 'sent' to send emails to host(in person) and other recipients(signers)
                    result = await docuSignClient.updatingStatusOfEnvelopeInDocusign(docusignResult.createdEnvelopeResult.envelopeId, { status: 'sent' })

                    // updating status in caseInfoForm and caseInfoFormRecipient tables.
                    await models.CaseInfoForm.update({
                        status: 'sent',
                        envelopeId: docusignResult.createdEnvelopeResult.envelopeId
                    }, {
                        where: { id: caseInfoForm.id }
                    })

                    await models.CaseInfoFormRecipient.update({
                        status: 'sent'
                    }, {
                        where: { caseInfoFormId: caseInfoForm.id }
                    })
                    result.envelopeId = docusignResult.createdEnvelopeResult.envelopeId
                    logger.info(`Done job #' + ${JSON.stringify(job.id)} + ' ----> ' + ${JSON.stringify(job.data.id)}`)
                    done(null, { envelopeId: result.envelopeId, id: caseInfoForm.id })
                } else {
                    logger.error(e)
                    done(e)
                }
            } else {
                if (docusignResult.conditionForDocusignProcessorObj.conditionForDocusignProcessor === false) {
                    logger.info(`Done job #' + ${JSON.stringify(job.id)} + ' ----> ' + ${JSON.stringify(job.data.id)}`)
                    done(null, { envelopeId: docusignResult.createdEnvelopeResult.envelopeId, id: caseInfoForm.id })
                } else {
                    // no in person signers in caseInfoFormRecipient then we will directly sending envelope to given recipients.
                    result = await FormController.sendFormToDocusignClient(caseInfoForm.form, caseInfoForm, 'sent')
                    logger.info(`Done job #' + ${JSON.stringify(job.id)} + ' ----> ' + ${JSON.stringify(job.data.id)}`)
                    done(null, { envelopeId: result.createdEnvelopeResult.envelopeId, id: caseInfoForm.id })
                }
            }
        }
    } catch (e) {
        logger.error(e)
        done(e)
    }

    function comparer (otherArray) {
        return function (current) {
            return otherArray.filter(function (other) {
                return other.docusignRole === current.roleName
            }).length === 0
        }
    }
}

async function deleteDrafts (job, done) {
    logger.info(`Processing deleteDrafts job at #' + ${new Date()}`)
    try {
        const timeToDeleteBefore = moment().subtract(moment.duration(6, 'hours'))
        const draftedEnvelopes = await models.CaseInfoForm.findAll({
            where: { status: 'preview',
                envelopeId: { [Op.ne]: null },
                createdAt: { [Op.lte]: timeToDeleteBefore } },
            attributes: ['id', 'envelopeId']
        })
        if (draftedEnvelopes.length) {
            const envelopeIdsToDeleteDraftsFromDocusign = draftedEnvelopes.map(eachEnvelope => eachEnvelope.envelopeId)
            const caseInfoFormIds = draftedEnvelopes.map(eachEnvelope => eachEnvelope.id)
            try {
                await docuSignClient.deleteDraftsFromDocusign(envelopeIdsToDeleteDraftsFromDocusign)
                await models.CaseInfoFormRecipient.destroy({ where: { caseInfoFormId: { [Op.in]: caseInfoFormIds } } })
                await models.CaseInfoForm.destroy({ where: { id: { [Op.in]: caseInfoFormIds } } })
                logger.info(`Deleted draft envelopes.. caseinfoFormIds: ${JSON.stringify(caseInfoFormIds)}, envelopeIds: ${JSON.stringify(envelopeIdsToDeleteDraftsFromDocusign)}}`)
                done(null, { 'result': `Deleted envelopes from Docusign: ${JSON.stringify(envelopeIdsToDeleteDraftsFromDocusign)}` })
            } catch (err) {
                throw err
            }
        } else {
            done(null, { 'message': `There is no drafted envelopes for the requested time as: ${timeToDeleteBefore}` })
        }
    } catch (err) {
        logger.info(`Delete docusign drafts job failed ${err}`)
        done(err)
    }
}

async function docusignEmailWorker (job, done) {
    logger.info(`Processing docusignEmailWorker job #' + ${JSON.stringify(job.id)} + ' ----> ' + ${JSON.stringify(job.data)}`)
    try {
        let caseInfoForm = await getSortedFormRecipients(job.data, 'DESC')
        caseInfoForm = caseInfoForm.toJSON()
        let sortedRcpts = caseInfoForm.recipients
        const recipient = sortedRcpts ? sortedRcpts.find(e => e.status === 'Completed') : null
        if (recipient) {
            const person = recipient.employee ||
                (recipient.personContact ? recipient.personContact.person : '') ||
                recipient.otherRecipient ||
                (recipient.agreementPerson ? recipient.agreementPerson.person : '') ||
                (recipient.agreementPropertyOwner ? recipient.agreementPropertyOwner.person : '') ||
                (recipient.certifier ? recipient.certifier.certifierPerson : '') ||
                (recipient.formRecipientRoleCarboncopyEmail ? recipient.formRecipientRoleCarboncopyEmail : '') ||
                recipient.vendor
            if (recipient.formRecipientRoleCarboncopyEmail) {
                person.name = 'EmbalmingTeam'
            }
            let name = person && person.name
            if (!name) {
                name = [person.firstName, person.middleName, person.lastName].join(' ').trim()
            }
            const user = await models.User.findOne({
                where: { id: caseInfoForm.createdBy }
            })
            let quotaionDetails
            // if caseinfoForm linked with quote then populating quote number
            if (caseInfoForm.quotationId) {
                let isExist = await isTableExist('Quotation')
                if (isExist) {
                    [quotaionDetails] = await models.sequelize.query(`
                    SELECT 
                    quotationNumber 
                    FROM 
                    Quotation 
                    WHERE 
                    id = :id
                    `, {
                        type: models.sequelize.QueryTypes.SELECT,
                        replacements: {
                            id: caseInfoForm.quotationId
                        }
                    })
                }
            }
            const formName = caseInfoForm.envelopeName ? caseInfoForm.envelopeName : null
            const decName = caseInfoForm.Person ? _.compact([caseInfoForm.Person.firstName, caseInfoForm.Person.middleName, caseInfoForm.Person.lastName]).join(' ').trim() : null
            const contractNo = (caseInfoForm.agreement && caseInfoForm.agreement.contractNumber) ? caseInfoForm.agreement.contractNumber : ((quotaionDetails || {}).quotationNumber ? (quotaionDetails || {}).quotationNumber : null)
            const subtext = contractNo ? `[${contractNo} - ${decName}]` : `[${decName}]`
            const subject = `Signing Completed - [${name}] - ${formName} - ${subtext}`
            const text = `Hello ${user.name}\n\n${name} has completed signing the form - [${formName}] - ${subtext}. Please log on to the ${quotaionDetails ? 'Sales App' : 'OnePortal'} application and navigate to the forms section to proceed with the next steps.\n\n- ${quotaionDetails ? 'Sales App' : 'OnePortal'}`
            Email.sendMail(user.email, subject, text)
            logger.info(`Done docusignEmailWorker job #' + ${JSON.stringify(job.id)} + ' ----> ' + ${JSON.stringify(job.data)}`)
        }
        done(null, { data: job.data })
    } catch (e) {
        logger.error(e)
        done(e)
    }
}

async function getSortedFormRecipients (data, order = 'ASC') {
    const caseInfoForm = await models.CaseInfoForm.scope('form', 'recipients').findOne({
        where: { id: data.caseInfoForm.id },
        attributes: ['id', 'status', 'metaData', 'envelopeId', 'createdBy', 'quotationId', 'envelopeName'],
        include: [{
            model: models.Person,
            include: [{
                model: models.PersonVerificationDetails,
                as: 'personVerificationDetails'
            }]
        }, {
            model: models.Agreement,
            as: 'agreement'
        }],
        order: [
            [
                { model: models.CaseInfoFormRecipient, as: 'recipients' },
                'personSigningOrder',
                order
            ]
        ]
    })
    return caseInfoForm
}

async function docusignAutomaticEmailWorker (job, done) {
    logger.info(`Processing docusignAutomaticEmailWorker job #' + ${JSON.stringify(job.id)} + ' ----> ' + ${JSON.stringify(job.data.id)}`)
    try {
        let caseInfoForm = await getSortedFormRecipients(job.data, 'ASC')
        if (caseInfoForm.status !== 'voided') {
            let nxtRcpt = getNextRecipient(caseInfoForm.recipients)
            if (nxtRcpt && !nxtRcpt.isEmailSentForSigning) {
                const FormsController = require('../controllers/refactorControllers/formsController/formsController')
                const formsCtrl = new FormsController()
                await formsCtrl.generateRecipientUrlAndSendEmail(null, nxtRcpt.id, 'email', null)
            }
            logger.info(`Done docusignAutomaticEmailWorker job #' + ${JSON.stringify(job.id)} + ' ----> ' + ${JSON.stringify(job.data)}`)
            done(null, { data: job.data })
        } else {
            logger.info(`Done docusignAutomaticEmailWorker job #' + ${JSON.stringify(job.id)} + ' ----> ' + ${JSON.stringify(job.data)}`)
            done(null, { data: job.data })
        }
    } catch (error) {
        logger.error(error)
        done(error)
    }
}

function getNextRecipient (sortedRecipients) {
    let unsignedRcpts = sortedRecipients.length ? sortedRecipients.filter(e => e.status !== 'Completed') : []
    let nxtRcpt = unsignedRcpts ? unsignedRcpts[0] : null
    return nxtRcpt
}

async function docusignCompletedEmailWorker (job, done) {
    logger.info(`Processing docusignCompletedEmailWorker job #' + ${JSON.stringify(job.id)} + ' ----> ' + ${JSON.stringify(job.data.id)}`)
    try {
        const FormsController = require('../controllers/refactorControllers/formsController/formsController')
        const formsCtrl = new FormsController()
        let caseInfoForm = await getSortedFormRecipients(job.data, 'ASC')
        caseInfoForm = caseInfoForm.toJSON()
        let rEmails = []
        caseInfoForm.recipients.forEach(e => {
            let rcpt = formsCtrl.getRecipientNameAndEmailDetails(e)
            rEmails.push(rcpt.email)
        })
        let metaData = JSON.parse(caseInfoForm.metaData)
        const formName = caseInfoForm.envelopeName ? caseInfoForm.envelopeName : null
        const decName = caseInfoForm.Person ? _.compact([caseInfoForm.Person.firstName, caseInfoForm.Person.middleName, caseInfoForm.Person.lastName]).join(' ').trim() : null
        let clLogo = 'https://clcimagesdev.blob.core.windows.net/opi-dev/locationImages/cl-logo.png'
        let brandName = 'Brand Name'
        if (metaData.brandId) {
            let brandDetails = await formsCtrl.getBrandAndLogo(metaData.brandId)
            clLogo = brandDetails.clLogo
            brandName = brandDetails.brandName
        }
        let quotaionDetails
        // if caseinfoForm linked with quote then populating quote number
        if (caseInfoForm.quotationId) {
            let isExist = await isTableExist('Quotation')
            if (isExist) {
                [quotaionDetails] = await models.sequelize.query(`
                SELECT 
                   quotationNumber 
                FROM 
                   Quotation 
                WHERE 
                   id = :id
                `, {
                    type: models.sequelize.QueryTypes.SELECT,
                    replacements: {
                        id: caseInfoForm.quotationId
                    }
                })
            }
        }
        const OPID = caseInfoForm.Person && caseInfoForm.Person.personVerificationDetails ? caseInfoForm.Person.personVerificationDetails.onePortalId : (quotaionDetails || {}).quotationNumber || null
        const subject = `Completed Signing - ${decName}[${OPID}] - [${formName}]`
        const htmlContent = `<div>Dear Valued Client,
        <br><br>
        This email is to inform you that the document related to your arrangement have been completed and signed by all signatories.
        <br>
        Attached please find a copy of all signed documents.
        <br><br>
        Thank you for choosing ${brandName}. Should you have any additional questions upon your review now, or in the future, please do not hesitate to contact your Counselor or Arranger for immediate assistance.
        <br><br>
        With Gratitude,
        <br>
        The Brand Name Team
        <br><div><img src="${clLogo}" alt="${brandName}" style="padding: 5px; width: 150px;"></div></div>`
        const cc = process.env.NODE_ENV === 'production' ? ['c@gmail.com'] : ['w@gmail.com']
        const pdf = await getPDFForForm(caseInfoForm.envelopeId)
        const pdfName = `${formName}_${OPID}.pdf`
        await Email.sendMail(rEmails, subject, '', pdf, pdfName, cc, '', htmlContent)
        logger.info(`Done docusignCompletedEmailWorker job #' + ${JSON.stringify(job.id)} + ' ----> ' + ${JSON.stringify(job.data)}`)
        await unlink(pdf)
        done(null, { data: job.data })
    } catch (error) {
        logger.error(error)
        done(error)
    }
}

async function getPDFForForm (envelopeId) {
    let pdfName = './' + Date.now() + '.pdf'
    await createPDFForForm(envelopeId, pdfName)
    const pdfFile = await realpath(pdfName)
    return pdfFile
}

async function createPDFForForm (envelopeId, pdfName) {
    return new Promise(async (resolve, reject) => {
        try {
            const fs = require('fs')
            const pdfData = await docuSignClient.downloadDocument(envelopeId)
            pdfData.pipe(fs.createWriteStream(pdfName))
                .on('finish', () => {
                    resolve(pdfData)
                })
        } catch (error) {
            logger.info({ name: 'Form PDF Generation error', error })
            reject(error)
        }
    })
}

async function removeDuplicateRecipientsFromDb (job, done) {
    logger.info(`Processing removeDuplicateRecipients job #' + ${JSON.stringify(job.id)} + ' ----> ' + ${JSON.stringify(job.data)}`)
    try {
        const { caseInfoFormId, signers, recipients } = job.data
        const recipientIds = []
        for (var recipient of recipients) {
            let result = signers.find(signer => signer.clientUserId === recipient.docusignClientUserId)
            if (!result) {
                if (!recipient.formRecipientRoleCarboncopyEmail) {
                    recipientIds.push(recipient.id)
                }
            }
        }
        await models.CaseInfoFormRecipient.destroy({ where: { id: { [Op.in]: recipientIds }, caseInfoFormId } })
        logger.info(`Done removeDuplicateRecipients job #' + ${JSON.stringify(job.id)} + ' ----> ' + ${JSON.stringify(job.data)}`)
        done(null, { success: true })
    } catch (e) {
        logger.error(e)
        done(e)
    }
}

// exports.sendForm = newSendForm
module.exports = {
    newSendForm,
    deleteDrafts,
    docusignEmailWorker,
    sendForm,
    docusignAutomaticEmailWorker,
    docusignCompletedEmailWorker,
    removeDuplicateRecipientsFromDb
}
