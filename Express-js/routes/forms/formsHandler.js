const FormsController = require('../../controllers/refactorControllers/formsController/formsController')
const { customResponse } = require('../../lib/custom-response')
const { sendErrorResponse } = require('../../lib/errorResponse')

/**
 * Get all the types of forms in the system
 */
async function getListOfForms (req, res) {
    try {
        const list = await FormsController.getAllForms(req.query.formName)
        customResponse(200, list, res)
    } catch (error) {
        sendErrorResponse(error, res)
    }
}

/**
 * Gets all the case info forms of a person
 * @param {object} req Person ID is required in the req params
 */
async function getListOfCaseInfoForms (req, res) {
    try {
        const list = await new FormsController().getCaseInfoForms(req.params.personId, req.query)
        customResponse(200, list, res)
    } catch (error) {
        sendErrorResponse(error, res)
    }
}

/**
 * Send all the case info forms of a person
 * @param {object} req Person ID is required in the req params
 */
async function sendCaseInfoForms (req, res) {
    try {
        req.body.map((body) => {
            // let meta = JSON.parse(body.metaData.replace(/'/g, '"'))
            let meta = JSON.parse(body.metaData)
            if (meta && meta.hasOwnProperty('emailSubject') && meta.hasOwnProperty('emailMessage') && (!meta.emailSubject || !meta.emailMessage)) {
                if (meta.emailSubject.length > 100) {
                    throw new Error('emailSubject and emailMessage length should be less than 100')
                }
                throw new Error('emailSubject and emailMessage  are required')
            }
        })
        let result = await FormsController.createCaseInfoFormsAndSendUsingDocusign(
            req.params.personId,
            req.body,
            req.currentUser
        )
        // let result = await FormsController.createCaseInfoFormsAndSendUsingDocusign1(
        //     req.params.personId,
        //     req.body,
        //     req.currentUser
        // )
        customResponse(200, result, res)
    } catch (err) {
        sendErrorResponse(err, res)
    }
}

async function createEnvelope (req, res) {
    try {
        if (req.body.compositeTemplates === true && req.body.metaData) {
            let meta = JSON.parse(req.body.metaData)
            if (meta && (!meta.hasOwnProperty('envelopeName') || !meta.hasOwnProperty('emailSubject') || !meta.hasOwnProperty('emailMessage')) && (!meta.envelopeName || !meta.emailSubject || !meta.emailMessage)) {
                if (meta.emailSubject.length > 100) {
                    throw new Error('CREATE_ENVELOPE_EMAIL_SUBJECT_LENGTH')
                }
                throw new Error('CREATE_ENVELOPE_ENVELOPE_NAME_EMAIL_SUBJECT_MESSAGE_REQUIRED')
            }
        } else {
            req.body.forms.map((form) => {
                let meta = JSON.parse(form.metaData)
                if (meta && (!meta.hasOwnProperty('emailSubject') || !meta.hasOwnProperty('emailMessage')) && (!meta.emailSubject || !meta.emailMessage)) {
                    if (meta.emailSubject.length > 100) {
                        throw new Error('CREATE_ENVELOPE_EMAIL_SUBJECT_LENGTH')
                    }
                    throw new Error('CREATE_ENVELOPE_EMAIL_SUBJECT_MESSAGE_REQUIRED')
                }
            })
        }
        let result = await FormsController.createCaseInfoFormsAndEnvelopes(
            req.params.personId,
            req.body,
            req.currentUser
        )
        customResponse(200, result, res)
    } catch (err) {
        sendErrorResponse(err, res)
    }
}

async function changeRoutingOrderOfRecipientsInAnEnvelope (req, res) {
    try {
        const envelopeId = req.params.envelopeId
        const { recipients, caseInfoFormId } = req.body
        const result = await FormsController.adjustRoutingOrder(envelopeId, caseInfoFormId, recipients)
        customResponse(200, result, res)
    } catch (err) {
        sendErrorResponse(err, res)
    }
}
async function previewEnvelope (req, res) {
    try {
        const envelopeId = req.params.envelopeId
        const result = await FormsController.generatePreviewUrl(envelopeId)
        customResponse(200, result, res)
    } catch (err) {
        sendErrorResponse(err, res)
    }
}

async function confirmEnvelope (req, res) {
    try {
        const envelopeId = req.params.envelopeId
        const result = await FormsController.confirmAndChangeEnvelopeStatusToSent(envelopeId)
        customResponse(200, result, res)
    } catch (err) {
        sendErrorResponse(err, res)
    }
}

async function getMergeRecipients (req, res) {
    try {
        const result = await new FormsController().getMergeRecipients(req.body)
        customResponse(200, result, res)
    } catch (err) {
        sendErrorResponse(err, res)
    }
}

/**
 * generated a docusign preview link to view a caseInfoForm
 * @param {*} req params should contain formId, personId and body should contain forms data
 */
async function previewCaseInfoForm (req, res) {
    try {
        // let meta = JSON.parse(req.body.metaData.replace(/(^\\'|\\'$)/g, '"'))
        let meta = JSON.parse(req.body.metaData)

        if (meta && (!meta.emailSubject || !meta.emailMessage)) {
            throw new Error('emailSubject and emailMessage  are required')
        }
        let result = await FormsController.createCaseInfoFormPreview(
            req.params.formId,
            req.params.personId,
            req.body,
            req.currentUser
        )
        customResponse(200, result, res)
    } catch (err) {
        sendErrorResponse(err, res)
    }
}

/**
 * Deletes all the drafted case info forms of a person
 * @param {*} req param should contain personId
 */
async function deleteCaseInfoForms (req, res) {
    try {
        const result = await FormsController.deleteDraftedAndCreatedCaseInfoFormsOfAPerson(req.params.personId)
        customResponse(200, result, res)
    } catch (err) {
        sendErrorResponse(err, res)
    }
}

/**
 * voids a case info form of a person
 * @param {*} req should have formId and personId in params and envelope ID in body.
 */
async function voidCaseInfoForm (req, res) {
    try {
        const result = await FormsController.voidCaseInfoForm(
            req.params.caseInfoFormId,
            req.params.personId
        )
        customResponse(200, result, res)
    } catch (err) {
        sendErrorResponse(err, res)
    }
}

/**
 * Gives a download request which we stream to who so ever calls this API
 * @param {*} req params should contain personId and envelope Id
 */
async function downloadCaseInfoForm (req, res) {
    try {
        let downloadedResult = await FormsController.downloadCaseInfoForm(req.params.envelopeId, req.params.personId)
        downloadedResult.pipe(res)
    } catch (err) {
        sendErrorResponse(err, res)
    }
}

/**
 * Gives latest status of sent form.
 * @param {*} req parmas should contain personId and envelopeId
 */
async function checkLatestStatusOfForm (req, res) {
    try {
        let fetchSentFormStatus = await FormsController.checkStatusAndReturnUrlOfSentForm(req.params.envelopeId, req.params.personId)
        customResponse(200, fetchSentFormStatus, res)
    } catch (err) {
        sendErrorResponse(err, res)
    }
}

/**
 * Fetches the In-Person Signing Hosts
 */
async function getInPersonHosts (req, res) {
    try {
        let hosts = await FormsController.getInPersonHosts()
        customResponse(200, hosts, res)
    } catch (err) {
        sendErrorResponse(err, res)
    }
}

/**
 * @param {*} req includes request data for sending the form in recipientView format
 * @param {*} res
 */
async function embeddedSignForCaseInfoForm (req, res) {
    try {
        let result = await FormsController.createCaseInfoFormForEmbeddedSigning(
            req.params.formId,
            req.params.personId,
            req.body,
            req.currentUser
        )
        customResponse(200, result, res)
    } catch (err) {
        sendErrorResponse(err, res)
    }
}

/**
 * Embedded signing fetch url for next recipient to get signature
 * @param {*} req
 * @param {*} res
 */
async function getNextRecipientViewForsigning (req, res) {
    try {
        let fetchNextRecipientView = await FormsController.fetchNextRecipientViewForSigning(req.params.envelopeId, req.params.personId)
        customResponse(200, fetchNextRecipientView, res)
    } catch (err) {
        sendErrorResponse(err, res)
    }
}

/*
* Fetch brands
*/
async function getDocusingBrands (req, res) {
    try {
        let DocusignBrands = await FormsController.getDocusignBrands()
        customResponse(200, DocusignBrands, res)
    } catch (err) {
        sendErrorResponse(err, res)
    }
}

async function generateRecipientUrlAndSendEmail (req, res) {
    try {
        let sendRecipient = await new FormsController().generateRecipientUrlAndSendEmail(
            req.params.personId,
            req.params.recipientId,
            req.query.signingType,
            req.currentUser)
        customResponse(200, sendRecipient, res)
    } catch (err) {
        sendErrorResponse(err, res)
    }
}

async function generateRecipientUrlAndDocusign (req, res) {
    try {
        let sendRecipient = await new FormsController().generateRecipientUrlAndSendEmail(
            null,
            req.params.recipientId,
            'embedded')
        // customResponse(200, sendRecipient, res)
        res.redirect(sendRecipient.redirectUrl)
    } catch (err) {
        sendErrorResponse(err, res)
    }
}
async function validateEmailAddress (req, res) {
    try {
        let isValidated = await new FormsController().validateEmail(req.body.email)
        customResponse(200, isValidated, res)
    } catch (err) {
        sendErrorResponse(err, res)
    }
}

module.exports = {
    getListOfForms,
    getListOfCaseInfoForms,
    sendCaseInfoForms,
    deleteCaseInfoForms,
    voidCaseInfoForm,
    previewCaseInfoForm,
    downloadCaseInfoForm,
    checkLatestStatusOfForm,
    getInPersonHosts,
    embeddedSignForCaseInfoForm,
    getNextRecipientViewForsigning,
    getDocusingBrands,
    generateRecipientUrlAndSendEmail,
    generateRecipientUrlAndDocusign,
    createEnvelope,
    previewEnvelope,
    confirmEnvelope,
    validateEmailAddress,
    changeRoutingOrderOfRecipientsInAnEnvelope,
    getMergeRecipients
}
