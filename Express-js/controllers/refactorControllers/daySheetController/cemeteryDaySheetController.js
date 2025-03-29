const models = require('../../../models')
const logger = require('../../../lib/logger')
const { queueNames, queues } = require('./../../../appQueues')
const moment = require('moment-timezone')
const _ = require('lodash')
const Sequelize = require('sequelize')
const { bullJobRetry } = require('../../../lib/util')
const Op = Sequelize.Op
const seed = require('../../../config/seed')
class CemeteryDaySheetController {
    /**
     * Fetches the Cemetery Day Sheets in the given range
     * @param {*} fromDate is a date from when to fetch the Cemetery Day Sheets
     * @param {*} toDate is a date till when to fetch the Cemetery Day Sheets
     * @param {*} locations are the locationId's to filter the Cemetery Day Sheets of those locations
     * @param {*} timezone is the timezone of the end user accessing this API
     * @param {*} paginate is the parameter that tells to paginate or not
     * @param {*} page is the page number
     * @param {*} limit is the limitation of records per page
     */
    static async getCemeteryDaySheet (fromDate, toDate, locations, timezone, paginate, page, limit, resource, resourceTypeId) {
        if (resource === 'Chapel' || resource === 'Reception') {
            return { count: 0, cemeteryResult: [] }
        }
        locations = locations.map(e => Number(e))
        let itemUsageCommonScope = {
            model: models.ItemUsage,
            as: 'itemUsage',
            required: false,
            where: { resourceType: 'AgreementLocationItem' },
            attributes: ['id'],
            include: [
                {
                    model: models.AgreementLocationItem,
                    as: 'agreementItems',
                    required: true,
                    attributes: ['id'],
                    include: [
                        {
                            model: models.LocationItem.scope('withAttributeValues'),
                            as: 'locationItem',
                            attributes: ['id']
                        },
                        {
                            model: models.Agreement,
                            as: 'agreementDetails',
                            required: true,
                            where: {
                                locationId: {
                                    [Op.in]: locations
                                }
                            },
                            attributes: ['type', 'contractNumber', 'due']
                        },
                        {
                            model: models.Addendum,
                            as: 'addendumDetails',
                            attributes: ['addendumNumber']
                        }
                    ]
                }
            ]
        }
        let commonScope = [
            'intermentRequestSectionScope',
            'merchandiseAdditionalInfoSectionScope',
            'genericSectionScope',
            'disintermentInfoSectionScope',
            'FuneralArrangementSectionScope',
            'casketSectionScope',
            'vaultSectionScope',
            'urnInformationScope',
            'noteSectionsScope',
            'personScope',
            { method: ['miscServiceItemScope', false] }
        ]
        const noteCategory = await models.NoteCategory.findOne({
            where: { name: 'Work Order' }
        })
        let crWhere = {}
        let crRequired = false
        if (resource === 'Crematory Retort' && resourceTypeId && resourceTypeId.length) {
            resourceTypeId = resourceTypeId.map(e => Number(e))
            crWhere = { id: { [Op.in]: resourceTypeId } }
            crRequired = true
        }
        commonScope.push({ method: ['workOrderScopeDaySheet', _.get(noteCategory, 'id'), crWhere, crRequired] })
        // Fetch the Cemetery Schedulings with Interment Information
        let ssWithIntInfo = await models.ScheduledCemeteryService.scope(commonScope).findAll({
            where: {
                deletedAt: null,
                deletedBy: null
            },
            include: [
                {
                    model: models.IntermentInformationSection.scope('intermentInfoPropertiesScope'),
                    as: 'intermentInformationDetails',
                    required: true,
                    where: {
                        [Op.and]: [
                            { beginningTime: { [Op.gte]: fromDate } },
                            { beginningTime: { [Op.lt]: toDate } }
                        ]
                    }
                },
                {
                    model: models.UrnTransfer,
                    as: 'resourcesCemeteryUrnTransferDetails',
                    required: false,
                    where: {
                        resourceType: 'ScheduledCemeteryService'
                    }
                },
                itemUsageCommonScope
            ]
        })

        // Fetch the Cemetery Schedulings with DisInterment Information
        let ssWithDisIntInfo = await models.ScheduledCemeteryService.scope(commonScope).findAll({
            where: {
                deletedAt: null,
                deletedBy: null
            },
            include: [
                {
                    model: models.DisintermentInfoSection.scope('disintermentInfoPropertiesScope'),
                    as: 'disintermentInformationDetails',
                    required: true,
                    where: {
                        [Op.and]: [
                            { beginningTime: { [Op.gte]: fromDate } },
                            { beginningTime: { [Op.lt]: toDate } }
                        ]
                    }
                },
                {
                    model: models.UrnTransfer,
                    as: 'resourcesCemeteryUrnTransferDetails',
                    required: false,
                    where: {
                        resourceType: 'ScheduledCemeteryService'
                    }
                },
                itemUsageCommonScope
            ]
        })

        // Concat both the results and sort date wise
        let finalSS = ssWithIntInfo.concat(ssWithDisIntInfo).sort((a, b) => {
            let intDate1 = a.intermentInformationDetails && a.intermentInformationDetails.beginningTime ? a.intermentInformationDetails.beginningTime : null
            let disIntDate1 = a.disintermentInformationDetails ? a.disintermentInformationDetails.beginningTime : null
            let intDate2 = b.intermentInformationDetails && b.intermentInformationDetails.beginningTime ? b.intermentInformationDetails.beginningTime : null
            let disIntDate2 = b.disintermentInformationDetails ? b.disintermentInformationDetails.beginningTime : null
            let date1 = intDate1 ? new Date(intDate1) : new Date(disIntDate1)
            let date2 = intDate2 ? new Date(intDate2) : new Date(disIntDate2)
            return date1 - date2
        })
        const count = finalSS.length

        // Paginating the array
        let paginatedRes = finalSS
        if (paginate) {
            page = page || 1
            limit = limit || 10
            paginatedRes = finalSS.slice((page - 1) * limit, page * limit)
        }

        // Formatting Data
        const cemeteryResult = paginatedRes.map(ss => {
            let due
            let intInfo = ss.intermentInformationDetails
            let disIntInfo = ss.disintermentInformationDetails
            let intDate = intInfo && intInfo.beginningTime ? intInfo.beginningTime : null
            let disIntDate = disIntInfo ? disIntInfo.beginningTime : null
            let propertyName = ''
            if ((intInfo && intInfo.properties.length) || (disIntInfo && disIntInfo.properties.length)) {
                let data = _.get(intInfo, 'properties') || _.get(disIntInfo, 'properties')
                let props = data.map(e => {
                    return _.get(e, 'itemUsage.agreementProperties') ? `${e.itemUsage.agreementProperties.property.name} - ${_.get(e, 'itemUsage.lotSpaceId') ? _.get(e, 'itemUsage.lotSpaceId') : ''}` : ''
                })
                propertyName = props.join(', ')
            }
            let contractNumbers = []
            let vaultName = '-'
            let vExpDate = '-'
            if (ss.vaultItemUsageDetails) {
                let vault = ss.vaultItemUsageDetails.ItemUsage && ss.vaultItemUsageDetails.ItemUsage.agreementItems ? ss.vaultItemUsageDetails.ItemUsage.agreementItems : null
                if (vault) {
                    vaultName = vault.locationItem && vault.locationItem.Item ? vault.locationItem.Item.name : '-'
                    let adNo = vault.addendumDetails ? vault.addendumDetails.addendumNumber : null
                    contractNumbers.push(adNo || vault.agreementDetails.contractNumber)
                }
                vExpDate = ss.vaultItemUsageDetails.ItemUsage && ss.vaultItemUsageDetails.ItemUsage.poItemDetails ? ss.vaultItemUsageDetails.ItemUsage.poItemDetails.expectedDeliveryDate : '-'
            }
            if (ss.vaultItemDetails) {
                let vault = ss.vaultItemDetails.vault ? ss.vaultItemDetails.vault : null
                if (vault) {
                    vaultName = vault.locationItem && vault.locationItem.Item ? vault.locationItem.Item.name : '-'
                    let adNo = vault.addendumDetails ? vault.addendumDetails.addendumNumber : null
                    contractNumbers.push(adNo || vault.agreementDetails.contractNumber)
                    let poDetails = vault.purchaseOrder && vault.purchaseOrder.purchaseOrderItems && vault.purchaseOrder.purchaseOrderItems.length ? vault.purchaseOrder.purchaseOrderItems[0] : null
                    vExpDate = poDetails && poDetails.expectedDeliveryDate ? poDetails.expectedDeliveryDate : '-'
                }
            }
            if (ss.vaultDetails) {
                vaultName = ss.vaultDetails.disinteredVaultDetails
            }
            let casketName = '-'
            let cExpDate = '-'
            if (ss.casketItemUsageDetails) {
                let casket = ss.casketItemUsageDetails.ItemUsage && ss.casketItemUsageDetails.ItemUsage.agreementItems ? ss.casketItemUsageDetails.ItemUsage.agreementItems : null
                if (casket) {
                    casketName = casket.locationItem && casket.locationItem.Item ? casket.locationItem.Item.name : '-'
                    let adNo = casket.addendumDetails ? casket.addendumDetails.addendumNumber : null
                    contractNumbers.push(adNo || casket.agreementDetails.contractNumber)
                }
                cExpDate = ss.casketItemUsageDetails.ItemUsage && ss.casketItemUsageDetails.ItemUsage.poItemDetails ? ss.casketItemUsageDetails.ItemUsage.poItemDetails.expectedDeliveryDate : '-'
            }
            if (ss.casketItemDetails) {
                let casket = ss.casketItemDetails.casket ? ss.casketItemDetails.casket : null
                if (casket) {
                    casketName = casket && casket.locationItem && casket.locationItem.Item ? casket.locationItem.Item.name : '-'
                    let adNo = casket.addendumDetails ? casket.addendumDetails.addendumNumber : null
                    contractNumbers.push(adNo || casket.agreementDetails.contractNumber)
                    let poDetails = casket && casket.purchaseOrder && casket.purchaseOrder.purchaseOrderItems && casket.purchaseOrder.purchaseOrderItems.length ? casket.purchaseOrder.purchaseOrderItems[0] : null
                    cExpDate = poDetails && poDetails.expectedDeliveryDate ? poDetails.expectedDeliveryDate : '-'
                }
            }
            if (ss.casketDetails && ss.casketDetails.isOutSideCasket) {
                casketName = ss.casketDetails.casketType ? ss.casketDetails.casketType : null
            }
            let urnInfo = ss.urnInformationItemUsageDetails || ss.urnInformationItemDetails || ss.urnInformationDetails
            let urnName = urnInfo && urnInfo.isFamilyOwnedUrn ? 'Family Urn' : '-'
            let uExpDate = '-'
            if (ss.urnInformationItemUsageDetails) {
                let urn = ss.urnInformationItemUsageDetails.ItemUsage && ss.urnInformationItemUsageDetails.ItemUsage.agreementItems ? ss.urnInformationItemUsageDetails.ItemUsage.agreementItems : null
                if (urn) {
                    urnName = urn.locationItem && urn.locationItem.Item ? urn.locationItem.Item.name : '-'
                    let adNo = urn.addendumDetails ? urn.addendumDetails.addendumNumber : null
                    contractNumbers.push(adNo || urn.agreementDetails.contractNumber)
                }
                uExpDate = ss.urnInformationItemUsageDetails.ItemUsage && ss.urnInformationItemUsageDetails.ItemUsage.poItemDetails ? ss.urnInformationItemUsageDetails.ItemUsage.poItemDetails.expectedDeliveryDate : '-'
            }
            if (ss.urnInformationItemDetails) {
                let urn = ss.urnInformationItemDetails.urn ? ss.urnInformationItemDetails.urn : null
                if (urn) {
                    urnName = urn.locationItem && urn.locationItem.Item ? urn.locationItem.Item.name : '-'
                    let adNo = urn.addendumDetails ? urn.addendumDetails.addendumNumber : null
                    contractNumbers.push(adNo || urn.agreementDetails.contractNumber)
                    let poDetails = urn.purchaseOrder && urn.purchaseOrder.purchaseOrderItems && urn.purchaseOrder.purchaseOrderItems.length ? urn.purchaseOrder.purchaseOrderItems[0] : null
                    uExpDate = poDetails && poDetails.expectedDeliveryDate ? poDetails.expectedDeliveryDate : '-'
                }
            }
            if (ss.itemUsage && ss.itemUsage.agreementItems && ss.itemUsage.agreementItems.agreementDetails) {
                let agmtDetails = ss.itemUsage.agreementItems.agreementDetails
                let adDetails = ss.itemUsage.agreementItems.addendumDetails
                let adNo = adDetails ? adDetails.addendumNumber : null
                contractNumbers.push(adNo || agmtDetails.contractNumber)
                due = agmtDetails.due
            }
            if (ss.agreementLocationItem && ss.agreementLocationItem.agreementDetails) {
                let agmtDetails = ss.agreementLocationItem.agreementDetails
                let adDetails = ss.agreementLocationItem.addendumDetails
                let adNo = adDetails ? adDetails.addendumNumber : null
                contractNumbers.push(adNo || agmtDetails.contractNumber)
                due = agmtDetails.due
            }
            let serviceName = '-'
            let serviceType = '-'
            if (ss.itemUsage && ss.itemUsage.agreementItems && ss.itemUsage.agreementItems.locationItem && ss.itemUsage.agreementItems.locationItem.Item && ss.itemUsage.agreementItems.locationItem.Item.itemAttributes.length) {
                let itemAtts = ss.itemUsage.agreementItems.locationItem.Item.itemAttributes
                let SNDetails = itemAtts.find(e => e.AttributeValue.attribute.name === 'Scheduling Service')
                serviceName = SNDetails ? SNDetails.AttributeValue.name : '-'
                let STDetails = itemAtts.find(e => e.AttributeValue.attribute.name === 'Burial Type')
                serviceType = STDetails ? STDetails.AttributeValue.name : '-'
            }
            if (ss.agreementLocationItem && ss.agreementLocationItem.locationItem && ss.agreementLocationItem.locationItem.Item && ss.agreementLocationItem.locationItem.Item.itemAttributes.length) {
                let itemAtts = ss.agreementLocationItem.locationItem.Item.itemAttributes
                let SNDetails = itemAtts.find(e => e.AttributeValue.attribute.name === 'Scheduling Service')
                serviceName = SNDetails ? SNDetails.AttributeValue.name : '-'
                let STDetails = itemAtts.find(e => e.AttributeValue.attribute.name === 'Burial Type')
                serviceType = STDetails ? STDetails.AttributeValue.name : '-'
            }
            let fnrlArrDetails = ss.funeralArrangementDetails
            let clFacilityLocation = fnrlArrDetails && fnrlArrDetails.clFacilityLocation ? fnrlArrDetails.clFacilityLocation.name : null
            let serviceLocation = fnrlArrDetails && fnrlArrDetails.serviceLocation && fnrlArrDetails.serviceLocation.organization ? fnrlArrDetails.serviceLocation.organization.name : null
            let wo = ss.workOrder
            let chamberAccountabilityLog = wo ? wo.ChamberAccountabilityLog : null
            let woDetails = wo ? wo.workOrderDetail : null
            let staffNotes = []
            let familyNotes = []
            if (ss.notesSections && ss.notesSections.length) {
                ss.notesSections.map(note => {
                    if (note.noteLevel.name === 'family') {
                        familyNotes.push(note.content)
                    } else {
                        staffNotes.push(note.content)
                    }
                })
            }
            if (ss && ss.workOrder && ss.workOrder.notes) {
                ss.workOrder.notes.map((data) => {
                    staffNotes.push(data.content)
                })
            }
            let crematoryRetort = '-'
            // if (woDetails && woDetails.crematoryRetort) {
            //     crematoryRetort = woDetails.crematoryRetort.name + ' ' + woDetails.crematoryRetort.chamber
            // }
            if (chamberAccountabilityLog && chamberAccountabilityLog.chamber) {
                crematoryRetort = chamberAccountabilityLog.chamber.name + ' ' + chamberAccountabilityLog.chamber.chamber
            }

            let apc = '-'
            let leadIn = '-'
            if (wo && wo.assignedResources.length) {
                _.reverse(wo.assignedResources)
                let apcDetails = wo.assignedResources.find(e => e.staffType === 'apc')
                apc = apcDetails && apcDetails.employee ? apcDetails.employee.name : '-'
                let leadInDetails = wo.assignedResources.find(e => e.staffType === 'leadIn')
                leadIn = leadInDetails && leadInDetails.employee ? leadInDetails.employee.name : '-'
            }
            let isLocVrfdByForeman = woDetails ? woDetails.isLocationVerifiedByForeman : false
            let isLocVrfdWithFamily = ss.genericDetails ? ss.genericDetails.isLocationVerifiedWithFamily : false
            let personName = ss.person ? _.compact([ss.person.firstName, ss.person.middleName]).join(' ') : '-'
            if (ss.person && ss.person.lastName) {
                personName = `${ss.person.lastName.toUpperCase()}, ${personName}`
            }
            let scData = {
                onePortalId: ss.person && ss.person.personVerificationDetails && ss.person.personVerificationDetails.onePortalId ? ss.person.personVerificationDetails.onePortalId : null,
                personName: personName,
                isAlive: !!ss.person.isAlive,
                agreementContractNumbers: _.uniq(contractNumbers),
                schedulingBeginningTime: intDate || disIntDate,
                schedulingEndingTime: intDate ? ss.intermentInformationDetails.endingTime : ss.disintermentInformationDetails.endingTime,
                scheduledServiceName: serviceName,
                scheduledServiceType: serviceType,
                apc: apc,
                leadIn: leadIn,
                propertyName: propertyName,
                crematedRemainsCurrentStatus: woDetails && woDetails.cremationStatus ? woDetails.cremationStatus.name : '-',
                valutDetails: {
                    name: vaultName,
                    expectedDate: vExpDate
                },
                casketDetails: {
                    name: casketName,
                    expectedDate: cExpDate
                },
                urnDetails: {
                    name: urnName,
                    expectedDate: uExpDate,
                    width: urnInfo && urnInfo.width ? urnInfo.width : '-',
                    height: urnInfo && urnInfo.height ? urnInfo.height : '-',
                    depth: urnInfo && urnInfo.depth ? urnInfo.depth : '-',
                    urnType: urnInfo && urnInfo.urnType && urnInfo.urnTypeDetails ? urnInfo.urnTypeDetails.name : '-',
                    isTransferRequired: urnInfo && urnInfo.isTransferRequired ? 'Transfer Required' : 'Transfer not required'
                },
                memorialInfo: ss.intermentInformationDetails && ss.intermentInformationDetails.memorialInformation ? ss.intermentInformationDetails.memorialInformation : '-',
                otherInstructions: ss.merchandiseAdditionalInfoDetails && ss.merchandiseAdditionalInfoDetails.instruction ? ss.merchandiseAdditionalInfoDetails.instruction : '-',
                isPreBuried: woDetails ? woDetails.isPreBuried : null,
                funeralArrangementDetails: {
                    funeralHome: clFacilityLocation || serviceLocation || '-',
                    funeralHomePhone: fnrlArrDetails && fnrlArrDetails.funeralHomePhone ? fnrlArrDetails.funeralHomePhone : '-',
                    funeralDirector: fnrlArrDetails && fnrlArrDetails.funeralDirectorDetails ? fnrlArrDetails.funeralDirectorDetails.name : '-',
                    phone: fnrlArrDetails && fnrlArrDetails.phone ? fnrlArrDetails.phone : '-'
                },
                funeralArrangementSectionLocations: fnrlArrDetails ? fnrlArrDetails.funeralArrangementSectionLocations : [],
                instruction: fnrlArrDetails && fnrlArrDetails.instruction !== '' ? fnrlArrDetails.instruction : '-',
                notesFromStaff: staffNotes && staffNotes.length ? staffNotes : ['-'],
                notesFromFamily: familyNotes && familyNotes.length ? familyNotes : ['-'],
                reviewElectroicPlattedRecord: ss.genericDetails ? ss.genericDetails.isLocationVerifiedWithPlattedRecord : false,
                confirmBurialSpaceWithFamilyAndOperation: !!(isLocVrfdByForeman && isLocVrfdWithFamily),
                reviewTrustStatement: ss.genericDetails ? ss.genericDetails.reviewedTrustStatement : false,
                electronicCIF: ss.genericDetails ? ss.genericDetails.isElectronicCIF : false,
                confirmedPlacementScheduleWithFuneralDirector: ss.genericDetails ? ss.genericDetails.confirmedPlacementScheduleWithFuneralDirector : false,
                confirmedBodyIsEmbalmed: ss.intermentRequestDetails ? ss.intermentRequestDetails.isWitnessLoweringOrEntombment : false,
                confirmedExpectedMerchandiseDelivery: ss.genericDetails ? ss.genericDetails.confirmedExpectedMerchandiseDelivery : false,
                isPermitted: ss.genericDetails ? ss.genericDetails.isPermitted : false,
                isIntermentAuthorizationCompleted: woDetails ? woDetails.isIntermentAuthorizationCompleted : false,
                isPaidInFullForAN: woDetails ? woDetails.isPaidInFullForAN : false,
                isWitnessLoweringOrEntombment: ss.intermentRequestDetails ? ss.intermentRequestDetails.isWitnessLoweringOrEntombment : false,
                isWitnessCoveringOrSealings: ss.intermentRequestDetails ? ss.intermentRequestDetails.isWitnessCoveringOrSealings : false,
                isWitnessFilling: ss.intermentRequestDetails ? ss.intermentRequestDetails.isWitnessFilling : false,
                isReopenBottom: ss.intermentRequestDetails ? ss.intermentRequestDetails.isReopenBottom : false,
                isBurningPot: ss.intermentRequestDetails ? ss.intermentRequestDetails.isBurningPot : false,
                isMoundOfDirtByFootend: ss.intermentRequestDetails ? ss.intermentRequestDetails.isMoundOfDirtByFootend : false,
                isUseOfTent: ss.intermentRequestDetails ? ss.intermentRequestDetails.isUseOfTent : false,
                isPlaceAndNotify: ss.intermentRequestDetails ? ss.intermentRequestDetails.isPlaceAndNotify : false,
                isReopenTop: ss.intermentRequestDetails ? ss.intermentRequestDetails.isReopenTop : false,
                crematoryRetort: crematoryRetort
            }
            let startDate = moment(scData.schedulingBeginningTime).tz(timezone)
            let endDate = moment().tz(timezone)
            let diff = startDate.diff(endDate, 'hours')
            if (due > 0 && diff < 48) {
                scData.paidInFull = 'Agreement is not paid in full'
            }
            scData.urnTransferStatus = seed.seed.UrnTransferStatus[_.get(ss, 'resourcesCemeteryUrnTransferDetails[0].status')] || null
            return scData
        })

        return { count: count, cemeteryResult }
    }

    /**
     * CCS-8496
     * @param {*} reqBody
     * @param {date} reqData.serviceFromDate
     * @param {date} reqData.serviceToDate
     * @param {array} reqData.locations
     * @param {string} reqData.agreementType
     * @param {*} user currentUser details of name , email
     */
    static async sendEmailDaySheet (reqBody, user) {
        try {
            const cemeteryDaySheetWorker = queues[queueNames.cemetery_daysheet_email_queue]

            if (reqBody.agreementType === 'cemetery') {
                let result = await CemeteryDaySheetController.getCemeteryDaySheet(reqBody.serviceFromDate, reqBody.serviceToDate, reqBody.locations, reqBody.timezone, null, null, null, reqBody.resource, reqBody.resourceTypeId)
                let serviceToDate = moment(reqBody.serviceToDate).tz(reqBody.timezone).format('LL')
                let serviceFromDate = moment(reqBody.serviceFromDate).tz(reqBody.timezone).format('LL')
                if (result && result.count) {
                    let paymentRes = {
                        templateName: 'cemeteryDaySheetTemplate',
                        subject: `Cemetery Day Sheet: From (${serviceFromDate}) - To (${serviceToDate})`,
                        option: { pageSize: 'A4' },
                        pdfName: 'CemeteryDaysheet.pdf',
                        data: { ...result, timezone: reqBody.timezone },
                        content: `Hi ${user.name},
                        Please find the attached day sheet for your reference.
                        -One portal`,
                        email: user.email
                    }
                    cemeteryDaySheetWorker.add('cemeteryDaySheetEmailQueue', paymentRes, bullJobRetry)
                    return {
                        message: 'Logged in user will receive email. If Not try after 5 minutes'
                    }
                } else {
                    throw new Error(
                        'No Schedules found with in given from date, to date and locations'
                    )
                }
            }
        } catch (error) {
            logger.error(error)
            throw error
        }
    }
}
module.exports = exports = CemeteryDaySheetController
