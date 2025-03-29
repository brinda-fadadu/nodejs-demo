const moment = require('moment-timezone')
const BaseForm = require('./baseForm')
const _ = require('lodash')
const { locationItemAndAttributeInclude } = require('../../../controllers/refactorControllers/schedulingController/schedulingCommonInclude')
const { Gender } = require('../../../config/seed').seed
const models = require('../../../models')
const SchedulingController = require('../../../controllers/refactorControllers/schedulingController/schedulingController')
const { formatPhoneNumber } = require('../../../utils/formatters')
const ROLES = {
    'salesCounselor': 'Sales Counselor',
    'legalRep': 'Legal Representative',
    'owner': 'Owner'
}

class IntermentOrderAuthorizationForm extends BaseForm {
    constructor ({ caseInfoFormId, formId }, person) {
        super({ caseInfoFormId })
        if (person) {
            this.person = person
        }
        this.formId = formId
    }

    async envelopeData () {
        return [
            await this.salesCounselorPrefillData(),
            this.legalRepresentativePreFillData(),
            this.ownerPrefillData()
        ]
    }

    ownerPrefillData () {
        const owner = this.getSignerByRole(ROLES.owner, this.formId)
        return this.convertToTextTabsLatest(owner, {}, {})
    }

    async salesCounselorPrefillDataForReUse (salesCounselor, agreementId, meta) {
        const agreementData = await this.getAgreementPropertyLocation(agreementId)
        const agmntLocation = _.get(agreementData, 'agreementProperties[0].property.propertyGardens.propertyCampus.name')
        const VerifiedPersonController = require('../../../controllers/refactorControllers/personController/verifiedPersonController')
        const verifiedPersonController = new VerifiedPersonController(this.person.id)
        const veteranDetails = await verifiedPersonController.getVeteranDetails()
        const cemeteryServiceDetails = await this.getSchedulingCemeteryDetails()
        const funeralServiceDetails = await this.funeralServiceData()
        const isOverSizeCasket = await this.getOversizeCasketData(_.get(cemeteryServiceDetails, '[0]', {}))
        const isChildCasket = await this.getChildrenCasketData(_.get(cemeteryServiceDetails, '[0]', {}))
        const checkboxData = {
            CLMemorialPark: !(agreementData && agmntLocation === 'Olivet campus'),
            CLOlivetCampus: !!(agreementData && agmntLocation === 'Olivet campus'),
            // male: Gender[this.person.gender] === 'Male',
            // female: Gender[this.person.gender] === 'Female',
            veteran: !!_.get(veteranDetails, 'serviceBranchId'),
            army: _.get(veteranDetails, 'serviceBranch.name') === 'Army',
            navy: _.get(veteranDetails, 'serviceBranch.name') === 'Navy',
            marines: _.get(veteranDetails, 'serviceBranch.name') === 'Marines',
            airforce: _.get(veteranDetails, 'serviceBranch.name') === 'Air Force',
            coastGuard: _.get(veteranDetails, 'serviceBranch.name') === 'Coast Guard',
            otherVeteran: _.get(veteranDetails, 'isUnknown') || !_.get(veteranDetails, 'serviceBranchId'),
            // single: '',
            // double: '',
            reOpen: _.get(cemeteryServiceDetails, '[0].intermentRequestDetails.isReopenTop'),
            witnessLower: await this.getWitnessLowerValue(cemeteryServiceDetails[0]),
            fill: _.get(cemeteryServiceDetails, '[0].intermentRequestDetails.isWitnessFilling'),
            entomb: await this.getEntombValue(cemeteryServiceDetails[0]),
            seal: _.get(cemeteryServiceDetails, '[0].intermentRequestDetails.isWitnessCoveringOrSealings'),
            DisInter: '',
            ReInter: cemeteryServiceDetails.length > 1,
            vaultPlacementCover: '',
            other: ''
            // familyPallbearersYes: _.get(funeralServiceDetails, 'resourcesDetails.pallbearers', []).length > 0,
            // familyPallbearersNo: _.get(funeralServiceDetails, 'resourcesDetails.pallbearers', []).length === 0,
            // overSizeYes: isOverSizeCasket,
            // overSizeNo: !isOverSizeCasket,
            // childYes: isChildCasket,
            // childNo: !isChildCasket

        }

        const groupLabelData = {
            gender: [
                { male: Gender[this.person.gender] === 'Male' },
                { female: Gender[this.person.gender] === 'Female' }
            ],
            familyPallbearers: [
                { yes: _.get(funeralServiceDetails, 'resourcesDetails.pallbearers', []).length > 0 },
                { no: _.get(funeralServiceDetails, 'resourcesDetails.pallbearers', []).length === 0 }
            ],
            overSize: [
                { yes: isOverSizeCasket },
                { no: !isOverSizeCasket }
            ],
            child: [
                { yes: isChildCasket },
                { no: !isChildCasket }
            ],
            siteinformation: [
                { single: '' },
                { double: '' }
            ]
        }
        const { funeralHomeFax, funeralHomeName, funeralHomePhone } = await this.funeralHomeDetails(cemeteryServiceDetails[0])
        const { funeralDirectorEmail, funeralDirectorName, funeralDirectorPhone } = await this.funeralDirectorDetails(cemeteryServiceDetails[0])
        const sortedFamilyNotes = _.orderBy(
            _.get(cemeteryServiceDetails, '[0].notesSections', []).filter(r => r.noteLevel.name === 'family'),
            'updatedAt',
            'desc'
        )
        // let metaData = this.caseInfoForm && this.caseInfoForm.metaData ? JSON.parse(this.caseInfoForm.metaData.replace(/'/g, '"')) : (meta ? JSON.parse(meta.replace(/'/g, '"')) : '')
        let metaData = this.caseInfoForm && this.caseInfoForm.metaData ? JSON.parse(this.caseInfoForm.metaData) : (meta ? JSON.parse(meta) : '')

        let timezone = metaData.timezone ? metaData.timezone : null
        let currentDate = new Date()
        const stateDetails = _.get(this.person, 'addressPlace.address.state')
        const statecode = stateDetails ? await this.getState(stateDetails) : ''
        const textData = {
            date: moment(currentDate).tz(timezone).format('MM/DD/YYYY'),
            contractNumber: _.get(agreementData, 'contractNumber', ''),
            counselorName: _.get(salesCounselor, 'employee.name', ''),
            otherInfo: _.get(veteranDetails, 'serviceEra', ''),
            decedentName: this.personFullName,
            decedentDOB: _.get(this.person, 'dateOfBirth') ? moment(_.get(this.person, 'dateOfBirth')).tz(timezone).format('MM/DD/YYYY') : '',
            decedentDOD: _.get(this.person, 'deathDetails.dateOfDeath') ? moment(_.get(this.person, 'deathDetails.dateOfDeath')).tz(timezone).format('MM/DD/YYYY') : '',
            decedentAddress: await this.returnAddress(),
            decedentCity: _.get(this.person, 'addressPlace.address.city'),
            decedentState: statecode,
            decedentZipCode: _.get(this.person, 'addressPlace.address.zipcode'),
            funeralHomeName,
            funeralHomePhone,
            funeralHomeFax,
            funeralDirectorName,
            funeralDirectorPhone,
            funeralDirectorEmail,
            funeralServiceLocation: _.get(funeralServiceDetails, 'schedulingDetails.clFacilityLocation.name') || _.get(funeralServiceDetails, 'schedulingDetails.serviceLocation.organization.name'),
            funeralServiceDay: _.get(funeralServiceDetails, 'schedulingDetails.date') ? moment(_.get(funeralServiceDetails, 'schedulingDetails.date')).tz(timezone).format('dddd') : '',
            funeralServiceDate: _.get(funeralServiceDetails, 'schedulingDetails.date') ? moment(_.get(funeralServiceDetails, 'schedulingDetails.date')).tz(timezone).format('MM/DD/YYYY') : '',
            funeralServiceTime: _.get(funeralServiceDetails, 'schedulingDetails.beginningTime') ? moment(_.get(funeralServiceDetails, 'schedulingDetails.beginningTime')).tz(timezone).format('HH:mm a') : '',
            committalServiceLocation: _.get(cemeteryServiceDetails, '[0].itemUsage.agreementItems.agreementDetails.location.name'),
            committalServiceDay: _.get(cemeteryServiceDetails, '[0].intermentInformationDetails.beginningTime') ? moment(_.get(cemeteryServiceDetails, '[0].intermentInformationDetails.beginningTime')).tz(timezone).format('dddd') : '',
            committalServiceDate: _.get(cemeteryServiceDetails, '[0].intermentInformationDetails.beginningTime') ? moment(_.get(cemeteryServiceDetails, '[0].intermentInformationDetails.beginningTime')).tz(timezone).format('MM/DD/YYYY') : '',
            committalServiceTime: _.get(cemeteryServiceDetails, '[0].intermentInformationDetails.beginningTime') ? moment(_.get(cemeteryServiceDetails, '[0].intermentInformationDetails.beginningTime')).tz(timezone).format('HH:mm a') : '',
            siteInformation: await this.returnSiteInfo(_.get(cemeteryServiceDetails, '[0].intermentInformationDetails', {})),
            otherText: '',
            casketDimensions: await this.returnDimensions(_.get(cemeteryServiceDetails, '[0].casketItemDetails', {})),
            urnType: _.get(cemeteryServiceDetails, '[0].urnInformationDetails.urnTypeDetails.name', ''),
            urnDimensions: await this.returnDimensions(_.get(cemeteryServiceDetails, '[0].urnInformationDetails', {})),
            vaultName: _.get(cemeteryServiceDetails, '[0].vaultItemDetails.vault.locationItem.item.name') ? _.get(cemeteryServiceDetails, '[0].vaultItemDetails.vault.locationItem.item.name', '') : _.get(cemeteryServiceDetails, '[0].vaultItemUsageDetails.ItemUsage.agreementItems.locationItem.Item.name', ''),
            specialNotes: _.get(sortedFamilyNotes, '[0].content', '')

        }
        return { textData, checkboxData, groupLabelData }
    }

    async salesCounselorPrefillData () {
        const salesCounselor = this.getSignerByRole(ROLES.salesCounselor, this.formId)
        const { textData, checkboxData, groupLabelData } = await this.salesCounselorPrefillDataForReUse(salesCounselor)
        return this.convertToTextTabsLatest(salesCounselor, textData, checkboxData, groupLabelData)
    }

    legalRepresentativePreFillData () {
        const legalRep = this.getSignerByRole(ROLES.legalRep, this.formId)
        // const legalRepData = legalRep ? (legalRep.personContact ? legalRep.personContact.person : null) : null
        return this.convertToTextTabsLatest(legalRep, {}, {})
    }

    getWitnessLowerValue (data) {
        const propertyTypes = [
            'Cremorial',
            'Niche',
            'Crypt'
        ]
        if (!propertyTypes.includes(_.get(data, 'intermentInformationDetails.properties[0].itemUsage.agreementProperties.property.propertyTypeCode.propertyType.name'))) {
            const attributeValue = _.get(data, 'itemUsage.agreementItems.locationItem.Item.itemAttributes.AttributeValue')
            if (_.get(attributeValue, 'name') === 'Full Body' && _.get(attributeValue, 'attribute.name') === 'burial Type') {
                return true
            }
            return false
        }
        return false
    }

    getEntombValue (data) {
        const cryptProperty = _.get(data, 'intermentInformationDetails.properties[0].itemUsage.agreementProperties.property.propertyTypeCode.propertyType.name', '').includes('Crypt')
        return cryptProperty
    }

    async returnSiteInfo (intermentInformationDetails) {
        if (intermentInformationDetails && intermentInformationDetails.properties && intermentInformationDetails.properties.length > 0) {
            const name = []
            intermentInformationDetails.properties.forEach(property => {
                name.push(_.get(property.itemUsage, 'agreementProperties.property.name'))
            })
            return _.compact(name).join(', ')
        } else if (_.get(intermentInformationDetails, 'temporaryBurialLocationId')) {
            const schedulingController = new SchedulingController()
            const temporaryBurialLocation = await schedulingController.getTempPropertyDataFromHMIS(intermentInformationDetails.temporaryBurialLocationId)
            return temporaryBurialLocation.Location
        }
    }

    getOversizeCasketData (data) {
        const casketData = _.get(data, 'casketItemUsageDetails.ItemUsage.agreementItems', _.get(data, 'casketItemDetails.casket'))
        const isOverSizeCasket = _.get(casketData, 'locationItem.Item.itemAttributes', []).filter(e => _.get(e, 'AttributeValue.name') === 'Oversize Casket')
        return !!isOverSizeCasket.length > 0
    }

    getChildrenCasketData (data) {
        const casketData = _.get(data, 'casketItemUsageDetails.ItemUsage.agreementItems', _.get(data, 'casketItemDetails.casket'))
        const isInfantChildrenCasket = _.get(casketData, 'locationItem.Item.itemAttributes', []).filter(e => _.get(e, 'AttributeValue.name') === 'Infant Children Casket')
        return !!isInfantChildrenCasket.length > 0
    }

    async funeralServiceData (personId) {
        const data = await models.ScheduledFuneralService.scope(
            'schedulingSectionScope',
            'resourceSectionScope'
        )
            .findAll({
                where: { personId: personId || this.person.id, deletedAt: null, deletedBy: null },
                include: [
                    {
                        model: models.AgreementLocationItem,
                        as: 'agreementLocationItem',
                        where: { deletedAt: null },
                        attributes: ['id'],
                        required: true,
                        include: locationItemAndAttributeInclude('Funeral Service')
                    }]
            })
        if (data.length) {
            return data[0]
        }
        return {}
    }

    funeralHomeDetails (data) {
        const clFacilityLocation = _.get(data, 'funeralArrangementDetails.clFacilityLocation')
        const serviceLocation = _.get(data, 'funeralArrangementDetails.serviceLocation')
        return {
            funeralHomeName: _.get(clFacilityLocation, 'name') || _.get(serviceLocation, 'organization.name'),
            funeralHomePhone: _.get(clFacilityLocation, 'phoneNumber') || formatPhoneNumber(_.get(serviceLocation, 'organization.phoneNumber')),
            funeralHomeFax: _.get(clFacilityLocation, 'fax') || _.get(serviceLocation, 'organization.licenseNumber')
        }
    }

    funeralDirectorDetails (data) {
        const directorData = _.get(data, 'funeralArrangementDetails.funeralDirectorDetails')
        return {
            funeralDirectorName: _.get(directorData, 'name'),
            funeralDirectorPhone: formatPhoneNumber(_.get(data, 'funeralArrangementDetails.funeralHomePhone')),
            funeralDirectorEmail: _.get(directorData, 'email')
        }
    }

    returnDimensions (data) {
        const dimensions = []
        dimensions.push(
            _.get(data, 'height', ''),
            _.get(data, 'width', ''),
            _.get(data, 'depth', '')
        )
        return _.compact(dimensions).join('X')
    }

    returnAddress () {
        const address = []
        const line1 = _.get(this.person, 'addressPlace.address.line1', '')
        const line2 = _.get(this.person, 'addressPlace.address.line2', '')
        address.push(line1, line2)
        return _.compact(address).join(' ')
    }

    async getSchedulingCemeteryDetails (personId) {
        const scopes = [
            'intermentInformationSectionScope',
            'intermentRequestSectionScope',
            'genericSectionScope',
            'FuneralArrangementSectionScope',
            'disintermentInfoSectionScope',
            'casketSectionScope',
            'vaultSectionScope',
            'urnInformationScope',
            'noteSectionsScope'
        ]
        const data = await models.ScheduledCemeteryService.scope(scopes).findAll({
            where: {
                personId: personId || this.person.id,
                deletedAt: null,
                deletedBy: null
            },
            include: [
                {
                    model: models.ItemUsage,
                    as: 'itemUsage',
                    required: true,
                    include: [
                        {
                            model: models.AgreementLocationItem,
                            as: 'agreementItems',
                            where: { deletedAt: null },
                            attributes: ['id'],
                            required: true,
                            include: locationItemAndAttributeInclude('Cemetery Graveside Service')
                        }
                    ]
                }
            ]
        })
        return data
    }
}

module.exports = IntermentOrderAuthorizationForm
