const _ = require('lodash')
const models = require('../../../models')
const moment = require('moment')
const Json2csvParser = require('json2csv').Parser
const logger = require('../../../lib/logger')
const { getFullNameOfPerson } = require('../utils')
class StatementReportsController {
    static _queryObjForStatementReports (filters) {
        let sql = ''
        Object.keys(filters).map((e) => {
            switch (e) {
            case 'contractNumber':
                sql += ` AND ag.contractNumber LIKE '%${filters.contractNumber}%'`
                break
            case 'agreementType':
                sql += ` AND agt.id = '${filters.agreementType}'`
                break
            case 'locationId':
                sql += ` AND loc.id = ${filters.locationId}`
                break
            case 'arrangerId':
                sql += ` AND emp.id = ${filters.arrangerId}`
                break
            case 'submittedDateFrom':
                filters.submittedDateFrom = moment(filters.submittedDateFrom).tz(filters.timezone).startOf('day').format('YYYY/MM/DD HH:mm:ss')
                filters.submittedDateTo = moment(filters.submittedDateTo).tz(filters.timezone).endOf('day').format('YYYY/MM/DD HH:mm:ss')
                sql += ` AND hds.updatedAt between '${filters.submittedDateFrom}' AND  '${filters.submittedDateTo}' and hds.statusId=3`
                break
            case 'status':
                sql += ` AND ag.status = '${filters.status}'`
                break
            case 'decedentName':
                sql += ` AND scDetails.firstName like '%${filters.decedentName}%' or scDetails.middleName = '%${filters.decedentName}%' or scDetails.lastName = '%${filters.decedentName}'`
                break
            default:
                break
            }
        })

        return sql
    }

    /**
     * this method returns all the contracts with due
     * @param {object} filters
     */
    static async getANReports (filters = {}) {
        try {
            let { page = 1, limit = 10, getAllRecords = false } = filters

            let primaryQuerySelect = `select 
            ag.contractNumber  as contractNumber,
            ag.id as agreementId,
            ag.totalCashPrice,
            ag.due,
            agt.agreementType,
            loc.name as locationName,
            emp.name as arrangerName,
            case when hdStatus.name='Success' then hds.updatedAt else null end as submittedDate,
        ag.status,
        scDetails.personId,
        scDetails.prefix,
        scDetails.firstName,
        scDetails.lastName,
        scDetails.middleName,
        loc.id as locationId,
        case when SUM(amountDetails.insuranceAmount)>0 then 'Y' else 'N' end as insuranceAgreement,
        amountDetails.insuranceAmount,
        amountDetails.companyName as insuranceCompany,
        DATEDIFF(DAY,GETDATE(), 
        scDetails.latestDate  
        ) as daysUntilService,
        (   select p.id,p.firstName,p.lastName,p.middleName,p.prefix from AgreementPerson ap
            inner join Person p on p.id=ap.personId where ap.roleId=3 and ap.agreementId=ag.id
        for JSON PATH) as decedentDetails
        `

            let query = `
                from Agreement ag
                        inner join AgreementType agt on agt.id=ag.[type]
                        inner join Location loc on loc.id=ag.locationId
                        LEFT join Employee emp on emp.id=ag.arrangerId -- whole sale cremation agreements does not have arranger 
                        left join 
                        (
                            select MAX(maxBeginningDate) as latestDate, agreementId, a.firstName,a.lastName,a.middleName,a.personId,a.isAlive,a.prefix from (
                                select a.id as agreementId, ss.beginningTime AS maxBeginningDate, 
                                case  when a.type=4 then  null else p.firstName end as firstName  ,
                                case  when a.type=4 then  null else p.id end as personId  ,
                                case  when a.type=4 then  null else p.prefix end as prefix  ,

                                case  when a.type=4 then  null else p.lastName end as lastName  ,
                                case  when a.type=4 then  null else p.middleName end as middleName  ,
                                case  when a.type=4 then  0 else p.isAlive end as isAlive  
                                     from ScheduledFuneralService as sfs 
                                    INNER JOIN Person as p ON p.id = sfs.personId
                                    INNER JOIN PersonVerificationDetails as pvd ON pvd.personId = p.id
                                    INNER JOIN SchedulingSection as ss ON ss.id = sfs.schedulingSectionId
                                    LEFT JOIN AgreementLocationItem as ali ON ali.id = sfs.agreementLocationItemId
                                    LEFT JOIN AgreementPackageItem as api ON api.id = sfs.agreementPackageItemId
                                    LEFT JOIN AgreementCashAdvancedItem as acai ON acai.id = sfs.agreementCashAdvancedItemId
                                    LEFT JOIN AgreementPackage ap ON ap.id = api.agreementPackageId
                                    INNER JOIN Agreement as a ON a.id IN (ali.agreementId, ap.agreementId, acai.agreementId)
                                    INNER JOIN AgreementType as agt ON agt.id = a.type
                                    and sfs.deletedAt is null and sfs.deletedBy is null
            
                            UNION
                                      
                                select a.id as agreementId, iis.beginningTime AS maxBeginningDate,
                                case  when a.type=4 then  null else p.firstName end as firstName  ,
                                case  when a.type=4 then  null else p.id end as personId  ,
                                case  when a.type=4 then  null else p.prefix end as prefix  ,
                                case  when a.type=4 then  null else p.lastName end as lastName  ,
                                case  when a.type=4 then  null else p.middleName end as middleName  ,
                                case  when a.type=4 then  0 else p.isAlive end as isAlive  
                                    from  ScheduledCemeteryService as scs  
                                    INNER JOIN Person as p ON p.id = scs.personId
                                    INNER JOIN PersonVerificationDetails as pvd ON pvd.personId = p.id
                                    INNER JOIN ItemUsage as iu on iu.id = scs.itemUsageId
                                    INNER JOIN AgreementLocationItem as ali ON ali.id = iu.resourceId and iu.resourceType='AgreementLocationItem'
                                    INNER JOIN Agreement as a ON a.id = ali.agreementId
                                    INNER JOIN AgreementType as agt ON agt.id = a.type
                                    INNER JOIN IntermentInformationSection iis on scs.intermentInformationSectionId=iis.id
                                    and scs.deletedAt is null and scs.deletedBy is null
                
                            UNION
                                select a.id as agreementId, dis.beginningTime AS maxBeginningDate,
                                case  when a.type=4 then  null else p.firstName end as firstName  ,
                                case  when a.type=4 then  null else p.id end as personId  ,
                                case  when a.type=4 then  null else p.prefix end as prefix  ,

                                case  when a.type=4 then  null else p.lastName end as lastName  ,
                                case  when a.type=4 then  null else p.middleName end as middleName  ,
                                case  when a.type=4 then  0 else p.isAlive end as isAlive  
                                    
                                    from  ScheduledCemeteryService as scs  
                                    INNER JOIN Person as p ON p.id = scs.personId
                                    INNER JOIN PersonVerificationDetails as pvd ON pvd.personId = p.id
                                    INNER JOIN ItemUsage as iu on iu.id = scs.itemUsageId
                                    INNER JOIN AgreementLocationItem as ali ON ali.id = iu.resourceId and iu.resourceType='AgreementLocationItem'
                                    INNER JOIN Agreement as a ON a.id = ali.agreementId
                                    INNER JOIN AgreementType as agt ON agt.id = a.type
                                    INNER JOIN DisintermentInfoSection dis on scs.disintermentInfoSectionId=dis.id
                                    and scs.deletedAt is null and scs.deletedBy is null
                            UNION
                                select a.id as agreementId, NULL AS maxBeginningDate,
                                case  when a.type=4 then  null else p.firstName end as firstName  ,
                                case  when a.type=4 then  null else p.id end as personId  ,
                                case  when a.type=4 then  null else p.prefix end as prefix  ,

                                case  when a.type=4 then  null else p.lastName end as lastName  ,
                                case  when a.type=4 then  null else p.middleName end as middleName  ,
                                case  when a.type=4 then  0 else p.isAlive end as isAlive  
                                     from Agreement a
                                    inner join AgreementPerson ap on ap.agreementId=a.id and ap.isOwner=1
                                    inner join PersonVerificationDetails pvd on pvd.personId=ap.personId
                                    inner join Person p on p.id=pvd.personId
                            ) a
                        GROUP by a.agreementId, a.firstName,a.lastName,a.middleName,a.personId ,a.isAlive,a.prefix
                        ) as scDetails on ag.id=scDetails.agreementId
                        LEFT join HMISDataSync hds on hds.agreementId=ag.id
                        LEFT join HMISDataSyncStatus  hdStatus on  (hdStatus.id=hds.statusId)
                        LEFT JOIN 
                        (
                            select  a.id as agreementId,  sum(ap.amount) as insuranceAmount,
                            STUFF((
                            SELECT ',' + org.name
                            FROM AnticipatedPayment AN  
                            LEFT JOIN  ORGANIZATION org ON org.ID=AN.organizationId
                            where AN.resourceId=a.id and AN.resourceType='Agreement'       
                            FOR XML PATH('')), 1, 1, '') as companyName
                            from Agreement a
                            LEFT JOIN AnticipatedPayment ap on ap.resourceId=a.id and ap.resourceType='Agreement' 
                            group by a.id
                        )   as amountDetails ON amountDetails.agreementId=ag.id
                        `

            let whereCondition = ` where 
                ag.due>0
                 and (ag.[needType]=1 or ag.[needType] is null or scDetails.isAlive=0 )`

            let filtersQuery = this._queryObjForStatementReports(filters)

            let groupByClause = ` GROUP by ag.contractNumber,
            ag.contractNumber,
            ag.totalCashPrice,
            ag.due,
            agt.agreementType,
            loc.name,
            emp.name,
            ag.status,
            scDetails.firstName,
            scDetails.lastName,
            scDetails.middleName,
            scDetails.personId, scDetails.prefix,
            hdStatus.name,
            hds.updatedAt,amountDetails.companyName,amountDetails.insuranceAmount,
            loc.id  ,ag.id,scDetails.latestDate            
            `
            let orderByClause = ` order by  ag.contractNumber desc`
            let countQuery = query + whereCondition + filtersQuery + groupByClause

            countQuery = ` select  count(grouped.total) as total from (select count(ag.id)  as total ${countQuery} ) as grouped`

            const count = await models.sequelize.query(
                countQuery,
                { type: models.sequelize.QueryTypes.SELECT }
            )
            if (getAllRecords) {
                limit = count[0].total || limit
            }
            page = (page - 1) * limit

            let offSetQuery = ` OFFSET ${page} ROWS FETCH NEXT ${limit} ROWS ONLY`
            const items = await models.sequelize.query(
                primaryQuerySelect + query + whereCondition + filtersQuery + groupByClause + orderByClause + offSetQuery,
                { type: models.sequelize.QueryTypes.SELECT }
            )

            return {
                totalCount: count[0].total,
                items
            }
        } catch (error) {
            throw error
        }
    }

    /**
     * this method returns csv of reports
     * @param {*} req
     * @param {*} res
     * @param {*} next
     */
    static async exportStatementReports (req, res, next) {
        try {
            req.query.getAllRecords = true
            const reports = await this.getANReports(req.query)
            if (_.get(reports, 'items.length')) {
                let exportRes = reports.items.map((e, key) => {
                    let isWholeSale = false
                    let wholeSaleDecedent = []
                    if (e.agreementType === 'Wholesale Cremation') {
                        JSON.parse(_.get(e, 'decedentDetails', [])).forEach(element => {
                            wholeSaleDecedent.push(getFullNameOfPerson(element))
                        })
                        isWholeSale = true
                    }
                    return {
                        'Statement Number': e.contractNumber,
                        'Submission Date': e.submittedDate ? moment(e.submittedDate).format('MM/DD/YYYY') : '',
                        'Agreement Type': e.agreementType === 'Cemetry' ? 'Cemetery' : e.agreementType,
                        'Location': e.locationName,
                        'Arranger': e.arrangerName,
                        'Days Until Service': e.daysUntilService,
                        'Total Cash Price': e.totalCashPrice,
                        'Due Am': e.due,
                        'Beneficiary / Decedent': isWholeSale ? wholeSaleDecedent.join(',') : getFullNameOfPerson(e),
                        'Insurance Agreement': e.insuranceAgreement,
                        'Insurance Company': e.insuranceAgreement,
                        'Insurance Amount': e.insuranceAmount,
                        'Status': e.status
                    }
                })
                const json2csvParser = new Json2csvParser({ excelStrings: true })
                const csv = json2csvParser.parse(exportRes)
                res.attachment('openANStatement.csv')
                res.send(Buffer.from(csv))
            } else {
                res.json({
                    success: true,
                    msg: 'No records found'
                })
            }
        } catch (error) {
            logger.error(error)
            throw error
        }
    }
}

module.exports = StatementReportsController
