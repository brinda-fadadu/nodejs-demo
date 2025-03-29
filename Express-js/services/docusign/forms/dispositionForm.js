const BaseForm = require('./baseForm')
const models = require('../../../models')

const ROLES = {
    AssignedTo: 'AssignedTo',
    Authorizer: 'Authorizer'
}

class DispositionForm extends BaseForm {
    constructor ({ caseInfoFormId, formId }, recipients, person) {
        super({ caseInfoFormId })
        if (recipients) {
            this.recipients = recipients
        }
        if (person) {
            this.person = person
        }
        this.formId = formId
    }

    async envelopeData () {
        return [
            await this.funeralAssignedToPreFillData(),
            await this.funeralAuthorizerPreFillData()
        ]
    }

    async funeralAssignedToPreFillData () {
        const funeralAssignedTo = this.getSignerByRole(ROLES.AssignedTo, this.formId)
        const { textdata } = await this.funeralAssignedToPreFillDataForReUse(funeralAssignedTo)
        return this.convertToTextTabsLatest(funeralAssignedTo, textdata)
    }

    async funeralAssignedToPreFillDataForReUse (funeralAssignedTo, agreementId) {
        let anstmtData = await this.getAgreementData(agreementId || this.caseInfoForm.agreementId)

        const textdata = {
            EntityLocation: anstmtData && anstmtData.location ? anstmtData.location.name : '',
            FuneralAssignedTo: funeralAssignedTo.employee.name
        }
        return { textdata }
    }

    async getAddress (address) {
        const stateDetails = await models.State.findOne({
            where: { name: address.state }
        })
        if (stateDetails) {
            return [
                address.line1,
                address.line2,
                address.city,
                stateDetails.code,
                address.country !== 'United States' ? this.getCountry(address.country) : '',
                address.zipcode
            ]
                .join(' ')
                .trim()
        } else {
            return [
                address.line1,
                address.line2,
                address.city,
                await this.getState(address.state),
                address.country !== 'United States' ? this.getCountry(address.country) : '',
                address.zipcode
            ]
                .join(' ')
                .trim()
        }
    }

    async funeralAuthorizerPreFillData () {
        const funeralAuthorizer = this.getSignerByRole(ROLES.Authorizer, this.formId)
        const { textdata } = await this.funeralAuthorizerPreFillDataForReUse()
        return this.convertToTextTabsLatest(funeralAuthorizer, textdata)
    }
    async funeralAuthorizerPreFillDataForReUse () {
        const personContactDetails = this.personContactDetails
        let NOKAddress = this.recipients.find(ele => ele.personContact)
        const contactsList = await this.getContactDetailsList(
            NOKAddress.personContact.id
        )
        NOKAddress = NOKAddress.personContact.person
            ? NOKAddress.personContact.person.addressPlace
                ? NOKAddress.personContact.person.addressPlace.address
                : null
            : null
        const getNOKAddress = NOKAddress ? await this.getAddress(NOKAddress) : ''

        const textdata = {
            Do: '',
            DoNot: '',
            MainNOKRelationship: personContactDetails.relation,
            DecedentFullName: this.personFullName,
            MainNOKAddress: getNOKAddress,
            NOKFullName: personContactDetails.fullName,
            NOKAddress: getNOKAddress,
            NOKRelationship: personContactDetails.relation,
            NOKAge: '',
            NOK1FullName: contactsList[0] ? contactsList[0].fullName : '',
            NOK1Address: contactsList[0] ? contactsList[0].NOKAddress : '',
            NOK1Relationship: contactsList[0] ? contactsList[0].relation : '',
            NOK1Age: '',
            NOK2FullName: contactsList[1] ? contactsList[1].fullName : '',
            NOK2Address: contactsList[1] ? contactsList[1].NOKAddress : '',
            NOK2Relationship: contactsList[1] ? contactsList[1].relation : '',
            NOK2Age: '',
            NOK3FullName: contactsList[2] ? contactsList[2].fullName : '',
            NOK3Address: contactsList[2] ? contactsList[2].NOKAddress : '',
            NOK3Relationship: contactsList[2] ? contactsList[2].relation : '',
            NOK3Age: '',
            NOK4FullName: contactsList[3] ? contactsList[3].fullName : '',
            NOK4Address: contactsList[3] ? contactsList[3].NOKAddress : '',
            NOK4Relationship: contactsList[3] ? contactsList[3].relation : '',
            NOK4Age: '',
            NOK5FullName: contactsList[4] ? contactsList[4].fullName : '',
            NOK5Address: contactsList[4] ? contactsList[4].NOKAddress : '',
            NOK5Relationship: contactsList[4] ? contactsList[4].relation : '',
            NOK5Age: '',
            NOK6FullName: contactsList[5] ? contactsList[5].fullName : '',
            NOK6Address: contactsList[5] ? contactsList[5].NOKAddress : '',
            NOK6Relationship: contactsList[5] ? contactsList[5].relation : '',
            NOK6Age: '',
            NOK7FullName: contactsList[6] ? contactsList[6].fullName : '',
            NOK7Address: contactsList[6] ? contactsList[6].NOKAddress : '',
            NOK7Relationship: contactsList[6] ? contactsList[6].relation : '',
            NOK7Age: '',
            StateAndCountry: '',
            MainNOK: personContactDetails.fullName,
            FuneralAuthorizer: personContactDetails.fullName,
            FuneralAuthorizerRelation: personContactDetails.relation
        }
        return { textdata }
    }

    async getContactDetailsList (contactId) {
        const contactDetails = await models.PersonContact.scope(
            'defaultScope',
            'commonIncludes'
        ).findAll({
            where: {
                personId: this.person.id,
                contactType: 1
            },
            include: [
                {
                    model: models.PersonContactRole,
                    as: 'contactRoles',
                    include: [
                        {
                            model: models.ContactRole,
                            as: 'role',
                            where: {
                                name: 'Next of Kin'
                            },
                            require: true
                        }
                    ],
                    require: true
                }
            ]
        })
        let finalData = []
        for (let index in contactDetails) {
            let contact = contactDetails[index].toJSON()
            if (
                contact.id !== contactId &&
        contact.contactRoles &&
        contact.contactRoles.length
            ) {
                let contactObject = {}
                contactObject.fullName = [
                    contact.person.firstName ? contact.person.firstName : '',
                    contact.person.middleName ? contact.person.middleName : '',
                    contact.person.lastName ? contact.person.lastName : ''
                ]
                contactObject.fullName = contactObject.fullName.join(' ').trim()

                contactObject.relation = contact.relation ? contact.relation.name : ''
                let NOKAddress = contact.person
                    ? contact.person.addressPlace
                        ? contact.person.addressPlace.address
                        : null
                    : null
                contactObject.NOKAddress = NOKAddress
                    ? await this.getAddress(NOKAddress)
                    : ''
                finalData.push(contactObject)
            }
        }
        return finalData
    }
}
module.exports = DispositionForm
