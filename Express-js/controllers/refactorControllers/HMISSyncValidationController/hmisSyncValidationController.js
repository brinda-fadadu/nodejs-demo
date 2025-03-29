const models = require('../../../models')
const logger = require('../../../lib/logger')
const _ = require('lodash')
const { funeralInsuranceSaleTypes, funeralTrustSalesTypes } = require('../../../utils/constants')
const hmisValidations = require('../../../lib/hmis-sync-validations.json')
const VerifiedPersonController = require('../personController/verifiedPersonController')
const AdjustmentsController = require('../adjustmentController/discountsAndAdjustmentsHandler')
const AgreementItemController = require('../agreementController/agreementItemController')
const AgreementCashAdvancedController = require('../agreementController/agreementCashAdvanceItemController')
const SchedulingController = require('../schedulingController/schedulingController')
const FinanceController = require('../financeController/financeOptionController')
const AgreementController = require('../agreementController/agreementController')
const AgreementMemorialController = require('../agreementController/agreementMemorialController')
const PropertyController = require('../agreementController/agreementPropertiesController')
const AgreementSpecialOrderRequestController = require('../agreementController/agreementSpecialOrderRequestController')
const FormsController = require('../formsController/formsController')
const { upsert } = require('../utils')
const { bullJobRetry } = require('../../../lib/util')
const seedValues = require('../../../config/seed')
class HMISSyncValidator {
    constructor (agreementId) {
        this.agreementId = parseInt(agreementId)
    }

    _objectParser (obj) {
        return JSON.parse(JSON.stringify(obj))
    }

    // fetching the agreement details with an id
    async getAgreementDetails (transaction) {
        const agreement = await models.Agreement.scope(
            'withAgreementPersons',
            'commonIncludes'
        ).findOne({
            where: {
                id: this.agreementId
            },
            order: [
                [
                    { model: models.AgreementPerson, as: 'beneficiary' },
                    'id',
                    'ASC'
                ]
            ],
            transaction
        })
        if (!agreement) {
            throw new Error('AGREEMENT_NOT_FOUND')
        }
        return agreement
    }

    /**
     * This method return a boolean depending on firstname, lastname, dateofbirth and ssn numbers of a beneficiary person belonging to an agreement
     * @param {*} transaction
     */
    async beneficiaryFieldsMandatoryCheck (transaction) {
        try {
            const agreementController = new AgreementController(this.agreementId)
            const agreement = await agreementController.getAgreementDetails()
            const agreementDetails = agreement.toJSON()
            const personDetailsCheckArr = []
            await Promise.all(
                _.get(agreementDetails, 'beneficiary').map(async item => {
                    const verifiedPersonController = new VerifiedPersonController(item.personId)
                    const person = await verifiedPersonController.getVerifiedPerson(transaction)
                    const personDetails = this._objectParser(person)
                    personDetailsCheckArr.push(!_.get(personDetails, 'firstName') || !_.get(personDetails, 'lastName') || !_.get(personDetails, 'dateOfBirth'))
                    return item
                })
            )
            const personDetailsCheck = arr => arr.every(item => item === false)
            return !personDetailsCheck(personDetailsCheckArr)
        } catch (error) {
            logger.error(error)
            throw error
        }
    }

    /**
     * This method return a boolean depending on missing property owner details belonging to an agreement
     * @param {*} transaction
     */
    async isHavingCompleteOwnerInfo (transaction) {
        try {
            const propertyController = new PropertyController(this.agreementId)
            let getOwnersOfProperties = await propertyController.getOwnersOfProperties()
            getOwnersOfProperties = this._objectParser(getOwnersOfProperties)

            let isMissingInfo = false

            await Promise.all(getOwnersOfProperties.map(async property => {
                await Promise.all(property.ownerDetails.map(async owner => {
                    if (!isMissingInfo) {
                        const verifiedPersonController = new VerifiedPersonController(owner.ownerId)
                        const person = await verifiedPersonController.getVerifiedPerson(transaction)
                        const personDetails = this._objectParser(person)
                        const agreementOwnerDetailsCheck = !_.get(personDetails, 'lastName') || !_.get(personDetails, 'addressPlace.address.line1') || !_.get(personDetails, 'addressPlace.address.country') || !_.get(personDetails, 'addressPlace.address.state') || !_.get(personDetails, 'addressPlace.address.county') || !_.get(personDetails, 'addressPlace.address.city') || !_.get(personDetails, 'addressPlace.address.zipcode') || (!_.get(personDetails, 'phoneNumber') && !_.get(personDetails, 'email'))
                        if (agreementOwnerDetailsCheck) {
                            isMissingInfo = true
                        }
                    }
                }))
            }))

            return isMissingInfo
        } catch (error) {
            logger.error(error)
            throw error
        }
    }

    /**
     * This method return a boolean depending on NOK exists or not for a beneficiary person belonging to an agreement
     * @param {*} transaction
     */
    async isCemeteryNokExists (transaction) {
        try {
            const agreement = await this.getAgreementDetails()
            const agreementDetails = agreement.toJSON()

            // Adding a temperory logic to fetch the personId
            const beneficiaryRole = await models.AgreementRole.findOne({
                where: {
                    name: 'Beneficiary'
                }
            })

            const agreementPerson = _.get(agreementDetails, 'beneficiary').filter(item => {
                return item.roleId === beneficiaryRole.id
            })
            if (!agreementPerson.length) {
                throw new Error('Owner does not exists for this agreement')
            }
            const agreementPersonId = _.get(agreementPerson[0], 'personId')
            const verifiedPersonController = new VerifiedPersonController(agreementPersonId)

            // NOK Details Check
            const nokDetails = await verifiedPersonController.getNokDetails()
            const personNokDetails = this._objectParser(nokDetails)
            const noksCheck = personNokDetails.filter(item => {
                return item.firstName && item.lastName && (item.phoneNumber || item.email) && _.get(item, 'addressPlace.address.line1') && _.get(item, 'addressPlace.address.country') && _.get(item, 'addressPlace.address.state') && _.get(item, 'addressPlace.address.city') && _.get(item, 'addressPlace.address.zipcode')
            })
            const nokDetailsCheck = (personNokDetails.length !== noksCheck.length) || !personNokDetails.length
            return nokDetailsCheck
        } catch (error) {
            logger.error(error)
            throw error
        }
    }

    /**
     * This method return a boolean depending on decedent EDRS mandatory fields belonging to an agreement
     */
    async decedentEDRSMandatoryCheck () {
        try {
            const agreement = await this.getAgreementDetails()
            const agreementDetails = agreement.toJSON()

            // Adding a temperory logic to fetch the personId
            const beneficiaryRole = await models.AgreementRole.findOne({
                where: {
                    name: 'Beneficiary'
                }
            })

            const agreementPerson = _.get(agreementDetails, 'beneficiary').filter(item => {
                return item.roleId === beneficiaryRole.id
            })
            if (!agreementPerson.length) {
                throw new Error('Owner does not exists for this agreement')
            }
            const agreementPersonId = _.get(agreementPerson[0], 'personId')
            const verifiedPersonController = new VerifiedPersonController(agreementPersonId)

            // Primary & Residential Details Check
            const primaryDetails = await verifiedPersonController.getPrimaryDetails()
            const personPrimaryDetails = this._objectParser(primaryDetails)
            const primaryDetailsCheck = !_.get(personPrimaryDetails, 'firstName') || !_.get(personPrimaryDetails, 'lastName') || !_.get(personPrimaryDetails, 'dateOfBirth') || !_.get(personPrimaryDetails, 'maritalStatus') || !_.get(personPrimaryDetails, 'birthPlace.address.country') || !_.get(personPrimaryDetails, 'birthPlace.address.state') || !_.get(personPrimaryDetails, 'gender') || !_.get(personPrimaryDetails, 'personVerificationDetails.ssnLastFour')
            const residentialDetailsCheck =
            (_.get(personPrimaryDetails, 'addressPlace.address.country') === 'United States')
                ? (!_.get(personPrimaryDetails, 'addressPlace.address.line1') || !_.get(personPrimaryDetails, 'addressPlace.address.country') || !_.get(personPrimaryDetails, 'addressPlace.address.state') || !_.get(personPrimaryDetails, 'addressPlace.address.county') || !_.get(personPrimaryDetails, 'addressPlace.address.city') || !_.get(personPrimaryDetails, 'addressPlace.address.zipcode') || !(_.get(personPrimaryDetails, 'personVerificationDetails.yearsAtResidentialAddress') || _.get(personPrimaryDetails, 'personVerificationDetails.yearsAtResidentialAddress') === 0))
                : !_.get(personPrimaryDetails, 'addressPlace.address.country') || !(_.get(personPrimaryDetails, 'personVerificationDetails.yearsAtResidentialAddress') || _.get(personPrimaryDetails, 'personVerificationDetails.yearsAtResidentialAddress') === 0)

            // Ethnicity Details Check
            const ethnicityDetails = await verifiedPersonController.getEthnicityDetails()
            const personEthnicityDetails = this._objectParser(ethnicityDetails)
            const ethnicityDetailsCheck = _.get(personEthnicityDetails, 'isHispanic', null) === null ? !_.get(personEthnicityDetails, 'isHispanic') : false
            // const ethnicityDetailsCheck = _.get(personEthnicityDetails, 'isHispanic') ? !_.get(personEthnicityDetails, 'hispanic.id') || (!_.get(personEthnicityDetails, 'ethnicityOne') && !_.get(personEthnicityDetails, 'ethnicityTwo') && !_.get(personEthnicityDetails, 'ethnicityThree')) : false

            // Education Details Check
            const educationDetails = await verifiedPersonController.getEducationDetails()
            const personEducationDetails = this._objectParser(educationDetails)
            const educationDetailsCheck = !_.get(personEducationDetails, 'qualificationId') || !_.get(personEducationDetails, 'occupation') || !_.get(personEducationDetails, 'industry') || !(_.get(personEducationDetails, 'yearsOfOccupation') || _.get(personEducationDetails, 'yearsOfOccupation') === 0)

            // Veteran Details Check
            const veteranDetails = await verifiedPersonController.getVeteranDetails()
            const personVeteranDetails = this._objectParser(veteranDetails)
            const veteranDetailsCheck = _.get(personVeteranDetails, 'serviceBranchId') ? !_.get(personVeteranDetails, 'serviceBranchId') || !_.get(personVeteranDetails, 'serviceEra') : false

            // Parents Details Check
            const parentsDetails = await verifiedPersonController.getParentsDetails()
            const personParentsDetails = this._objectParser(parentsDetails)
            const parentsAddressCheck = _.get(personParentsDetails[0], 'birthPlace.address.country') === 'United States' ? !_.get(personParentsDetails[0], 'birthPlace.address.country') || !_.get(personParentsDetails[0], 'birthPlace.address.state') || !_.get(personParentsDetails[1], 'firstName') || !_.get(personParentsDetails[1], 'lastName') || !_.get(personParentsDetails[1], 'birthPlace.address.country') || !_.get(personParentsDetails[1], 'birthPlace.address.state') : !_.get(personParentsDetails[0], 'birthPlace.address.country')
            const parentsDetailsCheck = !personParentsDetails.length === 2 || !_.get(personParentsDetails[0], 'firstName') || !_.get(personParentsDetails[0], 'lastName') || parentsAddressCheck

            // Death Details Check
            const deathDetails = await verifiedPersonController.getDeathDetails()
            const personDeathDetails = this._objectParser(deathDetails)
            const addressCheck = _.get(personDeathDetails, 'deathPlace.address.country') === 'United States' ? (!_.get(personDeathDetails, 'deathPlace.address.line1') || !_.get(personDeathDetails, 'deathPlace.address.country') || !_.get(personDeathDetails, 'deathPlace.address.state') || !_.get(personDeathDetails, 'deathPlace.address.city')) : !_.get(personDeathDetails, 'deathPlace.address.country') || !_.get(personDeathDetails, 'deathPlace.address.line1')
            const deathDetailsCheck = !_.get(personDeathDetails, 'dateOfDeath') || addressCheck

            // Notifier Details Check
            const notifierDetails = await verifiedPersonController.getNotifierDetails()
            const personNotifierDetails = this._objectParser(notifierDetails)
            const relationIdOfPerson = _.get(personNotifierDetails, 'person.addressPlace.organization.id') ? false : !_.get(personNotifierDetails, 'relationId')
            const notifierAddressCheck = _.get(personNotifierDetails, 'person.addressPlace.address.country') === 'United States' ? !_.get(personNotifierDetails, 'person.addressPlace.address.line1') || !_.get(personNotifierDetails, 'person.addressPlace.address.country') || !_.get(personNotifierDetails, 'person.addressPlace.address.state') || !_.get(personNotifierDetails, 'person.addressPlace.address.city') || !_.get(personNotifierDetails, 'person.addressPlace.address.zipcode') : !_.get(personNotifierDetails, 'person.addressPlace.address.country') || !_.get(personNotifierDetails, 'person.addressPlace.address.line1')
            const notifierDetailsCheck = !_.get(personNotifierDetails, 'person.firstName') || !_.get(personNotifierDetails, 'person.lastName') || relationIdOfPerson || notifierAddressCheck

            // NOK Details Check
            const nokDetails = await verifiedPersonController.getNokDetails()
            const personNokDetails = this._objectParser(nokDetails)
            const noksCheck = personNokDetails.filter(item => {
                return item.firstName && item.lastName
            })
            const nokDetailsCheck = (personNokDetails.length !== noksCheck.length) || !personNokDetails.length

            return primaryDetailsCheck || residentialDetailsCheck || ethnicityDetailsCheck || educationDetailsCheck || veteranDetailsCheck || parentsDetailsCheck || deathDetailsCheck || notifierDetailsCheck || nokDetailsCheck
        } catch (error) {
            logger.error(error)
            throw error
        }
    }

    /**
     * This method return a boolean depending on whether the first transfer type is Ship in
     */
    async transferTypeCheck () {
        try {
            const agreement = await this.getAgreementDetails()
            const agreementDetails = agreement.toJSON()

            // Adding a temperory logic to fetch the personId
            const beneficiaryRole = await models.AgreementRole.findOne({
                where: {
                    name: 'Beneficiary'
                }
            })

            const agreementPerson = _.get(agreementDetails, 'beneficiary').filter(item => {
                return item.roleId === beneficiaryRole.id
            })
            if (!agreementPerson.length) {
                throw new Error('Owner does not exists for this agreement')
            }
            const agreementPersonId = _.get(agreementPerson[0], 'personId')

            // fetching the transfer type for the agreement person
            const agreementPersonSaleTypes = await models.sequelize.query(`
            SELECT * FROM PersonRemainsTransfer WHERE personId =:personId AND deletedAt IS NULL AND deletedBy IS NULL ORDER BY id ASC`, {
                type: models.sequelize.QueryTypes.SELECT,
                replacements: {
                    personId: agreementPersonId
                }
            })

            let agreementPersonShipInSaleTypeCheck = false

            let agreementPersonShipInSaleType = _.get(agreementPersonSaleTypes, 'length', 0) ? _.get(agreementPersonSaleTypes[0], 'transferType') : null

            if (agreementPersonShipInSaleType) {
                let saleType = seedValues.seed.TransferType[agreementPersonShipInSaleType]
                agreementPersonShipInSaleTypeCheck = (saleType === 'Ship In')
            }

            return agreementPersonShipInSaleTypeCheck
        } catch (error) {
            logger.error(error)
            throw error
        }
    }

    /**
     * This method return a boolean depending on certifier mandatory fields belonging to an agreement
     */
    async certifierMandatoryCheck () {
        try {
            const agreement = await this.getAgreementDetails()
            const agreementDetails = agreement.toJSON()

            // Adding a temperory logic to fetch the personId
            const beneficiaryRole = await models.AgreementRole.findOne({
                where: {
                    name: 'Beneficiary'
                }
            })

            const agreementPerson = _.get(agreementDetails, 'beneficiary').filter(item => {
                return item.roleId === beneficiaryRole.id
            })
            if (!agreementPerson.length) {
                throw new Error('Owner does not exists for this agreement')
            }
            const agreementPersonId = _.get(agreementPerson[0], 'personId')
            const verifiedPersonController = new VerifiedPersonController(agreementPersonId)

            // Certifier Details Check
            const certifierDetails = await verifiedPersonController.getCerifierDetails()
            const personCertifierDetails = this._objectParser(certifierDetails)
            const certifierDetailsCheck = !_.get(personCertifierDetails, 'certifier.licenseNumber') || !_.get(personCertifierDetails, 'certifier.certifierPerson.firstName') || !_.get(personCertifierDetails, 'certifier.faxNumber') || !_.get(personCertifierDetails, 'certifier.certifierPerson.addressPlace.address.line1') || !_.get(personCertifierDetails, 'certifier.certifierPerson.addressPlace.address.country') || !_.get(personCertifierDetails, 'certifier.certifierPerson.addressPlace.address.state') || !_.get(personCertifierDetails, 'certifier.certifierPerson.addressPlace.address.city') || !_.get(personCertifierDetails, 'certifier.certifierPerson.addressPlace.address.zipcode')

            return certifierDetailsCheck
        } catch (error) {
            logger.error(error)
            throw error
        }
    }

    /**
     * This method return a boolean depending on whether all the services are scheduled or not belonging to an agreement
     * @param {*} transaction
     */
    async isAllServicesAreScheduled (transaction) {
        try {
            const agreement = await this.getAgreementDetails()
            const agreementDetails = agreement.toJSON()

            // Adding a temperory logic to fetch the personId
            const beneficiaryRole = await models.AgreementRole.findOne({
                where: {
                    name: 'Beneficiary'
                }
            })

            const agreementPerson = _.get(agreementDetails, 'beneficiary').filter(item => {
                return item.roleId === beneficiaryRole.id
            })
            if (!agreementPerson.length) {
                throw new Error('Owner does not exists for this agreement')
            }
            const agreementPersonId = _.get(agreementPerson[0], 'personId')
            const listOfServices = await SchedulingController.getSchedulableServices(agreementPersonId)
            const schedulableServices = (listOfServices || []).filter(item => {
                return _.get(item, 'schedulingAttribute') !== 'Funeral Graveside Service'
            })
            const agreementType = agreementDetails.type === 1 ? 'FUNERAL' : 'CEMETERY'

            const funeralServices = schedulableServices.filter(item => {
                return item.agreementType.toUpperCase() === agreementType && item.agreementId === this.agreementId
            })
            const schuduledServices = funeralServices.filter(item => {
                return item[agreementDetails.type === 1 ? 'scheduledFuneralService' : 'scheduledCemeteryService'] && _.get(item, 'schedulingAttribute') !== 'Funeral Graveside Service'
            })

            return !(funeralServices.length === schuduledServices.length)
        } catch (error) {
            logger.error(error)
            throw error
        }
    }
    /**
     * This method return a boolean depending on whether all the special orders are cleared/approved or not belonging to an agreement
     * @param {*} transaction
     */
    async isAllSpecialItemsAreCleared () {
        try {
            const agreementSpecialOrderRequestController = new AgreementSpecialOrderRequestController(this.agreementId)
            const getSpecialOrderRequests = await agreementSpecialOrderRequestController.getSpecialOrderRequests(this.agreementId)
            return getSpecialOrderRequests.total
        } catch (error) {
            logger.error(error)
            throw error
        }
    }
    /**
     * This method return a boolean depending on cemetery schedules service contains funeral home details or not belonging to an agreement
     * @param {*} transaction
     */
    async isFuneralHomeInfoExists (transaction) {
        try {
            const agreement = await this.getAgreementDetails()
            const agreementDetails = agreement.toJSON()

            // Adding a temperory logic to fetch the personId
            const beneficiaryRole = await models.AgreementRole.findOne({
                where: {
                    name: 'Beneficiary'
                }
            })

            const agreementPerson = _.get(agreementDetails, 'beneficiary').filter(item => {
                return item.roleId === beneficiaryRole.id
            })
            if (!agreementPerson.length) {
                throw new Error('Owner does not exists for this agreement')
            }
            const agreementPersonId = _.get(agreementPerson[0], 'personId')
            const listOfServices = await SchedulingController.getSchedulableServices(agreementPersonId)

            const cemeteryServices = listOfServices.filter(item => {
                return item.agreementType === 'Cemetery' && item.agreementId === this.agreementId
            })
            let scheduledCMServices = cemeteryServices.filter(item => {
                return _.get(item, 'scheduledCemeteryService.id')
            })
            scheduledCMServices = this._objectParser(scheduledCMServices)

            const schedulingController = new SchedulingController()
            const scheduledFNHomeServices = []
            await Promise.all(scheduledCMServices.map(async item => {
                let listOfScheduledServices = await schedulingController.getScheduledCemeteryServiceDetails(agreementPersonId, _.get(item, 'scheduledCemeteryService.id'), transaction)
                listOfScheduledServices = this._objectParser(listOfScheduledServices)
                if ((_.get(listOfScheduledServices, 'funeralArrangementDetails.serviceLocation.organization.name') && _.get(listOfScheduledServices, 'funeralArrangementDetails.serviceLocation.address.line1') && _.get(listOfScheduledServices, 'funeralArrangementDetails.serviceLocation.address.country') && _.get(listOfScheduledServices, 'funeralArrangementDetails.serviceLocation.address.state') && _.get(listOfScheduledServices, 'funeralArrangementDetails.serviceLocation.address.city') && _.get(listOfScheduledServices, 'funeralArrangementDetails.serviceLocation.address.county') && _.get(listOfScheduledServices, 'funeralArrangementDetails.serviceLocation.address.zipcode')) || (_.get(listOfScheduledServices, 'funeralArrangementDetails.clFacilityLocation.id')) || item.workOrderStatus === 'closed') {
                    scheduledFNHomeServices.push(item)
                    return true
                }
            }))
            return !(scheduledCMServices.length === scheduledFNHomeServices.length)
        } catch (error) {
            logger.error(error)
            throw error
        }
    }

    async isReloadTypeProperty () {
        const propertyController = new PropertyController(this.agreementId)
        let getOwnersOfProperties = await propertyController.getOwnersOfProperties()
        getOwnersOfProperties = this._objectParser(getOwnersOfProperties)
        let isReloadPropertyType = false
        if (getOwnersOfProperties && getOwnersOfProperties.length > 0) {
            getOwnersOfProperties.map(item => {
                if (_.get(item, 'propertyType') === 'Reload') {
                    isReloadPropertyType = true
                }
            })
        }
        return isReloadPropertyType
    }

    /**
     * This method return a boolean depending on cemetery property owner exists or not
     * @param {*} transaction
     */
    async isMiscSalesDueExists () {
        try {
            const agreement = await models.Agreement.findOne({ where: { id: this.agreementId } })
            return agreement.due > 0
        } catch (error) {
            logger.error(error)
            throw error
        }
    }

    /**
     * This method return a boolean depending on cemetery property owner exists or not
     * @param {*} transaction
     */
    async isPropertyOwnerExists () {
        try {
            const agreement = await models.Agreement.findOne({ where: { id: this.agreementId } })
            const propertyController = new PropertyController(this.agreementId)
            let getOwnersOfProperties = await propertyController.getOwnersOfProperties()
            getOwnersOfProperties = this._objectParser(getOwnersOfProperties)
            let ownerExistsInEachProperty = []
            let isReloadPropertyType = false
            if (getOwnersOfProperties && getOwnersOfProperties.length > 0) {
                getOwnersOfProperties.map(item => {
                    if (_.get(item, 'ownerDetails.length')) {
                        ownerExistsInEachProperty.push(true)
                    }
                    if (_.get(item, 'propertyType') === 'Reload') {
                        isReloadPropertyType = true
                    }
                })
            }
            if (isReloadPropertyType) return false

            const exceptionAgreement = (agreement.contractNumber.startsWith('AA') || agreement.contractNumber.startsWith('OM'))
            if (getOwnersOfProperties.length === 0 && exceptionAgreement) {
                return !exceptionAgreement
            } else {
                const isPropertyOwnerExists =
                getOwnersOfProperties.length ===
                ownerExistsInEachProperty.length
                return !isPropertyOwnerExists
            }
        } catch (error) {
            logger.error(error)
            throw error
        }
    }
    /**
     * This method returns a boolean depending on whether the agreement have itemCategoryAttributeValues of category vault in gardenSpec or gardenSpecException
     */
    async checkVaultSpec () {
        try {
            let propertyQuery = `
            SELECT propertyId 
            FROM AgreementProperty 
            WHERE agreementId = ${this.agreementId}
            AND reservationStatus = 'confirmed' 
            AND deletedAt IS NULL 
            AND deletedBy IS NULL`

            let vaultItemCategoryQuery = `
            SELECT id
            FROM ItemCategory
            WHERE ItemCategory.name IN ('Vault')`

            let vaultItemCategoryAttributeValueQuery = `
            SELECT ItemCategoryAttributeValue.id
            FROM ItemCategoryAttributeValue
            WHERE ItemCategoryAttributeValue.itemCategoryId IN (${vaultItemCategoryQuery})`

            let gardenSpecExceptionQuery = `
            SELECT COUNT (GardenSpecException.id) AS vaultCount
            FROM GardenSpecException
            WHERE GardenSpecException.propertyId IN (${propertyQuery})
            AND GardenSpecException.itemCategoryAttributeValueId IN (${vaultItemCategoryAttributeValueQuery})`

            let gardenSpecException = await models.sequelize.query(gardenSpecExceptionQuery, {
                type: models.sequelize.QueryTypes.SELECT
            })

            let gardenSpec
            let gardenSpecQuery

            if (!_.get(gardenSpecException, '[0].vaultCount', false)) {
                let hasSideBySideBit = 0

                const sidebysideProperties = await models.sequelize.query(`SELECT * FROM SideBySideProperty WHERE agreementId=${this.agreementId} and deletedAt IS NULL`, {
                })

                if (sidebysideProperties[0].length) {
                    hasSideBySideBit = 1
                }

                let intermentRightsIdQuery = `SELECT IntermentRights.id FROM IntermentRights 
                INNER JOIN PropertyType ON IntermentRights.propertyTypeId = PropertyType.id 
                INNER JOIN PropertyTypeCode ON PropertyTypeCode.propertyTypeId = PropertyType.id 
                INNER JOIN Property ON PropertyTypeCode.id = Property.propertyTypeCodeId 
                INNER JOIN AgreementProperty ON Property.id = AgreementProperty.propertyId 
                WHERE AgreementProperty.agreementId = ${this.agreementId} AND IntermentRights.propertyCampusId IN (
                    SELECT DISTINCT(PropertyCampus.Id) FROM AgreementProperty
                    INNER JOIN Property ON Property.id = AgreementProperty.propertyId
                    INNER JOIN PropertyGarden ON PropertyGarden.id = Property.propertyGardenId
                    INNER JOIN PropertyCampus ON PropertyCampus.id = PropertyGarden.propertyCampusId
                    WHERE AgreementProperty.agreementId = ${this.agreementId}
                    AND AgreementProperty.reservationStatus = 'confirmed'
                    AND AgreementProperty.deletedAt IS NULL
                    AND AgreementProperty.deletedBy IS NULL
                )
                AND AgreementProperty.reservationStatus = 'confirmed'
                AND AgreementProperty.deletedAt IS NULL
                AND AgreementProperty.deletedBy IS NULL
                AND IntermentRights.graves = (CASE WHEN PropertyType.name = 'Grave' AND ${hasSideBySideBit} = 0 THEN 1 ELSE IntermentRights.graves END )`

                gardenSpecQuery = `
                SELECT COUNT(GardenSpec.id) AS vaultCount
                FROM GardenSpec
                WHERE GardenSpec.intermentRightsId IN (${intermentRightsIdQuery})
                AND GardenSpec.itemCategoryAttributeValueId IN (${vaultItemCategoryAttributeValueQuery})`

                gardenSpec = await models.sequelize.query(gardenSpecQuery, {
                    type: models.sequelize.QueryTypes.SELECT
                })
            }

            return Boolean(_.get(gardenSpecException, '[0].vaultCount', false) || _.get(gardenSpec, '[0].vaultCount', false))
        } catch (error) {
            logger.error(error)
            throw error
        }
    }

    /**
     * This method return a boolean depending on accommodation discount is approved or not belonging to an agreement
     * @param {*} transaction
     */
    async isAccommodationDiscountRequiresApproval (transaction) {
        try {
            const listOfPromoAdjustments = await AdjustmentsController.getAgreementAdjustments(this.agreementId)
            let accommodationDiscountValidation = false
            listOfPromoAdjustments.map(item => {
                if (item.adjustmentName && item.adjustmentName.includes('Accommodation') && item.status === 'Requires Approval') {
                    accommodationDiscountValidation = true
                }
            })
            return accommodationDiscountValidation
        } catch (error) {
            logger.error(error)
            throw error
        }
    }

    /**
     * This method return a boolean depending on atlease 1 death certificate is present or not belonging to an agreement
     * @param {*} transaction
     */
    async isDeathCertificatePurchased (transaction) {
        try {
            const agreementCashAdvancedController = new AgreementCashAdvancedController(this.agreementId)
            const agreementCashAdvanceItems = await agreementCashAdvancedController.getAgreementCashAdvancedItems()
            const isDeathCertificateExists = agreementCashAdvanceItems.filter(item => {
                return item.name === 'Death Certificate'
            })
            return !isDeathCertificateExists.length
        } catch (error) {
            logger.error(error)
            throw error
        }
    }

    getFormName (agreementDetails, addendumId) {
        let formName = 'AN Statement of Goods and Services'
        if (_.get(agreementDetails, 'type') === 2 && !addendumId) {
            formName = 'Retail installment agreement'
        }
        if (_.get(agreementDetails, 'type') === 2 && addendumId) {
            formName = 'Installment Agreement Addendum'
        }
        if (
            _.get(agreementDetails, 'type') === 1 &&
            funeralInsuranceSaleTypes.includes(_.get(agreementDetails, 'saleType.code', null))
        ) {
            formName = 'PN Statement of Goods and Services - Insurance'
        }
        if (
            _.get(agreementDetails, 'type') === 1 &&
            funeralTrustSalesTypes.includes(_.get(agreementDetails, 'saleType.code', null))
        ) {
            formName = 'PN Statement of Goods and Services - Trust'
        }

        return formName
    }

    /**
     * This method return a boolean if document is signed or not for an agreement
     */
    async missingContractSignCheck () {
        const agreement = await this.getAgreementDetails()
        const agreementDetails = agreement.toJSON()

        // Adding a temperory logic to fetch the personId
        const beneficiaryRole = await models.AgreementRole.findOne({
            where: {
                name: 'Beneficiary'
            }
        })

        const agreementPerson = _.get(agreementDetails, 'beneficiary').filter(item => {
            return item.roleId === beneficiaryRole.id
        })
        if (!agreementPerson.length) {
            throw new Error('Owner does not exists for this agreement')
        }
        const activeAddendum = await models.Addendum.findOne({ where: { agreementId: this.agreementId, status: 'In Progress' } })
        const addendumId = _.get(activeAddendum, 'id', null)
        const agreementPersonId = _.get(agreementPerson[0], 'personId')
        const getFormName = this.getFormName(agreementDetails, addendumId)
        const getFormInfo = await models.Form.findOne({
            where: { title: getFormName }
        })
        const caseInfoForm = await models.CaseInfoForm.findAll({
            where: {
                agreementId: this.agreementId,
                personId: agreementPersonId,
                formId: _.get(getFormInfo, 'id', null)
            },
            limit: 1,
            order: [['createdAt', 'DESC']]
        })
        let showError = true
        if (caseInfoForm.length > 0) {
            const formObj = {
                formName: getFormName,
                agreementId: this.agreementId,
                addendumId: addendumId
            }
            const formsList = await new FormsController().getCaseInfoForms(agreementPersonId, formObj)
            const formStatus = []
            if (formsList.length > 0) {
                formStatus.push(_.lowerCase(formsList[0].status))
                formsList[0].recipients.length && formsList[0].recipients.map(recepItem => {
                    formStatus.push(_.lowerCase(recepItem.status))
                })

                showError = !(formStatus.every((val, i, arr) => val === arr[0]) && formStatus[0] === 'completed')
            }
        }
        return showError
        // if (agreementDetails.status !== 'Submitted') {
        //     const caseInfoForm = await models.CaseInfoForm.findAll({ where: {
        //         agreementId: this.agreementId,
        //         personId: agreementPersonId
        //     },limit: 1, order: [['createdAt', 'DESC']] })
        // return caseInfoForm.filter(form => form.status !== 'Completed').length || !caseInfoForm.length
        // } else {
        //     const addendum = await models.Addendum.findOne({
        //         where: {
        //             agreementId: this.agreementId,
        //             status: 'In progress'
        //         }
        //     })

        //     const caseInfoForm = await models.CaseInfoForm.findAll({
        //         where: {
        //             agreementId: this.agreementId,
        //             personId: agreementPersonId,
        //             addendumId: addendum.id
        //         }
        //     })
        //     return (caseInfoForm.length !== caseInfoForm.filter(form => form.status === 'Completed').length) || !caseInfoForm.length
        // }
    }

    /**
     * This method return a boolean depending on, whether the agreement has a body tracking number
     */
    async missingBodyTrackingNumberCheck () {
        const agreement = await this.getAgreementDetails()
        const agreementDetails = agreement.toJSON()
        // Adding a temperory logic to fetch the personId
        const beneficiaryRole = await models.AgreementRole.findOne({
            where: {
                name: 'Beneficiary'
            }
        })

        const agreementPerson = _.get(agreementDetails, 'beneficiary').filter(item => {
            return item.roleId === beneficiaryRole.id
        })
        if (!agreementPerson.length) {
            throw new Error('Owner does not exists for this agreement')
        }
        const agreementPersonId = _.get(agreementPerson[0], 'personId')
        /** Check if any active addendum present */

        const isAddendumPresent = await models.Addendum.findOne({ where: { agreementId: this.agreementId, status: 'In Progress' } })
        let bodyTrackingNumberCheck
        // at contract level if bodytracking number is required, display error message
        if (!isAddendumPresent) {
            const bodyTrackingNumber = await models.sequelize.query(
                `SELECT * FROM PersonRemainsInfo WHERE personId =:personId AND bodyTransferTrackingNumber IS NOT NULL`, {
                    type: models.sequelize.QueryTypes.SELECT,
                    replacements: {
                        personId: agreementPersonId
                    }
                })
            bodyTrackingNumberCheck = bodyTrackingNumber.length
        } else { // at addendum level , warning is removed
            bodyTrackingNumberCheck = true
        }
        return !bodyTrackingNumberCheck
    }

    /**
     * This method validates the agreement before syncing with hmis db
     * @param {object} data
     * @param {boolean} data.warningsAcknowledged
     * @param {*} user
     */
    async validateAgreement (data, user) {
        try {
            // Checking if the agreement exists
            let agreement = await models.Agreement.findOne({
                where: {
                    id: this.agreementId
                }
            })
            if (!agreement) throw new Error('AGREEMENT_NOT_FOUND')
            if (!agreement.saleTypeId) throw new Error('SALE_TYPE_IS_MANDATORY_TO_VALIDATE')
            // TODO: to validate based on resouceType agreement/addendum
            // if (agreement.isValidated) throw new Error('AGREEMENT_CANNOT_BE_VALIDATED_AGAIN')

            // Get Agreement Sale Type
            // TODO: Make the arrange types and agreement types dynamic
            let agreementDetailQuery = `
                SELECT
                SaleType.code,
                CASE
                    WHEN Agreement.type = 5 THEN 'Misc Sales'
                    WHEN SaleType.arrangementType = 1 AND SaleType.agreementType = 1 THEN 'AN Funeral'
                    WHEN SaleType.arrangementType = 1 AND SaleType.agreementType = 2 THEN 'AN Cemetery'
                    WHEN SaleType.arrangementType = 2 AND SaleType.agreementType = 1 THEN 'PN Funeral Trust'
                    WHEN SaleType.arrangementType = 2 AND SaleType.agreementType = 2 THEN 'PN Cemetery'
                    ELSE ''
                END AS saleType
                FROM Agreement
                INNER JOIN SaleType ON SaleType.id = Agreement.saleTypeId
                WHERE Agreement.id =:agreementId
            `
            const agreementDetails = await models.sequelize.query(agreementDetailQuery, {
                type: models.sequelize.QueryTypes.SELECT,
                replacements: {
                    agreementId: this.agreementId
                }
            })

            if (funeralInsuranceSaleTypes.includes(agreementDetails[0].code) && agreementDetails[0].saleType.includes('PN')) agreementDetails[0].saleType = agreementDetails[0].saleType.replace('Trust', 'Insurance').trim()
            // Gets the validations to be checked for the saleType
            let validations
            if (agreement.status !== 'Cancelled') {
                validations = await this.getValidations(agreementDetails[0].saleType)
            }
            let errors = []
            if (!validations) {
                await this.hmisDataSync(user, data.warningsAcknowledged)
                return { validations: errors }
            }

            await Promise.all(validations.map(async validation => {
                let error = await this.agreementValidator(validation, agreementDetails[0].saleType)
                error && errors.push(error)
            }))
            let highErrors = errors.find(val => val.errorLevel === 'High') || []
            if (!errors.length || (highErrors.length === 0 && data.warningsAcknowledged)) {
                await this.hmisDataSync(user, data.warningsAcknowledged)
                return { validations: [] }
            }
            return { validations: errors }
        } catch (error) {
            logger.error(error)
            throw error
        }
    }

    /**
     * this method inserts record in hmisdatasync and updated isValidated in Agreement
     * @param {*} user
     */
    async hmisDataSync (user, warningsAcknowledged = false) {
        let transaction
        try {
            transaction = await models.sequelize.transaction()
            // TODO: get agreement
            let agreement = await models.Agreement.findOne({ where: { id: this.agreementId }, transaction })
            if (agreement && (!agreement.isValidated || agreement.status === 'In progress')) {
                await this.upsertHmisDataSync(user, warningsAcknowledged, transaction)
                await upsert('Agreement', { isValidated: true, id: this.agreementId }, transaction, { userId: user.id })
                await transaction.commit()
                // Add job
                const { queueNames, queues } = require('../../../appQueues')
                const hmisSyncQueue = queues[queueNames.hmis_sync_queue]
                let jobData = {
                    agreementId: this.agreementId,
                    user
                }
                hmisSyncQueue.add('SyncContract', jobData, bullJobRetry)
            } else {
                const hmisDataSync = await models.HMISDataSync.findOne({ where: {
                    agreementId: this.agreementId
                },
                transaction
                })
                if (!_.get(hmisDataSync, 'HMISSalesId')) {
                    throw new Error('There is no sales id for this agreement')
                }

                const addendum = await models.Addendum.findOne({ where: {
                    agreementId: this.agreementId,
                    [models.Sequelize.Op.or]: [ { isValidated: null }, { isValidated: false } ],
                    status: {
                        [models.Sequelize.Op.ne]: 'Submitted'
                    }
                },
                transaction })
                if (addendum) {
                    await this.upsertHmisAddendumDataSync(user, addendum.id, warningsAcknowledged, transaction)
                    await upsert('Addendum', { id: addendum.id, isValidated: true, agreementId: this.agreementId }, transaction, { userId: user.id })
                    await transaction.commit()
                    // Add job
                    const { queueNames, queues } = require('../../../appQueues')
                    const hmisSyncQueue = queues[queueNames.hmis_sync_queue]
                    let jobData = {
                        agreementId: this.agreementId,
                        addendumId: addendum.id,
                        user
                    }
                    hmisSyncQueue.add('SyncContractAddendum', jobData, bullJobRetry)
                } else {
                    // Some thing went wrong
                    throw new Error('No new addendum to validate or sync')
                }
            }
        } catch (error) {
            logger.error(error)
            await transaction.rollback()
            throw error
        }
    }

    /**
     * This method return a boolean depending on, whether all the agreement persons has the address details or not
     */
    async missingAgreementPersonAddressCheck (agreementId) {
        // Fetch all agreement preson addresses
        let agreementPersonsAddress = await models.sequelize.query(`
            SELECT
            Person.id,
            Address.*
            FROM AgreementPerson
            INNER JOIN Person ON Person.id = AgreementPerson.personId
            LEFT JOIN Place ON Place.id = Person.addressPlaceId
            LEFT JOIN Address ON Address.id = Place.addressId
            WHERE AgreementPerson.agreementId =:agreementId 
            AND AgreementPerson.deletedBy IS NULL 
            UNION
            SELECT
            Person.id,
            Address.*
            FROM AgreementProperty
            INNER JOIN AgreementPropertyOwner ON AgreementPropertyOwner.agreementPropertyId = AgreementProperty.id
            INNER JOIN Person ON Person.id = AgreementPropertyOwner.ownerId
            LEFT JOIN Place ON Place.id = Person.addressPlaceId
            LEFT JOIN Address ON Address.id = Place.addressId
            WHERE AgreementProperty.agreementId =:agreementId  
            AND AgreementProperty.deletedBy IS NULL 
            AND AgreementPropertyOwner.deletedBy IS NULL `, {
            type: models.sequelize.QueryTypes.SELECT,
            replacements: {
                agreementId: agreementId
            }
        })

        let agreementPersonWithAddress = agreementPersonsAddress.filter((person) => {
            return _.get(person, 'line1') && _.get(person, 'country') && _.get(person, 'state') && _.get(person, 'city') && _.get(person, 'zipcode')
        })

        let agreementPersonWithAddressCheck = false

        if (agreementPersonsAddress.length === agreementPersonWithAddress.length) agreementPersonWithAddressCheck = true

        return !agreementPersonWithAddressCheck
    }

    /**
     * this method inserts a record into HmisDataSync
     * @param {*} user
     * @param {*} transaction
     */
    async upsertHmisDataSync (user, warningsAcknowledged = false, transaction) {
        try {
            const hmisDataSync = await models.HMISDataSync.findOne({ where: { agreementId: this.agreementId }, transaction })
            let status = await models.HMISDataSyncStatus.findOne({
                where: {
                    name: 'InQueue'
                },
                transaction
            })
            let hmisData = {
                id: _.get(hmisDataSync, 'id', null),
                agreementId: this.agreementId,
                HMISSalesId: null,
                statusId: status.id,
                active: true, // TODO: to check with Narendra when active will be false
                warningsAcknowledged: warningsAcknowledged
            }
            await upsert('HMISDataSync', hmisData, transaction, { userId: user.id })
        } catch (error) {
            logger.error(error)
            throw error
        }
    }

    async upsertHmisAddendumDataSync (user, addendumId, warningsAcknowledged, transaction) {
        try {
            const hmisDataSync = await models.HMISDataSync.findOne({ where: { agreementId: this.agreementId }, transaction })
            const hmisAddendum = await models.HMISAddendumDataSync.findOne({
                where: {
                    addendumId
                }
            })
            let status = await models.HMISDataSyncStatus.findOne({
                where: {
                    name: 'InQueue'
                },
                transaction
            })
            let hmisAddendumData = {
                id: _.get(hmisAddendum, 'id', null),
                addendumId,
                hmisDataSyncId: _.get(hmisDataSync, 'id', null),
                statusId: status.id,
                warningsAcknowledged
            }
            await upsert('HMISAddendumDataSync', hmisAddendumData, transaction, { userId: user.id })
        } catch (error) {
            logger.error(error)
            throw error
        }
    }

    async agreementValidator (validationObject, saleType) {
        let validation
        const agreeementController = new AgreementController(this.agreementId)
        const financeController = new FinanceController(this.agreementId)
        const agreementItemController = new AgreementItemController(this.agreementId)
        const agreementMemorialController = new AgreementMemorialController(this.agreementId)

        switch (validationObject.code) {
        case 'BENEFICIARY_INFORMATION':
            let beneficiaryFieldsMandatoryCheck = await this.beneficiaryFieldsMandatoryCheck()
            if (beneficiaryFieldsMandatoryCheck) validation = validationObject
            break
        case 'ACCOMMODATION_DISCOUNT_NOT_APPROVED':
            let isAccommodationDiscountRequiresApproval = await this.isAccommodationDiscountRequiresApproval()
            if (isAccommodationDiscountRequiresApproval) validation = validationObject
            break
        case 'DOWN_PAYMENT<20':
            let downPayment20Percentage = true
            let agreementFinanceCheck20 = await agreeementController.agreementFinanceCheck()
            if (agreementFinanceCheck20) {
                downPayment20Percentage = await agreeementController.downPaymentPercentageCheck('agreementFinanceDownPaymentPercentageCheck')
            } else {
                downPayment20Percentage = await agreeementController.downPaymentPercentageCheck(20)
            }
            /** Note: When the user have opted for a finance the percentage to with which is compared is the downpayment
            percentage of the finance and the validation error message as well as the resolute changes */
            if (!downPayment20Percentage) {
                if (agreementFinanceCheck20) {
                    let newValidationObject = { ...validationObject }
                    newValidationObject['error'] = 'Less than agreed downpayment'
                    newValidationObject['resolution'] = 'Receive more than agreed downpayment'
                    validation = newValidationObject
                } else {
                    validation = validationObject
                }
            }
            break
        case 'SPECIAL_FINANCING_NOT_APPROVED':
            let specialFinancingApprovedDetails = true
            let agreementSpecialFinanceCheck = await financeController.agreementSpecialFinanceCheck()
            if (agreementSpecialFinanceCheck) specialFinancingApprovedDetails = await financeController.specialFinancesApprovedByCeoOrCfoCheck()
            if (agreementSpecialFinanceCheck && !specialFinancingApprovedDetails) validation = validationObject
            break
        case 'NO_CASKET_OR_MINIMAL_CONTAINER':
            let casketOrMinimalContainerDetails = await agreementItemController.agreementCasketOrMinimalContainerCheck([this.agreementId])
            if (!casketOrMinimalContainerDetails) {
                let agreementIds = await agreementItemController.getAgreementIds(this.agreementId)
                // Need to check if a container exist for any of the cemetery contract belonging to the same decedent
                let casketOrMinimalContainerDetailsOfOtherContracts = await agreementItemController.agreementCasketOrMinimalContainerCheck(agreementIds)
                let newValidationObject = { ...validationObject }
                if (casketOrMinimalContainerDetailsOfOtherContracts) {
                    // If yes then throw a medium level error
                    newValidationObject['error'] = 'No casket and container on the funeral statement, but we have on associated cemetery contract.'
                    newValidationObject['errorLevel'] = 'Medium'
                } else {
                    if (saleType === 'PN Funeral Trust') {
                        newValidationObject['error'] = 'No casket and container on the funeral statement.'
                        newValidationObject['errorLevel'] = 'Medium'
                    } else {
                        // If No then throw a high level error
                        newValidationObject['errorLevel'] = 'High'
                    }
                }
                validation = newValidationObject
            }
            break
        case 'NO_CREMATION_SERVICES_PURCHASE_FOR_CREMATION_SALES':
            let cremationServiceDetails = true
            let cremationServices = []
            let agreementSaleTypeCheck = await this.agreementSaleTypeCheck()
            let agreementType = await this.getAgreementType()
            if (agreementType === 1) cremationServices = ['Funeral Witness Cremation Service', 'Funeral Cremation Service']
            if (agreementType === 2) cremationServices = ['Cemetery Cremation Service', 'Cemetery Witness Cremation Services']
            if (agreementSaleTypeCheck && agreementType && cremationServices.length) cremationServiceDetails = await agreementItemController.agreementCremationServiceItems(cremationServices)
            if (agreementSaleTypeCheck && agreementType && !cremationServiceDetails) validation = validationObject
            break
        case 'NO_URN_PURCHASED_FOR_CREMATION_SALES_TYPE':
            let urnPurchaseDetails = true
            let agreementCremationSaleTypeCheck = await this.agreementSaleTypeCheck()
            if (agreementCremationSaleTypeCheck) urnPurchaseDetails = await agreementItemController.agreementMerchandiseItems('Urn')
            if (agreementCremationSaleTypeCheck && !urnPurchaseDetails) validation = validationObject
            break
        case 'DECEDENT_EDRS_REQUIRED_INFORMATION_NOT_COMPLETE':
            let transferTypeCheck = false
            let decedentEDRSMandatoryCheck = await this.decedentEDRSMandatoryCheck()
            if (decedentEDRSMandatoryCheck) {
                transferTypeCheck = await this.transferTypeCheck()
                if (transferTypeCheck) {
                    let newValidationObject = { ...validationObject }
                    newValidationObject['errorLevel'] = 'Medium'
                    validation = newValidationObject
                } else {
                    validation = validationObject
                }
            }
            break
        case 'NOT_ALL_SERVICES_HAVE_BEEN_SCHEDULED':
            let isAllServicesAreScheduled = await this.isAllServicesAreScheduled()
            if (isAllServicesAreScheduled) validation = validationObject
            break
        case 'NO_DEATH_CERTIFICATE_PURCHASED':
            let isDeathCertificatePurchased = await this.isDeathCertificatePurchased()
            if (isDeathCertificatePurchased) validation = validationObject
            break
        case 'NOT_ALL_CASH_ADVANCE_CHECKS_HAS_BEEN_GENERATED':
            let cashAdvanceChecksNotGenerated = await this.cashAdvanceChecksNotGenerated()
            if (cashAdvanceChecksNotGenerated) validation = validationObject
            break
        case 'ALL_SPECIAL_ITEMS_MUST_BE_CLEARED':
            let isAllSpecialItemsAreCleared = await this.isAllSpecialItemsAreCleared()
            if (isAllSpecialItemsAreCleared) validation = validationObject
            break
        case 'NO_FINAL_DISPOSTION_METHOD_INDICATED':
            let FinalDispositionMethodIndicated = await this.getFinalDispositionMethodIndicated()
            if (!FinalDispositionMethodIndicated) validation = validationObject
            break
        case 'DOWN_PAYMENT<5':
            let downPayment5Percentage = true
            let agreementFinanceCheck5 = await agreeementController.agreementFinanceCheck()
            if (agreementFinanceCheck5) {
                downPayment5Percentage = await agreeementController.downPaymentPercentageCheck('agreementFinanceDownPaymentPercentageCheck')
            } else {
                downPayment5Percentage = await agreeementController.downPaymentPercentageCheck(5)
            }
            /** Note: When the user have opted for a finance the percentage to with which is compared is the downpayment
            percentage of the finance and the validation error message as well as the resolute changes */
            if (!downPayment5Percentage) {
                if (agreementFinanceCheck5) {
                    let newValidationObject = { ...validationObject }
                    newValidationObject['error'] = 'Less than agreed downpayment'
                    newValidationObject['resolution'] = 'Receive more than agreed downpayment'
                    validation = newValidationObject
                } else {
                    validation = validationObject
                }
            }
            break
        case 'MISSING_MEMORIAL':
            let agreementMemorialDetails = await agreementMemorialController.agreementMemorialCheck()
            if (!agreementMemorialDetails) validation = validationObject
            break
        case 'FULL_BODY_REMAINS_NOT_EMBALMED_MUST_PURCHASE_EN-SURE_SEAL':
            let allDecedentsEmbalmed = true
            let agreementPropertyWithCryptTypeAndSealDetails = true
            // Checking if the receieved agreement has any crypt property types.
            let agreementPropertyWithCryptTypeCheck = await this.agreementPropertyCryptTypeCheck()
            // If there are crypt property types, checking if all the decedents is embalmed or not.
            if (agreementPropertyWithCryptTypeCheck) allDecedentsEmbalmed = await this.allDecedentEmbalmentCheck()
            // If all the decedents are not embalmed check if there is 'Casket Seal - Crypts' added in the contract.
            if (agreementPropertyWithCryptTypeCheck && !allDecedentsEmbalmed) agreementPropertyWithCryptTypeAndSealDetails = await agreementMemorialController.agreementWithSealCheck()
            // If there are crypt properties, not all the decedents are embalmed, and does not have any 'Casket Seal - Crypts', then show the validation.
            if (agreementPropertyWithCryptTypeCheck && !allDecedentsEmbalmed && !agreementPropertyWithCryptTypeAndSealDetails) validation = validationObject
            break
        case 'MISSING_BURIAL_REQUIRED_ITEMS':
            let itemChecks = []
            let requiredBurialItemsCategory = await this.getRequiredBurialItemsCategory()
            await Promise.all(requiredBurialItemsCategory.map(async item => {
                let itemCheck = await agreementItemController.agreementMerchandiseItems(item.requiredBurialItemCategory)
                itemChecks.push(itemCheck)
            }))
            if (!itemChecks.every(boolean => boolean === true)) validation = validationObject
            break
        case 'MISSING_OWNER_INFORMATION':
            let isHavingCompleteOwnerInfo = await this.isHavingCompleteOwnerInfo()
            if (isHavingCompleteOwnerInfo) validation = validationObject
            break
        case 'MISSING_NOK_INFORMATION':
            let isCemeteryNokExists = await this.isCemeteryNokExists()
            if (isCemeteryNokExists) validation = validationObject
            break
        case 'NO_FUNERAL_HOME_INFORMATION_PROVIDED':
            let isFuneralHomeInfoExists = await this.isFuneralHomeInfoExists()
            if (isFuneralHomeInfoExists) validation = validationObject
            break
        case 'ITEMS_USED_FOR_BURIAL_MUST_BE_PAID_IN_FULL':
            let burialItemPriceNotFullyPaid = await this.getburialItemPriceFullyPaid(null, false)
            let burialItemPriceNotFullyPaidWithAnticipatedPayment = true
            if (burialItemPriceNotFullyPaid) {
                burialItemPriceNotFullyPaidWithAnticipatedPayment = await this.getburialItemPriceFullyPaid(null, true)
            }
            if (burialItemPriceNotFullyPaid && !burialItemPriceNotFullyPaidWithAnticipatedPayment) {
                let newValidationObject = { ...validationObject }
                newValidationObject['errorLevel'] = 'Medium'
                validation = newValidationObject
            } else if (burialItemPriceNotFullyPaid && burialItemPriceNotFullyPaidWithAnticipatedPayment) {
                validation = validationObject
            }
            break
        case 'NO_VAULT_PURCHASED':
            let isReloadTypeProperty = await this.isReloadTypeProperty()
            let agreementVaultItemsDetails = await agreementItemController.agreementMerchandiseItems('Vault')
            if (!agreementVaultItemsDetails && !isReloadTypeProperty) validation = validationObject
            /* let agreementVaultItemsDetails = true
            let vaultSpecCheck = await this.checkVaultSpec()
            if (vaultSpecCheck) agreementVaultItemsDetails = await agreementItemController.agreementMerchandiseItems('Vault')
            if (vaultSpecCheck && !agreementVaultItemsDetails) validation = validationObject */
            break
        case 'NO_URN_PURCHASED':
            let agreementUrnItemsDetails = await agreementItemController.agreementMerchandiseItems('Urn')
            if (!agreementUrnItemsDetails) validation = validationObject
            break
        case 'MISSING_PROPERTY_OWNER':
            let isPropertyOwnerExists = await this.isPropertyOwnerExists()
            if (isPropertyOwnerExists) validation = validationObject
            break
        case 'CERTIFIER_REQUIRED_INFORMATION_NOT_COMPLETE':
            let certifierMandatoryCheck = await this.certifierMandatoryCheck()
            if (certifierMandatoryCheck) validation = validationObject
            break
        case 'MISSING_CONTRACT_SIGNING':
            let missingContractSignCheck = await this.missingContractSignCheck()
            if (missingContractSignCheck) validation = validationObject
            break
        case 'MISSING_BODY_TRACKING_NUMBER':
            let missingBodyTrackingNumber = await this.missingBodyTrackingNumberCheck()
            if (missingBodyTrackingNumber) validation = validationObject
            break
        case 'MISSING_AGREEMENT_PERSON_ADDRESS_INFORMATION':
            let missingAgreementPersonAddress = await this.missingAgreementPersonAddressCheck(this.agreementId)
            if (missingAgreementPersonAddress) validation = validationObject
            break
        case 'MISC_SALES_DUE_EXISTS':
            let isMiscSalesDueExists = await this.isMiscSalesDueExists(this.agreementId)
            if (isMiscSalesDueExists) validation = validationObject
            break
        default:
            break
        }
        return validation
    }

    /**
     * This method gets the validations for the received saleType
     * @param {string} saleType
     * The Expected Sale Types are:
     * AN Funeral Trust
     * AN Cemetery
     * PN Funeral Trust
     * PN Cemetery
     * AN Funeral Insurance
     * PN Funeral Insurance
     */
    async getValidations (saleType) {
        return hmisValidations[saleType]
    }

    /**
     * This method return an array of required burial items for the agreement
     * @param {*} transaction
     * expected return Casket or Vault
     */
    async getRequiredBurialItemsCategory (transaction) {
        try {
            let requiredBurialItemCategoriesQuery = `
                SELECT 
                ItemCategory.name as requiredBurialItemCategory
                FROM AgreementProperty
                INNER JOIN GardenSpecException ON GardenSpecException.propertyId = AgreementProperty.propertyId
                INNER JOIN ItemCategoryAttributeValue ON ItemCategoryAttributeValue.id = GardenSpecException.itemCategoryAttributeValueId
                INNER JOIN ItemCategory ON ItemCategory.id = ItemCategoryAttributeValue.itemCategoryId
                WHERE ItemCategory.name IN ('Casket', 'Vault') AND AgreementProperty.agreementId =:agreementId
                UNION
                SELECT
                ItemCategory.name as requiredBurialItemCategory
                FROM AgreementProperty
                INNER JOIN Property ON Property.id = AgreementProperty.propertyId
                INNER JOIN PropertyTypeCode ON PropertyTypeCode.id = Property.propertyTypeCodeId
                INNER JOIN PropertyGarden ON PropertyGarden.id = Property.propertyGardenId
                INNER JOIN PropertyCampus ON PropertyCampus.id = PropertyGarden.propertyCampusId
                INNER JOIN IntermentRights ON IntermentRights.propertyCampusId = PropertyCampus.id AND IntermentRights.propertyTypeId = PropertyTypeCode.propertyTypeId
                INNER JOIN GardenSpec ON GardenSpec.intermentRightsId = IntermentRights.id
                INNER JOIN ItemCategoryAttributeValue ON ItemCategoryAttributeValue.id = GardenSpec.itemCategoryAttributeValueId
                INNER JOIN ItemCategory ON ItemCategory.id = ItemCategoryAttributeValue.itemCategoryId
                WHERE ItemCategory.name IN ('Casket', 'Vault') AND AgreementProperty.agreementId =:agreementId
            `
            let requiredBurialItemCategories = await models.sequelize.query(requiredBurialItemCategoriesQuery, {
                type: models.sequelize.QueryTypes.SELECT,
                replacements: {
                    agreementId: this.agreementId
                },
                transaction
            })

            return requiredBurialItemCategories
        } catch (error) {
            logger.error(error)
            throw error
        }
    }

    /**
     * This method return a boolean depending on whether all the cash advance items for an agreement have been selected (isSelected) or not
     */
    async cashAdvanceChecksNotGenerated () {
        try {
            const activeAddendum = await models.Addendum.findOne({ where: { agreementId: this.agreementId, status: 'In Progress' } })

            const agreementCashAdvanceItems = await models.AgreementCashAdvancedItem.findAll({
                where: {
                    agreementId: this.agreementId,
                    addendumId: _.get(activeAddendum, 'id', null),
                    deletedAt: null,
                    deletedBy: null
                }
            })
            let agreementCashAdvanceItemsCountQuery = `
                SELECT COUNT(AgreementCashAdvancedItem.id) AS agreementCashAdvanceItemsCount
                FROM AgreementCashAdvancedItem
                LEFT JOIN CheckRequest CR ON CR.agreementCashAdvancedItemId= AgreementCashAdvancedItem.ID
                WHERE AgreementCashAdvancedItem.agreementId =:agreementId
                AND AgreementCashAdvancedItem.deletedAt IS NULL
                AND AgreementCashAdvancedItem.deletedBy IS NULL
                AND (CR.id IS NULL or CR.[status]='voided')
                AND CR.deletedAt is null
                AND CR.deletedBy is null
            `
            if (activeAddendum && agreementCashAdvanceItems.length > 0) {
                agreementCashAdvanceItemsCountQuery += `AND AgreementCashAdvancedItem.addendumId=${_.get(activeAddendum, 'id', null)}`
            }
            const agreementCashAdvanceItemsCheck = await models.sequelize.query(agreementCashAdvanceItemsCountQuery, {
                type: models.sequelize.QueryTypes.SELECT,
                replacements: {
                    agreementId: this.agreementId
                }
            })

            // let selectedAgreementCashAdvanceItemsCountQuery = `
            //     SELECT COUNT(AgreementCashAdvancedItem.id) AS selectedAgreementCashAdvanceItemsCount
            //     FROM AgreementCashAdvancedItem
            //     WHERE AgreementCashAdvancedItem.agreementId =:agreementId
            //     AND AgreementCashAdvancedItem.deletedAt IS NULL
            //     AND AgreementCashAdvancedItem.deletedBy IS NULL
            //     AND AgreementCashAdvancedItem.formId IS NOT NULL
            // `
            // let selectedAgreementCashAdvanceItems = await models.sequelize.query(selectedAgreementCashAdvanceItemsCountQuery, {
            //     type: models.sequelize.QueryTypes.SELECT,
            //     replacements: {
            //         agreementId: this.agreementId
            //     }
            // })

            return _.get(agreementCashAdvanceItemsCheck, '[0].agreementCashAdvanceItemsCount', 0)
        } catch (error) {
            logger.error(error)
            throw error
        }
    }

    /**
     * This method return a boolean depending on whether the finalDisposition for agreementPerson is null or not
     */
    async getFinalDispositionMethodIndicated () {
        try {
            let agreementFinalDispositionQuery = `
                SELECT COUNT(AgreementPerson.id) AS finalDispositionCount
                FROM AgreementPerson
                INNER JOIN PersonRemainsInfo ON PersonRemainsInfo.personId = AgreementPerson.personId
                WHERE AgreementPerson.agreementId =:agreementId
                AND AgreementPerson.deletedAt IS NULL
                AND AgreementPerson.deletedBy IS NULL
                AND AgreementPerson.isOwner = 1
                AND PersonRemainsInfo.finalDisposition <> ''
                AND PersonRemainsInfo.finalDisposition IS NOT NULL
            `
            let agreementFinalDisposition = await models.sequelize.query(agreementFinalDispositionQuery, {
                type: models.sequelize.QueryTypes.SELECT,
                replacements: {
                    agreementId: this.agreementId
                }
            })

            return agreementFinalDisposition[0].finalDispositionCount > 0
        } catch (error) {
            logger.error(error)
            throw error
        }
    }

    /**
     * This method return a boolean depending on whether the sale type of the agreement is MORT - SOR, MORT-SORC, MORT-TCC, MORTDC or MORTTMC
     */
    async agreementSaleTypeCheck () {
        try {
            let agreementSaleTypeQuery = `
                SELECT COUNT(Agreement.id) AS cremationSaleType
                FROM Agreement
                INNER JOIN SaleType ON SaleType.id = Agreement.saleTypeId
                WHERE Agreement.id =:agreementId
                AND SaleType.code IN ('MORT - SOR', 'MORT-SORC', 'MORT-TCC', 'MORTDC', 'MORTTMC')
            `
            let agreementSaleType = await models.sequelize.query(agreementSaleTypeQuery, {
                type: models.sequelize.QueryTypes.SELECT,
                replacements: {
                    agreementId: this.agreementId
                }
            })

            return agreementSaleType[0].cremationSaleType > 0
        } catch (error) {
            logger.error(error)
            throw error
        }
    }

    /**
     * This method returns a boolean depending on the count of crypt property types that an agreement has.
     */
    async agreementPropertyCryptTypeCheck () {
        try {
            let agreementPropertyCryptTypeQuery = `
            SELECT COUNT(PropertyType.name) AS cryptPropertyTypeCount
            FROM AgreementProperty
            INNER JOIN Property ON Property.id = AgreementProperty.propertyId
            INNER JOIN PropertyTypeCode ON PropertyTypeCode.id = Property.propertyTypeCodeId
            INNER JOIN PropertyType ON PropertyType.id = PropertyTypeCode.propertyTypeId
            WHERE AgreementProperty.agreementId =:agreementId
            AND AgreementProperty.reservationStatus = 'confirmed'
            AND AgreementProperty.deletedAt IS NULL
            AND AgreementProperty.deletedBy IS NULL
            AND PropertyType.name IN (
                'Crypt',
                'Sarcophagus',
                'Tomb Room',
                'Crypt - Couch',
                'Crypt - Single',
                'Crypt - Double',
                'Crypt - Deluxe Companion',
                'Crypt - Deluxe Companion Westminster',
                'Crypt - Quad',
                'Crypt - Quad Westminster',
                'Crypt - Tandem',
                'Crypt - Tandem Westminster',
                'Crypt Westminster'
            )`
            let agreementPropertyCryptType = await models.sequelize.query(agreementPropertyCryptTypeQuery, {
                type: models.sequelize.QueryTypes.SELECT,
                replacements: {
                    agreementId: this.agreementId
                }
            })

            return agreementPropertyCryptType.length ? agreementPropertyCryptType[0].cryptPropertyTypeCount > 0 : null
        } catch (error) {
            logger.error(error)
            throw error
        }
    }

    /**
     * This method returns a boolean depending on whether the count of all decedents and isEmbalmingApproved for these decedents is equal or not.
     */
    async allDecedentEmbalmentCheck () {
        try {
            let allDecedentEmbalmentCheckQuery = `
            SELECT AgreementPerson.id AS decedentId, PersonRemainsInfo.isEmbalmingApproved
            FROM AgreementPerson
            INNER JOIN Person ON Person.id = AgreementPerson.personId AND Person.isAlive = 0
            INNER JOIN AgreementRole ON AgreementRole.id = AgreementPerson.roleId
            LEFT JOIN PersonRemainsInfo ON PersonRemainsInfo.personId = AgreementPerson.personId
            WHERE AgreementPerson.agreementId =:agreementId
            AND AgreementRole.name = 'Beneficiary'
            AND AgreementPerson.deletedAt IS NULL
            AND AgreementPerson.deletedBy IS NULL`
            let allDecedentEmbalmentCheck = await models.sequelize.query(allDecedentEmbalmentCheckQuery, {
                type: models.sequelize.QueryTypes.SELECT,
                replacements: {
                    agreementId: this.agreementId
                }
            })

            let decedentCount = allDecedentEmbalmentCheck.length

            let embalmedDecedents = allDecedentEmbalmentCheck.filter(decedent => decedent.isEmbalmingApproved === true)

            let embalmedDecedentCount = embalmedDecedents.length

            return decedentCount === embalmedDecedentCount
        } catch (error) {
            logger.error(error)
            throw error
        }
    }

    /**
     * This method return the type of the agreement i.e whether it is a funeral statement or a cemetery contract
     */
    async getAgreementType () {
        try {
            let agreementTypeQuery = `
                SELECT Agreement.type
                FROM Agreement
                WHERE Agreement.id =:agreementId
            `
            let agreementType = await models.sequelize.query(agreementTypeQuery, {
                type: models.sequelize.QueryTypes.SELECT,
                replacements: {
                    agreementId: this.agreementId
                }
            })

            return agreementType[0].type
        } catch (error) {
            logger.error(error)
            throw error
        }
    }

    /**
     * This method return boolean depending on difference between the agreement price paid and required burial items price
     * @param {*} transaction
     * @param {string} anticipatedPayment
     */
    async getburialItemPriceFullyPaid (transaction, anticipatedPayment = false) {
        try {
            let requiredBurialItemsCategoriesArray = await this.getRequiredBurialItemsCategory(transaction)
            // NOTE: only validate if there are requiredBurialItemsCategories
            if (requiredBurialItemsCategoriesArray.length) {
                let requiredBurialItemsCategories = requiredBurialItemsCategoriesArray.map(category => category.requiredBurialItemCategory)
                let requiredBurialItemPriceQuery = `
                SELECT SUM(AgreementItemPrice.totalPrice) AS itemPrice
                FROM AgreementItemPrice
                WHERE AgreementItemPrice.id IN (
                    SELECT AgreementLocationItem.agreementItemPriceId AS agreementItemPriceIds
                    FROM AgreementLocationItem
                    INNER JOIN LocationItem ON LocationItem.id = AgreementLocationItem.locationItemId
                    INNER JOIN Item ON Item.id = LocationItem.itemId
                    INNER JOIN ItemCategory ON ItemCategory.id = Item.itemCategoryId
                    WHERE ItemCategory.name IN (:requiredBurialItemsCategory)
                    AND AgreementLocationItem.agreementId =:agreementId
                )
            `
                let requiredBurialItemPrice = await models.sequelize.query(requiredBurialItemPriceQuery, {
                    type: models.sequelize.QueryTypes.SELECT,
                    replacements: {
                        agreementId: this.agreementId,
                        requiredBurialItemsCategory: requiredBurialItemsCategories
                    },
                    transaction
                })

                let agreementPriceQuery = `
                SELECT 
                Agreement.totalCashPrice as agreementPrice,
                Agreement.totalPaid as agreementTotalPaid
                FROM Agreement
                WHERE Agreement.id =:agreementId
            `
                let agreementPrice = await models.sequelize.query(agreementPriceQuery, {
                    type: models.sequelize.QueryTypes.SELECT,
                    replacements: {
                        agreementId: this.agreementId
                    },
                    transaction
                })

                let anticipatedAmountQuery = ''
                let anticipatedAmount = []

                if (anticipatedPayment) {
                    anticipatedAmountQuery = `
                        SELECT SUM(amount) AS amount
                        FROM AnticipatedPayment 
                        WHERE resourceType = 'Agreement' 
                        AND resourceId =:agreementId
                        AND paymentId IS NULL
                    `
                    anticipatedAmount = await models.sequelize.query(anticipatedAmountQuery, {
                        type: models.sequelize.QueryTypes.SELECT,
                        replacements: {
                            agreementId: this.agreementId
                        },
                        transaction
                    })
                }

                let agreementsTotalPrice = _.get(agreementPrice[0], 'agreementPrice', 0)
                let agreementsRequiredBurialItemsPrice = _.get(requiredBurialItemPrice[0], 'itemPrice', 0)
                let agreementsTotalPaidPrice = _.get(agreementPrice[0], 'agreementTotalPaid', 0)
                let agreementAnticipatedAmount = _.get(anticipatedAmount[0], 'amount', 0)

                if ((agreementsTotalPrice - agreementsRequiredBurialItemsPrice) >= 0) {
                    if (!anticipatedPayment) {
                        return (agreementsTotalPaidPrice - agreementsRequiredBurialItemsPrice) < 0
                    } else {
                        if ((agreementsTotalPaidPrice + agreementAnticipatedAmount) - agreementsRequiredBurialItemsPrice < 0) {
                            return true
                        } else if ((agreementsTotalPaidPrice + agreementAnticipatedAmount) - agreementsRequiredBurialItemsPrice >= 0) {
                            return false
                        }
                    }
                } else {
                    return false
                }
            }
            return false
        } catch (error) {
            logger.error(error)
            throw error
        }
    }
}

module.exports = HMISSyncValidator
