const models = require('../../../models')
const _ = require('lodash')
const seedValues = require('../../../config/seed')
const { getKey } = require('../../../lib/util')
const { seed } = require('../../../config/seed')
const Op = require('sequelize').Op

function locationItemAndAttributeIncludesForFuneralScheduling (servicetype) {
    return [
        {
            model: models.LocationItem,
            as: 'locationItem',
            attributes: ['id', 'itemId'],
            required: true,
            include: [
                {
                    model: models.Item,
                    attributes: ['id'],
                    required: true,
                    include: [
                        {
                            model: models.ItemAttributeValue,
                            as: 'itemAttributes',
                            attributes: ['id'],
                            required: true,
                            include: [
                                {
                                    model: models.AttributeValue,
                                    attributes: ['id', 'name'],
                                    required: true,
                                    where: { name: servicetype },
                                    include: [
                                        {
                                            model: models.Attribute,
                                            as: 'attribute',
                                            required: false
                                        }
                                    ]
                                }
                            ]
                        }
                    ]
                }
            ]
        }
    ]
}
function locationItemAndAttributeInclude (servicetype) {
    return [
        {
            model: models.LocationItem,
            as: 'locationItem',
            attributes: ['id', 'itemId'],
            required: true,
            include: [
                {
                    model: models.Item,
                    attributes: ['id'],
                    required: true,
                    include: [
                        {
                            model: models.ItemAttributeValue,
                            as: 'itemAttributes',
                            attributes: ['id'],
                            required: true,
                            include: [
                                {
                                    model: models.AttributeValue,
                                    attributes: ['id', 'name'],
                                    required: true,
                                    where: { name: servicetype },
                                    include: [
                                        {
                                            model: models.Attribute,
                                            as: 'attribute',
                                            required: false
                                        }
                                    ]
                                }
                            ]
                        }
                    ]
                }
            ]
        },
        {
            model: models.Agreement,
            as: 'agreementDetails',
            attributes: ['type', 'contractNumber', 'arrangerId'],
            include: [
                {
                    model: models.Location,
                    as: 'location'
                }
            ]
        }
    ]
}

async function _createNoteForResourceSection (
    notesArray,
    resourceSectionId,
    userId,
    levelName,
    transaction
) {
    const noteCategory = await models.NoteCategory.findOne({
        where: { name: 'Cemetery Scheduling' }
    })
    await Promise.all(
        notesArray.map(async note => {
            if (!note.id) {
                const inputObj = {
                    resourceType: 'ScheduledCemeteryService',
                    resourceId: resourceSectionId,
                    content: note.content,
                    categoryId: noteCategory ? noteCategory.id : 8,
                    createdBy: userId,
                    updatedBy: userId
                }
                let noteResult = await models.Note.create(inputObj, { transaction })
                if (noteResult) {
                    await models.NoteLevel.create(
                        { name: levelName, noteId: noteResult.id },
                        { transaction }
                    )
                }
            }
        })
    )
}

/**
 * notes to separate noteFromFamily and noteFromStaff
 * @param {Object} noteData notesection details
 * @param {Object} result  scheduling object
 */
function _getNoteSections (noteData, result) {
    let notesFromStaff = []
    let notesFromFamily = []
    if (noteData && noteData.length) {
        notesFromFamily = noteData.filter(r => r.noteLevel.name === 'family')
        notesFromStaff = noteData.filter(r => r.noteLevel.name === 'staff')
        result.notesFromFamily = notesFromFamily
        result.notesFromStaff = notesFromStaff
    } else {
        if (result) {
            result.notesFromFamily = notesFromFamily
            result.notesFromStaff = notesFromStaff
        }
    }
}

/**
 * create query for fetch funeral arragement details
 * @param {Number} personId
 * @param {String} serviceName
 */
function getCommonQueryFuneralArragement (personId, serviceName) {
    let agreementIncludes = [
        {
            model: models.SchedulingSection,
            as: 'schedulingDetails',
            attributes: ['id'],
            include: [
                {
                    model: models.Location,
                    as: 'clFacilityLocation',
                    attributes: ['id', 'name', 'code']
                },
                {
                    model: models.Place,
                    as: 'serviceLocation',
                    attributes: ['id'],
                    include: [
                        {
                            model: models.Organization,
                            as: 'organization',
                            attributes: ['id', 'name'],
                            include: [
                                {
                                    model: models.OrganizationType,
                                    as: 'organizationType'
                                }
                            ]
                        },
                        {
                            model: models.Address,
                            attributes: [
                                'id',
                                'line1',
                                'line2',
                                'city',
                                'state',
                                'county',
                                'country',
                                'zipcode'
                            ],
                            as: 'address'
                        }
                    ]
                }
            ]
        },
        {
            model: models.WorkOrder,
            as: 'workOrder',
            attributes: ['id'],
            include: [
                {
                    model: models.Employee,
                    as: 'workOrderOwner',
                    attributes: ['id', 'name'],
                    include: [
                        {
                            model: models.EmployeeType,
                            attributes: ['id', 'code', 'description'],
                            as: 'employeeType'
                        }
                    ]
                }
            ]
        },
        {
            model: models.AgreementLocationItem,
            as: 'agreementLocationItem',
            where: { deletedAt: null },
            attributes: ['id'],
            required: false,
            include: locationItemAndAttributeIncludesForFuneralScheduling(serviceName)
        },
        {
            model: models.AgreementPackageItem,
            as: 'agreementPackageItem',
            attribute: ['id'],
            include: locationItemAndAttributeIncludesForFuneralScheduling(serviceName)
        },
        {
            model: models.AgreementCashAdvancedItem,
            as: 'agreementCashAdvancedItem',
            where: { deletedAt: null },
            required: false,
            attribute: ['id'],
            include: locationItemAndAttributeIncludesForFuneralScheduling(serviceName)
        }
    ]

    let commonQuery1 = {
        where: {
            id: personId,
            isAlive: false
        },
        attributes: ['id'],
        include: [
            {
                model: models.ScheduledFuneralService,
                as: 'scheduledFuneralServices',
                require: true,
                where: { deletedAt: null },
                attributes: ['id'],
                include: agreementIncludes
            }
        ]
    }
    return commonQuery1
}

/**
 * Reapeats the required item in array n number of times
 * @param {*} obj - obj is the item to repeat
 * @param {*} n - number of times to repeat the item in array
 */
function getSSArray (obj, n) {
    let newArr = []
    for (let index = 0; index < n; index++) {
        newArr.push({ ...obj })
    }
    return newArr
}

/**
 * Get Schedulable Items
 * @param {*} itemsArray - array of Items
 * @param {*} itemsType - type of Items (locationItem or Package)
 * @param {*} agreementType - type of Agreement
 * @param {*} agreement - details of Agreement
 */
async function getSSItems (itemsArray, itemsType, agreement, sds, scs) {
    try {
        let ssItems = await Promise.all(
            itemsArray.map(async item => {
                let itemQty = itemsType === 'locItem' || itemsType === 'cai'
                    ? item.agreementItemPrice.quantity : 1
                let [itemAttribute] = item.locationItem.Item.itemAttributes
                let attributeVal = itemAttribute.AttributeValue
                let ss = {
                    schedulingAttribute: attributeVal.name,
                    schedulingAttributeId: attributeVal.id,
                    description: '',
                    agreementType: seedValues.seed.ContractType[agreement.type],
                    itemAgreementType: _.get(item, 'locationItem.Item.ItemCategory.itemCategoryIndustry[0].ItemIndustry.name'),
                    agreementId: agreement.id,
                    addendumNumber: item.addendumDetails ? item.addendumDetails.addendumNumber : null,
                    contractNumber: agreement.contractNumber,
                    due: agreement.due,
                    agreementLocationItemId: itemsType === 'locItem' ? item.id : null,
                    agreementPackageItemId: itemsType === 'package' ? item.id : null,
                    agreementCashAdvancedItemId: itemsType === 'cai' ? item.id : null,
                    itemUsageId: null,
                    scheduledFuneralService: null,
                    scheduledCemeteryService: null,
                    workOrderStatus: null
                }
                // Refer getSSArray Method
                let ssArray = getSSArray(ss, itemQty)
                let issKey = itemsType === 'locItem'
                    ? 'agreementLocationItemId' : itemsType === 'package'
                        ? 'agreementPackageItemId' : 'agreementCashAdvancedItemId'
                if (sds && sds.length) {
                    let itemSDS = sds.filter(iss => iss[issKey] === item.id)
                    let sItems = await getSSArrayWithScheduledService(ssArray, itemSDS, 'funeral')
                    return sItems
                } else if (scs && scs.length) {
                    let itemSCS = scs.filter(iss => iss[issKey] === item.id)
                    let sItems = await getSSArrayWithScheduledService(ssArray, itemSCS, 'cemetery')
                    return sItems
                } else {
                    return ssArray
                }
            })
        )
        return ssItems
    } catch (error) {
        throw error
    }
}

/**
 * Compare the Schedulable Services and Scheduled Services arrays.
 * Fetches the scheduled service for each service as well as handles removal scenarios
 * @param {*} ssArray is the array of Schedulable Services
 * @param {*} sds is the array of Scheduled Services
 */
async function getSSArrayWithScheduledService (ssArray, sds, type) {
    ssArray = ssArray.map((ss, i) => {
        let servKey = type === 'funeral' ? 'scheduledFuneralService' : 'scheduledCemeteryService'
        ss[servKey] = sds[i] ? sds[i] : null
        ss.workOrderStatus = sds[i] && sds[i].workOrder && sds[i].workOrder.status ? sds[i].workOrder.status.name : null
        return ss
    })
    return ssArray
}

function getCasketDetailsSection (result) {
    if (result.casketItemUsageDetails || result.casketItemDetails) {
        result.casketDetails = result.casketItemUsageDetails || result.casketItemDetails
        if (result.casketItemUsageDetails && result.casketDetails.ItemUsage) {
            result.casketDetails.casket = {}
            result.casketDetails.casket.id = result.casketDetails.ItemUsage.id
            result.casketDetails.casket.casketName = result.casketDetails.ItemUsage.agreementItems.locationItem.Item.name
            result.casketDetails.casket.resourceType = result.casketDetails.resourceType
            delete result.casketDetails.ItemUsage
        } else {
            if (!result.casketDetails.casket) {
                result.casketDetails.casket = {}
            }
            result.casketDetails.casket.casketName = _.get(result, 'casketDetails.casket.locationItem.Item.name')
            if (result.casketDetails.casket) {
                delete result.casketDetails.casket.locationItem
            }
        }
        result.casketDetails.casket.resourceType = result.casketDetails.resourceType
        delete result.casketDetails.resourceType
    } else {
        if (result.casketDetails) {
            result.casketDetails.casket = null
            delete result.casketDetails.resourceType
        } else {
            result.casketDetails = null
        }
    }
    delete result.casketItemDetails
    delete result.casketItemUsageDetails
}

function getUrnDetailsSection (result) {
    if (result.urnInformationItemUsageDetails || result.urnInformationItemDetails) {
        result.urnInformationDetails = result.urnInformationItemUsageDetails || result.urnInformationItemDetails
        if (result.urnInformationItemUsageDetails) {
            result.urnInformationDetails.urn = {}
            result.urnInformationDetails.urn.id = result.urnInformationDetails.ItemUsage.id
            result.urnInformationDetails.urn.urnName = result.urnInformationDetails.ItemUsage.agreementItems.locationItem.Item.name
            delete result.urnInformationDetails.ItemUsage
        } else {
            if (!result.urnInformationDetails.urn) {
                result.urnInformationDetails.urn = {}
            }
            result.urnInformationDetails.urn.urnName = _.get(result, 'urnInformationDetails.urn.locationItem.Item.name')
            if (result.urnInformationDetails.urn) {
                delete result.urnInformationDetails.urn.locationItem
            }
        }
        result.urnInformationDetails.urn.resourceType = result.urnInformationDetails.resourceType
        delete result.urnInformationDetails.resourceType
    } else {
        if (result.urnInformationDetails) {
            result.urnInformationDetails.urn = null
            delete result.urnInformationDetails.resourceType
        } else {
            result.urnInformationDetails = null
        }
    }
    delete result.urnInformationItemDetails
    delete result.urnInformationItemUsageDetails
}

function getCommonQueryMerchandise (service, type, key, id) {
    return ` SELECT cs.id as ${key},sfs.id as funeralScheduling, scs.id as cemeteryScheduling,wo.completedOn FROM ${service} cs
     LEFT JOIN ScheduledFuneralService sfs ON sfs.${key} = cs.id 
     LEFT JOIN ScheduledCemeteryService scs ON scs.${key} = cs.id
     INNER JOIN WorkOrder wo ON (( wo.resourceId = sfs.id  AND wo.resourceType = 'ScheduledFuneralService') OR (wo.resourceId = scs.id AND wo.resourceType = 'ScheduledCemeteryService'))
     WHERE cs.${type} = ${id} AND cs.resourceType = 'AgreementLocationItem'`
}

async function getMerchandiseItems (type, personId, itemCategory) {
    let agreementType = Number(getKey(seed.ContractType, type))

    // let arrangementType = Number(getKey(seed.ArrangementType, 'AN'))
    let agreementIncludes = [

        {
            model: models.AgreementLocationItem,
            as: 'agreementItems',
            include: [
                {
                    model: models.AgreementItemPrice,
                    as: 'agreementItemPrice',
                    required: true
                },
                {
                    model: models.LocationItem,
                    as: 'locationItem',
                    attributes: ['id', 'itemId'],
                    required: true,
                    include: [
                        {
                            model: models.Item,
                            attributes: ['id', 'name'],
                            required: true,
                            include: [
                                {
                                    model: models.ItemCategory,
                                    where: {
                                        name: { [Op.in]: itemCategory }
                                    }
                                }
                            ]
                        }
                    ]
                }
            ]
        }
    ]

    if (type === 'FUNERAL') {
        agreementIncludes.push({
            model: models.SaleType,
            as: 'saleType',
            where: {
                agreementType: agreementType,
                isActive: true
            }
        })
    }
    let whereCond = { id: personId }
    let AgreementRole = ['Beneficiary']
    if (type === 'Miscellaneous Sales') {
        whereCond = { id: personId }
        AgreementRole = ['Beneficiary', 'Purchaser']
    }
    let result = await models.Person.findOne({
        where: whereCond,
        attributes: [],
        include: [
            {
                model: models.AgreementPerson,
                as: 'agreementPersons',
                where: {
                    'personId': personId
                },
                attributes: ['id', 'agreementId', 'roleId'],
                include: [
                    {
                        model: models.AgreementRole,
                        as: 'agreementRole',
                        where: {
                            name: { [Op.in]: AgreementRole }
                        },
                        required: true
                    },
                    {
                        model: models.Agreement,
                        where: {
                            type: { [Op.in]: [agreementType] },
                            contractNumber: {
                                [Op.ne]: null
                            }
                        },
                        attributes: ['id', 'saleTypeId', 'contractNumber', 'type'],
                        include: agreementIncludes
                    }
                ]
            }
        ]
    }
    )
    return result
}
module.exports = {
    _createNoteForResourceSection,
    _getNoteSections,
    getCommonQueryFuneralArragement,
    getSSArray,
    getSSItems,
    getSSArrayWithScheduledService,
    getCasketDetailsSection,
    getUrnDetailsSection,
    getCommonQueryMerchandise,
    locationItemAndAttributeInclude,
    getMerchandiseItems
}
