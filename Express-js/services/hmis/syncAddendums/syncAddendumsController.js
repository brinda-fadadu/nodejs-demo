// const hmisModels = require('./hmisConnection')
const hmisDB = require('../hmisConnection')
const models = require('../../../models')
const _ = require('lodash')
// const moment = require('moment')
// const Op = require('sequelize').Op
// const config = require('../../config/config.json')
const logger = require('../../../lib/logger')
// const { getNameOfPerson } = require('../../lib/util')
const hmisConfig = require('../../../config/hmis-config')
// const config = require('../../config/config.json')
// const { PaymentTypes } = require('../../config/seed').seed
// const { stripeClient } = require('../../services').stripe
// const PayerController = require('../../controllers/refactorControllers/paymentController/payerController')
const HMISSyncController = require('../hmisSyncController')
const moment = require('moment')
const config = require('../../../config/config.js')

/**
 * This class syncs One portal agreements to HMIS and provides read only information of all the contracts in HMIS server DB
 */
class HMISAddendumSyncController {
    constructor (addendumId, sequenceId) {
        this.addendumId = addendumId
        this.agreementId = null
        this.sequenceId = sequenceId
        this.agreementContractNumber = null
        this.salesId = null
        this.syncType = null
    }

    /**
     * This method syncs an addendum end to end provided this controller is initialized with a valid addendum
     * @param {*} user is the complete details of the user who initiates the sync process
     */
    async syncAddendum (user, transaction, onePortalTransaction) {
        // let transaction, onePortalTransaction
        try {
            // transaction = await hmisDB.sequelize.transaction()
            // onePortalTransaction = await models.sequelize.transaction()
            const onePortalDB = config[process.env.NODE_ENV].database
            // Fetching the agreementDetails for the addendum
            let agreementDetails = await this.getAgreementDetailsForAddendum()

            // Fetching the Sales details from the HMIS DB for the agreement contractNumber
            let salesId = await this.getSalesDetails(agreementDetails[0].contractNumber)
            this.hmisSyncController = new HMISSyncController(agreementDetails[0].id, this.sequenceId)
            // let sequenceRow = await hmisDB.sequelize.query(`SELECT * FROM Sequence`, { type: hmisDB.sequelize.QueryTypes.SELECT, transaction })
            // this.hmisSyncController.sequenceId = sequenceRow[0].Next_ID
            this.salesId = salesId[0].Sales_ID

            let salesFinanceId = await this.SyncAddendumToSalesFinance(transaction)
            await this.syncAddendumSalesItem(transaction)
            await this.syncAddendumToSalesAdjustment(this.salesId, salesFinanceId, transaction, onePortalTransaction)
            // Name, Name_Name_Type, Object_Name table sync
            await this.hmisSyncController.nameModuleDataTransformation(this.salesId, 'Funeral', user, transaction, onePortalTransaction)
            // await Promise.all(nameModuleDataArray.map(async (data) => {
            //     if (data.nameIdTableData && Object.keys(data.nameIdTableData).length > 0) {
            //         await this.hmisSyncController.syncToNameIdTable(data.nameIdTableData, transaction)
            //     }
            //     if (data.nameNameTypeTableData && Object.keys(data.nameNameTypeTableData).length > 0) {
            //         await this.hmisSyncController.syncToNameNameTypeTable(data.nameNameTypeTableData, transaction)
            //     }
            //     if (data.objectNameTableData && Object.keys(data.objectNameTableData).length > 0) {
            //         await this.hmisSyncController.syncToObjectNameTable(data.objectNameTableData, transaction)
            //     }
            // }))

            if (this.syncType === 'Cemetery') {
                let agreementPropertiesDataArray = await this.hmisSyncController.agreementPropertiesSync(this.salesId, user, transaction, onePortalTransaction)
                // await Promise.all(agreementPropertiesDataArray.map(async (propertyData) => {
                for (let propertyData of agreementPropertiesDataArray) {
                    if (propertyData.purchaseTableData && Object.keys(propertyData.purchaseTableData).length > 0) {
                    // insert if no purchase record is found
                        let record = await hmisDB.sequelize.query(`select * from Purchase where Purchase_ID= ${propertyData.purchaseTableData.Purchase_ID}`, { type: hmisDB.sequelize.QueryTypes.SELECT, transaction })
                        if (!record.length) {
                            await this.hmisSyncController.syncToPurchaseTable(propertyData.purchaseTableData, transaction)
                        }
                    }
                    // owners
                    await Promise.all(propertyData.owners.map(async ownerData => {
                        // if (ownerData.nameIdTableData && Object.keys(ownerData.nameIdTableData).length > 0) {
                        //     await this.hmisSyncController.syncToNameIdTable(ownerData.nameIdTableData, transaction)
                        // }
                        // if (ownerData.nameNameTypeTableData && Object.keys(ownerData.nameNameTypeTableData).length > 0) {
                        //     await this.hmisSyncController.syncToNameNameTypeTable(ownerData.nameNameTypeTableData, transaction)
                        // }
                        // if (ownerData.objectNameTableData && Object.keys(ownerData.objectNameTableData).length > 0) {
                        //     await this.hmisSyncController.syncToObjectNameTable(ownerData.objectNameTableData, transaction)
                        // }
                        if (ownerData.objectSalesTableData && Object.keys(ownerData.objectSalesTableData).length > 0) {
                            await this.hmisSyncController.syncToObjectSalesTable(ownerData.objectSalesTableData, transaction)
                        }
                    }))

                    if (propertyData.lotSellUnitHistoryTableData && Object.keys(propertyData.lotSellUnitHistoryTableData).length > 0) {
                        await this.hmisSyncController.syncToLotSellUnitHistoryTable(propertyData.lotSellUnitHistoryTableData, transaction)
                    }
                    if (propertyData.purchaseTableData && propertyData.purchaseTableData.Purchase_ID) {
                        let lotSellRecord = await hmisDB.sequelize.query(`select * from Lot_Sell_Unit where Purchase_ID=${propertyData.purchaseTableData.Purchase_ID}`, { type: hmisDB.sequelize.QueryTypes.SELECT, transaction })
                        let lotSellUnitId = _.get(propertyData, 'lotSellUnitId', null)

                        if (!lotSellRecord.length) {
                            const userLdap = await this.hmisSyncController.getUserLdapId(user.id)
                            await this.hmisSyncController.lotSellUnitHistoryTableDataTransformation(lotSellUnitId, propertyData.purchaseTableData.Purchase_ID, userLdap, transaction)
                            await models.sequelize.query(`update ${onePortalDB}.dbo.Property set status='S', updatedAt='${moment().format('YYYY-MM-DD HH:mm:ss Z')}' where lotSellUnitId=${lotSellUnitId}`, { type: models.sequelize.QueryTypes.UPDATE, transaction: onePortalTransaction })
                        }
                        if (propertyData.lotSellUnitId) {
                            await this.hmisSyncController.syncToLotSpaceHistoryTable(propertyData.lotSellUnitId, user.ldapId, transaction)
                        }
                    }
                }
                // update controlOwnerSequenceId
                if (agreementPropertiesDataArray.length) {
                    await hmisDB.sequelize.query(`UPDATE Control_Owner_Lot SET Next_Owner_ID = ${this.hmisSyncController.controlOwnerSequenceId}`, { type: hmisDB.sequelize.QueryTypes.UPDATE, transaction })
                }
            }

            const cashReceiptPaymentData = await this.hmisSyncController.syncAgreementPayments(false, this.addendumId, transaction, onePortalTransaction)
            // await hmisDB.sequelize.query(`UPDATE Sequence SET Next_ID = ${this.sequenceId}`, { type: hmisDB.sequelize.QueryTypes.UPDATE, transaction })
            await Promise.all(cashReceiptPaymentData.map(async data => {
                await this.hmisSyncController.updateCashReceiptId(data, onePortalTransaction)
            }))
            // await transaction.commit()
            // await onePortalTransaction.commit()
            return { saleId: this.salesId, sequenceId: this.hmisSyncController.sequenceId }
        } catch (error) {
            logger.error(error)
            // await transaction.rollback()
            // await onePortalTransaction.rollback()
            throw error
        }
    }

    /**
     * This method syncs the items of an addendum in the sales item table in HMIS
     * @param {*} transaction
     */
    async syncAddendumSalesItem (transaction) {
        try {
            const ApprovalsController = require('../../../controllers/refactorControllers/adjustmentController/approvalsController')
            let agreementItems = []
            // Fetching all the agreement items for the agreementId and syncType
            let agreementCurrentItems = await this.hmisSyncController.getAgreementItems(this.syncType)

            let agreementItemCheck = agreementCurrentItems.every((item) => item.type === 'AgreementTax')
            // Setting the agreementItems array
            if (!agreementItemCheck) {
                await Promise.all(agreementCurrentItems.map(async (item) => {
                    if (item.guaranteedItem && item.guaranteedItem === 2021) {
                        let newGuranteedItem = 2
                        let cemeteryGuaranteedItemQuery = `
                            SELECT COUNT(Item_Cd) AS trustItemCount
                            FROM (
                                SELECT i.Item_Cd,i.Descr,
                                CASE
                                    WHEN ifund.Fund_Item_Cd IS null THEN ifundc.Fund_Item_Cd
                                    ELSE ifund.Fund_Item_Cd
                                END as fundInfo from item i
                                LEFT OUTER JOIN Item_Fund ifund ON i.Item_Cd =ifund.Item_Cd
                                LEFT OUTER JOIN Item_Fund ifundC ON i.Parent_Item_Cd =ifundC.Item_Cd
                                WHERE Active =1
                            ) info
                            where fundInfo ='CFSPNF00 ' AND Item_Cd =:productItemCode
                        `
                        let cemeteryGuaranteedItem = await hmisDB.sequelize.query(cemeteryGuaranteedItemQuery, {
                            type: hmisDB.sequelize.QueryTypes.SELECT,
                            replacements: {
                                productItemCode: item.productItemCode
                            }
                        })

                        if (cemeteryGuaranteedItem.length && cemeteryGuaranteedItem[0].trustItemCount && cemeteryGuaranteedItem[0].trustItemCount > 0) newGuranteedItem = 1
                        item['guaranteedItem'] = newGuranteedItem
                    }
                    // Splitting the multiple quantity items of cemetery into separate items of quantity 1
                    if (item.isApprovalNeeded === 0 || (item.isApprovalNeeded === 1 && item.reviewedBy && ((item.reviewedBy === ApprovalsController.ApprovalStatus['Approved']) || (item.reviewedBy === ApprovalsController.ApprovalStatus['AutoApproved'])))) {
                        if (this.syncType === 'Cemetery' && item.salesItemQuantitySold > 1) {
                            let totalQuantity = item.salesItemQuantitySold
                            for (let quantity = 0; quantity < totalQuantity; quantity++) {
                                item['salesItemQuantitySold'] = 1
                                agreementItems.push(item)
                            }
                        } else {
                            agreementItems.push(item)
                        }
                    }
                }))
            }
            // Fetching all the sales items for the sales
            let salesItems = await this.getSalesItem(this.salesId)

            // Finding the items which needs to be updated
            salesItems = await this.updateSalesItem(agreementItems, salesItems, transaction)
            // await this.updateSalesItem(agreementItems, salesItems, transaction)

            // Finding the items to be deleted
            await this.deleteSalesItem(agreementItems, salesItems, transaction)
            // Finding the items to be added
            await this.addSalesItems(agreementItems, salesItems, transaction)
            // await hmisDB.sequelize.query(`UPDATE Sequence SET Next_ID = ${this.sequenceId}`, { type: hmisDB.sequelize.QueryTypes.UPDATE, transaction })
        } catch (error) {
            logger.log(error)
            throw error
        }
    }

    /**
     * This method syncs the adjustment items of an addendum into the Sales_Adjustment table in HMIS
     * @param {number} salesId
     * @param {number} salesFinanceId
     * @param {*} transaction
     * @param {*} onePortalTransaction
     */
    async syncAddendumToSalesAdjustment (salesId, salesFinanceId, transaction, onePortalTransaction) {
        try {
            let adjustmentItems = []
            let salesAdjustmentModuleData = []
            let deletedAdjustmentItems = await this.hmisSyncController.getAgreementAdjustmentItems(true)
            let newAdjustmentItems = await this.hmisSyncController.getAgreementAdjustmentItems(false, true)
            adjustmentItems = [...deletedAdjustmentItems, ...newAdjustmentItems]

            await Promise.all(adjustmentItems.map(async (item) => {
                let agreementAdjustmentTransforemedData = await this.hmisSyncController.saleAdjustmentTableDataTransformation(item, salesId, salesFinanceId)
                salesAdjustmentModuleData.push(agreementAdjustmentTransforemedData)
            }))

            await Promise.all(salesAdjustmentModuleData.map(async (data) => {
                let agreementAdjustmentId = data.Agreement_Adjustment_Id
                let salesAdjustmentId = data.Sales_Adjustment_ID
                let deletedItem = Boolean(data.Deleted_Item)
                delete data.Agreement_Adjustment_Id
                delete data.Deleted_Item
                await this.hmisSyncController.syncToSalesAdjustment(data, transaction)
                await this.hmisSyncController.syncSalesAdjustmentIdToAgreementAdjustment(agreementAdjustmentId, salesAdjustmentId, deletedItem, onePortalTransaction)
            }))
        } catch (error) {
            logger.log(error)
            throw error
        }
    }

    /**
     * This method fetches the agreementId of the addendum
     */
    async getAgreementDetailsForAddendum () {
        try {
            // Get Agreement Details for the addendumId
            let agreementDetailsQuery = `
            SELECT * FROM Agreement
            WHERE Agreement.id = (
                SELECT agreementId FROM Addendum
                WHERE Addendum.id =:addendumId
            )`
            let agreementDetails = await models.sequelize.query(agreementDetailsQuery, {
                type: models.sequelize.QueryTypes.SELECT,
                replacements: {
                    addendumId: this.addendumId
                }
            })

            if (agreementDetails.length) {
                this.agreementId = agreementDetails[0].id
                this.contractNumber = agreementDetails[0].contractNumber
                this.syncType = agreementDetails[0].type === 1 ? 'Funeral' : 'Cemetery'
            } else {
                throw new Error('Invalid Addendum')
            }
            return agreementDetails
        } catch (error) {
            logger.log(error)
            throw error
        }
    }

    /**
     * This method fetches the salesId for the contractNumber from the HMIS DB
     * @param {string} contractNumber
     */
    async getSalesDetails (contractNumber) {
        try {
            let hmisDBName = hmisConfig[process.env.NODE_ENV].database
            // Get Agreement Details for the addendumId
            let salesDetailsQuery = `
            SELECT * FROM ${hmisDBName}.dbo.Sales
            WHERE ${hmisDBName}.dbo.Sales.Sales_Contract_Nbr =:contractNumber
            `
            let salesDetails = await hmisDB.sequelize.query(salesDetailsQuery, {
                type: hmisDB.sequelize.QueryTypes.SELECT,
                replacements: {
                    contractNumber
                }
            })

            if (salesDetails.length) this.salesId = salesDetails[0].Sales_ID
            return salesDetails
        } catch (error) {
            logger.log(error)
            throw error
        }
    }

    /**
     * This method fetches the sales items from the HMIS DB for the received sales id
     * @param {number} salesId
     */
    async getSalesItem (salesId) {
        try {
            // Get sales items for the received sales id
            let salesItemsQuery = `
            SELECT * FROM Sales_Item
            WHERE Sales_ID =:salesId
            AND Sales_Item_ID NOT IN (
                SELECT Sales_Item_ID FROM Sales_Item
                WHERE Sales_Item.Sales_ID =:salesId
                AND Sales_Price = 0
                AND Sales_Item_Qty_Sold = 0
            ) ORDER BY Sales_Item_ID
            `
            let salesItems = await hmisDB.sequelize.query(salesItemsQuery, {
                type: hmisDB.sequelize.QueryTypes.SELECT,
                replacements: {
                    salesId
                }
            })
            return salesItems
        } catch (error) {
            logger.log(error)
            throw error
        }
    }

    /**
     * This method deletes the sales item by comparing the current agreement items from the oneportal DB and sales items in the HMIS DB
     * @param {array} agreementItems
     * @param {array} receivedSalesItems
     * @param {*} transaction
     */
    async deleteSalesItem (agreementItems, receivedSalesItems, transaction) {
        try {
            let salesItems = [...receivedSalesItems] || []
            await Promise.all(agreementItems.map(async (agreementItem) => {
                let salesItemIndex = _.findIndex(salesItems, (salesItem) => {
                    if (this.syncType === 'Cemetery') {
                        return agreementItem.productItemCode && agreementItem.productItemCode.trim() === salesItem.Product_Item_Cd.trim() && (agreementItem.type === 'AgreementProperty' ? agreementItem.itemCdDesc.trim() === salesItem.Item_Cd_Desc.trim() : true)
                    } else {
                        return agreementItem.productItemCode && agreementItem.productItemCode.trim() === salesItem.Product_Item_Cd.trim() && (agreementItem.type === 'AgreementProperty' ? agreementItem.itemCdDesc.trim() === salesItem.Item_Cd_Desc.trim() : true) && agreementItem.salesItemQuantitySold === salesItem.Sales_Item_Qty_Sold
                    }
                })
                if (salesItemIndex !== -1) {
                    _.pullAt(salesItems, salesItemIndex)
                }
            }))
            await Promise.all(salesItems.map(async (salesItem) => {
                if (salesItem.Posted === 1) {
                    await hmisDB.sequelize.query(`
                        UPDATE Sales_Item
                        SET 
                        Sales_Price = 0,
                        Sales_Item_Qty_Sold = 0
                        WHERE Sales_Item.Sales_Item_ID =:salesItemId`,
                    {
                        replacements: {
                            salesItemId: salesItem.Sales_Item_ID
                        },
                        type: hmisDB.sequelize.QueryTypes.UPDATE,
                        transaction
                    })
                } else {
                    await hmisDB.sequelize.query(`
                        DELETE FROM Fund_Summary
                        WHERE Fund_Summary.Sales_Item_ID =:salesItemId`,
                    {
                        replacements: {
                            salesItemId: salesItem.Sales_Item_ID
                        },
                        type: hmisDB.sequelize.QueryTypes.DELETE,
                        transaction
                    })
                    await hmisDB.sequelize.query(`
                        DELETE FROM Sales_Item
                        WHERE Sales_Item.Sales_Item_ID =:salesItemId`,
                    {
                        replacements: {
                            salesItemId: salesItem.Sales_Item_ID
                        },
                        type: hmisDB.sequelize.QueryTypes.DELETE,
                        transaction
                    })
                }
            }))
        } catch (error) {
            logger.log(error)
            throw error
        }
    }

    /**
     * This method adds items into the sales item table into HMIS by comparing the current agreement items from the oneportal DB and sales items in the HMIS DB
     * @param {number} salesId
     * @param {array} receivedAgreementItems
     * @param {array} salesItems
     * @param {*} transaction
     */
    async addSalesItems (receivedAgreementItems, salesItems, transaction) {
        try {
            let saleItemsModuleData = []
            let agreementItems = [...receivedAgreementItems] || []
            await Promise.all(salesItems.map(async (salesItem) => {
                let agreementItemIndex = _.findIndex(agreementItems, (agreementItem) => agreementItem.productItemCode && agreementItem.productItemCode.trim() === salesItem.Product_Item_Cd.trim() && (agreementItem.type === 'AgreementProperty' ? agreementItem.itemCdDesc.trim() === salesItem.Item_Cd_Desc.trim() : true) && salesItem.Sales_Item_Qty_Sold === agreementItem.salesItemQuantitySold)
                if (agreementItemIndex !== -1) {
                    _.pullAt(agreementItems, agreementItemIndex)
                }
            }))
            await Promise.all(agreementItems.map(async (agreementItem) => {
                let transformedData = {}
                let saleItemsTransformedData = await this.hmisSyncController.saleItemsTableDataTransformation(agreementItem, this.salesId)
                transformedData['saleItemsTableData'] = saleItemsTransformedData
                saleItemsModuleData.push(transformedData)
            }))
            await Promise.all(saleItemsModuleData.map(async (data) => {
                // Checking if the item code generated from the one portal DB exists in the HMIS DB.
                let hmisCodeCheck = await this.hmisSyncController.hmisItemCodeCheck(data.saleItemsTableData.Product_Item_Cd)
                // Proceed with syncing if the item code exists in the HMIS DB, else log the item code with the message.
                await this.hmisSyncController.SyncToSalesItem(data.saleItemsTableData, hmisCodeCheck, transaction)
            }))
        } catch (error) {
            logger.log(error)
            throw error
        }
    }

    /**
     * This method updates the sales finance record changes due to the addendum sync
     * @param {*} transaction
     */
    async SyncAddendumToSalesFinance (transaction) {
        try {
            // let salesItemPostedDetails = await this.getSalesItemPostedDetails()
            let salesFinanceId = null
            let salesTableData = await this.hmisSyncController.salesTableDataTransformation(transaction)
            let sales = await this.getSalesDetails(this.contractNumber)

            // Creating a batch
            let activeStatus = 0 // As Sales_Finance Posted is always 1 while syncing a contract for the first time
            let batchTableTransformedData = await this.hmisSyncController.batchTableDataTransformation('Funeral', activeStatus, transaction)
            await this.hmisSyncController.syncToBatchTable(batchTableTransformedData, transaction)

            salesTableData['Sales_ID'] = sales[0].Sales_ID
            salesTableData['Batch_ID'] = batchTableTransformedData.Batch_ID

            // let salesItemPostedDetailsLength = _.get(salesItemPostedDetails, 'length', null)
            // if (salesItemPostedDetailsLength === 1) {

            let salesFinanceRecord = await hmisDB.sequelize.query(`
            SELECT TOP(1) Sales_Finance.*, Batch.Posted AS batchPosted
            FROM Sales_Finance 
            INNER JOIN Batch ON Batch.Batch_ID =  Sales_Finance.Batch_ID
            WHERE Sales_ID =:salesId 
            AND Txn_Type_Cd 
            NOT IN ('WITHDRAW') 
            ORDER BY Sales_Finance_ID DESC`, { replacements: { salesId: sales[0].Sales_ID }, type: hmisDB.sequelize.QueryTypes.SELECT })

            let salesFinanceBatchPosted = _.get(salesFinanceRecord[0], 'batchPosted', 1)

            if (salesFinanceRecord.length && salesFinanceBatchPosted === 0) {
                let salesFinanceData = await this.hmisSyncController.salesFinanceTableDataTransformation(salesTableData, 'UPDATE', 0, transaction)
                // Update the values of the sales finance record (purchase price, due, sales tax etc.) for the last not active sales finance record.
                // TODO: Populate the necessary information and make this a separate function
                await hmisDB.sequelize.query(`
                        UPDATE Sales_Finance
                        SET
                        Nbr_of_Pymts =:numberOfPayments,
                        Pymnt_Start_Dt =:paymentStartDate,
                        Next_Pymt_Dt =:nextPaymentDate,
                        Stment_Jan =:statementJan,
                        Stment_Feb =:statementFeb,
                        Stment_Mar =:statementMar,
                        Stment_Apr =:statementApr,
                        Stment_May =:statementMay,
                        Stment_Jun =:statementJun,
                        Stment_Jul =:statementJul,
                        Stment_Aug =:statementAug,
                        Stment_Sep =:statementSep,
                        Stment_Oct =:statementOct,
                        Stment_Nov =:statementNov,
                        Stment_Dec =:statementDec,
                        Purchase_Price =:purchasePrice,
                        Sales_Tax =:salesTax,
                        Down_Pymt =:downPayment,
                        Adjustments =:adjustments,
                        Balance_Due =:balanceDue,
                        Principle =:principle,
                        Pymt_Amt =:paymentAmount
                        WHERE Sales_Finance.Sales_Finance_ID =:salesFinanceId`,
                {
                    replacements: {
                        numberOfPayments: salesFinanceData.Nbr_of_Pymts,
                        paymentStartDate: salesFinanceData.Pymnt_Start_Dt,
                        nextPaymentDate: salesFinanceData.Next_Pymt_Dt,
                        statementJan: salesFinanceData.Stment_Jan,
                        statementFeb: salesFinanceData.Stment_Feb,
                        statementMar: salesFinanceData.Stment_Mar,
                        statementApr: salesFinanceData.Stment_Apr,
                        statementMay: salesFinanceData.Stment_May,
                        statementJun: salesFinanceData.Stment_Jun,
                        statementJul: salesFinanceData.Stment_Jul,
                        statementAug: salesFinanceData.Stment_Aug,
                        statementSep: salesFinanceData.Stment_Sep,
                        statementOct: salesFinanceData.Stment_Oct,
                        statementNov: salesFinanceData.Stment_Nov,
                        statementDec: salesFinanceData.Stment_Dec,
                        purchasePrice: salesFinanceData.Purchase_Price,
                        salesTax: salesFinanceData.Sales_Tax,
                        downPayment: salesFinanceData.Down_Pymt,
                        adjustments: salesFinanceData.Adjustments,
                        balanceDue: salesFinanceData.Balance_Due,
                        principle: salesFinanceData.Principle,
                        paymentAmount: salesFinanceData.Pymt_Amt,
                        salesFinanceId: salesFinanceRecord[0].Sales_Finance_ID
                    },
                    type: hmisDB.sequelize.QueryTypes.UPDATE,
                    transaction
                })
                salesFinanceId = salesFinanceRecord[0].Sales_Finance_ID
            } else {
                // Insert a new sales finance record with active as 0 with the new values
                let salesFinanceData = await this.hmisSyncController.salesFinanceTableDataTransformation(salesTableData, 'INSERT', 0, transaction)
                await this.hmisSyncController.syncToSalesFinance(salesFinanceData, transaction)
                salesFinanceId = salesFinanceData.Sales_Finance_ID
                // await this.hmisSyncController.insertToHMISTable('Sales_Finance', salesFinanceData, transaction)
            }
            // } else {
            //     if (salesItemPostedDetailsLength === 2) {
            //         logger.log('Incorrect POSTED status in sales item table')
            //         throw new Error('Incorrect POSTED status in sales item table')
            //     }
            // }
            // else if (salesItemPostedDetailsLength === 1 && salesItemPostedDetails[0].Posted === 1) {
            //     // Update the active state of the current active sales finance record into 0
            //     await hmisDB.sequelize.query(`
            //             UPDATE Sales_Finance
            //             SET
            //             Active = 0
            //             WHERE Sales_Finance.Sales_ID =:salesId
            //             AND Active = 1`,
            //     {
            //         replacements: {
            //             salesId: this.salesId
            //         },
            //         type: hmisDB.sequelize.QueryTypes.UPDATE,
            //         transaction
            //     })
            //     // Insert a new sales finance record with active as 1 with new values
            //     let salesFinanceData = await this.hmisSyncController.salesFinanceTransformation(salesTableData, 'INSERT', 1, transaction)
            //     await this.hmisSyncController.syncToSalesFinance(salesFinanceData, transaction)
            //     // await this.hmisSyncController.insertToHMISTable('Sales_Finance', salesFinanceData, transaction)
            // }
            return salesFinanceId
        } catch (error) {
            logger.log(error)
            throw error
        }
    }

    /**
     * This method fetches the sales finance id for the received active value
     * @param {number} activeValue
     */
    async getSalesFinanceId (activeValue) {
        try {
            let salesFinanceId = await hmisDB.sequelize.query(`
                    SELECT Sales_Finance_ID
                    FROM Sales_Finance
                    WHERE Active =:activeValue
                    AND Sales_Finance.Sales_ID =:salesId
                    AND Sales_Finance.Txn_Type_Cd NOT IN ('WITHDRAW')
                    ORDER BY Sales_Finance_ID DESC`,
            {
                replacements: {
                    salesId: this.salesId,
                    activeValue
                },
                type: hmisDB.sequelize.QueryTypes.SELECT
            })
            return salesFinanceId
        } catch (error) {
            logger.log(error)
            throw error
        }
    }

    /**
     * This method fetches the value of the posted status from the sales item table for a sales id
     */
    async getSalesItemPostedDetails () {
        try {
            let salesItemPostedDetailsQuery = `
            SELECT DISTINCT(Posted)
            FROM Sales_Item
            WHERE Sales_ID =:salesId`
            let salesItemPostedDetails = await hmisDB.sequelize.query(salesItemPostedDetailsQuery, {
                replacements: {
                    salesId: this.salesId
                },
                type: hmisDB.sequelize.QueryTypes.SELECT
            })
            return salesItemPostedDetails
        } catch (error) {
            logger.log(error)
            throw error
        }
    }
    /**
     * This method updates the sales item by comparing the current agreement items from the oneportal DB and sales items in the HMIS DB
     * @param {array} receivedAgreementItems
     * @param {array} receivedSalesItems
     * @param {*} transaction
     */
    async updateSalesItem (receivedAgreementItems, receivedSalesItems, transaction) {
        try {
            let updatedSalesItems = []
            let salesItems = [...receivedSalesItems]
            let agreementItems = [...receivedAgreementItems]
            receivedSalesItems.forEach((salesItem, index) => {
                let agreementItemIndex = _.findIndex(agreementItems, (agreementItem) => agreementItem.productItemCode && agreementItem.productItemCode.trim() === salesItem.Product_Item_Cd.trim() && (agreementItem.type === 'AgreementProperty' ? agreementItem.itemCdDesc.trim() === salesItem.Item_Cd_Desc.trim() : true) && salesItem.Sales_Item_Qty_Sold !== agreementItem.salesItemQuantitySold)
                if (agreementItemIndex !== -1) {
                    updatedSalesItems.push({ ...agreementItems[agreementItemIndex], Sales_Item_ID: salesItem.Sales_Item_ID })
                    salesItems[index].Sales_Price = agreementItems[agreementItemIndex].salesPrice
                    salesItems[index].Sales_Item_Qty_Sold = agreementItems[agreementItemIndex].salesItemQuantitySold
                    _.pullAt(agreementItems, agreementItemIndex)
                }
            })
            await Promise.all(updatedSalesItems.map(async (salesItem) => {
                await hmisDB.sequelize.query(`
                    UPDATE Sales_Item
                    SET
                    Sales_Price =:salesPrice,
                    Sales_Item_Qty_Sold =:salesItemQuantitySold
                    WHERE Sales_Item.Sales_Item_ID =:salesItemId`,
                {
                    replacements: {
                        salesItemId: salesItem.Sales_Item_ID,
                        salesPrice: salesItem.salesPrice,
                        salesItemQuantitySold: salesItem.salesItemQuantitySold
                    },
                    type: hmisDB.sequelize.QueryTypes.UPDATE,
                    transaction
                })
            }))
            return salesItems
        } catch (error) {
            logger.log(error)
            throw error
        }
    }
}

module.exports = HMISAddendumSyncController
