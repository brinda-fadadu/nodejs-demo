const models = require('../../models')
const Op = require('sequelize').Op
const _ = require('underscore')
const { getKey } = require('../../lib/util')
const { seed } = require('../../config/seed')

exports.createSchedulableServices = async function (personId, currentUserId) {
    let agreementType = Number(getKey(seed.ContractType, 'FUNERAL'))
    let arrangementType = Number(getKey(seed.ArrangementType, 'AN'))
    const schedulableServices = await models.Person.findOne({
        where: {
            id: personId,
            isAlive: false
        },
        attributes: [],
        include: [
            {
                model: models.AgreementPerson,
                as: 'AgreementPersons',
                where: {
                    'personId': personId
                },
                attributes: ['id', 'statementId'],
                include: [
                    {
                        model: models.AgreementPersonRole,
                        as: 'AgreementRoles',
                        attributes: ['roleId'],
                        include: [
                            {
                                model: models.Role,
                                where: {
                                    name: 'Beneficiary'
                                },
                                required: true
                            }
                        ]
                    },
                    {
                        model: models.Statement,
                        where: {
                            contractNumber: {
                                [Op.ne]: null
                            },
                            agreementType: 'funeral'
                        },
                        attributes: ['saleTypeId'],
                        include: [
                            {
                                model: models.SaleType,
                                attributes: [],
                                where: {
                                    agreementType: agreementType,
                                    arrangementType: arrangementType,
                                    isInactive: 0
                                }
                            },
                            {
                                model: models.StatementLocationItem,
                                as: 'StatementItems',
                                include: [
                                    {
                                        model: models.LocationItem,
                                        as: 'LocationItemDetails',
                                        attributes: ['id', 'itemId'],
                                        include: [
                                            {
                                                model: models.Item,
                                                as: 'ItemDetails',
                                                attributes: ['id', 'serviceType', 'isSchedulable'],
                                                where: {
                                                    serviceType: {
                                                        [Op.ne]: null
                                                    },
                                                    isSchedulable: true
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
    })

    if (schedulableServices) {
        const scheduledServices = await models.ScheduleService.findAll({
            where: {
                personId: personId
            }
        })

        const finalSchedulableServices = _.flatten(_.map(schedulableServices.AgreementPersons, function (agrmntPerson) {
            let stmntItems = []
            if (agrmntPerson.AgreementRoles.length) {
                _.map(agrmntPerson.Statement.StatementItems, function (stmtItem) {
                    if (stmtItem.LocationItemDetails) {
                        let existingSS = _.where(scheduledServices, { statementLocationItemId: stmtItem.id })
                        let lnth = stmtItem.quantity - existingSS.length
                        for (let i = 0; i < lnth; i++) {
                            stmntItems.push({
                                personId: personId,
                                statementLocationItemId: stmtItem.id,
                                createdBy: currentUserId,
                                updatedBy: currentUserId
                            })
                        }
                    }
                })
            }
            return stmntItems
        }))

        let createdSS = await models.sequelize.transaction(async (t) => {
            const result = await models.ScheduleService.bulkCreate(finalSchedulableServices, {
                transaction: t
            })
            return result
        })
        return createdSS
    } else {
        return []
    }
}
