const docusign = require('docusign-esign')
const AuthToken = require('./authToken')
const request = require('request')
const requestPromise = require('request-promise')
const _ = require('underscore')

class DocuSignClient {
    constructor (config, privateKeyPath) {
        this.config = config
        this.authToken = new AuthToken({ config, privateKeyPath })
        this.accountId = config.account_id
        this.basePath = config.base_path
        this.base_path_uri = config.base_path_uri

        this._apiClient = new docusign.ApiClient()
        this._apiClient.setBasePath(config.base_path)
    }

    async getApiClient () {
        const accessToken = await this.authToken.getToken()
        this._apiClient.addDefaultHeader('Authorization', `Bearer ${accessToken}`)
        return this._apiClient
    }

    async envelopeClient () {
        const apiClient = await this.getApiClient()
        return new docusign.EnvelopesApi(apiClient)
    }

    async folderClient () {
        const apiClient = await this.getApiClient()
        return new docusign.FoldersApi(apiClient)
    }

    async templateClient () {
        const apiClient = await this.apiClient()
        return new docusign.EnvelopesApi(apiClient)
    }

    async listTemplates ({ searchText, folderName } = {}) {
        const client = await this.templateClient()

        const results = await client.listTemplates(this.accountId, { searchText, folderName })
        return results
    }

    async getTemplate (templateId) {
        const client = await this.templateClient()

        const result = await client.get(this.accountId, templateId)
        return result
    }
    async envelopStatus (envelopId) {
        const client = await this.envelopeClient()
        const results = await client.listStatusChanges(
            this.accountId, {
                envelopeIds: envelopId
            })

        return results
    }

    async generatePreviewUrl (envelopId) {
        const authToken = await this.authToken.getToken()
        var options = {
            method: 'POST',
            uri: `${this.base_path_uri}/${this.accountId}/envelopes/${envelopId}/views/sender`,
            headers: {
                'Authorization': `Bearer ${authToken}`
            },
            body: {},
            json: true
        }
        return new Promise((resolve, reject) => {
            requestPromise(options)
                .then(function (updatedEnvelopeResult) {
                    resolve(updatedEnvelopeResult.url)
                })
                .catch(function (err) {
                    reject(err)
                })
        })
    }

    async moveToRecycleBin (envelopeIds) {
        const folderClient = await this.folderClient()
        const result = await folderClient.moveEnvelopes(
            this.accountId, 'recyclebin', { foldersRequest: { envelopeIds } }
        )
        return result
    }

    async voidDocument (envelopId) {
        const client = await this.envelopeClient()
        const result = await client.update(
            this.accountId, envelopId, { advancedUpdate: true, envelope: { 'status': 'voided', 'voidedReason': 'Voided by staff' } }
        )
        return result
    }

    async downloadDocument (envelopId) {
        const url = `${this.base_path_uri}/${this.accountId}/envelopes/${envelopId}/documents/combined`
        const authToken = await this.authToken.getToken()
        const result = request.get({
            url: url,
            headers: {
                'Authorization': `Bearer ${authToken}`
            }
        })
        return result
    }

    /* async sendCompositeTemplateEnvelope (templateId, signersWithData, status) {
        const recipients = {}

        if (signersWithData) {
            recipients.signers = signersWithData
        }

        // if (inPersonSigners) {
        //     recipients.inPersonSigners = inPersonSigners
        // }

        const compositeTemplate = docusign.CompositeTemplate.constructFromObject({
            serverTemplates: [{
                templateId: templateId,
                sequence: '1'
            }],
            inlineTemplates: [{
                templateId: templateId,
                sequence: '1',
                recipients: recipients
            }]
        })

        const envelopeDefinition = new docusign.EnvelopeDefinition()
        envelopeDefinition.compositeTemplates = [ compositeTemplate ]
        envelopeDefinition.status = status

        const client = await this.envelopeClient()
        const result = await client.createEnvelope(this.accountId, {
            envelopeDefinition
        })

        return result
    } */

    async creatingEnvelopeInDocusign (envelopeDefinition) {
        // envelopeDefinition.templateRoles = _.filter(envelopeDefinition.templateRoles)
        envelopeDefinition.compositeTemplates.map(compositeTemplate => {
            compositeTemplate.inlineTemplates[0].recipients.signers = _.filter(compositeTemplate.inlineTemplates[0].recipients.signers)
            return compositeTemplate
        })
        const authToken = await this.authToken.getToken()
        var options = {
            method: 'POST',
            uri: `${this.base_path_uri}/${this.accountId}/envelopes`,
            headers: {
                'Authorization': `Bearer ${authToken}`
            },
            body: envelopeDefinition,
            json: true
        }
        return new Promise((resolve, reject) => {
            requestPromise(options)
                .then(function (envelope) {
                    resolve(envelope)
                })
                .catch(function (err) {
                    reject(err)
                })
        })
    }

    async getRecipientsOfEnvelopeInDocusign (envelopId) {
        const authToken = await this.authToken.getToken()
        var options = {
            method: 'GET',
            uri: `${this.base_path_uri}/${this.accountId}/envelopes/${envelopId}/recipients`,
            headers: {
                'Authorization': `Bearer ${authToken}`
            },
            json: true
        }
        return new Promise((resolve, reject) => {
            requestPromise(options)
                .then(function (envelopeRecipients) {
                    resolve(envelopeRecipients)
                })
                .catch(function (err) {
                    reject(err)
                })
        })
    }

    async updatingRecipientsInDocusign (envelopId, recipientsData, queryParams) {
        let uri
        if (queryParams && queryParams.combine_same_order_recipients) {
            uri = `${this.base_path_uri}/${this.accountId}/envelopes/${envelopId}/recipients?combine_same_order_recipients=true`
        } else {
            uri = `${this.base_path_uri}/${this.accountId}/envelopes/${envelopId}/recipients`
        }
        const authToken = await this.authToken.getToken()
        var options = {
            method: 'PUT',
            uri: uri,
            headers: {
                'Authorization': `Bearer ${authToken}`
            },
            body: recipientsData,
            json: true
        }
        return new Promise((resolve, reject) => {
            requestPromise(options)
                .then(function (updatedRecipients) {
                    resolve(updatedRecipients)
                })
                .catch(function (err) {
                    reject(err)
                })
        })
    }

    async updatingStatusOfEnvelopeInDocusign (envelopId, statusObj, lockToken) {
        const authToken = await this.authToken.getToken()
        if (lockToken) {
            var options = {
                'method': 'PUT',
                'url': `${this.base_path_uri}/${this.accountId}/envelopes/${envelopId}`,
                'headers': {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${authToken}`,
                    'X-DocuSign-Edit': `{ "LockToken": ${JSON.stringify(lockToken)}, "LockDurationInSeconds": "600" }`
                },
                'body': JSON.stringify(statusObj)
            }
            return new Promise((resolve, reject) => {
                requestPromise(options)
                    .then(function (updatedEnvelopeResult) {
                        resolve(updatedEnvelopeResult)
                    })
                    .catch(function (err) {
                        reject(err)
                    })
            })
        } else {
            // eslint-disable-next-line no-redeclare
            var options = {
                'method': 'PUT',
                'url': `${this.base_path_uri}/${this.accountId}/envelopes/${envelopId}`,
                'headers': {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${authToken}`
                },
                'body': JSON.stringify(statusObj)
            }
            return new Promise((resolve, reject) => {
                requestPromise(options)
                    .then(function (updatedEnvelopeResult) {
                        resolve(updatedEnvelopeResult)
                    })
                    .catch(function (err) {
                        reject(err)
                    })
            })
        }
    }

    async deleteRecipientsInDocusign (envelopId, recipients) {
        const authToken = await this.authToken.getToken()
        var options = {
            method: 'DELETE',
            uri: `${this.base_path_uri}/${this.accountId}/envelopes/${envelopId}/recipients`,
            headers: {
                'Authorization': `Bearer ${authToken}`
            },
            body: recipients,
            json: true
        }
        return new Promise((resolve, reject) => {
            requestPromise(options)
                .then(function (updatedEnvelopeResult) {
                    resolve(updatedEnvelopeResult)
                })
                .catch(function (err) {
                    reject(err)
                })
        })
    }
    async updateRecipientTabsInDocusign (envelopId, recipientId, tabsInput) {
        const authToken = await this.authToken.getToken()
        var options = {
            method: 'PUT',
            uri: `${this.base_path_uri}/${this.accountId}/envelopes/${envelopId}/recipients/${recipientId}/tabs`,
            headers: {
                'Authorization': `Bearer ${authToken}`
            },
            body: tabsInput,
            json: true
        }
        return new Promise((resolve, reject) => {
            requestPromise(options)
                .then(function (updatedEnvelopeTabsResult) {
                    resolve(updatedEnvelopeTabsResult)
                })
                .catch(function (err) {
                    reject(err)
                })
        })
    }
    async deleteRecipientTabsInDocusign (envelopId, recipientId, tabsToDelete) {
        const authToken = await this.authToken.getToken()
        var options = {
            method: 'DELETE',
            uri: `${this.base_path_uri}/${this.accountId}/envelopes/${envelopId}/recipients/${recipientId}/tabs`,
            headers: {
                'Authorization': `Bearer ${authToken}`
            },
            body: tabsToDelete,
            json: true
        }
        return new Promise((resolve, reject) => {
            requestPromise(options)
                .then(function (deletedEnvelopeTabsResult) {
                    resolve(deletedEnvelopeTabsResult)
                })
                .catch(function (err) {
                    reject(err)
                })
        })
    }

    async getRecipientsTabsOfEnvelopeInDocusign (envelopId, documentId) {
        const authToken = await this.authToken.getToken()
        var options = {
            method: 'GET',
            uri: `${this.base_path_uri}/${this.accountId}/envelopes/${envelopId}/documents/${documentId}/tabs`,
            headers: {
                'Authorization': `Bearer ${authToken}`
            },
            json: true
        }
        return new Promise((resolve, reject) => {
            requestPromise(options)
                .then(function (envelopeRecipients) {
                    resolve(envelopeRecipients)
                })
                .catch(function (err) {
                    reject(err)
                })
        })
    }

    async fetchEnvelopeStatusFromDocusign (envelopId) {
        const authToken = await this.authToken.getToken()
        var options = {
            method: 'GET',
            uri: `${this.base_path_uri}/${this.accountId}/envelopes/${envelopId}`,
            headers: {
                'Authorization': `Bearer ${authToken}`
            }
        }
        return new Promise((resolve, reject) => {
            requestPromise(options)
                .then(function (envelope) {
                    resolve(envelope)
                })
                .catch(function (err) {
                    reject(err)
                })
        })
    }
    async getBrands () {
        const authToken = await this.authToken.getToken()
        var options = {
            method: 'GET',
            uri: `${this.base_path_uri}/${this.accountId}/brands`,
            headers: {
                'Authorization': `Bearer ${authToken}`,
                'User-Agent': 'Request-Promise'
            },
            json: true
        }
        return new Promise((resolve, reject) => {
            requestPromise(options)
                .then(function (brands) {
                    resolve(brands)
                })
                .catch(function (err) {
                    reject(err)
                })
        })
    }

    // FYI: below method written for embedded signing POC. while working on new signing flow developer can use
    async generatePreviewrecipientUrl (envelopId, recipient) {
        try {
            let viewRequest = new docusign.RecipientViewRequest()
            viewRequest.returnUrl = 'https://www.gmail.com'
            viewRequest.authenticationMethod = 'none'
            // Recipient information must match embedded recipient info
            // we used to create the envelope.
            viewRequest.email = recipient.email || recipient.hostEmail
            viewRequest.userName = recipient.name || recipient.hostName
            viewRequest.clientUserId = recipient.clientUserId
            const client = await this.envelopeClient()
            const result = await client.createRecipientView(this.accountId, envelopId,
                { recipientViewRequest: viewRequest })
            return ({ envelopeId: envelopId, redirectUrl: result.url })
        } catch (err) {
            throw err
        }
    }

    async deleteDraftsFromDocusign (envelopeIdsToDelete) {
        const authToken = await this.authToken.getToken()
        var options = {
            method: 'PUT',
            uri: `${this.base_path_uri}/${this.accountId}/folders/recyclebin`,
            headers: {
                'Authorization': `Bearer ${authToken}`
            },
            body: { 'envelopeIds': envelopeIdsToDelete },
            json: true
        }
        return new Promise((resolve, reject) => {
            requestPromise(options)
                .then(function (deletedEnvelopesResult) {
                    resolve(deletedEnvelopesResult)
                })
                .catch(function (err) {
                    reject(err)
                })
        })
    }

    async getRecipientTabs (envelopId, recipientId) {
        const authToken = await this.authToken.getToken()
        var options = {
            method: 'GET',
            uri: `${this.base_path_uri}/${this.accountId}/envelopes/${envelopId}/recipients/${recipientId}/tabs`,
            headers: {
                'Authorization': `Bearer ${authToken}`
            },
            json: true
        }
        return new Promise((resolve, reject) => {
            requestPromise(options)
                .then(function (recipientTabs) {
                    resolve(recipientTabs)
                })
                .catch(function (err) {
                    reject(err)
                })
        })
    }

    async deleteSingleRecipientInDocusign (envelopId, recipientId) {
        const authToken = await this.authToken.getToken()
        var options = {
            method: 'DELETE',
            uri: `${this.base_path_uri}/${this.accountId}/envelopes/${envelopId}/recipients/${recipientId}`,
            headers: {
                'Authorization': `Bearer ${authToken}`
            },
            json: true
        }
        return new Promise((resolve, reject) => {
            requestPromise(options)
                .then(function (deletedRecipientResult) {
                    resolve(deletedRecipientResult)
                })
                .catch(function (err) {
                    reject(err)
                })
        })
    }

    async envelopeTemplatesList (envelopId) {
        const authToken = await this.authToken.getToken()
        var options = {
            method: 'GET',
            uri: `${this.base_path_uri}/${this.accountId}/envelopes/${envelopId}/templates`,
            headers: {
                'Authorization': `Bearer ${authToken}`
            },
            json: true
        }
        return new Promise((resolve, reject) => {
            requestPromise(options)
                .then(function (templatesList) {
                    resolve(templatesList)
                })
                .catch(function (err) {
                    reject(err)
                })
        })
    }

    async envelopeDocumentList (envelopId) {
        const authToken = await this.authToken.getToken()
        var options = {
            method: 'GET',
            uri: `${this.base_path_uri}/${this.accountId}/envelopes/${envelopId}/documents`,
            headers: {
                'Authorization': `Bearer ${authToken}`
            },
            json: true
        }
        return new Promise((resolve, reject) => {
            requestPromise(options)
                .then(function (documentList) {
                    resolve(documentList)
                })
                .catch(function (err) {
                    reject(err)
                })
        })
    }

    async setEnvelopeLock (envelopId) {
        const authToken = await this.authToken.getToken()
        var options = {
            method: 'POST',
            uri: `${this.base_path_uri}/${this.accountId}/envelopes/${envelopId}/lock`,
            headers: {
                'Authorization': `Bearer ${authToken}`
            },
            body: {
                'lockDurationInSeconds': '60',
                'lockType': 'edit',
                'lockedByApp': 'onePortal'
            },
            json: true
        }
        return new Promise((resolve, reject) => {
            requestPromise(options)
                .then(function (lock) {
                    resolve(lock)
                })
                .catch(function (err) {
                    reject(err)
                })
        })
    }

    async deleteEnvelopeLock (envelopId) {
        const authToken = await this.authToken.getToken()
        var options = {
            method: 'DELETE',
            uri: `${this.base_path_uri}/${this.accountId}/envelopes/${envelopId}/lock`,
            headers: {
                'Authorization': `Bearer ${authToken}`
            },
            json: true
        }
        return new Promise((resolve, reject) => {
            requestPromise(options)
                .then(function (lock) {
                    resolve(lock)
                })
                .catch(function (err) {
                    reject(err)
                })
        })
    }

    async updateALLRecipientTabsInDocusign (envelopId, recipients) {
        const authToken = await this.authToken.getToken()
        var options = {
            method: 'PUT',
            uri: `${this.base_path_uri}/${this.accountId}/envelopes/${envelopId}/recipients`,
            headers: {
                'Authorization': `Bearer ${authToken}`
            },
            body: recipients,
            json: true
        }
        return new Promise((resolve, reject) => {
            requestPromise(options)
                .then(function (updatedEnvelopeTabsResult) {
                    resolve(updatedEnvelopeTabsResult)
                })
                .catch(function (err) {
                    reject(err)
                })
        })
    }

    async getEnvelopeLock (envelopId) {
        const authToken = await this.authToken.getToken()
        var options = {
            method: 'GET',
            uri: `${this.base_path_uri}/${this.accountId}/envelopes/${envelopId}/lock`,
            headers: {
                'Authorization': `Bearer ${authToken}`
            },
            json: true
        }
        return new Promise((resolve, reject) => {
            requestPromise(options)
                .then(function (lockObj) {
                    resolve(lockObj)
                })
                .catch(function (err) {
                    reject(err)
                })
        })
    }
}

module.exports = DocuSignClient
