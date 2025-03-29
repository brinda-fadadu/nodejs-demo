
const models = require('../../../models')
const moment = require('moment')
const { convertToJson } = require('../utils')

class ReportsController {
    async getAnUsage (queryObj) {
        let where = await this.constructor._queryObjForAnUsage(queryObj)

        const { page = 1, limit = 10 } = queryObj
        const offset = (page - 1) * limit
        const sortOrder = queryObj.sortOrder || 'desc'
        const orderByQuery = `ORDER BY T.createdAt ${sortOrder}`

        let query = `
        DECLARE @agreementServiceDate TABLE(
                        id int,
                        beginningTime date
                    );
        INSERT @agreementServiceDate 
        SELECT COALESCE(ALI.agreementId, APC.agreementId, ACAI.agreementId), SS.beginningTime as beginningTime
            FROM ScheduledFuneralService  AS SFS
            LEFT JOIN SchedulingSection as SS ON SS.id = SFS.schedulingSectionId
            LEFT JOIN AgreementLocationItem as ALI ON ALI.id = SFS.agreementLocationItemId AND ALI.deletedAt IS NULL
            LEFT JOIN AgreementPackageItem as API ON API.id = SFS.agreementPackageItemId
            LEFT JOIN AgreementCashAdvancedItem as ACAI ON ACAI.id = SFS.agreementCashAdvancedItemId AND ACAI.deletedAt IS NULL
            LEFT JOIN AgreementPackage AS APC ON APC.id = API.agreementPackageId AND APC.deletedAt IS NULL
                GROUP BY ALI.agreementId, APC.agreementId, ACAI.agreementId, SS.beginningTime
                ORDER bY ss.beginningTime DESC;

                
        SELECT DISTINCT T.id, A.id AS agreementId, L.name AS location,  ( SELECT 
                        [APP].[id] AS id,
                        [APP].[firstName] AS firstName ,
                        [APP].[middleName] AS middleName ,
                        [APP].[lastName] AS lastName ,
                        [APPV].[onePortalId] as onePortalId 
                        FOR JSON PATH, WITHOUT_ARRAY_WRAPPER
                    ) as decedent, 
                    C.createdAt AS callDate,
                    C.appointmentDate,
                    EMP.name AS arranger,
                    DDS.dateofDeath AS dateofDeath,
                    T.transferDateTime AS transferDate,
                    A.createdAt AS caseDate,
                    DATEADD(day, 8, DDS.dateofDeath) AS deatheControlDate,
                    HMIS.createdAt As submissionOn,
                    beginT.beginningTime AS serviceDate,
                    T.createdAt AS transferCreated
                FROM  (
                    SELECT personId, MAX(id) as id FROM PersonRemainsTransfer 
                    WHERE transferType in (1,5,6) AND deletedAt IS NULL 
                    GROUP BY personId 
                ) AS PRT
                OUTER APPLY (
                    SELECT TOP 1 AG.id, AG.createdAt, AG.contractNumber, AG.arrangerId FROM AgreementPerson AS AP 
                    INNER JOIN Agreement AS AG ON AG.id = AP.agreementId AND AG.type = 1 and AG.status in ('Pending', 'Submitted', 'Completed','In progress') 
                    WHERE  AP.personId = PRT.personId AND AP.roleId = 3
                ) AS A
                LEFT JOIN [Employee] AS EMP ON EMP.id = A.arrangerId
                LEFT JOIN DeathDetails AS DDS ON DDS.personId = PRT.personId
                LEFT JOIN HMISDataSync AS HMIS ON HMIS.agreementId = A.id AND HMIS.active = 1
                INNER JOIN Person AS APP ON APP.id = PRT.personId
                INNER JOIN PersonVerificationDetails APPV ON APPV.personId = PRT.personId
                LEFT JOIN SomeOnePassed AS SOP ON SOP.decedentId = APP.id
                LEFT JOIN PreArrangement AS PA ON PA.beneficiaryId = APP.id 
                INNER JOIN [Call] AS C ON C.id in (SOP.callId, PA.callId) AND C.deletedAt IS NULL
                LEFT JOIN [Location] AS L ON L.id = C.receivedLocationId
                INNER JOIN [PersonRemainsTransfer] AS T ON T.id = PRT.id 
                OUTER APPLY(
                    SELECT TOP 1 SS.beginningTime as beginningTime
                        FROM @agreementServiceDate  AS SS
                        WHERE  SS.id = A.id
                        ORDER bY SS.beginningTime DESC
                ) AS beginT
        WHERE ${where}`
        if (queryObj.page) query += ` ${orderByQuery} OFFSET ${offset} ROWS FETCH NEXT ${limit} ROWS ONLY`
        query += ` DELETE FROM @agreementServiceDate`
        let list = await models.sequelize.query(query, { type: models.sequelize.QueryTypes.SELECT })

        list.map(e => convertToJson(e))
        return { list }
    }
    /**
     * forming the query based on the requested queries
     * @param {Object} queryObj is the object of queries made for fetching the AnCases
     */
    static async _queryObjForAnUsage (queryObj) {
        let query = ' C.id IS NOT NULL AND T.id IS NOT NULL '
        Object.keys(queryObj).map(key => {
            switch (key) {
            case 'Ids':
                query += ` AND T.id IN (select value from STRING_SPLIT('${queryObj.Ids}',','))`
                break
            case 'locationId':
                query += ` AND L.id = ${queryObj.locationId}`
                break
            case 'arranger':
                query += ` AND A.arrangerId = ${queryObj.arranger}`
                break
            case 'decedent':
                let words = '\'' + queryObj.decedent.split(' ').join('\',\'') + '\''
                query += ` AND (APP.firstName LIKE '%${queryObj.decedent}%' OR APP.middleName LIKE '%${queryObj.decedent}%' OR APP.lastName LIKE '%${queryObj.decedent}%' OR APP.firstName IN (${words}) OR APP.middleName IN (${words}) OR APP.lastName IN (${words}))`
                break
            case 'callDateFrom':
                query += ` AND C.createdAt between '${moment(queryObj.callDateFrom).tz(queryObj.timezone).startOf('day').format('YYYY/MM/DD')}' and '${moment(queryObj.callDateTo).tz(queryObj.timezone).endOf('day').format('YYYY/MM/DD')}'`
                break
            case 'deathDateFrom':
                query += ` AND DDS.dateofDeath between '${moment(queryObj.deathDateFrom).tz(queryObj.timezone).startOf('day').format('YYYY/MM/DD')}' and '${moment(queryObj.deathDateTo).tz(queryObj.timezone).endOf('day').format('YYYY/MM/DD')}'`
                break
            case 'removalDateFrom':
                query += ` AND T.transferDateTime between '${moment(queryObj.removalDateFrom).tz(queryObj.timezone).startOf('day').format('YYYY/MM/DD')}' and '${moment(queryObj.removalDateTo).tz(queryObj.timezone).endOf('day').format('YYYY/MM/DD')}'`
                break
            case 'caseDateFrom':
                query += ` AND A.createdAt between '${moment(queryObj.caseDateFrom).tz(queryObj.timezone).startOf('day').format('YYYY/MM/DD')}' and '${moment(queryObj.caseDateTo).tz(queryObj.timezone).endOf('day').format('YYYY/MM/DD')}'`
                break
            case 'appointmentDateFrom':
                query += ` AND C.appointmentDate between '${moment(queryObj.appointmentDateFrom).tz(queryObj.timezone).startOf('day').format('YYYY/MM/DD')}' and '${moment(queryObj.appointmentDateTo).tz(queryObj.timezone).endOf('day').format('YYYY/MM/DD')}'`
                break
            case 'deathctrlDateFrom':
                query += ` AND DATEADD(day, 8, DDS.dateofDeath) between '${moment(queryObj.deathctrlDateFrom).tz(queryObj.timezone).startOf('day').format('YYYY/MM/DD')}' and '${moment(queryObj.deathctrlDateTo).tz(queryObj.timezone).endOf('day').format('YYYY/MM/DD')}'`
                break
            case 'validateDateFrom':
                query += ` AND HMIS.createdAt between '${moment(queryObj.validateDateFrom).tz(queryObj.timezone).startOf('day').format('YYYY/MM/DD')}' and '${moment(queryObj.validateDateTo).tz(queryObj.timezone).endOf('day').format('YYYY/MM/DD')}'`
                break

            default:
                break
            }
        })
        return query
    }
}
module.exports = exports = ReportsController
