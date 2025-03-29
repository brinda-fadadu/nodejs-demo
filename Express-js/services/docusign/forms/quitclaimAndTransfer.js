const BaseForm = require('./baseForm')
const models = require('../../../models')
const Op = require('sequelize').Op
const _ = require('lodash')

const ROLES = {
    owner: 'Owner',
    coOwner: 'Co-Owner',
    newOwner: 'New Owner',
    newCoOwner: 'New Co-Owner',
    salesCounselor: 'Sales Counselor'
}

class OrderAndAuthorizationForDisintermentAndRemoval extends BaseForm {
    constructor (caseInfoData) {
        let caseInfoFormId = caseInfoData.caseInfoFormId
        super({ caseInfoFormId })
        this.formId = caseInfoData.formId
    }

    async envelopeData () {
        return [
            await this.ownerPreFillData(),
            this.coOwnerPreFillData(),
            this.newOwnerPreFillData(),
            this.newCoOwnerPreFillData(),
            await this.salesCounselorPrefillData()
        ]
    }
    async ownerPreFillData () {
        const owner = this.getSignerByRole(ROLES.owner, this.formId)
        let ownerPersonDetails = owner.agreementPropertyOwner.person
        let ownerName = ownerPersonDetails ? [ownerPersonDetails.firstName, ownerPersonDetails.middleName, ownerPersonDetails.lastName].join(' ').trim() : ''
        let ownerAddress = ownerPersonDetails && ownerPersonDetails.addressPlace && ownerPersonDetails.addressPlace.address ? ownerPersonDetails.addressPlace.address : null
        ownerAddress = ownerAddress ? [ownerAddress.line1, ownerAddress.line2, ownerAddress.city, await this.getState(ownerAddress.state), ownerAddress.county, ownerAddress.country !== 'United States' ? ownerAddress.country : '', ownerAddress.zipcode].join(' ').trim() : ''
        const coOwner = this.getSignerByRole(ROLES.coOwner, this.formId)
        let coOwnerName
        let coOwnerAddress = '-'
        if (coOwner) {
            let coOwnerPersonDetails = coOwner.agreementPropertyOwner.person
            coOwnerName = coOwnerPersonDetails ? [coOwnerPersonDetails.firstName, coOwnerPersonDetails.middleName, coOwnerPersonDetails.lastName].join(' ').trim() : ''
            coOwnerAddress = coOwnerPersonDetails && coOwnerPersonDetails.addressPlace && coOwnerPersonDetails.addressPlace.address ? coOwnerPersonDetails.addressPlace.address : null
            coOwnerAddress = coOwnerAddress ? [coOwnerAddress.line1, coOwnerAddress.line2, coOwnerAddress.city, await this.getState(coOwnerAddress.state), coOwnerAddress.county, coOwnerAddress.country !== 'United States' ? ownerAddress.country : '', coOwnerAddress.zipcode].join(' ').trim() : ''
        }
        const newOwner = this.getSignerByRole(ROLES.newOwner, this.formId)
        let newOwnerPersonDetails = newOwner.agreementPropertyOwner.person
        const newCoOwner = this.getSignerByRole(ROLES.newCoOwner, this.formId)
        let newCoOwnerPersonDetails = newCoOwner ? newCoOwner.agreementPropertyOwner.person : null
        let newOwnerIds = []
        if (newOwner && newOwner.agreementPropertyOwnerId) {
            newOwnerIds.push(Number(newOwner.agreementPropertyOwnerId))
        }
        if (newCoOwner && newCoOwner.agreementPropertyOwnerId) {
            newOwnerIds.push(Number(newCoOwner.agreementPropertyOwnerId))
        }
        let otherCoOwner = await this.getNewCoOwners(newOwnerIds, this.caseInfoForm.agreementId)
        const agmntDetails = await this.getAgreementPropertyLocation()
        const agmntLocation = _.get(agmntDetails, 'agreementProperties[0].property.propertyGardens.propertyCampus.name')
        let props = agmntDetails.agreementProperties
        let p1, p2, p3
        if (props.length) {
            [p1, p2, p3] = props.map(e => {
                return e.property.name
            })
        }
        const textData = {
            owners: [ownerName, coOwnerName].join(', '),
            address: `Owner- ${ownerAddress}, Co-Owner- ${coOwnerAddress}`,
            intermentRights1: p1 || '',
            intermentRights2: p2 || '',
            intermentRights3: p3 || '',
            persons1: newOwnerPersonDetails ? [newOwnerPersonDetails.firstName, newOwnerPersonDetails.middleName, newOwnerPersonDetails.lastName].join(' ').trim() : '',
            persons2: newCoOwnerPersonDetails ? [newCoOwnerPersonDetails.firstName, newCoOwnerPersonDetails.middleName, newCoOwnerPersonDetails.lastName].join(' ').trim() : '',
            persons3: otherCoOwner ? [otherCoOwner.person.firstName, otherCoOwner.person.middleName, otherCoOwner.person.lastName].join(' ').trim() : ''
        }
        let checkboxData = {
            CLMemorialPark: !(agmntDetails && agmntLocation === 'Olivet campus'),
            CLOlivetCampus: !!(agmntDetails && agmntLocation === 'Olivet campus')
        }
        return this.convertToTextTabsLatest(owner, textData, checkboxData)
    }

    coOwnerPreFillData () {
        const coOwner = this.getSignerByRole(ROLES.coOwner, this.formId)
        const textData = {}
        return this.convertToTextTabsLatest(coOwner, textData)
    }

    newOwnerPreFillData () {
        const newOwner = this.getSignerByRole(ROLES.newOwner, this.formId)
        const textData = {}
        return this.convertToTextTabsLatest(newOwner, textData)
    }

    newCoOwnerPreFillData () {
        const newCoOwner = this.getSignerByRole(ROLES.newCoOwner, this.formId)
        const textData = {}
        return this.convertToTextTabsLatest(newCoOwner, textData)
    }

    async salesCounselorPrefillData () {
        const salesCounselor = this.getSignerByRole(ROLES.salesCounselor, this.formId)
        const textData = {}
        return this.convertToTextTabsLatest(salesCounselor, textData)
    }

    async getNewCoOwners (ids, agreementId) {
        const coOwner = await models.Agreement.findAll({
            where: {
                id: agreementId
            },
            include: [
                {
                    model: models.AgreementProperty,
                    as: 'agreementProperties',
                    attributes: ['id'],
                    required: false,
                    include: [
                        {
                            model: models.AgreementPropertyOwner,
                            as: 'agreementPropertyOwner',
                            attributes: ['id', 'ownerId', 'deletedAt'],
                            where: {
                                id: { [Op.not]: ids },
                                deletedAt: null,
                                deletedBy: null
                            },
                            include: [{
                                model: models.Person,
                                as: 'person',
                                attributes: [
                                    'prefix',
                                    'firstName',
                                    'middleName',
                                    'lastName',
                                    'email',
                                    'phoneNumber',
                                    'isAlive'
                                ]
                            }
                            ]
                        }
                    ]
                }
            ]
        })
        let persons = []
        if (coOwner && coOwner.length) {
            coOwner[0].agreementProperties.map((agreementProperties) => {
                agreementProperties.agreementPropertyOwner.map((agreementPropertyOwner) => {
                    persons.push(agreementPropertyOwner)
                })
            })
        }
        if (persons && persons.length) {
            [persons] = persons
        } else {
            persons = null
        }
        return persons
    }
}
module.exports = OrderAndAuthorizationForDisintermentAndRemoval
