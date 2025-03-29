const BaseForm = require('./baseForm')
const models = require('../../../models')
const moment = require('moment-timezone')
const _ = require('lodash')
const ROLES = {
    Arranger: 'Arranger',
    Manager: 'Manager',
    Cremator: 'Crematory Operator'
}
class RequestForCremation extends BaseForm {
    constructor (caseInfoData) {
        let caseInfoFormId = caseInfoData.caseInfoFormId
        super({ caseInfoFormId })
        this.formId = caseInfoData.formId
    }

    async envelopeData () {
        return [await this.arrangerPreFillData(), await this.managerPreFillData(), this.CrematorPreFillData()]
    }
    getFullName (person) {
        return [person.firstName, person.middleName, person.lastName]
            .join(' ')
            .trim()
    }
    async fetchANStmtDetails (personId) {
        try {
            const result = await models.AgreementPerson.findOne({
                where: {
                    personId,
                    deletedBy: null,
                    deletedAt: null
                },
                include: [
                    {
                        model: models.Agreement,
                        where: {
                            type: 1,
                            needType: 1
                        },
                        include: [
                            {
                                model: models.Location,
                                as: 'location',
                                required: true
                            }
                        ]
                    }
                ]
            })
            return result
        } catch (err) {
            throw err
        }
    }
    async arrangerPreFillData () {
        // let metaData = this.caseInfoForm.metaData
        //     ? JSON.parse(this.caseInfoForm.metaData.replace(/'/g, '"'))
        //     : ''
        let metaData = this.caseInfoForm.metaData
            ? JSON.parse(this.caseInfoForm.metaData)
            : ''
        let timezone = metaData.timezone ? metaData.timezone : null
        const arranger = this.getSignerByRole(ROLES.Arranger, this.formId)
        const agreement = await this.getAgreementData(this.caseInfoForm.agreementId)
        let casket = {
            modal: '',
            material: ''
        }
        let urn = {
            modal: '',
            material: ''
        }
        let serviceDeatils = await this.funeralServicesDetails(this.person.id)
        if (serviceDeatils && serviceDeatils.length) {
            serviceDeatils.map((item) => {
                if (item.type === 'Casket') {
                    casket.modal = item.name
                    casket.material = item.material
                }
                if (item.type === 'Urn') {
                    urn.modal = item.name
                    urn.material = item.material
                }
            })
        }
        if (!casket.modal || !urn.material) {
            let serviceDeatils = await this.cemeteryServicesDetails(this.person.id)
            if (serviceDeatils && serviceDeatils.length) {
                serviceDeatils.map((item) => {
                    if (item.type === 'Casket' && !casket.modal) {
                        casket.modal = item.name
                        casket.material = item.material
                    }
                    if (item.type === 'Urn' && !urn.modal) {
                        urn.modal = item.name
                        urn.material = item.material
                    }
                })
            }
        }

        const data = {
            decedentName: this.personFullName,
            contractNumber: _.get(agreement, 'contractNumber'),
            paidwitnesscremationDate: '',
            paidwitnesscremationTime: '',
            paidPriorityDate: '',
            paidPriorityTime: '',
            viewingService: '',
            locationnofDeceased: '',
            urntypeModel: urn.modal,
            urnTypeMaterial: urn.material,
            casketModel: casket.modal,
            casketMaterial: casket.material,
            totalWeightOfDeceased: '',
            contractNumber1: _.get(agreement, 'contractNumber'),
            otherValidationData: '',
            date: moment().tz(timezone).format('MM/DD/YYYY')
        }
        let checkboxData = {
            paidwitnesscremation: '',
            paidPriority: '',
            standardRequest: '',
            plasticTemporary: '',
            urnTypeother: '',
            cardboard: '',
            casketOther: '',
            funeral: _.get(agreement, 'type', '') === 1,
            cemetery: _.get(agreement, 'type', '') === 2,
            permitcopies: '',
            cremationAuthorization: '',
            durablePowerofAttorney: '',
            affidavitofHeirship: '',
            othervalidation: ''
        }
        const groupLabelData = {
            location: [
                { cfs: _.get(agreement, 'location.code', '') === 'CFS' || _.get(agreement, 'location.code', '') === 'COM' },
                { sso: _.get(agreement, 'location.code', '') === 'SSO' },
                { cng: _.get(agreement, 'location.code', '') === 'CNG' },
                { mdc: _.get(agreement, 'location.code', '') === 'MDC' },
                { acc: _.get(agreement, 'location.code', '') === 'ACC' }
            ],
            selfUrn: [{ yes: '' }, { no: '' }]
        }
        return this.convertToTextTabsLatest(arranger, data, checkboxData, groupLabelData)
    }

    async managerPreFillData () {
        let manager = this.getSignerByRole(ROLES.Manager, this.formId)
        const data = {
        }
        return this.convertToTextTabsLatest(manager, data)
    }

    async funeralServicesDetails (personId) {
        let query = `
        SELECT sfs.id,item1.name as name, itemcat.name as type, attval1.name as material FROM ScheduledFuneralService sfs
                        LEFT JOIN AgreementLocationItem argmtlocaitem on argmtlocaitem.id = sfs.agreementLocationItemId
                        LEFT JOIN AgreementPackageItem argmtpacitem  ON argmtpacitem.id = sfs.agreementPackageItemId
                        LEFT JOIN AgreementPackage ON AgreementPackage.id = argmtpacitem.agreementPackageId
                        LEFT JOIN AgreementCashAdvancedItem argmtcashitem ON argmtcashitem.id = sfs.agreementCashAdvancedItemId
                        INNER JOIN LocationItem locItem on locItem.id IN (argmtlocaitem.locationItemId,argmtpacitem.locationItemId,argmtcashitem.locationItemId)
                        INNER JOIN Item item on item.id = locItem.itemId
                        INNER JOIN ItemAttributeValue itemAtt on itemAtt.itemId = item.id
                        INNER JOIN AttributeValue attval on attval.id = itemAtt.attributeValueId 
                        LEFT JOIN CasketSection casket on casket.id = sfs.casketSectionId
                        LEFT JOIN UrnInformationSection urn on urn.id = sfs.urnInformationSectionId
                        LEFT JOIN ItemUsage itemus1 on itemus1.id IN (casket.casketId,urn.urnId)
                        INNER JOIN AgreementLocationItem argmtlocationItem on ((argmtlocationItem.id IN (casket.casketId,urn.urnId)  AND (urn.resourceType = 'AgreementLocationItem'  OR casket.resourceType = 'AgreementLocationItem')) OR argmtlocationItem.id = itemus1.resourceId)
                        INNER JOIN LocationItem locItem1 on locItem1.id = argmtlocationItem.locationItemId
                        INNER JOIN Item item1 on item1.id = locItem1.itemId
                        INNER JOIN ItemCategory itemcat on itemcat.id = item1.itemCategoryId
                        INNER JOIN ItemAttributeValue itemAtt1 on itemAtt1.itemId = item1.id
                        INNER JOIN AttributeValue attval1 on attval1.id = itemAtt1.attributeValueId 
                        WHERE sfs.personId = ${personId} 
                        AND sfs.deletedBy IS NULL
                        AND sfs.deletedAt IS NULL
                          AND itemcat.name IN ('Casket', 'Urn')
                        AND attval.name IN ('Funeral Cremation Service', 'Funeral Witness Cremation Service')
                        AND (casket.casketId IS NOT NULL
                        OR urn.urnId IS NOT NULL)`
        let serviceDeatils = await models.sequelize.query(query, {
            type: models.sequelize.QueryTypes.SELECT
        })
        return serviceDeatils
    }

    async cemeteryServicesDetails (personId) {
        let query = `SELECT scs.id,item1.name as name,itemcat.name as type, attval1.name as material FROM ScheduledCemeteryService scs
        INNER JOIN ItemUsage itemus on itemus.id = scs.itemUsageId
        INNER JOIN AgreementLocationItem argmtlocaitem on argmtlocaitem.id = itemus.resourceId
        INNER JOIN LocationItem locItem on locItem.id = argmtlocaitem.locationItemId
        INNER JOIN Item item on item.id = locItem.itemId
        INNER JOIN ItemAttributeValue itemAtt on itemAtt.itemId = item.id
        INNER JOIN AttributeValue attval on attval.id = itemAtt.attributeValueId 
        LEFT JOIN CasketSection casket on casket.id = scs.casketSectionId
        LEFT JOIN UrnInformationSection urn on urn.id = scs.urnInformationSectionId
        LEFT JOIN ItemUsage itemus1 on itemus1.id IN (casket.casketId,urn.urnId)
        INNER JOIN AgreementLocationItem argmtlocationItem on ((argmtlocationItem.id IN (casket.casketId,urn.urnId)  AND (urn.resourceType = 'AgreementLocationItem'  OR casket.resourceType = 'AgreementLocationItem')) OR argmtlocationItem.id = itemus1.resourceId)
        INNER JOIN LocationItem locItem1 on locItem1.id = argmtlocationItem.locationItemId
        INNER JOIN Item item1 on item1.id = locItem1.itemId
        INNER JOIN ItemCategory itemcat on itemcat.id = item1.itemCategoryId
        INNER JOIN ItemAttributeValue itemAtt1 on itemAtt1.itemId = item1.id
        INNER JOIN AttributeValue attval1 on attval1.id = itemAtt1.attributeValueId 
        WHERE scs.personId = ${personId} 
        AND scs.deletedBy IS NULL
        AND scs.deletedAt IS NULL
        AND itemcat.name IN ('Casket', 'Urn')
        AND attval.name IN ('Cemetery Cremation Service', 'Cemetery Witness Cremation Services')
        AND (casket.casketId IS NOT NULL
        OR urn.urnId IS NOT NULL)`
        let serviceDeatils = await models.sequelize.query(query, {
            type: models.sequelize.QueryTypes.SELECT
        })

        return serviceDeatils
    }

    CrematorPreFillData () {
        const cremator = this.getSignerByRole(
            ROLES.Cremator, this.formId
        )
        const textData = {}
        return this.convertToTextTabsLatest(cremator, textData)
    }
}
module.exports = RequestForCremation
