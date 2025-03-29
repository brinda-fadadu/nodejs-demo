const models = require('../../../models')
const logger = require('../../../lib/logger')
const _ = require('lodash')
const Sequelize = require('sequelize')
const { queueNames, queues } = require('./../../../appQueues')
const Op = Sequelize.Op
const moment = require('moment')
const { bullJobRetry } = require('../../../lib/util')

class FuneralOnePageDaySheetController {
    /**
     * Get FuneralDaySheet details
     * @param {String} fromDate - starting date given by user
     * @param {String} toDate - ending date given by user
     * @param {Boolean} paginate - pagination required or not
     * @param {String} page -  page number
     * @param {String} limit -  limit per page
     */
    static async getFuneralOnePageDaySheet (fromDate, toDate, paginate, page, limit, locations = []) {
        locations = locations.map(e => Number(e))
        try {
            page = parseInt(page)
            limit = parseInt(limit)
            let agreementLocationItemScope = {
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

                    },
                    include: [
                        {
                            model: models.ReservedResource,
                            as: 'reservedChapel',
                            attributes: ['id', 'resourceType', 'resourceId', 'reservationDate', 'startTime', 'endTime'],
                            include: [{
                                model: models.Chapel,
                                as: 'reservedChapelDetails',
                                attributes: ['id', 'name'],
                                include: [{
                                    model: models.ChapelTypeChapel,
                                    include: [{
                                        model: models.ChapelType
                                    }]
                                }]
                            }]
                        }
                    ]
                },
                agreementLocationItemScope,
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
                    obj.arranger = '-'
                    if (item && item.agreementLocationItem && item.agreementLocationItem.agreementDetails && item.agreementLocationItem.agreementDetails.arranger) {
                        obj.arranger = item.agreementLocationItem.agreementDetails.arranger.name ? item.agreementLocationItem.agreementDetails.arranger.name : '-'
                    } else if (item && item.agreementPackageItem && item.agreementPackageItem.agreementPackage && item.agreementPackageItem.agreementPackage.agreementDetails && item.agreementPackageItem.agreementPackage.agreementDetails.arranger) {
                        obj.arranger = item.agreementPackageItem.agreementPackage.agreementDetails.arranger.name ? item.agreementPackageItem.agreementPackage.agreementDetails.arranger.name : '-'
                    } else if (item && item.agreementCashAdvancedItem && item.agreementCashAdvancedItem.agreementDetails && item.agreementCashAdvancedItem.agreementDetails.arranger) {
                        obj.arranger = item.agreementCashAdvancedItem.agreementDetails.arranger.name ? item.agreementCashAdvancedItem.agreementDetails.arranger.name : '-'
                    }
                    obj.agreementContractNumber = item.contractNumber
                    let personName = item.person ? _.compact([item.person.firstName, item.person.middleName]).join(' ') : '-'
                    if (item.person && item.person.lastName) {
                        personName = `${item.person.lastName.toUpperCase()}, ${personName}`
                    }
                    obj.personName = personName
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
                    obj.embalmer = item && item.person && item.person.PersonRemainsInfo && item.person.PersonRemainsInfo.embalmer ? item.person.PersonRemainsInfo.embalmer.name : item.person.PersonRemainsInfo && item.person.PersonRemainsInfo.isEmbalmingNotAssigned ? 'Not Assigned' : '-'
                    obj.deathCertificateStatus = (item && item.person && item.person.CaseInfoForm ? item.person.CaseInfoForm.status : 'pending')
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
                    obj.chapelName = '-'
                    if (item && item.schedulingDetails && (
                        (_.get(item, 'schedulingDetails.reservedChapel.reservedChapelDetails.ChapelTypeChapels[0].ChapelType.name') === 'chapel') ||
                        (_.get(item, 'schedulingDetails.reservedChapel.reservedChapelDetails.ChapelTypeChapels[0].ChapelType.name') === 'reception')
                    )) {
                        obj.chapelName = item.schedulingDetails.reservedChapel.reservedChapelDetails.name
                    }
                    obj.finalDisposition = item && item.person && item.person.PersonRemainsInfo && item.person.PersonRemainsInfo.finalDisposition ? item.person.PersonRemainsInfo.finalDisposition : '-'
                    obj.cremationType = _.get(item, 'schedulingDetails.cremationType', '-')
                    obj.schedulingBeginningTime = _.get(item, 'schedulingDetails.beginningTime', '-')
                    obj.schedulingEndingTime = _.get(item, 'schedulingDetails.endingTime', '-')
                    obj.hearseDetails = '-'
                    obj.utilityCarDetails = []
                    obj.employeesSchedule = []
                    obj.funeralDirector = '-'
                    if (item && item.workOrder && item.workOrder.assignedResources) {
                        item.workOrder.assignedResources.forEach((resource) => {
                            if (resource.task) {
                                if (resource.task.reservedResource && resource.task.reservedResource.reservedVehicleDetails && resource.task.reservedResource.reservedVehicleDetails.type === 'hearse') {
                                    obj.hearseDetails = resource && resource.employee && resource.employee.name ? resource.employee.name : '-'
                                } else if (resource.task.reservedResource && resource.task.reservedResource.reservedVehicleDetails && resource.task.reservedResource.reservedVehicleDetails.type === 'utilityCar') {
                                    obj.utilityCarDetails.push(resource && resource.employee && resource.employee.name ? resource.employee.name : '-')
                                }
                            }
                            if (resource.staffType === 'staff') {
                                obj.employeesSchedule.push(resource.employee ? resource.employee.name : '-')
                            }
                            if (resource.staffType === 'apc') {
                                obj.funeralDirector = resource.employee.name
                            }
                        })
                    }
                    let workOrderNotes = []
                    let schedulingNotes = []
                    if (item.resourcesDetails && item.resourcesDetails.resourceSectionNotes && item.resourcesDetails.resourceSectionNotes.length) {
                        item.resourcesDetails.resourceSectionNotes.map(note => {
                            if (note.noteLevel.name === 'staff') {
                                schedulingNotes.push(note.content)
                            }
                        })
                    }
                    if (item && item.workOrder && item.workOrder.notes) {
                        item.workOrder.notes.map((data) => {
                            workOrderNotes.push(data.content)
                        })
                    }
                    obj.workOrderNotes = workOrderNotes && workOrderNotes.length ? workOrderNotes : ['-']
                    obj.schedulingNotes = schedulingNotes && schedulingNotes.length ? schedulingNotes : ['-']

                    finalFuneralServiceData.push(obj)
                } catch (error) {
                    logger.log(error)
                    throw error
                }
            })

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
    static async sendEmailOnePageDaySheet (reqBody, user) {
        try {
            let serviceToDate = moment(reqBody.serviceToDate).tz(reqBody.timezone).format('LL')
            let serviceFromDate = moment(reqBody.serviceFromDate).tz(reqBody.timezone).format('LL')
            const funeralOnePageDaySheetWorker = queues[queueNames.funeral_one_page_daysheet_email_queue]
            let result = await FuneralOnePageDaySheetController.getFuneralOnePageDaySheet(reqBody.serviceFromDate, reqBody.serviceToDate, null, null, null, reqBody.locations)
            this.formatData(result, reqBody.timezone)
            if (result && result.count) {
                let paymentRes = {
                    templateName: 'funeralOnePageDaySheetTemplate',
                    subject: `Funeral  One Page Day Sheet: From (${serviceFromDate}) - To (${serviceToDate})`,
                    option: { pageSize: 'A4', orientation: 'landscape' },
                    pdfName: 'OnePageDaysheet.pdf',
                    data: { ...result, timezone: reqBody.timezone },
                    content: `Hi ${user.name},\n\n Please find the attached funeral one page day sheet for your reference.\n\n-One portal`,
                    email: user.email
                }
                funeralOnePageDaySheetWorker.add('funeralOnePageDaySheetEmailQueue', paymentRes, bullJobRetry)
                return {
                    message: 'Logged in user will receive email. If Not try after 5 minutes'
                }
            } else {
                throw new Error(
                    'No Schedules found with in given from date, to date and locations'
                )
            }
        } catch (error) {
            logger.error(error)
            throw error
        }
    }

    static formatData (data, timezone) {
        if (data.funeralResult.length) {
            let funeralResults = data.funeralResult.map(ele => {
                const day = _.get(ele, 'schedulingBeginningTime', '')
                    ? moment(_.get(ele, 'schedulingBeginningTime', '')).tz(timezone).format(
                        'dddd'
                    )
                    : ''
                const date = _.get(ele, 'schedulingBeginningTime', '')
                    ? moment(_.get(ele, 'schedulingBeginningTime', '')).tz(timezone).format(
                        'MMMM Do'
                    )
                    : ''
                const beginningTime = _.get(
                    ele,
                    'schedulingBeginningTime',
                    ''
                )
                    ? moment(_.get(ele, 'schedulingBeginningTime', '')).tz(timezone).format(
                        'LT'
                    )
                    : ''
                const endTime = _.get(ele, 'schedulingEndingTime', '')
                    ? moment(_.get(ele, 'schedulingEndingTime', '')).tz(timezone).format(
                        'LT'
                    )
                    : ''
                const cremationDate = _.get(ele, 'schedulingBeginningTime', '')
                    ? moment(_.get(ele, 'schedulingBeginningTime', '')).tz(timezone).format(
                        'L'
                    )
                    : ''
                ele.beginningTime = beginningTime
                ele.endTime = endTime
                ele.ServiceDate = date.toString()
                ele.ServiceDay = day
                ele.cremationType = ele.cremationType ? `${ele.cremationType} - ${cremationDate}` : '-'
                ele.employeesScheduleText = '-'
                if (_.get(ele, 'employeesSchedule', []).length) {
                    ele.employeesScheduleText = ''
                    _.get(ele, 'employeesSchedule', []).map(
                        (note, i) => {
                            ele.employeesScheduleText += note
                            if (_.get(ele, 'employeesSchedule')
                                .length !==
                                      i + 1
                            ) { ele.employeesScheduleText += ',' }
                        }
                    )
                }
                ele.pallbearersText = '-'
                if (_.get(ele, 'pallbearers', []).length) {
                    ele.pallbearersText = ''
                    _.get(ele, 'pallbearers', []).map(
                        (pallbearer, i) => {
                            ele.pallbearersText += pallbearer
                            if (_.get(ele, 'pallbearers')
                                .length !==
                                      i + 1
                            ) { ele.pallbearersText += ',' }
                        }
                    )
                }
                ele.utilityCarDetailsText = '-'
                if (_.get(ele, 'utilityCarDetails', []).length) {
                    ele.utilityCarDetailsText = ''
                    _.get(ele, 'utilityCarDetails', []).map(
                        (note, i) => {
                            ele.utilityCarDetailsText += note
                            if (_.get(ele, 'utilityCarDetails')
                                .length !==
                                      i + 1
                            ) { ele.utilityCarDetailsText += ',' }
                        }
                    )
                }
                return ele
            })
            return funeralResults
        }
        return []
    }
}
module.exports = exports = FuneralOnePageDaySheetController
