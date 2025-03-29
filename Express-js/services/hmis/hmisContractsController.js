// const hmisModels = require('./hmisConnection')
const hmisDB = require('./hmisConnection')
const models = require('../../models')
const { upsert } = require('../../controllers/refactorControllers/utils')
const _ = require('lodash')
const config = require('../../config/config.js')
const hmisConfig = require('../../config/hmis-config')
const esPerson = require('../../es_models/person')
const esAgreement = require('../../es_models/agreement')
const { migrateFinanceSchedule } = require('../../scripts/data-migration/temp-finance-schedule')
const { queueNames, queues } = require('../../appQueues')
const { bullJobRetry } = require('../../lib/util')
const AgreementPropertyController = require('../../controllers/refactorControllers/agreementController/agreementPropertiesController')

/**
 * This is a class links HMIS contracts to One portal and provides read only information of all the contracts in HMIS server DB
 */
class HMISContractsController {
    /**
     * This method provides a list of HMIS contracts with the given search params
     * @param {object} searchParams
     * @param {string} searchParams.firstName
     * @param {string} searchParams.contractNumber
     * @param {string} searchParams.lastName
     * @param {date} searchParams.dob
     * @param {string} searchParams.phoneNumber
     */
    static async getListOfContracts (searchParams = {}) {
        try {
            let { page = 1, limit = 10 } = searchParams

            let start = (page - 1) * limit + 1
            let end = page * limit

            let searchQuery = ''
            const columnMap = {
                contractNumber: 'S.Sales_Contract_Nbr',
                firstName: 'N.Primary_First_Name',
                lastName: 'N.Primary_Last_Name',
                phoneNumber: 'N.Phone_1',
                dob: 'N.Lot_Born_Dt'
            }
            const filterKeys = ['contractNumber', 'firstName', 'lastName', 'phoneNumber', 'dob']
            if (searchParams.dob) {
                searchParams.dob = searchParams.dob.split('-').join('')
            }
            Object.keys(searchParams).forEach(val => {
                if (filterKeys.includes(val)) {
                    searchQuery = searchQuery && searchQuery + ` OR `
                    searchQuery = searchQuery + `${columnMap[val]} LIKE '%${searchParams[val]}%'`
                }
            })

            const onePortalDB = config[process.env.NODE_ENV].database
            const hmisDBConfigDB = hmisConfig[process.env.NODE_ENV].database
            const hmisDBConfigHost = hmisConfig[process.env.NODE_ENV].host

            const whereCondition = `WHERE a.totalSalesItemPrice > 0 AND a.RowNum BETWEEN ${start} AND ${end} ORDER BY a.salesId DESC`
            const primaryQuery = `
                (SELECT ROW_NUMBER() OVER (ORDER BY S.Sales_ID) As RowNum, SUM(SI.Sales_Price) as totalSalesItemPrice,  S.Sales_ID as salesId,S.Sales_Contract_Nbr as contractNumber,N.Lot_Born_Dt as dob,N.Primary_First_Name as firstName,N.Primary_Last_Name as lastName,N.Phone_1 as phoneNumber
                FROM [${hmisDBConfigHost}].[${hmisDBConfigDB}].dbo.Sales S
                    INNER JOIN ${onePortalDB}.dbo.SaleType AS onePortalSaleTypes
                        ON S.Sales_Type_Cd = onePortalSaleTypes.code
                        LEFT JOIN ${onePortalDB}.dbo.HMISDataSync AS syncedSales
                        on S.Sales_ID = syncedSales.HMISSalesId
                        INNER JOIN [${hmisDBConfigHost}].[${hmisDBConfigDB}].dbo.Object_Name ON1 
                            ON S.Sales_ID = ON1.Object_ID
                        INNER JOIN [${hmisDBConfigHost}].[${hmisDBConfigDB}].dbo.[Name] N
                            ON ON1.Name_ID = N.Name_ID
                        INNER JOIN [${hmisDBConfigHost}].[${hmisDBConfigDB}].dbo.Sales_Item SI
                            ON S.Sales_ID = SI.Sales_ID WHERE OBJECT_TYPE_CD='Sales' AND NAME_TYPE_CD IN ('Purch', 'Deceased') AND onePortalSaleTypes.agreementType = 2 
                        AND  (syncedSales.id is null or syncedSales.isLinkedContract = 1)
                        AND (${searchQuery}) AND SI.Sales_Item_Qty_Sold > 0 AND SI.Product_Item_CD not like '%disc%' AND SI.Product_Item_Cd NOT LIKE '%*INT' -- eliminating cancelled records from listing 
                        AND NULLIF(LTRIM(RTRIM(N.Primary_First_Name)), '') IS NOT NULL
                                        GROUP BY S.SALES_ID,S.Sales_Contract_Nbr,N.Lot_Born_Dt,N.Primary_First_Name,N.Primary_Last_Name,N.Phone_1
                                        ) a`

            const getContractsQuery = `SELECT * FROM ${primaryQuery} ${whereCondition}`
            const countQuery = `SELECT COUNT(*) as total FROM ${primaryQuery}`

            const contracts = await models.sequelize.query(getContractsQuery, { type: models.sequelize.QueryTypes.SELECT })
            await Promise.all(contracts.map(async contract => {
                let contractBalanceQuery = `SELECT S.SALES_ID,SUM(SALES_PRICE)-ISNULL(SA.Amt,0.00)-ISNULL(PAY.PAIDAMOUNT,0.00) AS balance FROM [${hmisDBConfigHost}].[${hmisDBConfigDB}].DBO.Sales S
                INNER JOIN [${hmisDBConfigHost}].[${hmisDBConfigDB}].DBO.Sales_Item SI
                    ON S.Sales_ID = SI.Sales_ID
                LEFT JOIN  ( SELECT SUM(SA.Amt) AS Amt,SA.Sales_ID FROM  [HQS-SQL02].[h_000_Preprod].dbo.Sales_Adjustment SA GROUP BY SA.sales_id ) SA
                    ON S.Sales_ID = SA.Sales_ID
                LEFT JOIN (SELECT S.Sales_ID,ISNULL(SUM(CR.Amt),0) AS PAIDAMOUNT FROM [${hmisDBConfigHost}].[${hmisDBConfigDB}].DBO.Sales S
                    INNER JOIN [${hmisDBConfigHost}].[${hmisDBConfigDB}].DBO.Sales_Cash_Application SCA
                        ON S.Sales_ID = SCA.Sales_ID
                    INNER JOIN [${hmisDBConfigHost}].[${hmisDBConfigDB}].DBO.Cash_Receipt CR
                        ON SCA.Cash_Receipt_ID = CR.Cash_Receipt_ID AND isnull(CR.Amt, 0) <> 0
                    LEFT OUTER JOIN (SELECT DISTINCT Sales_Cash_Application_ID,Sales_ID,Receipt_Nbr FROM  [${hmisDBConfigHost}].[${hmisDBConfigDB}].DBO.Sales_Down_Pymt) SDP
                        ON S.SALES_ID = SDP.Sales_ID 
                            AND SCA.Sales_Cash_Application_ID = SDP.Sales_Cash_Application_ID WHERE S.Sales_ID = ${contract.salesId} GROUP BY S.Sales_ID) PAY
                    ON S.Sales_ID = PAY.Sales_ID
            WHERE S.Sales_ID = ${contract.salesId} AND SI.Sales_Item_Qty_Sold > 0
             -- AND SI.Product_Item_Cd NOT LIKE '%*INT' -- exclude cancelled records
            GROUP BY S.Sales_ID,PAY.PAIDAMOUNT,  SA.Amt`
                let contractBalance = await models.sequelize.query(contractBalanceQuery, { type: models.sequelize.QueryTypes.SELECT })
                contract.contractBalance = contractBalance[0].balance
            }))
            const count = await models.sequelize.query(countQuery, { type: models.sequelize.QueryTypes.SELECT })
            return { contracts, total: count[0].total }
        } catch (error) {
            throw error
        }
    }

    /**
     * This method provides the details of a HMIS contract based on contactId.
     * @param {*} contractId
     */
    static async getContractDetails (contractId) {
        try {
            const contractDetailsQuery = `SELECT  DISTINCT S.Sales_ID as salesId, S.Sales_Type_Cd  as saleType,S.Sales_Contract_Nbr as contractNumber,N.Primary_First_Name as firstName,N.Primary_Last_Name as lastName,N.Lot_Born_Dt as dob,SF.Balance_Due as contractBalance,N.Phone_1 as phoneNumber,N.Primary_Street_Address as address,N.Primary_City as city,N.Primary_State as state
            FROM Sales S 
            INNER JOIN  Object_Name ON1 ON S.Sales_ID = ON1.Object_ID
            INNER JOIN [Name] N ON ON1.Name_ID = N.Name_ID
            INNER JOIN Sales_Finance SF ON S.Sales_ID = SF.Sales_ID AND SF.Active = 1
            LEFT JOIN Sales_Item SI ON S.Sales_ID = SI.Sales_ID
            WHERE OBJECT_TYPE_CD='Sales' AND NAME_TYPE_CD IN ('Purch', 'Deceased')
            AND S.Sales_ID='${contractId}'`

            const contractDetails = await hmisDB.sequelize.query(contractDetailsQuery, { type: hmisDB.sequelize.QueryTypes.SELECT })
            const hmisDBConfigDB = hmisConfig[process.env.NODE_ENV].database
            const hmisDBConfigHost = hmisConfig[process.env.NODE_ENV].host

            let contractBalanceQuery = `SELECT S.SALES_ID,SUM(SALES_PRICE)-ISNULL(SA.Amt,0.00)-ISNULL(PAY.PAIDAMOUNT,0.00) AS balance FROM [${hmisDBConfigHost}].[${hmisDBConfigDB}].DBO.Sales S
            INNER JOIN [${hmisDBConfigHost}].[${hmisDBConfigDB}].DBO.Sales_Item SI
                ON S.Sales_ID = SI.Sales_ID
            LEFT JOIN  ( SELECT SUM(SA.Amt) AS Amt,SA.Sales_ID FROM  [HQS-SQL02].[h_000_Preprod].dbo.Sales_Adjustment SA GROUP BY SA.sales_id ) SA
                ON S.Sales_ID = SA.Sales_ID
            LEFT JOIN (SELECT S.Sales_ID,ISNULL(SUM(CR.Amt),0) AS PAIDAMOUNT FROM [${hmisDBConfigHost}].[${hmisDBConfigDB}].DBO.Sales S
                INNER JOIN [${hmisDBConfigHost}].[${hmisDBConfigDB}].DBO.Sales_Cash_Application SCA
                    ON S.Sales_ID = SCA.Sales_ID
                INNER JOIN [${hmisDBConfigHost}].[${hmisDBConfigDB}].DBO.Cash_Receipt CR
                    ON SCA.Cash_Receipt_ID = CR.Cash_Receipt_ID AND isnull(CR.Amt, 0) <> 0
                LEFT OUTER JOIN (SELECT DISTINCT Sales_Cash_Application_ID,Sales_ID,Receipt_Nbr FROM  [${hmisDBConfigHost}].[${hmisDBConfigDB}].DBO.Sales_Down_Pymt) SDP
                    ON S.SALES_ID = SDP.Sales_ID 
                        AND SCA.Sales_Cash_Application_ID = SDP.Sales_Cash_Application_ID WHERE S.Sales_ID = ${contractId} GROUP BY S.Sales_ID) PAY
                ON S.Sales_ID = PAY.Sales_ID
        WHERE S.Sales_ID = ${contractId} AND SI.Sales_Item_Qty_Sold > 0
         -- AND SI.Product_Item_Cd NOT LIKE '%*INT' -- exclude cancelled records
        GROUP BY S.Sales_ID,PAY.PAIDAMOUNT,  SA.Amt`

            let contractBalance = await hmisDB.sequelize.query(contractBalanceQuery, { type: hmisDB.sequelize.QueryTypes.SELECT })
            contractDetails[0].contractBalance = contractBalance[0].balance

            if (!contractDetails.length) {
                throw new Error('HMIS_CONTRACT_NOT_FOUND')
            }

            const items = await HMISContractsController.getContractItems(contractId)

            const linkedTo = await HMISContractsController.getLinkedContract(contractId)

            return { ...contractDetails[0], items, linkedTo }
        } catch (error) {
            throw error
        }
    }

    /**
     * This method fetches the items under the the hmis contract.
     * @param {*} contractId
     */
    static async getContractItems (contractId) {
        try {
            // TODO: Have to add trust available after getting confirmation from Tejo
            const contractItemsQuery = `SELECT It.Sales_Item_ID as id,It.Product_Item_Cd as itemCode,It.Item_Cd_Desc as itemDescription,It.Sales_Price as price,It.Sales_Item_Status_Cd as trustStatus, It.Lot_Sell_Unit_ID
            FROM Sales_Item It
            WHERE It.Sales_ID='${contractId}'`

            const contractItems = await hmisDB.sequelize.query(contractItemsQuery, { type: hmisDB.sequelize.QueryTypes.SELECT })

            return contractItems
        } catch (error) {
            throw error
        }
    }

    /**
     * This method fetches the details of the linked one portal contract.
     * @param {*} contractId
     */
    static async getLinkedContract (contractId) {
        try {
            const linkedContractQuery = `SELECT PersonVerificationDetails.onePortalId as opiId,Person.id,Person.firstName, Person.lastName
            FROM LinkAgreement
            INNER JOIN AgreementPerson ON AgreementPerson.agreementId = LinkAgreement.agreementId
            INNER JOIN Person ON Person.id = AgreementPerson.personId
            INNER JOIN PersonVerificationDetails ON PersonVerificationDetails.personId = Person.id
            WHERE LinkAgreement.hmisSalesId='${contractId}'`

            const linkedContract = await models.sequelize.query(linkedContractQuery, { type: models.sequelize.QueryTypes.SELECT })

            return linkedContract[0]
        } catch (error) {
            throw error
        }
    }

    /**
     * This method generates agreement finance schedule
     * @param {number} agreementId
     */
    static async _generateAgreementFinanceSchedule (agreementId, transaction) {
        try {
            // Check financing is available or not for a agreement
            let agreementFinanceRecord = await models.AgreementFinance.findOne({
                where: {
                    agreementId: agreementId,
                    isActive: 1,
                    isRecent: 1,
                    deletedBy: null,
                    deletedAt: null
                },
                transaction
            })
            if (agreementFinanceRecord && _.get(agreementFinanceRecord, 'id')) {
                const hmisDBConfigDB = hmisConfig[process.env.NODE_ENV].database
                const hmisDBConfigHost = hmisConfig[process.env.NODE_ENV].host

                const agreementFinanceId = agreementFinanceRecord.id
                const agreementFinanceQuery = `
                SELECT 
                AgreementFinance.agreementId,
                SalesFinance.Pymnt_Start_Dt AS createdAt
                FROM AgreementFinance
                INNER JOIN Agreement ON Agreement.id = AgreementFinance.agreementId
                INNER JOIN [${hmisDBConfigHost}].${hmisDBConfigDB}.dbo.Sales AS Sales ON Sales.Sales_Contract_Nbr = Agreement.contractNumber
                INNER JOIN [${hmisDBConfigHost}].${hmisDBConfigDB}.dbo.Sales_Finance AS SalesFinance ON SalesFinance.Sales_ID = Sales.Sales_ID
                WHERE AgreementFinance.id IN (${agreementFinanceId}) 
                AND AgreementFinance.isActive = 1 
                AND AgreementFinance.isRecent = 1
                AND AgreementFinance.financedAmount > 0
                AND SalesFinance.Active = 1
                GROUP BY AgreementFinance.agreementId, SalesFinance.Pymnt_Start_Dt
                ORDER BY AgreementFinance.agreementId ASC`
                const agreementFinances = await models.sequelize.query(agreementFinanceQuery,
                    { type: models.sequelize.QueryTypes.SELECT, transaction })
                const { agreementId, createdAt } = agreementFinances[0]
                await migrateFinanceSchedule(agreementId, createdAt, transaction)
            }
            return _.get(agreementFinanceRecord, 'id', null)
        } catch (error) {
            throw error
        }
    }

    /**
     * This method links hmis contract to one portal.
     * @param {object} data
     * @param {number} data.personId
     * @param {string} data.hmisContractNumber
     * @param {number} data.salesId
     * @param {number} data.hmisContractType
     * @param {number} data.hmisSalesType
     * @param {object} data.user
     */
    static async linkContract (data, user) {
        let transaction
        try {
            transaction = await models.sequelize.transaction()
            const saleType = await models.SaleType.findOne({ where: { code: data.hmisSalesType }, transaction })
            if (!saleType) {
                throw new Error('SALE_TYPE_NOT_FOUND')
            }
            let linkedAgreement = await models.LinkAgreement.findOne({
                where: {
                    hmisContractNumber: data.hmisContractNumber,
                    hmisSalesId: data.salesId
                },
                include: [
                    {
                        model: models.LinkAgreementPerson,
                        as: 'linkedPerson'
                    }
                ],
                transaction
            })
            let linkAgreementPersonPayload, linkedAgreementPerson
            if (linkedAgreement) {
                if (linkedAgreement && _.filter(linkedAgreement.linkedPerson, (val) => { return _.get(val, 'personId') === Number(data.personId) }).length) {
                    throw new Error('AGREEMENT_ALREADY_LINKED')
                }
                await models.AgreementPerson.create(
                    {
                        agreementId: linkedAgreement.agreementId,
                        personId: data.personId,
                        roleId: 3,
                        createdBy: user.id,
                        updatedBy: user.id
                    },
                    {
                        transaction
                    }
                )
                linkAgreementPersonPayload = {
                    linkAgreementId: linkedAgreement.id,
                    personId: data.personId
                }
                linkedAgreementPerson = await upsert('LinkAgreementPerson', linkAgreementPersonPayload, transaction, {
                    userId: user.id
                })
            } else {
                // else Create a new agreement using sp
                const status = await this.getLinkAgreementStatus('ToBeProcessed', transaction)
                const salesFinanceQuery = `SELECT  DISTINCT SF.Sales_Finance_ID FROM Sales_Finance  SF
                WHERE SF.Active = 1 AND SF.Sales_ID=${data.salesId}`
                const salesFinance = await hmisDB.sequelize.query(salesFinanceQuery, { type: hmisDB.sequelize.QueryTypes.SELECT })
                const linkAgreementPayload = {
                    id: null,
                    agreementId: null,
                    hmisContractNumber: data.hmisContractNumber,
                    hmisSalesId: data.salesId,
                    statusId: status[0].id,
                    hmisSalesFinanceId: salesFinance[0].Sales_Finance_ID,
                    hmisContractType: data.hmisContractType.slice(0, 3),
                    arrangerId: null,
                    agreementType: 2
                }
                linkedAgreement = await upsert('LinkAgreement', linkAgreementPayload, transaction, {
                    userId: user.id
                })
                linkAgreementPersonPayload = {
                    linkAgreementId: linkedAgreement.id,
                    personId: data.personId
                }
                linkedAgreementPerson = await upsert('LinkAgreementPerson', linkAgreementPersonPayload, transaction, {
                    userId: user.id
                })
                const spQuery = `EXEC ImportCemportalContracts @salesId=${data.salesId}`

                await models.sequelize.query(spQuery, { type: models.sequelize.QueryTypes.SELECT, transaction })
                // Insert this into HMISDataSync along with Sales_Id, linkedAgreements actual agreementId

                const agreementDetails = await models.Agreement.findOne({ where: { contractNumber: data.hmisContractNumber }, transaction })
                await esAgreement.save(agreementDetails, { transaction })
                let syncStatus = await models.HMISDataSyncStatus.findOne({
                    where: {
                        name: 'Success'
                    },
                    transaction
                })

                let hmisDataSyncPayload = {
                    agreementId: agreementDetails.id,
                    HMISSalesId: data.salesId,
                    statusId: syncStatus.id,
                    active: true,
                    isLinkedContract: true
                }

                await upsert('HMISDataSync', hmisDataSyncPayload, transaction, { userId: user.id })

                // Generate agreement finance schedule
                let agreementFinanceId = await this._generateAgreementFinanceSchedule(agreementDetails.id, transaction)

                if (agreementFinanceId) {
                    const syncAgreementFinanceSchedulePaymentWorker = queues[queueNames.syncAgreementFinanceSchedulePaymentJob]
                    let jobData = {
                        agreementId: agreementDetails.id,
                        agreementFinanceId,
                        user
                    }
                    syncAgreementFinanceSchedulePaymentWorker.add('syncAgreementFinanceSchedulePayment', jobData, bullJobRetry)
                    // When the agreement finance interest and sum of agreement finance schedule's interest are not equal, make an entry in FinanceChargeException
                    let agreementFinanceInterestDetailsQuery = `
                    SELECT AgreementFinance.interestAmount, SUM(AgreementFinanceSchedule.interest) AS calculatedInterest
                    FROM AgreementFinance
                    INNER JOIN AgreementFinanceSchedule ON AgreementFinanceSchedule.agreementFinanceId = AgreementFinance.id
                    WHERE AgreementFinance.id = ${agreementFinanceId}
                    GROUP BY AgreementFinance.interestAmount`

                    let agreementFinanceInterestDetails = await models.sequelize.query(agreementFinanceInterestDetailsQuery, { type: models.sequelize.QueryTypes.SELECT, transaction })

                    let agreementFinanceInterest = _.get(agreementFinanceInterestDetails, '[0].interestAmount')
                    let calculatedInterest = _.get(agreementFinanceInterestDetails, '[0].calculatedInterest')
                    if (agreementFinanceInterest !== calculatedInterest) {
                        await models.FinanceChargeException.create({
                            contractNumber: agreementDetails.contractNumber,
                            hmisSalesId: data.salesId,
                            agreementId: agreementDetails.id,
                            agreementFinanceId: agreementFinanceId,
                            interestFromHmis: agreementFinanceInterest,
                            interestInOnePortal: calculatedInterest,
                            status: 'TBD'
                        }, transaction)
                    }
                }

                let agreementPersons = await models.AgreementPerson.findAll({
                    where: {
                        agreementId: agreementDetails.id,
                        deletedAt: null,
                        deletedBy: null
                    },
                    transaction
                })
                const agreementPropertyOwners = await models.AgreementProperty.findAll({
                    where: {
                        agreementId: agreementDetails.id,
                        deletedAt: null,
                        deletedBy: null
                    },
                    include: [{
                        model: models.AgreementPropertyOwner,
                        as: 'agreementPropertyOwner',
                        attributes: ['ownerId'],
                        where: {
                            deletedAt: null,
                            deletedBy: null
                        }
                    }],
                    transaction
                })
                const owners = _.flatMap(agreementPropertyOwners, (prop) => { return prop.agreementPropertyOwner.map((val) => { return { personId: val.ownerId } }) })
                agreementPersons = [...agreementPersons, ...owners]
                await Promise.all(agreementPersons.map(async agreementPerson => {
                    let foundPerson = await models.Person.scope('withBirthPlace').findOne({
                        where: {
                            id: agreementPerson.personId
                        },
                        transaction
                    })
                    foundPerson.isVerified = true
                    await esPerson.save(foundPerson, { transaction })
                }))

                // Creating Cert of Sepulcher files
                const agreementPropertyController = new AgreementPropertyController(agreementDetails.id)
                await agreementPropertyController.generateCertificateOfSepulcherFilesAndUploadToAzure(user.id, agreementDetails.totalPaid, transaction)
            }

            await transaction.commit()
            return { linkedAgreement, linkedAgreementPerson }
        } catch (error) {
            await transaction.rollback()
            throw error
        }
    }

    static async getLinkAgreementStatus (name, transaction) {
        try {
            if (name) {
                return await models.LinkAgreementStatus.findAll({
                    where: {
                        name
                    },
                    transaction
                })
            }
            return await models.LinkAgreementStatus.findAll({ transaction })
        } catch (error) {
            throw error
        }
    }

    /**
     * This method fetches all the failed hmis sync details and the detail when last hmis sync happened
     * @param {number} receivedPage
     * @param {number} receivedLimit
     */
    static async getHMISSyncStatus (receivedPage, receivedLimit) {
        let transaction
        try {
            transaction = await models.sequelize.transaction()
            let offset = (Number(receivedPage) - 1) * receivedLimit
            // Query to fetch the last hmis sync details
            let lastSyncedDetailsQuery = `
            SELECT MAX(lastSynced.lastSyncedDetails) AS lastSyncedDate
            FROM
            (SELECT MAX(HMISDataSync.createdAt) AS lastSyncedDetails FROM HMISDataSync
            UNION
            SELECT MAX(HMISAddendumDataSync.createdAt) AS lastSyncedDetails FROM HMISAddendumDataSync) AS lastSynced`

            let lastSyncedDetails = await models.sequelize.query(lastSyncedDetailsQuery, {
                type: models.sequelize.QueryTypes.SELECT,
                transaction
            })

            let subQuery = `
            (SELECT
                Agreement.contractNumber AS contractNumber,
                Employee.name AS salesCounselor,
                HMISDataSync.createdAt AS lastSyncAttempt,
                HMISDataSync.failureReason AS syncFailReason
                FROM HMISDataSync
                INNER JOIN Agreement ON Agreement.id = HMISDataSync.agreementId
                INNER JOIN Employee ON Employee.id = Agreement.arrangerId
                WHERE HMISDataSync.statusId IN (
                    SELECT HMISDataSyncStatus.id
                    FROM
                    HMISDataSyncStatus
                    WHERE HMISDataSyncStatus.name = 'Error'
                )
                UNION
                SELECT
                Agreement.contractNumber AS contractNumber,
                Employee.name AS salesCounselor,
                HMISAddendumDataSync.createdAt AS lastSyncAttempt,
                HMISAddendumDataSync.failureReason AS syncFailReason
                FROM HMISAddendumDataSync
                INNER JOIN Addendum ON Addendum.id = HMISAddendumDataSync.addendumId
                INNER JOIN Agreement ON Agreement.id = Addendum.agreementId
                INNER JOIN Employee ON Employee.id = Agreement.arrangerId
                WHERE HMISAddendumDataSync.statusId IN (
                    SELECT HMISDataSyncStatus.id
                    FROM
                    HMISDataSyncStatus
                    WHERE HMISDataSyncStatus.name = 'Error'
                )
                ) AS failedSyncDetails`

            // Query to fetch  the details of the failed syncs from HMISDataSync and HMISAddendumDataSync
            let failedSyncDataQuery = `
            SELECT * FROM
            ${subQuery}
            ORDER BY failedSyncDetails.lastSyncAttempt DESC
            OFFSET :offset ROWS 
            FETCH  NEXT :limit ROWS ONLY`

            let failedSyncData = await models.sequelize.query(failedSyncDataQuery, {
                type: models.sequelize.QueryTypes.SELECT,
                transaction,
                replacements: {
                    limit: receivedLimit,
                    offset
                }
            })
            failedSyncData = await Promise.all(failedSyncData.map(async (obj) => {
                const agreementPersonsQuery = `
                select distinct pvd.onePortalId as opi,p.id from Agreement a
                inner join AgreementPerson ap on a.id=ap.agreementId
                inner join Person p on p.id=ap.personId
                inner join PersonVerificationDetails pvd on pvd.personId=p.id
                 where contractNumber='${obj.contractNumber}'
                `
                let agreementPersons = await models.sequelize.query(agreementPersonsQuery, {
                    type: models.sequelize.QueryTypes.SELECT,
                    transaction
                })
                obj.agreementPersons = agreementPersons
                return obj
            }))
            let failedSyncDataCountQuery = `
            SELECT COUNT(*) AS totalCount FROM
            ${subQuery}`

            let failedSyncDataCount = await models.sequelize.query(failedSyncDataCountQuery, {
                type: models.sequelize.QueryTypes.SELECT,
                transaction
            })

            await transaction.commit()
            return {
                lastSyncedDate: lastSyncedDetails[0].lastSyncedDate,
                failedSyncData,
                totalCount: failedSyncDataCount[0].totalCount
            }
        } catch (error) {
            await transaction.rollback()
            throw error
        }
    }
}

module.exports = HMISContractsController
