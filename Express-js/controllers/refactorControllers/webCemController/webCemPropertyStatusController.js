// const Op = require('sequelize').Op
const models = require('../../../models')
const hmisDB = require('../../../services/hmis/hmisConnection')
const logger = require('../../../lib/logger')
const Email = require('../../../lib/Emailer/core')
const { propertyStatusFromRdmsToOp } = require('./constants')
class WebCemPropertyStatusController {
    constructor (id) {
        this.personId = id
    }
    static async updatePropertyStatus (lotSellUnitId, reqBody) {
        let onePortalTransaction = await models.sequelize.transaction()
        let hmisTransaction = await hmisDB.sequelize.transaction()
        try {
            let property
            const opStatus = 'U'
            const oldRdmsStatus = reqBody.oldPropertyStatus
            const newRdmsStatus = reqBody.newPropertyStatus
            const oldPropertyStatus = propertyStatusFromRdmsToOp[reqBody.oldPropertyStatus]
            const newPropertyStatus = propertyStatusFromRdmsToOp[reqBody.newPropertyStatus]
            if (!oldPropertyStatus || !newPropertyStatus) {
                throw new Error('INVALID_STATUS')
            }
            property = await this.getProperyDetail(lotSellUnitId)
            if (!property) {
                const propData = await this.getProperyDetailFromHmis(lotSellUnitId)
                if (!propData.length) {
                    throw new Error('Property is not available in both OP and HMIS')
                }
                if (oldPropertyStatus !== opStatus && newPropertyStatus !== opStatus) {
                    // update in hmis
                    await this.updateStatusInHmis(lotSellUnitId, newPropertyStatus, hmisTransaction)
                    // sending mail
                    await this.sendMail('template2', propData[0].Location, lotSellUnitId, oldRdmsStatus, newRdmsStatus)
                    await hmisTransaction.commit()
                } else if (oldPropertyStatus !== opStatus && newPropertyStatus === opStatus) {
                    // update in hmis
                    await this.updateStatusInHmis(lotSellUnitId, newPropertyStatus, hmisTransaction)
                    await hmisTransaction.commit()
                    // import to OP
                    await this.importFromHmis(lotSellUnitId, onePortalTransaction)
                    await this.updateStatusInOp(lotSellUnitId, newPropertyStatus, onePortalTransaction)
                    await onePortalTransaction.commit()
                    // sending mail
                    await this.sendMail('template3', propData[0].Location, lotSellUnitId, oldRdmsStatus, newRdmsStatus)
                }
            } else {
                // update in hmis
                await this.updateStatusInHmis(lotSellUnitId, newPropertyStatus, hmisTransaction)
                await hmisTransaction.commit()
                // update in OP
                await this.updateStatusInOp(lotSellUnitId, newPropertyStatus, onePortalTransaction)
                await onePortalTransaction.commit()
                // sending mail
                await this.sendMail('template1', property.name, lotSellUnitId, oldRdmsStatus, newRdmsStatus)
            }
        } catch (error) {
            await hmisTransaction.rollback()
            await onePortalTransaction.rollback()
            throw error
        }
    }
    static async getProperyDetailFromHmis (lotSellUnitId) {
        const query = `Select Location, Lot_Sell_Unit_ID FROM Lot_Sell_Unit where Lot_Sell_Unit_ID = ${lotSellUnitId}`
        const result = await hmisDB.sequelize.query(query, { type: hmisDB.sequelize.QueryTypes.SELECT })
        return result
    }
    static async importFromHmis (lotSellUnitId, onePortalTransaction) {
        try {
            const query = `INSERT INTO Property (
            name, 
            price, 
            pnDiscountValue, 
            preDevelopedDiscountValue, 
            ecfAmount,
            total, 
            propertyItemCode,
            lotSellUnitId,
            propertyGardenId,
            propertyTypeCodeId, 
            developedDt,
            preDeveloped,
            status,
            createdAt,
            updatedAt,
            pnPropertyDiscount)  
            SELECT  
            Location,
            Prpty_Price_1,
            Prpty_Price_2,
            Prpty_Price_3,
            ECF_Amount,
            total,
            Property_Item_Cd,
            Lot_Sell_Unit_ID,
            pg.id,
            ptc.id,
            Developed_Dt,
            PreDeveloped,
            LSU_Status_Cd,
            CURRENT_TIMESTAMP,
            CURRENT_TIMESTAMP,
            pnPropertyDiscount
            FROM OPENQUERY([HQS-SQL02], 'SELECT
            ls.Location,
            ls.Prpty_Price_1,
            ls.Prpty_Price_2,
            ls.Prpty_Price_3,
            ls.ECF_Amount,
            (ls.Prpty_Price_1 + ls.ECF_Amount) AS total,
            (pk.Component_Product_Item_Cd) Property_Item_Cd,
            ls.Lot_Sell_Unit_ID,
            ls.Developed_Dt,
            ls.PreDeveloped,
            lot.Section_Cd As Section_Cd,
            ls.Property_Type_Cd,
            LSU_Status_Cd,
            ls.Prpty_Price_4 as pnPropertyDiscount
            FROM         cemportal.dbo.vw_PropertyType AS pt 
            INNER JOIN  [HQS-SQL02].h_000.dbo.Lot_Sell_Unit AS ls ON pt.Property_Type_Cd = ls.Property_Type_Cd 
            INNER JOIN  (SELECT     Lot_Sell_Unit_ID, Section_Cd
            FROM          [HQS-SQL02].h_000.dbo.Lot_Space
            GROUP BY Lot_Sell_Unit_ID, Section_Cd) AS lot ON ls.Lot_Sell_Unit_ID = lot.Lot_Sell_Unit_ID 
            INNER JOIN  [HQS-SQL02].h_000.dbo.Section AS s ON lot.Section_Cd = s.Section_Cd 
            left outer join [HQS-SQL02].h_000.dbo.Product_Kit pk on ls.Property_Item_Cd=pk.Product_Item_Cd
            left outer join [HQS-SQL02].h_000.dbo.Product_Kit ek on ls.ECF_Item_Cd=ek.Product_Item_Cd 
            WHERE    
            Sectn_Cod_Desc not like ''%Do n%''
            and ls.Lot_Sell_Unit_ID=${lotSellUnitId}
            ') props INNER JOIN PropertyGarden pg ON pg.code=props.Section_Cd 
            INNER JOIN PropertyTypeCode ptc ON props.Property_Type_Cd = ptc.code`
            await models.sequelize.query(query, { type: models.sequelize.QueryTypes.INSERT, transaction: onePortalTransaction })
        } catch (error) {
            logger.info('Unable to import properties from HMIS')
            return {
                message: 'Unable to fetch property from HMIS',
                error: error
            }
        }
    }
    static async getProperyDetail (lotSellUnitId) {
        const property = await models.Property.findOne({
            where: {
                lotSellUnitId
            }
        })
        return property
    }
    static async updateStatusInOp (lotSellUnitId, status, onePortalTransaction) {
        const updatedQuery = `UPDATE Property SET status = '${status}', updatedAt=CURRENT_TIMESTAMP WHERE lotSellUnitId = ${lotSellUnitId}`
        await models.sequelize.query(updatedQuery, { type: models.sequelize.QueryTypes.UPDATE, transaction: onePortalTransaction })
    }
    static async updateStatusInHmis (lotSellUnitId, status, hmisTransaction) {
        const hmisQuery = `UPDATE Lot_Sell_Unit SET LSU_Status_Cd = '${status}' where Lot_Sell_Unit_ID = ${lotSellUnitId}`
        await hmisDB.sequelize.query(hmisQuery, { type: hmisDB.sequelize.QueryTypes.UPDATE, transaction: hmisTransaction })
    }
    static async sendMail (caseStatus, propertyName, lotSellUnitId, oldStatus, newStatus) {
        try {
            let emailStructure, toMail, cc
            if (process.env.NODE_ENV === 'production') {
                toMail = 'aauyeung@gmail.com'
                cc = [
                    'htran@gmail.com',
                    'fsoto@gmail.com'
                ]
            } else {
                toMail = 'gmail@gmail.com'
                cc = ['s@gmail.com', 'v@gmail.com']
            }
            switch (caseStatus) {
            case 'template1':
                emailStructure = {
                    to: toMail,
                    subject: `[SUCCESS] Property status change in RDMS, OnePortal & HMIS`,
                    body: `Hi All,\nThe status of [${propertyName}] having lot sell unit id as [${lotSellUnitId}] has been successfully changed in RDMS, OnePortal, and HMIS application from [${oldStatus}] to [${newStatus}].\n-One portal`
                }
                break
            case 'template2':
                emailStructure = {
                    to: toMail,
                    subject: `[SUCCESS] Property status change in RDMS & HMIS`,
                    body: `Hi All,\nThe status of [${propertyName}] having lot sell unit id as [${lotSellUnitId}] has been successfully changed in RDMS and HMIS application from [${oldStatus}] to [${newStatus}].\nNo change required in OnePortal as property is not present.\n-One portal`
                }
                break
            case 'template3':
                emailStructure = {
                    to: toMail,
                    subject: `[SUCCESS] Property status change in RDMS & HMIS and property migrated to OnePortal`,
                    body: `Hi All,\nThe status of [${propertyName}] having lot sell unit id as [${lotSellUnitId}] has been successfully changed in RDMS and HMIS application from [${oldStatus}] to [${newStatus}].\nAlso, the above property is successfully migrated to OnePortal because of “For Sale” status.\n-One portal`
                }
                break
            default:
                emailStructure = null
            }

            if (emailStructure) {
                Email.sendMail(emailStructure.to, emailStructure.subject, emailStructure.body, null, null, cc)
            } else {
                throw new Error('Email template not found')
            }
        } catch (e) {
            logger.error(e)
            throw e
        }
    }
}
module.exports = WebCemPropertyStatusController
