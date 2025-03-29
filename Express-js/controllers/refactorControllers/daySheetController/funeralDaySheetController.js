const models = require('../../../models')
const logger = require('../../../lib/logger')
const _ = require('lodash')
const Sequelize = require('sequelize')
const { queueNames, queues } = require('./../../../appQueues')
const Op = Sequelize.Op
const moment = require('moment')
const { bullJobRetry } = require('../../../lib/util')
const seed = require('../../../config/seed')

class FuneralDaySheetController {
    /**
     * Get FuneralDaySheet details
     * @param {String} fromDate - starting date given by user
     * @param {String} toDate - ending date given by user
     * @param {Array} locations - locations given by user
     * @param {Boolean} paginate - pagination required or not
     * @param {String} page -  page number
     * @param {String} limit -  limit per page
     */
    static async getFuneralDaySheet (fromDate, toDate, locations, paginate, page, limit, resource, resourceTypeId) {
        try {
            page = parseInt(page)
            limit = parseInt(limit)
            locations = locations.map(e => Number(e))
            let itemUsageCommonScope = {
                model: models.AgreementLocationItem,
                as: 'agreementLocationItem',
                include: [{
                    model: models.LocationItem.scope('withSchedulingService'),
                    as: 'locationItem'
                }, {
                    model: models.Agreement,
                    as: 'agreementDetails',
                    where: {
                        locationId: {
                            [Op.in]: locations
                        }
                    },
                    required: true,
                    attributes: ['type', 'contractNumber', 'arrangerId', 'locationId'],
                    include: [{
                        model: models.Employee,
                        as: 'arranger'
                    }]
                }, {
                    model: models.Addendum,
                    as: 'addendumDetails'
                }]
            }

            let agreementPackageItemScope = {
                model: models.AgreementPackageItem,
                as: 'agreementPackageItem',
                include: [{
                    model: models.LocationItem.scope('withSchedulingService'),
                    as: 'locationItem'
                }, {
                    model: models.AgreementPackage,
                    as: 'agreementPackage',
                    include: [{
                        model: models.Agreement,
                        as: 'agreementDetails',
                        where: {
                            locationId: {
                                [Op.in]: locations
                            }
                        },
                        required: true,
                        attributes: ['type', 'contractNumber', 'arrangerId'],
                        include: [{
                            model: models.Employee,
                            as: 'arranger'
                        }]
                    },
                    {
                        model: models.Addendum,
                        as: 'addendumDetails'
                    }]
                }]
            }

            let agreementCAItemScope = {
                model: models.AgreementCashAdvancedItem,
                as: 'agreementCashAdvancedItem',
                where: { deletedAt: null },
                required: false,
                include: [{
                    model: models.LocationItem.scope('withSchedulingService'),
                    as: 'locationItem'
                }, {
                    model: models.Agreement,
                    as: 'agreementDetails',
                    where: {
                        locationId: {
                            [Op.in]: locations
                        }
                    },
                    required: true,
                    attributes: ['type', 'contractNumber', 'arrangerId'],
                    include: [{
                        model: models.Employee,
                        as: 'arranger'
                    }]
                },
                {
                    model: models.Addendum,
                    as: 'addendumDetails'
                }]
            }

            let commonScope = [
                'subServicesSectionScope',
                'personScope',
                'urnInformationScope',
                'casketSectionScope',
                'resourceSectionScope',
                'cemeteryInformationScope',
                'vechileScope',
                'noteSectionsScope',
                'resourceSectionNotesScope'
            ]
            if (resourceTypeId && resourceTypeId.length) {
                resourceTypeId = resourceTypeId.map(e => Number(e))
            }
            let chapelWhere = resource && resource !== 'Crematory Retort' && resourceTypeId.length ? { id: { [Op.in]: resourceTypeId } } : {}
            let chapelRequired = !!(resource && resource !== 'Crematory Retort' && resourceTypeId.length)
            let CRWhere = resource && resource === 'Crematory Retort' && resourceTypeId.length ? { id: { [Op.in]: resourceTypeId } } : {}
            let CRRequired = !!(resource && resource === 'Crematory Retort' && resourceTypeId.length)
            commonScope.push({ method: ['schedulingSectionScopeDaySheet', chapelWhere, chapelRequired] })
            commonScope.push({ method: ['workOrderNotesScope', CRWhere, CRRequired] })
            let fsData = await models.ScheduledFuneralService.scope(commonScope).findAll({
                where: {
                    deletedAt: null,
                    deletedBy: null
                },
                include: [{
                    model: models.SchedulingSection,
                    as: 'schedulingDetails',
                    where: {
                        [Op.and]: [{
                            beginningTime: {
                                [Op.gte]: fromDate
                            }
                        },
                        {
                            beginningTime: {
                                [Op.lt]: toDate
                            }
                        }
                        ]
                    }
                },
                {
                    model: models.UrnTransfer,
                    as: 'resourcesFuneralUrnTransferDetails',
                    required: false,
                    where: {
                        resourceType: 'ScheduledFuneralService'
                    }
                },
                itemUsageCommonScope,
                agreementPackageItemScope,
                agreementCAItemScope
                ]
            })

            let funeralServiceData = []
            fsData.forEach((item) => {
                let addendumNo = _.get(item, 'agreementLocationItem.addendumDetails.addendumNumber', null)
                if (!addendumNo) {
                    addendumNo = _.get(item, 'agreementPackageItem.addendumDetails.addendumNumber', null)
                }
                if (!addendumNo) {
                    addendumNo = _.get(item, 'agreementCashAdvancedItem.addendumDetails.addendumNumber', null)
                }
                let contractNumber = _.get(item, 'agreementPackageItem.agreementPackage.agreementDetails.contractNumber', null)
                if (!contractNumber) {
                    contractNumber = _.get(item, 'agreementLocationItem.agreementDetails.contractNumber', null)
                }
                if (!contractNumber) {
                    contractNumber = _.get(item, 'agreementCashAdvancedItem.agreementDetails.contractNumber', null)
                }
                if (addendumNo || contractNumber) {
                    item.contractNumber = addendumNo || contractNumber
                    funeralServiceData.push(item)
                }
            })

            let count = funeralServiceData.length

            funeralServiceData = funeralServiceData.sort((a, b) => {
                let date1 = new Date(a.schedulingDetails.beginningTime)
                let date2 = new Date(b.schedulingDetails.beginningTime)
                return date1 - date2
            })
            // return funeralServiceData;

            // Paginating the array
            if (paginate) {
                page = page || 1
                limit = limit || 10
                funeralServiceData = funeralServiceData.slice((page - 1) * limit, page * limit)
            }

            let finalFuneralServiceData = []
            funeralServiceData.forEach((item, index) => {
                try {
                    let obj = {}
                    obj.onePortalId = _.get(item, 'person.personVerificationDetails.onePortalId', '-')
                    let personName = item.person ? _.compact([item.person.firstName, item.person.middleName]).join(' ') : '-'
                    if (item.person && item.person.lastName) {
                        personName = `${item.person.lastName.toUpperCase()}, ${personName}`
                    }
                    obj.personName = personName
                    obj.isAlive = !!item.person.isAlive
                    obj.agreementContractNumber = item.contractNumber
                    obj.schedulingBeginningTime = _.get(item, 'schedulingDetails.beginningTime', '-')
                    obj.schedulingEndingTime = _.get(item, 'schedulingDetails.endingTime', '-')
                    obj.serviceLocationAddress = '-'
                    obj.chapelName = '-'
                    obj.receptionName = '-'
                    if (item && item.schedulingDetails && item.schedulingDetails.serviceLocation) {
                        let address = ''
                        let location = item.schedulingDetails.serviceLocation
                        if (location.organization) {
                            address += location.organization.name + ','
                        }
                        if (location.address) {
                            if (location.address.line1) {
                                address += ' ' + location.address.line1 + ','
                            }
                            if (location.address.line2) {
                                address += ' ' + location.address.line2 + ','
                            }
                            if (location.address.city) {
                                address += ' ' + location.address.city + ','
                            }
                            if (location.address.state) {
                                address += ' ' + location.address.state + ','
                            }
                            if (location.address.county) {
                                address += ' ' + location.address.county + ','
                            }
                            if (location.address.country) {
                                address += ' ' + location.address.country
                            }
                        }
                        if (address) {
                            let newAddress = address[address.length - 1]
                            if (newAddress === ',') {
                                address = address.substring(0, address.length - 1)
                            }
                        }
                        obj.serviceLocationAddress = address
                    } else if (item && item.schedulingDetails && item.schedulingDetails.clFacilityLocation && item.schedulingDetails.clFacilityLocation.name) {
                        obj.serviceLocationAddress = item.schedulingDetails.clFacilityLocation.name
                        if (item.schedulingDetails.reservedChapel && item.schedulingDetails.reservedChapel.resourceType === 'Chapel' && item.schedulingDetails.reservedChapel.reservedChapelDetails && item.schedulingDetails.reservedChapel.reservedChapelDetails.name) {
                            if (_.get(item, 'schedulingDetails.reservedChapel.reservedChapelDetails.ChapelTypeChapels[0].ChapelType.name') === 'chapel') {
                                obj.chapelName = item.schedulingDetails.reservedChapel.reservedChapelDetails.name
                            }
                        }
                    }
                    if (!obj.serviceLocationAddress || obj.serviceLocationAddress === '-') {
                        let cemInfo = item ? item.cemeteryInformationDetails : null
                        let clCemLoc = cemInfo ? cemInfo.clCemeteryLocation : null
                        let cemLoc = cemInfo ? cemInfo.cemeteryLocation : null
                        if (clCemLoc) {
                            obj.serviceLocationAddress = clCemLoc.name
                        } else if (cemLoc) {
                            let clAddress = cemLoc.address
                            obj.serviceLocationAddress = [cemLoc.organization ? cemLoc.organization.name : '', clAddress.line1, clAddress.line2, clAddress.city, clAddress.state, clAddress.county, clAddress.country].join(', ').trim()
                        }
                    }
                    if (item && item.schedulingDetails && _.get(item, 'schedulingDetails.reservedChapel.reservedChapelDetails.ChapelTypeChapels[0].ChapelType.name') === 'reception') {
                        obj.receptionName = item.schedulingDetails.reservedChapel.reservedChapelDetails.name
                    }
                    obj.burialSite = '-'
                    if (item && item.cemeteryInformationDetails && item.cemeteryInformationDetails.burialSite) {
                        obj.burialSite = item.cemeteryInformationDetails.burialSite
                    }
                    obj.urn = '-'
                    obj.urnType = '-'
                    obj.urnReceivedDate = '-'
                    obj.urnTransferRequired = 'No'
                    if (item && item.urnInformationItemUsageDetails) {
                        if (item.urnInformationItemUsageDetails.ItemUsage && item.urnInformationItemUsageDetails.ItemUsage.agreementItems && item.urnInformationItemUsageDetails.ItemUsage.agreementItems.locationItem && item.urnInformationItemUsageDetails.ItemUsage.agreementItems.locationItem.Item) {
                            obj.urn = item.urnInformationItemUsageDetails.ItemUsage.agreementItems.locationItem.Item.name
                            obj.urnTransferRequired = item.urnInformationItemUsageDetails.isTransferRequired ? 'Yes' : 'No'
                        }
                    } else if (item && item.urnInformationItemDetails) {
                        if (item.urnInformationItemDetails.urn && item.urnInformationItemDetails.urn.locationItem && item.urnInformationItemDetails.urn.locationItem.Item) {
                            obj.urn = item.urnInformationItemDetails.urn.locationItem.Item.name
                            obj.urnTransferRequired = item.urnInformationItemDetails.isTransferRequired ? 'Yes' : 'No'
                        }
                    }

                    if (item && item.urnInformationDetails) {
                        if (item && item.urnInformationDetails.isFamilyOwnedUrn) {
                            obj.urn = 'Family Urn'
                            obj.urnType = item.urnInformationDetails.urnTypeDetails && item.urnInformationDetails.urnTypeDetails.name ? item.urnInformationDetails.urnTypeDetails.name : '-'
                            obj.urnReceivedDate = item.urnInformationDetails.receivedDate ? item.urnInformationDetails.receivedDate : '-'
                            obj.urnTransferRequired = item.urnInformationDetails.isTransferRequired ? 'Yes' : 'No'
                        }
                    }
                    obj.pallbearers = []
                    if (item && item.resourcesDetails && item.resourcesDetails.pallbearers && item.resourcesDetails.pallbearers.length) {
                        item.resourcesDetails.pallbearers.map((data) => {
                            let pc = data.PersonContact
                            if (pc && pc.employee) {
                                obj.pallbearers.push(pc.employee.name)
                            } else if (pc && pc.person) {
                                obj.pallbearers.push([pc.person.firstName, pc.person.middleName, pc.person.lastName].join(' ').trim())
                            }
                        })
                    } else {
                        obj.pallbearers = ['-']
                    }
                    obj.scheduledServiceName = '-'
                    if (item && item.agreementLocationItem && item.agreementLocationItem.locationItem && item.agreementLocationItem.locationItem.Item) {
                        let [itemAttribute] = item.agreementLocationItem.locationItem.Item.itemAttributes
                        let attributeVal = itemAttribute.AttributeValue
                        obj.scheduledServiceName = attributeVal ? attributeVal.name : '-'
                    } else if (item && item.agreementPackageItem && item.agreementPackageItem.locationItem && item.agreementPackageItem.locationItem.Item) {
                        let [itemAttribute] = item.agreementPackageItem.locationItem.Item.itemAttributes
                        let attributeVal = itemAttribute.AttributeValue
                        obj.scheduledServiceName = attributeVal ? attributeVal.name : '-'
                    } else if (item && item.agreementCashAdvancedItem && item.agreementCashAdvancedItem.locationItem && item.agreementCashAdvancedItem.locationItem.Item) {
                        let [itemAttribute] = item.agreementCashAdvancedItem.locationItem.Item.itemAttributes
                        let attributeVal = itemAttribute.AttributeValue
                        obj.scheduledServiceName = attributeVal ? attributeVal.name : '-'
                    }
                    obj.arranger = '-'
                    if (item && item.agreementLocationItem && item.agreementLocationItem.agreementDetails && item.agreementLocationItem.agreementDetails.arranger) {
                        obj.arranger = item.agreementLocationItem.agreementDetails.arranger.name ? item.agreementLocationItem.agreementDetails.arranger.name : '-'
                    } else if (item && item.agreementPackageItem && item.agreementPackageItem.agreementPackage && item.agreementPackageItem.agreementPackage.agreementDetails && item.agreementPackageItem.agreementPackage.agreementDetails.arranger) {
                        obj.arranger = item.agreementPackageItem.agreementPackage.agreementDetails.arranger.name ? item.agreementPackageItem.agreementPackage.agreementDetails.arranger.name : '-'
                    } else if (item && item.agreementCashAdvancedItem && item.agreementCashAdvancedItem.agreementDetails && item.agreementCashAdvancedItem.agreementDetails.arranger) {
                        obj.arranger = item.agreementCashAdvancedItem.agreementDetails.arranger.name ? item.agreementCashAdvancedItem.agreementDetails.arranger.name : '-'
                    }
                    obj.embalmer = item && item.person && item.person.PersonRemainsInfo && item.person.PersonRemainsInfo.embalmer ? item.person.PersonRemainsInfo.embalmer.name : item.person.PersonRemainsInfo && item.person.PersonRemainsInfo.isEmbalmingNotAssigned ? 'Not Assigned' : '-'
                    obj.deathCertificateStatus = (item && item.person && item.person.CaseInfoForm ? item.person.CaseInfoForm.status : 'pending')
                    if (item && item.casketDetails) {
                        obj.casketSelectedForScheduledService = '-'
                        if (item.casketDetails.isOutSideCasket) {
                            obj.casketSelectedForScheduledService = item.casketDetails.casketType
                        }
                    } else if (item && item.casketItemUsageDetails) {
                        if (item.casketItemUsageDetails.ItemUsage && item.casketItemUsageDetails.ItemUsage.agreementItems && item.casketItemUsageDetails.ItemUsage.agreementItems.locationItem && item.casketItemUsageDetails.ItemUsage.agreementItems.locationItem.Item) {
                            obj.casketSelectedForScheduledService = item.casketItemUsageDetails.ItemUsage.agreementItems.locationItem.Item.name
                        } else {
                            obj.casketSelectedForScheduledService = '-'
                        }
                    } else if (item && item.casketItemDetails) {
                        if (item.casketItemDetails.casket && item.casketItemDetails.casket.locationItem && item.casketItemDetails.casket.locationItem.Item) {
                            obj.casketSelectedForScheduledService = item.casketItemDetails.casket.locationItem.Item.name
                        } else {
                            obj.casketSelectedForScheduledService = '-'
                        }
                    }
                    obj.hearseDetails = null
                    obj.utilityCarDetails = []
                    obj.employeesSchedule = []
                    let staffNotes = []
                    let familyNotes = []
                    if (item.resourcesDetails && item.resourcesDetails.resourceSectionNotes && item.resourcesDetails.resourceSectionNotes.length) {
                        item.resourcesDetails.resourceSectionNotes.map(note => {
                            if (note.noteLevel.name === 'family') {
                                familyNotes.push(note.content)
                            } else {
                                staffNotes.push(note.content)
                            }
                        })
                    }
                    if (item && item.workOrder && item.workOrder.notes) {
                        item.workOrder.notes.map((data) => {
                            staffNotes.push(data.content)
                        })
                    }
                    obj.notesFromStaff = staffNotes && staffNotes.length ? staffNotes : ['-']
                    obj.notesFromFamily = familyNotes && familyNotes.length ? familyNotes : ['-']
                    obj.crematoryRetort = '-'
                    if (item && item.workOrder && item.workOrder.notes) {
                        [staffNotes] = _.reverse(item.workOrder.notes)
                    }
                    // if (item && item.workOrder && item.workOrder.workOrderDetail && item.workOrder.workOrderDetail.crematoryRetort) {
                    //     obj.crematoryRetort = item.workOrder.workOrderDetail.crematoryRetort.name + ' ' + item.workOrder.workOrderDetail.crematoryRetort.chamber
                    // }

                    if (item && item.workOrder && item.workOrder.ChamberAccountabilityLog && item.workOrder.ChamberAccountabilityLog.chamber) {
                        obj.crematoryRetort = item.workOrder.ChamberAccountabilityLog.chamber.name + ' ' + item.workOrder.ChamberAccountabilityLog.chamber.chamber
                    }

                    obj.subServicesDetails = []
                    if (item && item.subServicesDetails && item.subServicesDetails.length) {
                        item.subServicesDetails.forEach((item) => {
                            obj.subServicesDetails.push({
                                endTime: item.endTime,
                                startTime: item.startTime,
                                subServiceName: item && item.subService ? item.subService.name : '-'
                            })
                        })
                    }
                    if (item && item.workOrder && item.workOrder.assignedResources) {
                        item.workOrder.assignedResources.forEach((resource) => {
                            if (resource.task) {
                                if (resource.task.reservedResource && resource.task.reservedResource.reservedVehicleDetails && resource.task.reservedResource.reservedVehicleDetails.type === 'hearse') {
                                    obj.hearseDetails = {
                                        employeeName: resource.employee ? resource.employee.name : '-',
                                        startTime: resource.task.reservedResource.startTime,
                                        vehicleName: resource && resource.task && resource.task.reservedResource && resource.task.reservedResource.reservedVehicleDetails ? resource.task.reservedResource.reservedVehicleDetails.name : '-'
                                    }
                                } else if (resource.task.reservedResource && resource.task.reservedResource.reservedVehicleDetails && resource.task.reservedResource.reservedVehicleDetails.type === 'utilityCar') {
                                    obj.utilityCarDetails.push({
                                        employeeName: resource.employee ? resource.employee.name : '-',
                                        startTime: resource.task.reservedResource.startTime,
                                        vehicleName: resource && resource.task && resource.task.reservedResource && resource.task.reservedResource.reservedVehicleDetails ? resource.task.reservedResource.reservedVehicleDetails.name : '-'
                                    })
                                } else {
                                    obj.employeesSchedule.push({
                                        email: resource.employee ? resource.employee.email : '-',
                                        employeeName: resource.employee ? resource.employee.name : '-',
                                        startTime: resource.startTime,
                                        workOrderTaskName: resource.task && resource.task.name ? resource.task.name : '-'
                                    })
                                }
                            }
                        })
                    }
                    obj.urnTransferStatus = seed.seed.UrnTransferStatus[_.get(item, 'resourcesFuneralUrnTransferDetails[0].status')] || null
                    finalFuneralServiceData.push(obj)
                } catch (error) {
                    logger.log(error)
                    throw error
                }
            })

            // we can use this to group the data with date
            /* var groups = _.groupBy(finalFuneralServiceData, function (record) {
                return moment(record.schedulingBeginningTime).startOf('day').format();
            });
            finalFuneralServiceData = [];
            _.each(groups, (value,key) => {
                finalFuneralServiceData.push({
                    serviceDate: key,
                    scheduledFunerals: value
                })
            }) */

            return {
                count: count,
                funeralResult: finalFuneralServiceData
            }
        } catch (err) {
            throw err
        }
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
            let serviceToDate = moment(reqBody.serviceToDate).tz(reqBody.timezone).format('LL')
            let serviceFromDate = moment(reqBody.serviceFromDate).tz(reqBody.timezone).format('LL')
            const funeralDaySheetWorker = queues[queueNames.funeral_daysheet_email_queue]
            if (reqBody.agreementType === 'funeral') {
                let result = await FuneralDaySheetController.getFuneralDaySheet(reqBody.serviceFromDate, reqBody.serviceToDate, reqBody.locations, null, null, null, reqBody.resource, reqBody.resourceTypeId)
                if (result && result.count) {
                    let paymentRes = {
                        templateName: 'funeralDaySheetTemplate',
                        subject: `Funeral Day Sheet: From (${serviceFromDate}) - To (${serviceToDate})`,
                        option: { pageSize: 'A4' },
                        pdfName: 'funeralDaysheet.pdf',
                        data: { ...result, timezone: reqBody.timezone },
                        content: `Hi ${user.name},\n\n Please find the attached day sheet for your reference.\n\n-One portal`,
                        email: user.email
                    }
                    funeralDaySheetWorker.add('funeralDaySheetEmailQueue', paymentRes, bullJobRetry)
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
module.exports = exports = FuneralDaySheetController
