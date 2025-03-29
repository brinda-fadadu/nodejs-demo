const BaseForm = require('./baseForm')
const _ = require('lodash')
const models = require('../../../models')
const ROLES = {
    AssignedTo: 'AssignedTo',
    Purchaser: 'Purchaser',
    CoPurchaser: 'Co-Purchaser'
}
class ForeignLanguageReleaseForm extends BaseForm {
    constructor ({ caseInfoFormId, formId }, person) {
        super({ caseInfoFormId })
        if (person) {
            this.person = person
        }
        this.formId = formId
    }
    async envelopeData () {
        return [
            await this.funeralAssignedToPreFillData(),
            await this.purchaserPreFillData(),
            await this.coPurchaserPreFillData()
        ]
    }

    async funeralAssignedToPreFillData () {
        const funeralAssignedTo = this.getSignerByRole(ROLES.AssignedTo, this.formId)
        const { textdata } = await this.funeralAssignedToPreFillDataForReUse()
        const checkboxData = {}
        return this.convertToTextTabsLatest(funeralAssignedTo, textdata, checkboxData)
    }

    async funeralAssignedToPreFillDataForReUse (agreementId, personId) {
        const AgreementController = require('../../../controllers/refactorControllers/agreementController/agreementController')

        const agreements = await models.Agreement.findAll({
            include: [
                {
                    model: models.Location,
                    as: 'location',
                    attributes: ['id', 'name', 'tax']
                }
            ],
            where: {
                id: agreementId || this.caseInfoForm.agreementId
            },
            order: [['updatedAt', 'DESC']]
        })
        const anStatements = _.filter(agreements, agreement => agreement.needType === AgreementController.NEED_TYPES['AN'])
        const pnStatements = _.filter(agreements, agreement => agreement.needType === AgreementController.NEED_TYPES['PN'])
        let entityLocation = ''; let contractNumber = ''
        if (anStatements.length) {
            contractNumber = anStatements[0].contractNumber
            entityLocation = _.get(anStatements, '[0].location.name')
        } else if (pnStatements.length && anStatements.length === 0) {
            contractNumber = pnStatements[0].contractNumber
            entityLocation = _.get(pnStatements, '[0].location.name')
        }
        const textdata = {
            EntityLocation: entityLocation,
            FuneralCaseID: contractNumber
        }
        return { textdata }
    }

    async purchaserPreFillData () {
        const purchaser = this.getSignerByRole(ROLES.Purchaser, this.formId)
        const { textdata } = this.purchaserPreFillDataforReUse(purchaser)
        return this.convertToTextTabsLatest(purchaser, textdata)
    }
    purchaserPreFillDataforReUse (purchaser) {
        const textdata = {
            PurchaserFullName: this.getFullName(_.get(purchaser, 'agreementPerson.person', _.get(purchaser, 'agreementPerson'))) || ''
        }
        return { textdata }
    }
    coPurchaserPreFillDataforReUse (coPurchaser) {
        let data
        if (coPurchaser) {
            data = {
                Purchaser1FullName: this.getFullName(_.get(coPurchaser, 'agreementPerson.person', _.get(coPurchaser, 'agreementPerson'))) || ''
            }
        } else {
            data = {}
        }
        return { data }
    }
    async coPurchaserPreFillData () {
        const coPurchaser = this.getSignerByRole(ROLES.CoPurchaser, this.formId)
        const { data } = this.coPurchaserPreFillDataforReUse(coPurchaser)
        return this.convertToTextTabsLatest(coPurchaser, data)
    }

    getFullName (person) {
        return [person.firstName, person.middleName, person.lastName]
            .join(' ')
            .trim()
    }
}
module.exports = ForeignLanguageReleaseForm
