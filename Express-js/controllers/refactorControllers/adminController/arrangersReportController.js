const models = require('../../../models')
const _ = require('lodash')
const AgreementController = require('../agreementController/agreementController')
const moment = require('moment')
const { convertToJson } = require('../utils')

class ArrangersReportController {
    /**
     *
     * @param {Object} filterPayload is object of filters
     * @param {Number} filterPayload.arrangerId It is the employee id with which you want to fecth the agreemnts assigned to the employee
     * @param {Number} filterPayload.page it is the curresnt page to fetch the list
     * @param {Number} filterPayload.limit it is the limit of the records to be fetched
     * @param {Array} filterPayload.agreementType is array of number. it is type of the agreement funeral/cemetery
     * @param {Date} filterPayload.createdFrom to fetch the records based on createdAt
     * @param {Date} filterPayload.createdTo to fetch the records based on createdAt
     * @param {String} filterPayload.timezone timezone
     */
    static async fetchListOfArrangerCases (filterPayload) {
        try {
            const {
                arrangerId,
                createdFrom,
                createdTo,
                agreementType,
                locationIds,
                businessUnit,
                page = 1,
                limit = 10,
                timezone
            } = filterPayload
            let whereQuery = '[Agreement].[type] in (1,2)'

            Object.keys(filterPayload).map(key => {
                switch (key) {
                case 'arrangerId':
                    whereQuery += ` AND [Agreement].[arrangerId] = ${Number(arrangerId)}`
                    break
                case 'agreementType':
                    whereQuery += ` AND [Agreement].[type] IN (select value from STRING_SPLIT('${agreementType}',','))`
                    break
                case 'locationIds':
                    whereQuery += ` AND [Agreement].[locationId] IN (select value from STRING_SPLIT('${locationIds}',','))`
                    break
                case 'createdTo':
                    whereQuery += ` AND cast([Agreement].[createdAt] as date) between '${moment(createdFrom).tz(timezone).startOf('day').format('YYYY/MM/DD')}' and '${moment(createdTo).tz(timezone).endOf('day').format('YYYY/MM/DD')}'`
                    break
                case 'businessUnit':
                    if (businessUnit === 'CFS Funeral Service') {
                        whereQuery += ` AND [Agreement].[type] = 1 AND location.code != 'ACC' AND location.code != 'CCS'`
                    } else if (businessUnit === 'CCS Cremation Service') {
                        whereQuery += ` AND [Agreement].[type] = 1 AND (location.code = 'ACC' OR location.code = 'CCS')`
                    } else if (businessUnit === 'Cemetery') {
                        whereQuery += ` AND Agreement.type = 2`
                    } else {
                        whereQuery += ` AND Agreement.type = 4`
                    }
                    break
                default:
                    break
                }
            })
            const offset = (page - 1) * limit
            const orderByQuery = `ORDER BY [Agreement].[updatedAt] DESC`
            let Query = `
                SELECT [Agreement].[id], [Agreement].[contractNumber], 
                CASE WHEN [hds].[id] IS NOT NULL THEN 'Submitted'
                    WHEN [hds].[id] IS NULL AND pendingWo.openWorkOrders = 0 THEN 'Completed - Not Submitted'
                    ELSE 'Not Submitted' END AS HMISStatus,
                [Agreement].[status], [Agreement].[type], [Agreement].[needType], [Agreement].[createdAt], 
                (
                    SELECT [person].[id] AS [person.id], [person].[prefix] AS [person.prefix], [person].[firstName] AS [person.firstName], [person].[middleName] AS [person.middleName], [person].[lastName] AS [person.lastName], [person].[isAlive] AS [person.isAlive]
                    FROM [AgreementPerson] AS [beneficiary] 
                    LEFT OUTER JOIN [Person] AS [person] ON [beneficiary].[personId] = [person].[id] 
                    WHERE [Agreement].[id] = [beneficiary].[agreementId] AND (([beneficiary].[deletedBy] IS NULL AND [beneficiary].[deletedAt] IS NULL) AND [beneficiary].[roleId] = 3)  
                    FOR JSON PATH
                ) as beneficiary,
                (
                    SELECT [call].[id], [call].[identifier] FROM [Call] AS [call]
                    LEFT OUTER JOIN [someOnePassed] AS [decedent] ON [call].[id] = [decedent].[callId]--[beneficiary].[personId] = [decedent].[decedentId]
                    LEFT OUTER JOIN [PreArrangement] AS [preArrang] ON  [call].[id] = [preArrang].[callId] --[beneficiary].[personId] = [preArrang].[beneficiaryId]
                    INNER JOIN [AgreementPerson] AS [beneficiary] ON ([beneficiary].[personId] in ([decedent].[decedentId], [preArrang].[beneficiaryId]))
                    WHERE [Agreement].[id] = [beneficiary].[agreementId] AND (([beneficiary].[deletedBy] IS NULL AND [beneficiary].[deletedAt] IS NULL) AND [beneficiary].[roleId] = 3)  
                    FOR JSON PATH
                ) as callDetails,
                [location].[name] as location,
                [arranger].[name] AS [arrangerName] FROM
                [Agreement] AS [Agreement]  
                LEFT JOIN [Employee] AS [arranger] ON [Agreement].[arrangerId] = [arranger].[id]
                LEFT JOIN [Location] AS [location] ON [Agreement].[locationId] = [location].[id]
                LEFT JOIN [HMISDataSync] AS [hds] ON [hds].[agreementId]=[Agreement].[id] AND hds.statusId = 3
                OUTER APPLY
                ( SELECT count(*) openWorkOrders 
                    FROM WorkOrder AS wo
                        LEFT JOIN ScheduledFuneralService as sfs ON (sfs.id = wo.resourceId AND wo.resourceType = 'ScheduledFuneralService')
                        LEFT JOIN ScheduledCemeteryService as scs ON (scs.id = wo.resourceId AND wo.resourceType = 'ScheduledCemeteryService')
                        LEFT JOIN SchedulingSection as ss ON ss.id = sfs.schedulingSectionId
                        LEFT JOIN IntermentInformationSection iis on scs.intermentInformationSectionId=iis.id
                        LEFT JOIN DisintermentInfoSection dis on scs.disintermentInfoSectionId= dis.id
                        LEFT JOIN ItemUsage as iu ON iu.id IN (scs.itemUsageId)
                        LEFT JOIN AgreementLocationItem as ali ON ali.id IN (sfs.agreementLocationItemId, iu.resourceId) AND ali.agreementId = [Agreement].[id]
                        LEFT JOIN AgreementPackageItem as api ON api.id = sfs.agreementPackageItemId
                        LEFT JOIN AgreementCashAdvancedItem as acai ON acai.id = sfs.agreementCashAdvancedItemId  AND acai.agreementId = [Agreement].[id]
                        LEFT JOIN AgreementPackage ap ON ap.id = api.agreementPackageId  AND ap.agreementId = [Agreement].[id]
                        WHERE wo.deletedAt IS NULL AND wo.statusId != 3 and [Agreement].[id] in (ali.agreementId, ap.agreementId, acai.agreementId)
                    ) as pendingWo
                WHERE ${whereQuery} `

            let countQuery = ` SELECT COUNT(DISTINCT([Agreement].[id])) as [count] from [Agreement] INNER JOIN Location location ON location.id = Agreement.locationId
            WHERE ${whereQuery}`
            if (page) Query += ` ${orderByQuery} OFFSET ${offset} ROWS FETCH NEXT ${limit} ROWS ONLY`
            let listCount = await models.sequelize.query(countQuery, { type: models.sequelize.QueryTypes.SELECT })
            let list = await models.sequelize.query(Query, { type: models.sequelize.QueryTypes.SELECT })
            list.map(e => convertToJson(e))
            list = list.length && await Promise.all(
                list.map(async row => {
                    return {
                        contractNumber: row.contractNumber,
                        category: await this.getCategory(row.type, row.needType),
                        arranger: row.arrangerName,
                        status: row.status,
                        needType: Object.keys(AgreementController.NEED_TYPES).find(key => AgreementController.NEED_TYPES[key] === row.needType),
                        agreementPersons: await this._returnAgreementPersonsArray(_.get(row, 'beneficiary', [])),
                        calls: row.callDetails,
                        HMIS: row.HMISStatus,
                        location: row.location,
                        createdAt: moment(row.createdAt).tz(timezone)
                    }
                })
            )
            return {
                list,
                count: listCount[0].count
            }
        } catch (error) {
            throw error
        }
    }
    static async getCategory (type, needType) {
        let category
        if (type === 1) {
            category = needType === 1 ? 'Funeral AN' : 'Funeral PN'
        } else {
            category = needType === 1 ? 'Cemetery AN' : 'Cemetery PN'
        }
        return category
    }
    static async getSubmittedCount (conditions) {
        const query = `SELECT e.id, count(*) as submittedCount
        FROM Agreement a
        INNER JOIN Location location ON [a].[locationId] = [location].[id]
        LEFT JOIN Employee e ON [a].[arrangerId] = [e].[id]
        INNER JOIN [HMISDataSync] AS [hds] ON [hds].[agreementId]=[a].[id] AND hds.statusId = 3 
        WHERE [a].status = 'Submitted' AND ${conditions}
        GROUP BY e.id`
        let [count] = await models.sequelize.query(query, { type: models.sequelize.QueryTypes.SELECT })
        return count ? count.submittedCount : 0
    }
    static async getNotSubmittedCount (conditions) {
        const query = `SELECT e.id, count(*) as notSubmittedCount
        FROM Agreement a
        INNER JOIN Location location ON [a].[locationId] = [location].[id]
        LEFT JOIN [HMISDataSync] AS [hds] ON [hds].[agreementId]=[a].[id] AND hds.statusId = 3
        INNER JOIN Employee e ON [a].[arrangerId] = [e].[id]
        LEFT JOIN
        ( SELECT a.id, count(*) openWorkOrders
        FROM WorkOrder AS wo
            LEFT JOIN ScheduledFuneralService as sfs ON (sfs.id = wo.resourceId AND wo.resourceType = 'ScheduledFuneralService')
            LEFT JOIN ScheduledCemeteryService as scs ON (scs.id = wo.resourceId AND wo.resourceType = 'ScheduledCemeteryService')
            LEFT JOIN SchedulingSection as ss ON ss.id = sfs.schedulingSectionId
            LEFT JOIN IntermentInformationSection iis on scs.intermentInformationSectionId=iis.id
            LEFT JOIN DisintermentInfoSection dis on scs.disintermentInfoSectionId= dis.id
            LEFT JOIN ItemUsage as iu ON iu.id IN (scs.itemUsageId)
            LEFT JOIN AgreementLocationItem as ali ON ali.id IN (sfs.agreementLocationItemId, iu.resourceId)
            LEFT JOIN AgreementPackageItem as api ON api.id = sfs.agreementPackageItemId
            LEFT JOIN AgreementCashAdvancedItem as acai ON acai.id = sfs.agreementCashAdvancedItemId
            LEFT JOIN AgreementPackage ap ON ap.id = api.agreementPackageId
            INNER JOIN Agreement as a ON a.id IN (ali.agreementId, ap.agreementId, acai.agreementId)
        WHERE wo.deletedAt IS NULL AND wo.statusId != 3
        GROUP BY a.id) as pendingWo ON pendingWo.id = a.id
    WHERE COALESCE(pendingWo.openWorkOrders, 0) != 0 AND hds.id IS NULL AND ${conditions}
    GROUP BY e.id`
        let [count] = await models.sequelize.query(query, { type: models.sequelize.QueryTypes.SELECT })
        return count ? count.notSubmittedCount : 0
    }
    static async getCompletedCount (conditions) {
        let query = `SELECT e.id, count(*) as completedCount
            FROM Agreement a
            INNER JOIN Location location ON [a].[locationId] = [location].[id]
            LEFT JOIN [HMISDataSync] AS [hds] ON [hds].[agreementId]=[a].[id] AND hds.statusId = 3
            INNER JOIN Employee e ON [a].[arrangerId] = [e].[id]
            LEFT JOIN
            ( SELECT a.id, count(*) openWorkOrders
            FROM WorkOrder AS wo
                LEFT JOIN ScheduledFuneralService as sfs ON (sfs.id = wo.resourceId AND wo.resourceType = 'ScheduledFuneralService')
                LEFT JOIN ScheduledCemeteryService as scs ON (scs.id = wo.resourceId AND wo.resourceType = 'ScheduledCemeteryService')
                LEFT JOIN SchedulingSection as ss ON ss.id = sfs.schedulingSectionId
                LEFT JOIN IntermentInformationSection iis on scs.intermentInformationSectionId=iis.id
                LEFT JOIN DisintermentInfoSection dis on scs.disintermentInfoSectionId= dis.id
                LEFT JOIN ItemUsage as iu ON iu.id IN (scs.itemUsageId)
                LEFT JOIN AgreementLocationItem as ali ON ali.id IN (sfs.agreementLocationItemId, iu.resourceId)
                LEFT JOIN AgreementPackageItem as api ON api.id = sfs.agreementPackageItemId
                LEFT JOIN AgreementCashAdvancedItem as acai ON acai.id = sfs.agreementCashAdvancedItemId
                LEFT JOIN AgreementPackage ap ON ap.id = api.agreementPackageId
                INNER JOIN Agreement as a ON a.id IN (ali.agreementId, ap.agreementId, acai.agreementId)
            WHERE wo.deletedAt IS NULL AND wo.statusId != 3
            GROUP BY a.id) as pendingWo ON pendingWo.id = a.id
        WHERE COALESCE(pendingWo.openWorkOrders, 0) = 0 AND hds.id IS NULL AND ${conditions}
        GROUP BY e.id`
        let [count] = await models.sequelize.query(query, { type: models.sequelize.QueryTypes.SELECT })
        return count ? count.completedCount : 0
    }
    static async managerCascadingReport (filterPayload) {
        let whereConditions = await this.queryObjForManagerReport(filterPayload)
        const { page = 1, limit = 10 } = filterPayload
        const offset = (page - 1) * limit
        const orderByQuery = `ORDER BY [arranger].[id] DESC`
        let query = `SELECT DISTINCT arranger.id,
        ( 
            SELECT arranger.id as id, arranger.name as name
            FOR JSON PATH, WITHOUT_ARRAY_WRAPPER
        ) as staff,
        ( 
            SELECT manager.id as id, manager.name as name FOR JSON PATH, WITHOUT_ARRAY_WRAPPER
        ) as manager,
        (
           SELECT
           CASE 
           WHEN agreement.type = 2 THEN Cemetery'
           WHEN agreement.type = 1 AND (location.code = 'ACC' OR location.code = 'CCS') THEN 'CCS Cremation Service'
           ELSE 'CFS Funeral Service' END AS name FOR JSON PATH, WITHOUT_ARRAY_WRAPPER
        ) as businessUnit,
        (
            SELECT arrangerFuneralCount.funeralCount as funeralCount, arrangerFuneralCremationCount.funeralCremationCount as funeralCremationCount, arrangerCount.cemeteryCount as cemeteryCount
            FOR JSON PATH, WITHOUT_ARRAY_WRAPPER
        ) as agreementsCount
        FROM Agreement agreement
        LEFT JOIN [Location] AS [location] ON [location].[id] = [agreement].[locationId]
        LEFT JOIN [Employee] AS [arranger] ON [agreement].[arrangerId] = [arranger].[id]
        LEFT JOIN [User] AS [user] ON [arranger].[email] = [user].[email]
        LEFT JOIN [Employee] AS [manager] ON [user].[reportingManagerId] = [manager].[id]
        OUTER APPLY ( 
            SELECT arrangerCount.id, count(*) as cemeteryCount
            FROM Agreement a INNER JOIN Employee arrangerCount ON a.arrangerId = arrangerCount.id AND a.type = 2 AND a.arrangerId = arranger.id
            GROUP BY arrangerCount.id
        ) as arrangerCount
        OUTER APPLY ( 
            SELECT arrangerFuneralCount.id, count(*) as funeralCremationCount
            FROM Agreement a 
            INNER JOIN Employee arrangerFuneralCount ON a.arrangerId = arrangerFuneralCount.id
            INNER JOIN Location loc ON a.locationId = loc.id
            AND a.type = 1 AND (loc.code = 'ACC' OR loc.code = 'CCS') AND a.arrangerId = arranger.id
            GROUP BY arrangerFuneralCount.id
        ) as arrangerFuneralCremationCount
        OUTER APPLY ( 
            SELECT arrangerFuneralCount.id, count(*) as funeralCount
            FROM Agreement a 
            INNER JOIN Employee arrangerFuneralCount ON a.arrangerId = arrangerFuneralCount.id 
            INNER JOIN Location loc ON a.locationId = loc.id
            AND [a].[type] = 1 AND loc.code != 'ACC' AND loc.code != 'CCS' AND a.arrangerId = arranger.id
            GROUP BY arrangerFuneralCount.id
        ) as arrangerFuneralCount
    where ${whereConditions}`
        if (filterPayload.page) query += ` ${orderByQuery} OFFSET ${offset} ROWS FETCH NEXT ${limit} ROWS ONLY`
        let list = await models.sequelize.query(query, { type: models.sequelize.QueryTypes.SELECT })
        list.map(e => convertToJson(e))
        await Promise.all(list.map(async lis => {
            let contractDetails
            if (lis.businessUnit.name === 'Cemetery') {
                let condition = `e.id = ${lis.staff.id} AND [a].[type]=2`
                contractDetails = {
                    cemeteryAgreementsCount: lis.agreementsCount.cemeteryCount,
                    funeralStatementsCount: 0,
                    submittedCount: await this.getSubmittedCount(condition),
                    completedCount: await this.getCompletedCount(condition),
                    notSubmittedCount: await this.getNotSubmittedCount(condition)
                }
            } else if (lis.businessUnit.name === 'CCS Cremation Service') {
                let condition = `e.id = ${lis.staff.id} AND ([a].[type] = 1 AND (location.code = 'ACC' OR location.code = 'CCS'))`
                contractDetails = {
                    cemeteryAgreementsCount: 0,
                    funeralStatementsCount: lis.agreementsCount.funeralCremationCount,
                    submittedCount: await this.getSubmittedCount(condition),
                    completedCount: await this.getCompletedCount(condition),
                    notSubmittedCount: await this.getNotSubmittedCount(condition)
                }
            } else {
                let condition = `e.id = ${lis.staff.id} AND [a].[type] = 1 AND location.code != 'ACC' AND location.code != 'CCS'`
                contractDetails = {
                    cemeteryAgreementsCount: 0,
                    funeralStatementsCount: lis.agreementsCount.funeralCount,
                    submittedCount: await this.getSubmittedCount(condition),
                    completedCount: await this.getCompletedCount(condition),
                    notSubmittedCount: await this.getNotSubmittedCount(condition)
                }
            }
            lis.contractDetails = contractDetails
        }))
        return list
    }
    static async queryObjForManagerReport (filterPayload) {
        const {
            createdFrom,
            businessUnitIds,
            createdTo,
            timezone,
            managerIds
        } = filterPayload
        let whereQuery = '[arranger].[id] IS NOT NULL'
        Object.keys(filterPayload).map(key => {
            switch (key) {
            case 'managerIds':
                whereQuery += ` AND [manager].[id] IN (select value from STRING_SPLIT('${managerIds}',','))`
                break
            case 'businessUnitIds':
                if (businessUnitIds.includes('1') && businessUnitIds.includes('2') && businessUnitIds.includes('3')) {
                    whereQuery += ``
                } else if (businessUnitIds.includes('1') && businessUnitIds.includes('2')) {
                    whereQuery += ` AND [agreement].[type] = 1`
                } else if (businessUnitIds.includes('1') && businessUnitIds.includes('3')) {
                    whereQuery += ` AND (([agreement].[type] = 1 AND location.code != 'ACC' AND location.code != 'CCS') OR agreement.type = 2)`
                } else if (businessUnitIds.includes('2') && businessUnitIds.includes('3')) {
                    whereQuery += ` AND (([agreement].[type] = 1 AND (location.code = 'ACC' OR location.code = 'CCS')) OR [agreement].[type] = 2)`
                } else if (businessUnitIds.includes('1')) {
                    whereQuery += ` AND [agreement].[type] = 1 AND location.code != 'ACC' AND location.code != 'CCS'`
                } else if (businessUnitIds.includes('2')) {
                    whereQuery += ` AND [agreement].[type] = 1 AND (location.code = 'ACC' OR location.code = 'CCS')`
                } else if (businessUnitIds.includes('3')) {
                    whereQuery += ` AND agreement.type = 2`
                } else {
                    whereQuery += ` AND agreement.type = 4`
                }
                break
            case 'createdTo':
                whereQuery += ` AND [agreement].[createdAt] between '${moment(createdFrom).tz(timezone).startOf('day').format('YYYY/MM/DD')}' and '${moment(createdTo).tz(timezone).endOf('day').format('YYYY/MM/DD')}'`
                break
            default:
                break
            }
        })
        return whereQuery
    }
    static async fetchManagers () {
        const query = `Select Distinct emp.* from [User] [user] INNER JOIN Employee emp ON emp.id = [user].reportingManagerId`
        let list = await models.sequelize.query(query, { type: models.sequelize.QueryTypes.SELECT })
        return list
    }
    static _returnAgreementPersonsArray (beneficiary) {
        const beneficiaryNames = []
        beneficiary.forEach(beneficiary => {
            let nameDetails = []
            nameDetails.push(_.get(beneficiary, 'person.prefix', ''))
            nameDetails.push(_.get(beneficiary, 'person.firstName', ''))
            nameDetails.push(_.get(beneficiary, 'person.middleName', ''))
            nameDetails.push(_.get(beneficiary, 'person.lastName', ''))
            beneficiaryNames.push({
                label: nameDetails.join(' ').trim(),
                value: _.get(beneficiary, 'person.id'),
                isAlive: _.get(beneficiary, 'person.isAlive')
            })
        })
        return beneficiaryNames
    }
}

module.exports = ArrangersReportController
