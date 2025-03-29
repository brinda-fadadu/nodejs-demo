const models = require('../../../models')
const Op = require('sequelize').Op

async function agreementItemIncludeObj (type, itemCategory) {
    let itemCategoryCondition = {}
    if (itemCategory) {
        if (itemCategory === 'casket') {
            let resourceQuery = `select DISTINCT ic.name as itemCategoryName from Item i inner join ItemCategory ic 
            on i.itemCategoryId =ic.id 
            INNER join ItemAttributeValue iav on i.id = iav.itemId 
            inner join AttributeValue av on iav.attributeValueId = av.id
            inner join Attribute a on av.attributeId = a.id
            where av.name = 'CREMATION CONTAINER'`
            let serviceDeatils = await models.sequelize.query(resourceQuery, {
                type: models.sequelize.QueryTypes.SELECT
            })
            itemCategory = ['Casket']
            itemCategory.push(...serviceDeatils.map((ele) => {
                return ele.itemCategoryName
            }))
        } else {
            itemCategory = [itemCategory]
        }
        itemCategoryCondition['name'] = { [Op.in]: itemCategory }
    }
    // Commenting below line as we are no more showing the misc sale items in Item Usage Summary card
    // let ItemIndustryType = type
    // when type is equal top Services we are no includes Wholesale Cremation Add on items count and listing
    if (type === 'Services') {
        itemCategoryCondition['name'] = { [Op.notIn]: ['Wholesale Cremation Add on', 'Wholesale Cremation Fee'] }
    } else if (type === 'addOns') {
        itemCategoryCondition['name'] = 'Wholesale Cremation Add on'
        type = 'Services'
    }
    return {
        model: models.AgreementLocationItem,
        as: 'agreementItems',
        where: { deletedAt: null },
        required: false,
        include: [{
            model: models.Agreement,
            as: 'agreementDetails',
            attributes: ['contractNumber']
        },
        {
            model: models.Addendum,
            as: 'addendumDetails',
            attributes: ['addendumNumber']
        },
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
                    attributes: ['id', 'name', 'code'],
                    required: true,
                    include: [
                        {
                            model: models.ItemCategory,
                            attributes: ['id'],
                            where: itemCategoryCondition,
                            required: true,
                            include: [
                                {
                                    model: models.ItemType,
                                    where: { name: type },
                                    attributes: ['id']
                                }
                                // Commenting below code as we are no more showing the misc sale items in Item Usage Summary card
                                /* {
                                    model: models.ItemCategoryIndustry,
                                    as: 'itemCategoryIndustry',
                                    include: [
                                        {
                                            model: models.ItemIndustry,
                                            where: {
                                                name: 'Cemetery'
                                            },
                                            required: ItemIndustryType === 'Services' || ItemIndustryType === 'Merchandises'
                                        }
                                    ],
                                    required: true
                                } */
                            ]
                        }, {
                            model: models.ItemAttributeValue,
                            as: 'itemAttributes',
                            attributes: ['id'],
                            include: [
                                {
                                    model: models.AttributeValue,
                                    attributes: ['id', 'name'],
                                    include: [
                                        {
                                            model: models.Attribute,
                                            as: 'attribute',
                                            where: {
                                                name: 'Scheduling Service'
                                            }
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
}

function itemUsageStatusIncludeObj (whereQuery) {
    return {
        model: models.ItemUsageStatus,
        where: whereQuery,
        as: 'status'
    }
}

function personDetailsIncludeObj () {
    return {
        model: models.Person,
        as: 'person',
        attributes: ['id', 'firstName', 'middleName', 'lastName'],
        include: [{
            model: models.PersonVerificationDetails,
            as: 'personVerificationDetails',
            attributes: ['onePortalId']
        }]
    }
}

function agreementMemorialItemIncludesObj (itemCategory) {
    return {
        model: models.AgreementMemorialItem,
        as: 'agreementMemorialItems',
        where: { deletedAt: null },
        require: true,
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
                        attributes: ['id', 'name', 'code', 'description'],
                        required: true,
                        include: [
                            {
                                model: models.ItemCategory,
                                attributes: ['id', 'name'],
                                where: {
                                    name: { [Op.in]: [...itemCategory] }
                                },
                                required: true
                            },
                            {
                                model: models.ItemAttributeValue,
                                as: 'itemAttributes',
                                attributes: ['id'],
                                require: true,
                                include: [
                                    {
                                        model: models.AttributeValue,
                                        attributes: ['id', 'name'],
                                        require: true
                                    }
                                ]
                            }
                        ]
                    }
                ]
            }
        ]
    }
}

function checkItemUsedOrSelect (serviceDeatils, type) {
    if (serviceDeatils.length) {
        serviceDeatils.map((data) => {
            if (data.funeralScheduling || data.cemeteryScheduling) {
                throw new Error(`Item(s) utilized in service schedule cannot be ${type}`)
            }
        })
    }
}

module.exports = {
    agreementItemIncludeObj,
    itemUsageStatusIncludeObj,
    personDetailsIncludeObj,
    agreementMemorialItemIncludesObj,
    checkItemUsedOrSelect
}
