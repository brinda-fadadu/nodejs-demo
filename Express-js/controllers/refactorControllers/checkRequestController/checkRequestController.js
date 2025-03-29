const models = require('../../../models')

const _ = require('lodash')
const { Sequelize } = require('../../../models')
const Op = Sequelize.Op
const moment = require('moment')
const rollbar = require('../../../lib/rollbar')

const CheckRequestStatus = {
    'VOIDED': 'voided',
    'TOBEPROCESSED': 'toBeProcessed',
    'PROCESSED': 'processed'
}

class CheckRequestController {
    /**
     * list of cash advanced check requests
     * @param {*} query filters page , limit, status, requestedBy, searchTerm, requestedDateFrom, requestedDateTo
     */
    async getCAChecksLists (query) {
        try {
            let { page = 1, limit = 10, status, requestedBy, searchTerm, requestedDateFrom, requestedDateTo, processedDateFrom, processedDateTo } = query
            limit = Number(limit)
            page = (page - 1) * limit

            let condition = 'a.type in (1, 5) AND (agp.roleId = 3 OR  (a.type = 5 AND agpMisc.id IS NULL)) AND agp.deletedAt is NULL AND agp.deletedBy is NULL AND aci.deletedAt is NULL AND aci.deletedBy is NULL AND cr.deletedBy is NULL AND cr.deletedAt is NULL '
            if (status && status !== 'All') {
                if (processedDateFrom && processedDateTo) {
                    condition = condition + `AND cr.status = 'processed'`
                } else {
                    condition = condition + `AND cr.status = '${status}'`
                }
            }
            if (searchTerm) {
                condition = condition + this.getPersonSearchQuery(searchTerm)
            }
            if (requestedBy) {
                condition = condition + ` AND us.id = ${requestedBy}`
            }
            if (requestedDateFrom && requestedDateTo) {
                condition = condition + ` AND cr.createdAt >= '${moment(requestedDateFrom).startOf('day').format()}' AND cr.createdAt <= '${moment(requestedDateTo).endOf('day').format()}'`
            }
            if (processedDateFrom && processedDateTo) {
                condition = condition + `AND cr.status = 'processed' AND cr.processedTime >= '${moment(processedDateFrom).startOf('day').format()}' AND cr.processedTime <= '${moment(processedDateTo).endOf('day').format()}'`
            }

            let queryCondition = `Select cr.*, i.name as itemCategoryName,aip.quantity as quantity,aip.unitPrice as unitPrice,
            aip.id as agreementCashAdvancedItemId, aci.note as note, us.id as createdById, us.name as createdByname, us.email as createdByEmail,
            pvd.onePortalId as onePortalId, 
            (ISNULL(p.firstName,'') + ' '+ ISNULL(p.middleName,'') + ' ' + ISNULL(p.lastname,'')) as personName, 
            a.contractNumber, ad.addendumNumber, cav.id as vendorId, cav.name as vendorName, cav.code as vendorCode, cr.vendorPrice from CheckRequest cr
           INNER JOIN  AgreementCashAdvancedItem aci  ON aci.id = cr.agreementCashAdvancedItemId
           INNER JOIN AgreementItemPrice aip ON aci.agreementItemPriceId=aip.id 
           LEFT JOIN CashAdvancedVendor cav ON cav.id = cr.vendorId
           INNER JOIN LocationItem li  ON li.id=aci.locationItemId 
           INNER JOIN Item i ON i.id=li.itemId 
           INNER JOIN Agreement a ON a.id = aci.agreementId  
           LEFT  JOIN Addendum ad ON ad.id = aci.addendumId 
           INNER JOIN AgreementPerson agp ON a.id = agp.agreementId
           INNER JOIN Person p ON p.id = agp.personId 
           INNER JOIN PersonVerificationDetails pvd ON pvd.personId = p.id
           INNER JOIN [User] us ON us.id = aci.createdBy  
           LEFT JOIN AgreementPerson agpMisc ON a.id = agpMisc.agreementId AND a.type = 5 AND agpMisc.roleId = 3
           WHERE  ${condition}
           ORDER BY cr.createdAt DESC
           OFFSET ${page} ROWS FETCH NEXT ${limit} ROWS ONLY`

            let caChecksLists = await models.sequelize.query(queryCondition, {
                type: models.sequelize.QueryTypes.SELECT
            })

            let caChecksListsCount = await models.sequelize.query(`Select count(*)  from CheckRequest cr
           INNER JOIN  AgreementCashAdvancedItem aci  ON aci.id = cr.agreementCashAdvancedItemId
           INNER JOIN AgreementItemPrice aip ON aci.agreementItemPriceId=aip.id 
           LEFT JOIN CashAdvancedVendor cav ON cav.id = cr.vendorId
           INNER JOIN LocationItem li  ON li.id=aci.locationItemId 
           INNER JOIN Item i ON i.id=li.itemId 
           INNER JOIN Agreement a ON a.id = aci.agreementId  
           LEFT  JOIN Addendum ad ON ad.id = aci.addendumId 
           INNER JOIN AgreementPerson agp ON a.id = agp.agreementId
           INNER JOIN Person p ON p.id = agp.personId 
           INNER JOIN PersonVerificationDetails pvd ON pvd.personId = p.id
           INNER JOIN [User] us ON us.id = aci.createdBy  
           LEFT JOIN AgreementPerson agpMisc ON a.id = agpMisc.agreementId AND a.type = 5 AND agpMisc.roleId = 3
           WHERE  ${condition}`, {
                type: models.sequelize.QueryTypes.SELECT
            })

            let results = []
            caChecksLists.map((caCheck) => {
                let data = {
                    id: caCheck.id,
                    checkrequestedDate: caCheck.createdAt,
                    cashAdvanceItemResult: {
                        id: _.get(caCheck, 'agreementCashAdvancedItemId'),
                        itemCategoryName: _.get(caCheck, 'itemCategoryName'),
                        quantity: _.get(caCheck, 'quantity'),
                        unitPrice: _.get(caCheck, 'unitPrice'),
                        notes: _.get(caCheck, 'note')
                    },
                    createdBy: {
                        id: _.get(caCheck, 'createdById'),
                        name: _.get(caCheck, 'createdByname'),
                        email: _.get(caCheck, 'createdByEmail')
                    },
                    contractNumber: _.get(caCheck, 'addendumNumber') ? _.get(caCheck, 'addendumNumber') : _.get(caCheck, 'contractNumber'),
                    OPIName: _.get(caCheck, 'personName'),
                    onePortalId: _.get(caCheck, 'onePortalId'),
                    status: _.get(caCheck, 'status'),
                    processedTime: _.get(caCheck, 'processedTime'),
                    voidedTime: _.get(caCheck, 'voidedTime'),
                    vendor: {
                        id: _.get(caCheck, 'vendorId'),
                        code: _.get(caCheck, 'vendorCode'),
                        name: _.get(caCheck, 'vendorName'),
                        price: _.get(caCheck, 'vendorPrice')
                    }
                }
                results.push(data)
            })
            let count = caChecksListsCount && caChecksListsCount.length ? Object.values(caChecksListsCount[0])[0] : 0
            return { results, count }
        } catch (err) {
            throw err
        }
    }
    /**
     * update status of check requests
     * @param {*} body filters status ,vendorId, updatedTime
     */
    async UpdateCACheckRequest (body) {
        try {
            rollbar.info('update_check_request', body)
            let check = await models.CheckRequest.findOne({ where: { id: body.cashAdvancedCheckRequestId } })
            if (!check) {
                throw new Error('Check Request not found')
            }
            let checkRequest
            if (body.status === 'processed') {
                checkRequest = await models.CheckRequest.update({
                    status: body.status,
                    vendorId: body.vendorId,
                    processedTime: body.updatedTime,
                    vendorPrice: body.vendorPrice
                }, {
                    where: {
                        id: body.cashAdvancedCheckRequestId
                    }
                })
            } else {
                checkRequest = await models.CheckRequest.update({
                    status: body.status,
                    voidedTime: body.updatedTime
                }, {
                    where: {
                        id: body.cashAdvancedCheckRequestId
                    }
                })
            }
            return checkRequest
        } catch (err) {
            rollbar.error('update_check_request_error', body, err)
            throw err
        }
    }
    /**
     * add cash advanced vendors
     * @param {*} body filters name , code
     */
    async addCAVendor (body) {
        try {
            let caVendors = await models.CashAdvancedVendor.create(body)
            return caVendors
        } catch (err) {
            throw err
        }
    }

    getPersonFullName (person) {
        return [person.firstName, person.middleName, person.lastName]
            .join(' ')
            .trim()
    }
    /**
     * get cash advanced vendors
     * @param {*} filters  searchTerm, page, limit
     */
    async getCAVendors (filters) {
        try {
            let { searchTerm } = filters
            let searchQuery = {}
            if (searchTerm) {
                searchQuery = {
                    [Op.or]: [{
                        name: { [Op.like]: `%${searchTerm}%` }
                    }, {
                        code: { [Op.like]: `%${searchTerm}%` }
                    }]
                }
            }
            let caVendors = await models.CashAdvancedVendor.findAll({
                where: {
                    ...searchQuery
                }
            })
            return caVendors
        } catch (err) {
            throw err
        }
    }

    getPersonSearchQuery (searchTerm) {
        let searchQuery = ''
        if (searchTerm) {
            let words = searchTerm.split(' ')
            if (words.length > 0) {
                let nameStr = ''
                words.map(item => {
                    nameStr = nameStr + ` p.firstName LIKE '%${item}%' OR
                    p.middleName LIKE '%${item}%' OR
                    p.lastName LIKE '%${item}%' OR`
                    return item
                })
                searchQuery = `
                AND 
                ( 
                    ${nameStr}
                    pvd.onePortalId LIKE '${searchTerm}%'
                )`
            } else {
                searchQuery = `
                AND 
                ( 
                    p.firstName LIKE '%${searchTerm}%' OR
                    p.middleName LIKE '%${searchTerm}%' OR
                    p.lastName LIKE '%${searchTerm}%' OR
                    pvd.onePortalId LIKE '${searchTerm}%'
                )`
            }
        }
        return searchQuery
    }

    /**
     * create cash advanced check request of status toBeProcessed for each AgreementCashAdvancedItemId from array
     * @param {Array} AgreementCashAdvancedItemIds
     * @param {*} currentUserId
     */
    async CreateCACheckRequests (AgreementCashAdvancedItemIds, currentUserId) {
        try {
            for (var i = 0; i < AgreementCashAdvancedItemIds.length; i++) {
                /* check AgreementCashAdvancedItemIds[i] is valid or not */
                const agreementCashAdvancedItem = await models.AgreementCashAdvancedItem.findOne({ where: { id: AgreementCashAdvancedItemIds[i] } })
                if (agreementCashAdvancedItem) {
                    /* delete existing request */
                    await models.CheckRequest.update(
                        {
                            deletedBy: currentUserId,
                            deletedAt: moment().format('MM/DD/YYYY HH:mm:ss')
                        },
                        { where: { agreementCashAdvancedItemId: AgreementCashAdvancedItemIds[i] } }
                    )
                    const checkRequestDeatils = await models.CheckRequest.findOne({ where: { id: AgreementCashAdvancedItemIds[i], deletedAt: null, deletedBy: null } })
                    /* create CACheckRequest of type to be processed */
                    if (!checkRequestDeatils) {
                        rollbar.info('create_check_request', AgreementCashAdvancedItemIds, AgreementCashAdvancedItemIds[i])
                        await models.CheckRequest.create({
                            agreementCashAdvancedItemId: AgreementCashAdvancedItemIds[i],
                            status: CheckRequestStatus.TOBEPROCESSED,
                            vendorId: null,
                            processedTime: null,
                            voidedTime: null,
                            createdBy: currentUserId,
                            updatedBy: null
                        })
                    }
                } else {
                    throw new Error('ONE_OR_MORE_AGREEMENT_CASH_ADVANCED_ITEM_ID_IS_INVALID')
                }
            }
            return {}
        } catch (err) {
            rollbar.error('create_check_request_error', AgreementCashAdvancedItemIds, err)
            throw err
        }
    }
}
module.exports = CheckRequestController
