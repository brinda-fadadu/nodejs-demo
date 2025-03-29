const BaseForm = require('./baseForm')
const models = require('../../../models')

const ROLES = {
    funeralArranger: 'Funeral Arranger',
    purchaser: 'Purchaser'
}

class GlobalAtlanticGroupPreneedNewBusinessOptions extends BaseForm {
    constructor ({ caseInfoFormId, formId }, person) {
        super({ caseInfoFormId })
        if (person) {
            this.person = person
        }
        this.formId = formId
    }

    async envelopeData () {
        return [
            await this.funeralArrangerPreFillData(),
            this.purchaserPreFillData()
        ]
    }

    async fetchPNStmtDetails (personId, agreementId) {
        try {
            let whereCondition = {
                needType: 2
            }
            if (agreementId) {
                whereCondition = {
                    id: agreementId
                }
            }
            const result = await models.AgreementPerson.findOne({
                where: {
                    personId,
                    deletedBy: null,
                    deletedAt: null
                },
                include: [{
                    model: models.Agreement,
                    where: whereCondition,
                    include: [{
                        model: models.Location,
                        as: 'location'
                    }]
                }]
            })
            return result
        } catch (err) {
            throw err
        }
    }

    async funeralArrangerPreFillData () {
        const funeralDirector = this.getSignerByRole(ROLES.funeralArranger, this.formId)
        const purchaserData = this.getSignerByRole(ROLES.purchaser, this.formId)
        const { textData } = await this.funeralArrangerPreFillDataForReUse(purchaserData)
        return this.convertToTextTabsLatest(funeralDirector, textData)
    }

    async funeralArrangerPreFillDataForReUse (purchaserData, agreementId) {
        const purchaser = purchaserData.agreementPerson ? purchaserData.agreementPerson.person : ''
        const pnstmtData = await this.fetchPNStmtDetails(this.person.id, agreementId)

        const textData = {
            benificiaryName: this.personFullName,
            purchaserName: purchaser ? [purchaser.firstName, purchaser.middleName, purchaser.lastName].join(' ').trim() : '',
            pnStatmentLocationName: pnstmtData ? (pnstmtData.Agreement ? (pnstmtData.Agreement.location ? pnstmtData.Agreement.location.name : '') : '') : ''
        }
        return { textData }
    }

    purchaserPreFillData () {
        const purchaserData = this.getSignerByRole(ROLES.purchaser, this.formId)

        const data = {}
        return this.convertToTextTabsLatest(purchaserData, data)
    }
}

module.exports = GlobalAtlanticGroupPreneedNewBusinessOptions
