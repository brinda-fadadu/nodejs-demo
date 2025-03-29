const _ = require('lodash')
const moment = require('moment')
const Op = require('sequelize').Op
const logger = require('../../../lib/logger')
const models = require('../../../models')
const model = require('../../../models/index')
const ApprovalsController = require('./approvalsController')
const seedValues = require('../../../config/seed')
let adjustmentType = seedValues.seed.AdjustmentType
const { getFullNameOfPerson, upsert, getPropertyDiscounts } = require('../utils')
const { propertyDiscounts } = require('../../../utils/constants')

class AdjustmentsController {
    /**
     *
     * @param {*} query  query includes code, id of Adjustment
     * @param {*} includeOptions  array of included models
     */
    _getAdjustment (query, includeOptions, transaction) {
        query.deletedAt = null
        query.deletedBy = null
        return models.Adjustment.findOne({ where: query, include: includeOptions, transaction })
    }

    /**
     *
     * @param {*} updateParams values needs to be update
     * @param {*} queryParams where query includes deletedAt and (id or code)
     */
    async _updateAdjustment (updateParams, queryParams) {
        const result = await models.Adjustment.update(updateParams, {
            where: queryParams
        })
        return result
    }

    /**
     *
     * @param {*} agreementSections
     */
    // TODO: Amar needs to check and do necessary changes in below 2 methods
    async _getAdjustmentDiscountQuery (agreementSections, addendumId = null, isContractLevelPromoCode, data) {
        let { discountAppliedLevel, agreementAdjustmentId, adjustmentId, adjustmentTitle } = data
        let propertyWhere1, propertyWhere2, propertyWhere3, propertyWhere4, merchandiseWhere1, merchandiseWhere2, servicesWhere1, servicesWhere2, cashAdvancedItemWhere1, cashAdvancedItemWhere2, packageWhere1, packageWhere2, memorialWhere1, memorialWhere2, combinationPromoCodeQueryWhere
        let propertyPreApplyDiscounts = [...propertyDiscounts]
        let isPIFDiscount = false
        let isVeteranDiscount = false
        if (adjustmentId === 4 && adjustmentTitle === 'Paid in Full Discount') {
            propertyPreApplyDiscounts.splice(propertyPreApplyDiscounts.indexOf('Paid in Full Discount'), 1)
            isPIFDiscount = true
        }
        if (adjustmentId === 1 && adjustmentTitle === 'Veteran Discount') {
            propertyPreApplyDiscounts.splice(propertyPreApplyDiscounts.indexOf('Veteran Discount'), 1)
            isVeteranDiscount = true
        }
        if (adjustmentTitle !== 'Paid in Full Discount' && adjustmentTitle !== 'Veteran Discount') {
            propertyPreApplyDiscounts.splice(propertyPreApplyDiscounts.indexOf('Paid in Full Discount'), 1)
        }
        let propertyPreApplyDiscountsStr = getPropertyDiscounts(propertyPreApplyDiscounts)
        let propertyDiscountsLikeStrArr = []
        propertyDiscounts.map((item) => {
            return propertyDiscountsLikeStrArr.push(`title LIKE '%${item}%'`)
        }, 0)
        if ((discountAppliedLevel === 'Addendum') || (addendumId && !discountAppliedLevel)) {
            propertyWhere1 = `ap.addendumId=${addendumId}`
            propertyWhere2 = `apar.addendumId=${addendumId}`
            propertyWhere3 = `aa.addendumId=${addendumId}`
            propertyWhere4 = `AD.addendumId=${addendumId}`
            servicesWhere1 = `ai.addendumId=${addendumId}`
            servicesWhere2 = `aa.addendumId=${addendumId}`
            merchandiseWhere1 = `ai.addendumId=${addendumId}`
            merchandiseWhere2 = `aa.addendumId=${addendumId}`
            cashAdvancedItemWhere1 = `aci.addendumId=${addendumId}`
            cashAdvancedItemWhere2 = `aa.addendumId=${addendumId}`
            packageWhere1 = `ap.addendumId=${addendumId}`
            packageWhere2 = `aa.addendumId=${addendumId}`
            memorialWhere1 = `am.addendumId=${addendumId}`
            memorialWhere2 = `ami.addendumId=${addendumId}`
            combinationPromoCodeQueryWhere = `AgreementAdjustment.addendumId=${addendumId}`
        } else if ((discountAppliedLevel === 'Agreement') || (!addendumId && !discountAppliedLevel)) {
            propertyWhere1 = `ap.addendumId IS NULL`
            propertyWhere2 = `apar.addendumId IS NULL`
            propertyWhere3 = `aa.addendumId IS NULL`
            propertyWhere4 = `AD.addendumId IS NULL`
            servicesWhere1 = `ai.addendumId IS NULL`
            servicesWhere2 = `aa.addendumId IS NULL`
            merchandiseWhere1 = `ai.addendumId IS NULL`
            merchandiseWhere2 = `aa.addendumId IS NULL`
            cashAdvancedItemWhere1 = `aci.addendumId IS NULL`
            cashAdvancedItemWhere2 = `aa.addendumId IS NULL`
            packageWhere1 = `ap.addendumId IS NULL`
            packageWhere2 = `aa.addendumId IS NULL`
            memorialWhere1 = `am.addendumId IS NULL`
            memorialWhere2 = `ami.addendumId IS NULL`
            combinationPromoCodeQueryWhere = `AgreementAdjustment.addendumId IS NULL`
        }
        let compareCondition = isContractLevelPromoCode || isVeteranDiscount || isPIFDiscount ? `!=` : `<`
        let agreementAdjustmentIdCond = agreementAdjustmentId ? `AND aa.id ${compareCondition} ${agreementAdjustmentId}` : ``
        let percentageCond = !isContractLevelPromoCode ? '* :percentage / 100' : ''
        let includeECF = isContractLevelPromoCode ? '+ aip.totalECFAmount' : ''
        let queryToGetCombinationPromoCodes = `AND aa.id NOT IN (SELECT AgreementAdjustment.id FROM AgreementAdjustment
                    INNER JOIN Adjustment ON Adjustment.id = AgreementAdjustment.adjustmentId
                    INNER JOIN AdjustmentAgreementSection ON Adjustment.id = AdjustmentAgreementSection.adjustmentId
                    INNER JOIN AgreementSection ON AgreementSection.id = AdjustmentAgreementSection.agreementSectionId
                    WHERE AgreementAdjustment.agreementId = :agreementId
                    AND AgreementAdjustment.deletedAt IS NULL 
                    AND AgreementAdjustment.deletedBy IS NULL
                    AND ${combinationPromoCodeQueryWhere}
                    GROUP BY AgreementAdjustment.id HAVING COUNT(*) > 1)`
        const queries = {
            'Merchandise': `SELECT (
            (SELECT 
                    ((ISNULL(SUM(aip.totalPrice), 0) ${percentageCond})) AS totalMerchandiseAmount FROM 
                ItemType it INNER JOIN ItemCategory ic ON ic.itemTypeId=it.id 
                INNER JOIN Item i ON i.itemCategoryId=ic.id 
                INNER JOIN LocationItem  li on li.itemId=i.id 
                INNER JOIN AgreementLocationItem ai ON ai.locationItemId=li.id
                INNER JOIN AgreementItemPrice aip ON aip.id = ai.agreementItemPriceId
                WHERE it.name='Merchandises' AND ai.agreementId=:agreementId AND ai.deletedAt IS NULL AND ai.deletedBy IS NULL AND ${merchandiseWhere1})
            -
            (SELECT ((ISNULL(SUM(aa.amount),0) ${percentageCond})) AS totalMerchandiseDiscount FROM AgreementAdjustment aa
            INNER JOIN Adjustment a ON a.id = aa.adjustmentId
            INNER JOIN AdjustmentAgreementSection aas ON a.id = aas.adjustmentId
            INNER JOIN AgreementSection ags ON ags.id = aas.agreementSectionId
            WHERE aa.agreementId = :agreementId
            AND aa.deletedAt IS NULL 
            AND aa.deletedBy IS NULL
            AND ags.id = (SELECT id FROM AgreementSection WHERE area = 'Merchandise') ${agreementAdjustmentIdCond} AND ${merchandiseWhere2} ${queryToGetCombinationPromoCodes})
            ) totalDiscount`,
            'Services': `SELECT (
            (SELECT 
                                ((ISNULL(SUM(aip.totalPrice), 0) ${percentageCond})) AS totalServiceAmount FROM 
                                ItemType it INNER JOIN ItemCategory ic ON ic.itemTypeId=it.id 
                                INNER JOIN Item i ON i.itemCategoryId=ic.id 
                                INNER JOIN LocationItem  li on li.itemId=i.id 
                                INNER JOIN AgreementLocationItem ai ON ai.locationItemId=li.id 
                                INNER JOIN AgreementItemPrice aip ON aip.id = ai.agreementItemPriceId 
                                WHERE it.name='Services' AND ai.agreementId=:agreementId AND ai.deletedAt IS NULL AND ai.deletedBy IS NULL AND ${servicesWhere1})
            -
            (SELECT ((ISNULL(SUM(aa.amount),0) ${percentageCond})) AS totalServiceDiscount FROM AgreementAdjustment aa
            INNER JOIN Adjustment a ON a.id = aa.adjustmentId
            INNER JOIN AdjustmentAgreementSection aas ON a.id = aas.adjustmentId
            INNER JOIN AgreementSection ags ON ags.id = aas.agreementSectionId
            WHERE aa.agreementId = :agreementId
            AND aa.deletedAt IS NULL 
            AND aa.deletedBy IS NULL
            AND ags.id = (SELECT id FROM AgreementSection WHERE area = 'Services') ${agreementAdjustmentIdCond} AND ${servicesWhere2} ${queryToGetCombinationPromoCodes})
            ) totalDiscount`,
            'CashAdvancedItem': `SELECT (
            (SELECT ((ISNULL(SUM(aip.totalPrice),0) ${percentageCond})) AS totalCAIAmount FROM AgreementCashAdvancedItem aci INNER JOIN AgreementItemPrice aip ON aip.id=aci.agreementItemPriceId WHERE aci.agreementId=:agreementId AND aci.deletedAt IS NULL AND aci.deletedBy IS NULL AND ${cashAdvancedItemWhere1})
            -
            (SELECT ((ISNULL(SUM(aa.amount),0) ${percentageCond})) AS totalCAIDiscount FROM AgreementAdjustment aa
            INNER JOIN Adjustment a ON a.id = aa.adjustmentId
            INNER JOIN AdjustmentAgreementSection aas ON a.id = aas.adjustmentId
            INNER JOIN AgreementSection ags ON ags.id = aas.agreementSectionId
            WHERE aa.agreementId = :agreementId
            AND aa.deletedAt IS NULL 
            AND aa.deletedBy IS NULL
            AND ags.id = (SELECT id FROM AgreementSection WHERE area = 'CashAdvancedItem') ${agreementAdjustmentIdCond} AND ${cashAdvancedItemWhere2} ${queryToGetCombinationPromoCodes})
            ) totalDiscount`,
            'Property': `SELECT (
            (SELECT ((ISNULL(SUM(A.totalPrice),0) ${percentageCond})) AS totalPropertyAmount FROM(SELECT ISNULL(SUM(aip.totalPrice ${includeECF}), 0) AS totalPrice FROM AgreementProperty ap
                    INNER JOIN AgreementItemPrice aip ON aip.id = ap.agreementItemPriceId
                    WHERE ap.agreementId= :agreementId
                    AND ${propertyWhere1}
                    AND ap.reservationStatus= 'confirmed' 
                    AND ap.deletedAt IS NULL AND ap.deletedBy IS NULL GROUP BY ap.agreementId 
                        ${!isPIFDiscount ? `UNION 
                        SELECT ISNULL(SUM(aip.totalPrice), 0) AS totalPrice FROM AgreementPropertyAdditionalRight apar
                    INNER JOIN AgreementItemPrice aip ON aip.id = apar.agreementItemPriceId
                WHERE apar.agreementId= :agreementId AND ${propertyWhere2}
                AND apar.deletedAt IS NULL AND apar.deletedBy IS NULL` : ``}
                ) AS A)
            -
            (SELECT ((ISNULL(SUM(AD.amount),0) ${percentageCond})) AS totalPNPreApplyDiscounts FROM AgreementAdjustment AD
            INNER JOIN Adjustment A ON AD.AdjustmentId=A.id WHERE 
            A.title IN (${propertyPreApplyDiscountsStr}) 
            AND AD.deletedAt IS NULL AND AD.deletedBy IS NULL AND AD.agreementId= :agreementId AND ${propertyWhere4})
            -
            (SELECT ((ISNULL(SUM(aa.amount),0) ${percentageCond})) AS totalPropertyDiscount FROM AgreementAdjustment aa
            INNER JOIN Adjustment a ON a.id = aa.adjustmentId
            INNER JOIN AdjustmentAgreementSection aas ON a.id = aas.adjustmentId
            INNER JOIN AgreementSection ags ON ags.id = aas.agreementSectionId
            WHERE aa.agreementId = :agreementId
            AND aa.adjustmentId NOT IN (SELECT id FROM Adjustment WHERE ${propertyDiscountsLikeStrArr.join(' OR ')})
            AND aa.deletedAt IS NULL 
            AND aa.deletedBy IS NULL
            AND ags.id = (SELECT id FROM AgreementSection WHERE area = 'Property') ${agreementAdjustmentIdCond} AND ${propertyWhere3} ${queryToGetCombinationPromoCodes})
            ) totalDiscount`,
            'Package': `SELECT (
            (SELECT ( (ISNULL(SUM(aip.totalPrice),0) ${percentageCond})) AS totalPackageAmount FROM AgreementPackage ap INNER JOIN AgreementItemPrice aip ON aip.id=ap.agreementItemPriceId WHERE ap.agreementId=:agreementId AND ap.deletedAt IS NULL AND ap.deletedBy IS NULL AND ${packageWhere1})
            -
            (SELECT ((ISNULL(SUM(aa.amount),0) ${percentageCond})) AS totalPackageDiscount FROM AgreementAdjustment aa
            INNER JOIN Adjustment a ON a.id = aa.adjustmentId
            INNER JOIN AdjustmentAgreementSection aas ON a.id = aas.adjustmentId
            INNER JOIN AgreementSection ags ON ags.id = aas.agreementSectionId
            WHERE aa.agreementId = :agreementId
            AND aa.deletedAt IS NULL 
            AND aa.deletedBy IS NULL
            AND ags.id = (SELECT id FROM AgreementSection WHERE area = 'Package') ${agreementAdjustmentIdCond} AND ${packageWhere2} ${queryToGetCombinationPromoCodes})
            ) totalDiscount`,
            'Memorial': `SELECT ((ISNULL(SUM(aip.totalPrice),0) ${percentageCond})) AS totalDiscount FROM AgreementMemorial am INNER JOIN AgreementMemorialItem ami ON am.id=ami.agreementMemorialId INNER JOIN AgreementItemPrice aip ON aip.id = ami.agreementItemPriceId WHERE am.agreementId= :agreementId AND ${memorialWhere1}
            AND am.deletedAt IS NULL AND am.deletedBy IS NULL AND ami.agreementId= :agreementId AND ${memorialWhere2}`
        }
        let agreementSectionQueries = []
        agreementSections.forEach(ele => {
            agreementSectionQueries.push(queries[ele])
        })
        agreementSectionQueries = agreementSectionQueries.filter((data) => data)
        agreementSectionQueries = agreementSectionQueries.join(` UNION ALL `)
        let totalDiscountQuery = `SELECT SUM(totalDiscount) AS totalDiscount FROM ( ${agreementSectionQueries} ) discount`
        return totalDiscountQuery
    }

    /**
     *
     * @param {*} data req.body don't have amount, then we need to caluclate amount from database(for veteran discount, paidinfull discount)
     * @param {*} transaction
     */
    async _calculateDiscountAmount (data, transaction) {
        let adjustment = await models.Adjustment.findOne({
            where: { id: data.adjustmentId },
            transaction
        })
        let agreementSections = await models.AdjustmentAgreementSection.findAll({
            where: {
                adjustmentId: data.adjustmentId
            },
            attributes: [],
            include: [{
                model: models.AgreementSection,
                attributes: ['area'],
                as: 'agreementSection'
            }],
            transaction
        })
        agreementSections = JSON.parse(JSON.stringify(agreementSections))
        let orgAgreementSections = JSON.parse(JSON.stringify(agreementSections))
        agreementSections = agreementSections.map(ele => {
            return ele.agreementSection.area
        })

        let allAgreementSections = await models.AgreementSection.findAll({
            where: {
                area: {
                    [Op.ne]: 'Contract'
                }
            },
            transaction
        })
        let isContractLevelPromoCode = agreementSections.indexOf('Contract') > -1
        if (isContractLevelPromoCode) {
            agreementSections = allAgreementSections.map(ele => {
                return ele.area
            })
            agreementSections.push('Memorial')
        }

        const addendumId = data.addendumId || null
        const isDollarDiscount = data.discountUnit === '$'
        // Applying 100% as discountValue for a $ discount promo code
        const discountPercentage = isDollarDiscount ? 100 : adjustment.discountValue
        let query, result
        query = await this._getAdjustmentDiscountQuery(agreementSections, addendumId, isContractLevelPromoCode, data)
        result = await models.sequelize.query(query, {
            replacements: {
                agreementId: data.agreementId,
                percentage: discountPercentage
            },
            log: console.log,
            type: models.sequelize.QueryTypes.SELECT,
            transaction
        })
        let discountValue
        if (!isContractLevelPromoCode) {
            if (result && result[0]) {
                discountValue = result[0].totalDiscount
                return discountValue > 0 ? discountValue : 0
            }
        } else {
            let combinationPromoCodeQueryWhere
            if ((data.discountAppliedLevel === 'Addendum') || (addendumId && !data.discountAppliedLevel)) {
                combinationPromoCodeQueryWhere = `aa.addendumId=${addendumId}`
            } else if ((data.discountAppliedLevel === 'Agreement') || (!addendumId && !data.discountAppliedLevel)) {
                combinationPromoCodeQueryWhere = `aa.addendumId IS NULL`
            }
            // This query will return totalDiscount for combination promo codes which does not include "Contract" as combination
            let includeCondition = isContractLevelPromoCode ? '<' : '!='
            let agreementAdjustmentIdCond = data.agreementAdjustmentId ? `AND aa.id ${includeCondition} ${data.agreementAdjustmentId}` : ``
            let includeSubQuery = orgAgreementSections.length < 7 ? `(SELECT aa.id FROM AgreementAdjustment aa
            INNER JOIN Adjustment a ON a.id = aa.adjustmentId
            INNER JOIN AdjustmentAgreementSection aas ON a.id = aas.adjustmentId
            INNER JOIN AgreementSection ags ON ags.id = aas.agreementSectionId
            WHERE aa.agreementId = :agreementId
            AND aa.deletedAt IS NULL 
            AND aa.deletedBy IS NULL
            AND ${combinationPromoCodeQueryWhere}
            GROUP BY aa.id HAVING COUNT(*) > 1) UNION (SELECT aa1.id FROM AgreementAdjustment aa1
            INNER JOIN Adjustment a1 ON a1.id = aa1.adjustmentId
            INNER JOIN AdjustmentAgreementSection aas1 ON a1.id = aas1.adjustmentId
            INNER JOIN AgreementSection ags1 ON ags1.id = aas1.agreementSectionId
            WHERE aa1.agreementId = :agreementId
            AND aa1.deletedAt IS NULL 
            AND aa1.deletedBy IS NULL
            AND ${combinationPromoCodeQueryWhere.replace('aa.', 'aa1.')}
            AND ags1.id = 1
            GROUP BY aa1.id HAVING COUNT(*) = 1)` : 0
            let combinationPromoCodeQuery = `SELECT ((ISNULL(SUM(Adj.amount),0))) AS totalDiscount FROM (
            SELECT DISTINCT aa.amount FROM AgreementAdjustment aa
            INNER JOIN Adjustment a ON a.id = aa.adjustmentId
            INNER JOIN AdjustmentAgreementSection aas ON a.id = aas.adjustmentId
            INNER JOIN AgreementSection ags ON ags.id = aas.agreementSectionId
            WHERE aa.agreementId = :agreementId
            AND aa.deletedAt IS NULL 
            AND aa.deletedBy IS NULL
            ${agreementAdjustmentIdCond}
            AND ${combinationPromoCodeQueryWhere}
            AND aa.id IN (${includeSubQuery}) 
            ) Adj`

            let combinationPromoCodeQueryResult = await models.sequelize.query(combinationPromoCodeQuery, {
                replacements: {
                    agreementId: data.agreementId
                },
                log: console.log,
                type: models.sequelize.QueryTypes.SELECT,
                transaction
            })

            if (result && result[0]) {
                let combinationPromoCodeValue = _.get(combinationPromoCodeQueryResult, '[0].totalDiscount', 0) > 0 ? _.get(combinationPromoCodeQueryResult, '[0].totalDiscount', 0) : 0
                discountValue = (result[0].totalDiscount - combinationPromoCodeValue) * discountPercentage / 100
                return discountValue > 0 ? discountValue : 0
            }
        }
    }

    /**
     *
     * @param {*} queryObj includes adjustmentType, page, limit. based on adjustmenttype
     */
    // Using this method for getting adjustments of adjustmentType===promocode with pagination
    // Using this method for getting adjustments of adjustmentType otherDiscount and adjustment. to prefill data in manage adjustments screen.
    static async getListOfAdjustments (queryObj) {
        try {
            queryObj.adjustmentType = queryObj.adjustmentType ? queryObj.adjustmentType : ['OtherDiscount', 'Adjustment']

            let query = {
                where: {
                    deletedAt: null,
                    title: {
                        // removing the auto applicable adjustments
                        [Op.notIn]: [
                            'Finance Discount',
                            'Automatic Payment Discount'
                        ]
                    }
                },
                include: [{
                    model: models.AdjustmentType,
                    as: 'adjustmentType',
                    where: { adjustmentType: queryObj.adjustmentType },
                    required: true
                },
                {
                    model: models.AdjustmentAgreementSection,
                    as: 'adjustmentAgreementSection',
                    include: [{
                        model: models.AgreementSection,
                        as: 'agreementSection'
                    }]
                }],
                distinct: true
            }

            if (queryObj.adjustmentType === 'PromoDiscount') {
                const limit = queryObj.limit ? Number(queryObj.limit) : 10
                const offset = queryObj.page ? (Number(queryObj.page - 1) * limit) : 0
                query.limit = limit
                query.offset = offset
                query.order = queryObj.order ? queryObj.order : [['updatedAt', 'DESC']]
            }

            const adjustments = await models.Adjustment.findAndCountAll(query)
            return adjustments
        } catch (err) {
            console.log(err)
            throw new Error(err)
        }
    }

    /**
     *
     * @param {*} agreementId
     */
    // Using this mehtod for getting applied adjustments of a agreement
    static async getAgreementAdjustments (agreementId, addendumId) {
        const UploadFileController = require('../uploadFileController/uploadFileController')
        let uploadFileController = new UploadFileController()
        try {
            if (agreementId) {
                let where = {
                    agreementId,
                    deletedAt: null,
                    deletedBy: null
                }
                if (addendumId) {
                    where.addendumId = addendumId || null
                }
                let agreementAdjustments = await models.AgreementAdjustment.findAll({
                    where: where,
                    include: [
                        {
                            model: models.Adjustment,
                            include: [{
                                model: models.AdjustmentType,
                                as: 'adjustmentType'
                            }]
                        }, {
                            model: models.AgreementAdjustmentDocument,
                            as: 'agreementAdjustmentDocuments',
                            attributes: ['fileUrl']
                        }, {
                            model: models.File,
                            as: 'adjustmentDocuments',
                            required: false,
                            where: { resourceName: 'AgreementAdjustment' }
                        },
                        {
                            model: models.Approval,
                            as: 'approval',
                            required: false
                        }
                    ]
                })
                if (agreementAdjustments.length) {
                    agreementAdjustments = JSON.parse(JSON.stringify(agreementAdjustments))
                    await Promise.all(agreementAdjustments.map(async agreementAdjustment => {
                        agreementAdjustment.documents = []
                        let docs = (agreementAdjustment.adjustmentDocuments).concat(agreementAdjustment.agreementAdjustmentDocuments)
                        if (docs.length) {
                            await Promise.all(docs.map(async doc => {
                                agreementAdjustment.documents.push({ originalFileName: uploadFileController.getFileName(doc.fileUrl), documentUrl: doc.fileUrl, fileUrl: await uploadFileController.downloadFileWithSignature(this.originalFileName, doc.fileUrl) })
                            }))
                        }
                        agreementAdjustment.adjustmentName = agreementAdjustment.Adjustment.title
                        agreementAdjustment.adjustmentTypeDetails = agreementAdjustment.Adjustment.adjustmentType
                        // agreementAdjustment.documents = _.map(agreementAdjustment.agreementAdjustmentDocuments, 'fileUrl')
                        agreementAdjustment.status = this.fetchTheStatusOfAdjustmentApplied(agreementAdjustment)
                        agreementAdjustment.reason = this.fetchTheReason(agreementAdjustment)
                        agreementAdjustment.description = agreementAdjustment.description || _.get(agreementAdjustment, 'Adjustment.description')
                        // agreementAdjustment.documents = docs
                        delete agreementAdjustment.Adjustment
                        delete agreementAdjustment.agreementAdjustmentDocuments
                        delete agreementAdjustment.adjustmentDocuments
                        return agreementAdjustment
                    }))
                    return agreementAdjustments
                } else {
                    return agreementAdjustments
                }
            } else {
                throw new Error('AGREEMENT_ID_NOT_FOUND')
            }
        } catch (err) {
            logger.error(err)
            throw err
        }
    }

    static fetchTheReason (agreementAdjustment) {
        if (agreementAdjustment.Adjustment.isApprovalNeeded) {
            return _.get(agreementAdjustment, 'approval.actionNotes')
        }
        return ''
    }

    static fetchTheStatusOfAdjustmentApplied (agreementAdjustment) {
        if (agreementAdjustment.Adjustment.isApprovalNeeded) {
            return ApprovalsController.ApprovalStatusStr(
                _.get(agreementAdjustment, 'approval.status')
            ) === 'Pending'
                ? 'Requires Approval'
                : ApprovalsController.ApprovalStatusStr(_.get(agreementAdjustment, 'approval.status'))
        }
        const autoAppliedDiscounts = [
            'PN Discount',
            'Predeveloped Discount',
            'Pn Property Discount',
            'Finance Discount',
            'Automatic Payment Discount'
        ]
        if (autoAppliedDiscounts.includes(agreementAdjustment.adjustmentName)) {
            return 'Auto Approved'
        }
        return 'Approved'
    }

    /**
     *
     * @param {*} reqData includes adjustmenttype,amount and fileurl
     */
    // applying adjustment to a agreement by creating agreementadjustment
    async createAgreementAdjustment (reqData, transaction = null) {
        let result
        if (adjustmentType[reqData.adjustmentTypeId] === 'PromoDiscount') { // promo discount applying
            const getAdjustment = await this._getAdjustment({ code: reqData.code }, null, transaction)
            if (getAdjustment) {
                reqData.adjustmentId = getAdjustment.id
                reqData.description = getAdjustment.description
                if (getAdjustment.discountUnit === '$') {
                    reqData.amount = getAdjustment.maxDiscountValue
                }
                reqData.discountUnit = getAdjustment.discountUnit
                result = await this._applyAdjustmentViaAgreementAdjustment(reqData, transaction)
                if (!reqData.reCalculate) {
                    await this.reCalculatePromoCodeDiscounts(reqData.agreementId, reqData.userId, transaction, true)
                }
                return result
            } else {
                throw new Error('DISCOUNT_NOT_FOUND')
            }
        } else {
            result = await this._applyAdjustmentViaAgreementAdjustment(reqData, transaction)
            if (!reqData.reCalculate) {
                await this.reCalculatePromoCodeDiscounts(reqData.agreementId, reqData.userId, transaction, true)
            }
            return result
        }
    }

    getIsOnlyDiscountForAgreement (agreementId, transaction) {
        return models.AgreementAdjustment.findOne({
            where: {
                agreementId,
                deletedAt: null,
                deletedBy: null
            },
            include: [
                {
                    model: models.Adjustment,
                    where: {
                        isOnlyDiscount: true
                    }
                },
                {
                    model: models.Approval,
                    as: 'approval',
                    where: {
                        status: [
                            ApprovalsController.ApprovalStatus['Approved'],
                            ApprovalsController.ApprovalStatus['AutoApproved']
                        ]
                    }
                }
            ],
            transaction
        })
    }

    getPIFDiscountForAgreement (agreementId, addendumId, transaction) {
        return models.AgreementAdjustment.findOne({
            where: {
                agreementId,
                addendumId,
                deletedAt: null,
                deletedBy: null
            },
            include: [
                {
                    model: models.Adjustment,
                    where: {
                        title: 'Paid in Full Discount'
                    },
                    include: [{
                        model: models.AdjustmentType,
                        as: 'adjustmentType',
                        where: {
                            adjustmentType: 'OtherDiscount'
                        }
                    }]
                },
                {
                    model: models.Approval,
                    as: 'approval'
                }
            ],
            transaction
        })
    }

    // To check adjustment already applied, if not preparing data for creating agreement adjustment
    // and if createAdj method returns success, then checking for adjustment approval process and sending email to approvars.
    async _applyAdjustmentViaAgreementAdjustment (reqData, tx) {
        const transaction = tx || await models.sequelize.transaction()
        try {
            const agreementAdjustment = await this._childMethodToCreateAgreementAdjustment(reqData, transaction)
            if (!reqData.reCalculate || reqData.createAdjustment) {
                await transaction.commit()
            }
            return agreementAdjustment
        } catch (error) {
            console.log(error)
            await transaction.rollback()
            logger.error(error)
            throw error
        }
    }

    async _childMethodToCreateAgreementAdjustment (reqData, transaction) {
        const whereCondition = { agreementId: reqData.agreementId, adjustmentId: reqData.adjustmentId, deletedAt: null, deletedBy: null, addendumId: reqData.addendumId || null }
        const getAgreementAdjustment = await models.AgreementAdjustment.findOne(
            {
                where: whereCondition,
                include: [
                    {
                        model: models.Adjustment
                    }
                ],
                transaction
            }
        )
        const adjustment = await models.Adjustment.findOne({
            where: { id: reqData.adjustmentId },
            include: [{
                model: models.AdjustmentApproval,
                as: 'adjustmentApprovalRules',
                include: [{
                    model: models.UserRole,
                    include: [{
                        model: models.User
                    }]
                }]
            },
            {
                model: models.AdjustmentType,
                as: 'adjustmentType'
            }, {
                model: models.AgreementType
            }],
            transaction
        })
        let isOnlyDiscountApplied
        if (!reqData.reCalculate) {
            isOnlyDiscountApplied = await this.getIsOnlyDiscountForAgreement(reqData.agreementId, transaction)
        }
        if (isOnlyDiscountApplied && (!adjustment || adjustment.title !== 'Refund Issued')) {
            if (reqData.title !== 'Finance Discount' && reqData.title !== 'Automatic Payment Discount' && reqData.title !== 'PN Discount' && reqData.title !== 'Predeveloped Discount' && reqData.title !== 'Pn Property Discount') {
                throw new Error(`IS_ONLY_DISCOUNT_ALREADY_APPLIED`)
            }
        } else {
            if (getAgreementAdjustment && !reqData.reCalculate) {
                if (getAgreementAdjustment.Adjustment.isApprovalNeeded) {
                    const approvalForAdjustment = await models.Approval.findOne({
                        where: {
                            resourceId: getAgreementAdjustment.id,
                            resourceType: 'AgreementAdjustment',
                            status: [
                                ApprovalsController.ApprovalStatus['Pending'],
                                ApprovalsController.ApprovalStatus['Approved'],
                                ApprovalsController.ApprovalStatus['AutoApproved']

                            ]
                        },
                        transaction
                    })
                    if (approvalForAdjustment) {
                        throw new Error(`${adjustmentType[reqData.adjustmentTypeId] === 'PromoDiscount' ? 'DISCOUNT' : 'ADJUSTMENT'}` + '' + '_ALREADY_APPLIED')
                    }
                } else if (!reqData.propertyId && reqData.title !== 'Finance Discount' && reqData.title !== 'Automatic Payment Discount') {
                    throw new Error(`${adjustmentType[reqData.adjustmentTypeId] === 'PromoDiscount' ? 'DISCOUNT' : 'ADJUSTMENT'}` + '' + '_ALREADY_APPLIED')
                }
            }
            const agreement = await models.Agreement.scope('withAgreementPersons').findByPk(reqData.agreementId, { transaction })
            if (!agreement) {
                throw new Error('AGREEMENT_NOT_FOUND')
            }
            // for sales app after converting quotation into case then only we get contractNumber number
            // so added contractNumber optional for sales app request
            if ((!agreement.contractNumber && reqData.apiType !== 'quotation') && adjustment &&
                    adjustment.title !== 'PN Discount' && adjustment.title !== 'Predeveloped Discount' && adjustment.title !== 'Pn Property Discount') {
                throw new Error('CONTRACTNO_IS_NOT_CREATED')
            }
            if (adjustment.title === 'Partial Interest Adjustment') {
                // active finance
                const AgreementController = require('../agreementController/agreementController')
                const agreeementController = new AgreementController(reqData.agreementId)
                let isActiveFinance = await agreeementController.agreementAllFinanceCheck()
                if (!isActiveFinance) {
                    throw new Error('FINANCE_NOT_FOUND')
                } else {
                    let getActiveFinanceDetails = await agreeementController.getActiveFinance()
                    if (getActiveFinanceDetails && getActiveFinanceDetails[0].remainingBalance === 0 && getActiveFinanceDetails[0].remainingInterest > 0) {
                        await agreeementController.updateRemainingInterest(getActiveFinanceDetails[0].id)
                    } else {
                        if (getActiveFinanceDetails[0].remainingBalance !== 0) {
                            throw new Error('FINANCE_PRINCIPAL_NOT_ZERO')
                        }
                        if (!getActiveFinanceDetails[0].remainingInterest) {
                            throw new Error('FINANCE_INTEREST_IS_ZERO')
                        }
                    }
                }
            }
            if ((
                _.get(adjustment, 'AgreementType.agreementType') &&
                        _.get(adjustment, 'AgreementType.agreementType') !== 'Both'
            ) && adjustment.agreementTypeId !== agreement.type) {
                throw new Error('AGREEMENT_TYPE_NOT_ALLOWED')
            }
            if (adjustment &&
                        adjustment.title === 'Reinstate Credit Adjustment' &&
                        reqData.requesterRole !== 'Accounting'
            ) {
                throw new Error('ACCESS_DENIED_REINSTATE_CREDIT')
            }
            if (adjustment && adjustment.adjustmentType && adjustment.adjustmentType.adjustmentType) {
                const today = moment().format('YYYY/MM/DD HH:mm:ss')
                // validity of adjustment check
                if (today > moment(adjustment.endDate).format('YYYY/MM/DD HH:mm:ss') && !reqData.reCalculate) {
                    throw new Error('DISCOUNT_IS_EXPIRED')
                }
                if (adjustment.isDisabled && !reqData.reCalculate) {
                    throw new Error('DISCOUNT_IS_IN_ACTIVE')
                }
                if ((moment(adjustment.startDate).format('YYYY/MM/DD HH:mm:ss') <= today && today <= moment(adjustment.endDate).format('YYYY/MM/DD HH:mm:ss')) || reqData.reCalculate) {
                    reqData.version = 1.0
                    const propertyPreApplyDiscounts = ['PN Discount', 'Predeveloped Discount', 'Pn Property Discount']
                    const preApplyPropertyDiscountsCondition = propertyPreApplyDiscounts.find(element => element === reqData.title)
                    if (reqData.amount > _.get(agreement, 'due') && adjustmentType[reqData.adjustmentTypeId] !== 'Adjustment' && !preApplyPropertyDiscountsCondition && !reqData.reCalculate) {
                        throw new Error('DISCOUNT_MORE_THAN_AGREEMENT_DUE')
                    }
                    reqData.amount = reqData.impact ? (reqData.impact !== 'negative' ? (reqData.amount * -1) : reqData.amount) : reqData.amount

                    const result = await this._createAgreementAdj(reqData, adjustment.maxDiscountValue, adjustment.isApprovalNeeded, adjustment.title, transaction)

                    // Sending email and adding the request into approval table
                    if (adjustment.isApprovalNeeded) {
                        await this._addApprovalRequestAndParticipants(reqData, adjustment, result.id, agreement, transaction)
                    }
                    return result
                } else {
                    throw new Error('ADJUSTMENT_NOT_APPLICABLE')
                }
            } else {
                throw new Error('ADJUSTMENT_OR_ADJUSTMENT_TYPE_NOT_FOUND')
            }
        }
    }

    async _addApprovalRequestAndParticipants (reqData, adjustment, agreementAdjustmentId, agreement, transaction) {
        const { queueNames, queues } = require('../../../appQueues')
        const adjustmentApprovalEmailWorker = queues[queueNames.adjustment_approval_email_queue]
        const adjustmentApprovalSMSWorker = queues[queueNames.adjustment_approval_sms_queue]
        const adjustmentAutoApprovalWorker = queues[queueNames.adjustmentAutoApprovalWorker]
        reqData.amount = Number(reqData.amount)
        const smsCode = await this._createSmsIdentifier(transaction)
        const location = await models.Location.findOne({ where: { id: agreement.locationId }, transaction })
        const approval = await ApprovalsController.createApproval({ resourceType: 'AgreementAdjustment',
            resourceId: agreementAdjustmentId,
            status: ApprovalsController.ApprovalStatus['Pending'],
            createdBy: reqData.userId,
            updatedBy: reqData.userId,
            requestedBy: reqData.userId,
            smsCode }, transaction)
        const AgreementController = require('../agreementController/agreementController')
        const agreementNeedTypes = Object.keys(AgreementController.NEED_TYPES).find(key => AgreementController.NEED_TYPES[key] === agreement.needType)
        const subType = agreementNeedTypes.toLowerCase() + '-' + 'funeral'
        const agreementType = agreement.type === 1 ? 'funeral' : 'cemetery'
        const approvalDetails = await models.Approval.scope('commonIncludes', 'withOutDeleted').findOne({
            where: {
                id: approval.id,
                status: [
                    ApprovalsController.ApprovalStatus['Pending']
                ]
            },
            transaction
        })
        let isQuotationAgreement = await models.Quotation.findOne({
            where: {
                [Op.or]: [
                    {
                        cemeteryAgreementId: reqData.agreementId
                    },
                    {
                        funeralAgreementId: reqData.agreementId
                    }
                ]
            }
        })
        await Promise.all(
            adjustment.adjustmentApprovalRules.map(async rule => {
                let users = rule.UserRole.Users.filter(user => user.id !== reqData.userId)
                let sendNotification = false
                if (rule.type && rule.type === agreementType && rule.subType && subType === rule.subType && (!rule.lessThanOrEquals || (rule.lessThanOrEquals && reqData.amount < rule.lessThanOrEquals))) {
                    sendNotification = true
                } else if (rule.type && rule.type === agreementType && !rule.subType && (!rule.lessThanOrEquals || (rule.lessThanOrEquals && reqData.amount < rule.lessThanOrEquals))) {
                    sendNotification = true
                } else if (!rule.type && (!rule.lessThanOrEquals || (rule.lessThanOrEquals && reqData.amount < rule.lessThanOrEquals))) {
                    sendNotification = true
                }
                let dataToSend = {
                    requesterName: reqData.requesterName,
                    requesterRole: reqData.requesterRole,
                    requestItem: adjustment.title,
                    location: location.name,
                    adjustmentTypeId: reqData.adjustmentTypeId,
                    beneficiary: _.get(agreement, 'beneficiary', []).length > 0 ? agreement.beneficiary.map(ben => getFullNameOfPerson(ben.person)).join(',') : '',
                    OPI: _.get(agreement, 'beneficiary', []).length > 0 ? agreement.beneficiary.map(ben => (((ben.person || {}).personVerificationDetails || {}).onePortalId || [])).join(',') : '',
                    totalPrice: agreement.totalPrice,
                    totalDiscount: ApprovalsController.fetchAgreementOrAddendumDetails(approvalDetails, 'percentage'),
                    amount: reqData.amount,
                    reason: reqData.description,
                    agreementType: ApprovalsController.fetchAgreementOrAddendumDetails(approvalDetails, 'type'),
                    contractNumber: ApprovalsController.fetchAgreementOrAddendumDetails(approvalDetails, 'contractNumber') || (isQuotationAgreement || {}).quotationNumber,
                    smsCode,
                    users,
                    isQuotationRequest: (isQuotationAgreement || {}).quotationNumber ? true : false
                }
                if (sendNotification) {
                    adjustmentApprovalEmailWorker.add('adjustmentApprovalEmailWorker', dataToSend)
                    adjustmentApprovalSMSWorker.add('adjustmentApprovalSMSWorker', dataToSend)
                    return ApprovalsController.createApprovalRoles({ approvalId: approval.id, roleId: rule.approvalRoleId }, transaction)
                }
            })
        )
        if (_.get(adjustment, 'adjustmentType.adjustmentType') === 'OtherDiscount') {
            adjustmentAutoApprovalWorker.add('adjustmentAutoApprovalWorker', {
                approvalId: approval.id
            }, {
                delay: 300 * 1000
            })
        }
    }

    // common function to create AgreementAdjustment along with agreementadjustmentDocuments in db
    async _createAgreementAdj (data, maxDiscountValue, isApprovalNeeded, adjustmentTitle, transaction) {
        let ChangeLog = require('../agreementController/changeLog')
        if ((!data.amount && adjustmentTitle !== 'PN Discount' && adjustmentTitle !== 'Predeveloped Discount' && adjustmentTitle !== 'Pn Property Discount' && adjustmentTitle !== 'Partial Interest Adjustment') || (data.amount && adjustmentTitle !== 'PN Discount' && adjustmentTitle !== 'Predeveloped Discount' && adjustmentTitle !== 'Pn Property Discount' && adjustmentTitle !== 'Partial Interest Adjustment' && data.discountUnit === '$')) {
            data.adjustmentTitle = adjustmentTitle
            let amount = await this._calculateDiscountAmount(data, transaction)
            if (maxDiscountValue && (amount > maxDiscountValue)) {
                amount = maxDiscountValue
            }
            data.amount = amount
        }
        data.createdBy = data.userId
        data.reviewedBy = data.userId
        data.reviewedAt = moment().format('YYYY-MM-DD HH:mm:ss')

        data.agreementAdjustmentDocuments = data.documents ? data.documents.map(document => { return { fileUrl: _.isObject(document) ? document.url : document } }) : []
        data.amount = Number(data.amount).toFixed(2)
        let result = {}
        if (data.reCalculate) {
            result = await models.AgreementAdjustment.update({
                amount: data.amount
            }, {
                where: {
                    id: data.agreementAdjustmentId,
                    amount: {
                        [Op.ne]: data.amount
                    }
                },
                transaction
            })
        } else {
            result = await models.AgreementAdjustment.create(data, {
                include: [{
                    model: models.AgreementAdjustmentDocument,
                    as: 'agreementAdjustmentDocuments'
                }],
                transaction
            })
        }

        // Update totalAdjustment in Agreement table
        const agreementUpdateQuery = `UPDATE Agreement SET totalAdjustment = (
            SELECT ISNULL(SUM(adjustmentTotals.adjustmentsTotal),0)  FROM (
                SELECT ISNULL(SUM(aa.amount),0) AS adjustmentsTotal FROM AgreementAdjustment aa 
                    INNER JOIN Adjustment a ON aa.adjustmentId=a.id AND a.isApprovalNeeded=0 WHERE aa.agreementId=:agreementId AND aa.deletedAt IS NULL ${!data.addendumId ? `and aa.addendumId is NULL` : ``}
                    UNION ALL 
                SELECT isnull(SUM(aa.amount),0) AS adjustmentsTotal  FROM AgreementAdjustment aa 
                    INNER JOIN Adjustment a ON aa.adjustmentId=a.id AND a.isApprovalNeeded=1
                    INNER JOIN Approval ap ON  ap.resourceId=aa.id AND ap.resourceType = 'AgreementAdjustment'
                    WHERE  aa.agreementId=:agreementId AND aa.deletedAt IS NULL  AND ap.status in (2,5) ${!data.addendumId ? `and aa.addendumId is NULL` : ``}
            ) adjustmentTotals
            ) from Agreement
            ${data.addendumId ? `INNER JOIN Addendum ad on ad.agreementId= Agreement.id` : ``}
            WHERE Agreement.id=:agreementId ${data.addendumId ? `and ad.id=:addendumId` : ``}`

        await models.sequelize.query(agreementUpdateQuery, {
            type: models.sequelize.QueryTypes.SELECT,
            replacements: {
                agreementId: data.agreementId,
                addendumId: data.addendumId
            },
            transaction
        })

        if (!isApprovalNeeded && !data.reCalculate) {
            await ChangeLog.recordAdjustmentsAction('add', result.agreementId, result.id, result.amount, transaction)
            // after creating need to sync with agreement totals
            await this._updatingAgreementSummary(data.agreementId, data.userId, transaction, _.get(data, 'addendumId', null))
            await ChangeLog.recordAdjustmentsAction('add', result.agreementId, result.id, result.amount, transaction)
        }
        return result
    }

    /**
     *
     * @param {*} agreementId to update agreement totals and applied adjustments
     * @param {*} transaction
     */
    async _updatingAgreementSummary (agreementId, userId, transaction, addendumId = null) {
        // await models.Agreement.updateTotalAdjustment(agreementId, transaction)
        await models.Agreement.updateAndGetTotal(agreementId, userId, transaction, addendumId)
    }

    /**
     *
     * @param {*} agreementAdjustmentId to soft delete agreement adjustment
     * @param {*} agreementId to update agreement totals and removing values of applied adjustments
     * @param {*} userId
     */
    async removeAppliedAgreementAdjustment (agreementAdjustmentId, agreementId, userId) {
        const transaction = await models.sequelize.transaction()
        try {
            const ChangeLog = require('../agreementController/changeLog')
            const agreementAdjustment = await models.AgreementAdjustment.update({
                deletedBy: userId,
                deletedAt: moment().format('YYYY/MM/DD HH:mm:ss')
            }, {
                where: { id: agreementAdjustmentId },
                transaction
            })
            const whereConditions = {
                resourceId: agreementAdjustmentId,
                resourceType: 'AgreementAdjustment'
            }
            const getAgreementAdjustment = await models.AgreementAdjustment.findOne(
                {
                    where: { id: agreementAdjustmentId },
                    transaction
                }
            )
            await ApprovalsController.removeApprovalRequest(whereConditions, userId)
            await this.reCalculatePromoCodeDiscounts(agreementId, userId, transaction)
            await this._updatingAgreementSummary(agreementId, userId, transaction, _.get(getAgreementAdjustment, 'addendumId'))
            await ChangeLog.recordAdjustmentsAction('remove', agreementId, agreementAdjustmentId, null, transaction)
            await transaction.commit()
            return agreementAdjustment
        } catch (error) {
            await transaction.rollback()
            logger.error(error)
            throw error
        }
    }

    /**
     *
     * @param {*} req contains reqdata for creating promocode adjustment
     */
    // creating promocode adjustment
    async createPromocodeAdjustment (req) {
        const transaction = await models.sequelize.transaction()
        try {
            const data = req.body
            // checking if the promocode with the code already exists
            const adj = await this._getAdjustment({ code: data.code }, [], transaction)
            if (adj) {
                throw new Error('CODE_MUST_BE_UNIQUE')
            }
            if (data.discountUnit === '%' && data.discountValue > 100) {
                throw new Error('PERCENTAGE_MAX_100_ALLOWED')
            }
            if (data.discountUnit === '%') {
                let discountValue = data.discountValue.toString()
                data.discountValue = Number(discountValue.slice(0, discountValue.indexOf('.') + 8 + 1))
            }
            // if not existed, creating prmocode adjustment with adjustmentagreementsections
            const reqBody = {
                title: data.title,
                adjustmentTypeId: data.adjustmentTypeId,
                agreementTypeId: data.agreementType,
                code: data.code,
                description: data.description,
                discountUnit: data.discountUnit,
                maxDiscountValue: data.maxDiscountValue,
                discountValue: data.discountValue,
                startDate: data.startDate,
                endDate: data.endDate,
                isCustomAmount: false,
                isOnlyDiscount: false,
                isApprovalNeeded: false,
                isDisabled: data.isDisabled,
                createdBy: req.currentUser.id,
                adjustmentAgreementSection: []
            }
            if (data.agreementSectionId) {
                data.agreementSectionId.map(e => {
                    reqBody.adjustmentAgreementSection.push({
                        agreementSectionId: e
                    })
                })
            }
            const createdDiscount = await models.Adjustment.create(reqBody, {
                include: [
                    {
                        model: models.AdjustmentAgreementSection,
                        as: 'adjustmentAgreementSection'
                    }
                ],
                transaction
            })
            await transaction.commit()
            return createdDiscount
        } catch (error) {
            await transaction.rollback()
            logger.error(error)
            throw error
        }
    }

    /**
     *
     * @param {*} id of promocodeadj
     */
    // Get the details of promocode adjustment by adjustmentId
    async getPromocodeAdjustment (id) {
        try {
            const result = await this._getAdjustment({ id }, [
                {
                    model: models.AdjustmentAgreementSection,
                    as: 'adjustmentAgreementSection',
                    include: [{
                        model: models.AgreementSection,
                        as: 'agreementSection'
                    }]
                }
            ])
            if (result) {
                return result
            } else {
                throw new Error('NOT_FOUND')
            }
        } catch (err) {
            throw err
        }
    }

    /**
     *
     * @param {*} data to update
     */
    // updating promocode adjustment
    async updatePromocodeAdjustment (data) {
        try {
            const result = await this._updateAdjustment({
                title: data.title,
                description: data.description,
                isDisabled: data.isDisabled,
                startDate: data.startDate,
                endDate: data.endDate,
                updatedBy: data.userId
            }, { id: data.id, deletedAt: null })
            if (result && result.length) {
                const adj = await this.getPromocodeAdjustment(data.id)
                return adj
            } else {
                throw new Error('Error in updating Promotional adjustment')
            }
        } catch (err) {
            logger.error(err)
            throw err
        }
    }

    /**
     *
     * @param {*} adjId to soft delete promocode adj by making changes to deletedBy and deletedAt files
     * @param {*} userId to update updatedBy and deletedBy fields.
     */
    async deletePromoAdjustment (adjId, userId) {
        try {
            const result = await this._updateAdjustment({
                deletedBy: userId,
                deletedAt: moment().format('MM/DD/YYYY HH:mm:ss'),
                updatedBy: userId
            }, { id: adjId, deletedAt: null })
            if (result && result[0] > 0) {
                return true
            } else {
                throw new Error('RECORD_NOT_FOUND')
            }
        } catch (err) {
            logger.error(err)
            throw err
        }
    }

    async applyPNDiscount (discountData) {
        await this._applyAdjustmentViaAgreementAdjustment(discountData)
    }

    async deletePropertyAdjustments (agreementId, propertyIds, adjustmentIds, userId, transaction) {
        try {
            const ChangeLog = require('../agreementController/changeLog')
            const whereCond = {
                agreementId,
                propertyId: { [Op.in]: propertyIds },
                adjustmentId: { [Op.in]: adjustmentIds }
            }
            const agmtAdjs = await models.AgreementAdjustment.findAll({
                where: whereCond,
                transaction
            })
            const result = await models.AgreementAdjustment.update({
                deletedAt: moment().format('MM/DD/YYYY HH:mm:ss'),
                deletedBy: userId
            }, {
                where: whereCond,
                transaction
            })
            await this._updatingAgreementSummary(agreementId, userId, transaction)
            await Promise.all(agmtAdjs.map(async ele => {
                let query = `SELECT * FROM Addendum WHERE agreementId = ${agreementId} AND status = 'In Progress'`
                const addendum = await model.sequelize.query(query, {
                    type: model.sequelize.QueryTypes.SELECT,
                    transaction
                })
                let addendumId = addendum && addendum.length ? addendum[0].id : null
                let resourceType = 'AgreementAdjustment'
                const amount = ele.amount
                let changeLogItem = await ChangeLog.getChangeLogItemDetails(agreementId, addendumId, ele.id, resourceType, transaction)
                let payload = {
                    id: changeLogItem ? changeLogItem.id : null,
                    agreementId,
                    addendumId,
                    resourceId: ele.id,
                    resourceType,
                    quantity: changeLogItem ? changeLogItem.quantity - 1 : -1,
                    unitPrice: amount,
                    totalPrice: amount
                }
                await upsert('ChangeLog', payload, transaction)
            }))
            return result
        } catch (err) {
            logger.error(err)
            throw err
        }
    }

    // fetch the adjustment from the Adjustment table.
    getAdjustment (title, transaction) {
        return models.Adjustment.findOne({
            where: {
                title
            },
            transaction
        })
    }

    async applyAdjustment ({ title, agreementId, addendumId, createdBy, amount, apiType = null }, transaction) {
        let result
        const adjustment = await this.getAdjustment(title, transaction)
        const adjustmentId = adjustment.id
        const adjustmentTypeId = adjustment.adjustmentTypeId
        let description = `${title} is auto-applied when Financed !!`
        result = await this._childMethodToCreateAgreementAdjustment({ agreementId, adjustmentId, addendumId, adjustmentTypeId, createdBy, amount, description, title, apiType }, transaction)
        return result
    }

    // Re calculate promocode discounts
    // This method will call on item addition/deletion, property confirm/release, discounts/adjustments deletion
    async reCalculatePromoCodeDiscounts (agreementId, userId, transaction, createAdjustment = false) {
        try {
            const query = {}
            // This query will return all the promo discount records from AgreementAdjustment which are 'Property', 'Services', 'Merchandise', 'CashAdvancedItem', 'Package'
            query.itemsQuery = `SELECT a.code, a.adjustmentTypeId, aa.id as agreementAdjustmentId, aa.agreementId, aa.addendumId, aa.adjustmentId from AgreementAdjustment AS aa
            INNER JOIN Adjustment AS a ON a.id = aa.adjustmentId
            INNER JOIN AdjustmentType AS at ON at.id = a.adjustmentTypeId
            INNER JOIN AdjustmentAgreementSection aas ON a.id = aas.adjustmentId
            INNER JOIN AgreementSection ags ON ags.id = aas.agreementSectionId
            WHERE a.adjustmentTypeId = (SELECT id FROM AdjustmentType WHERE adjustmentType = 'PromoDiscount')
            AND ags.id IN (SELECT id FROM AgreementSection WHERE area IN ('Property', 'Services', 'Merchandise', 'CashAdvancedItem', 'Package'))
            AND aa.deletedAt IS NULL
            AND aa.deletedBy IS NULL
            AND aa.agreementId = :agreementId 
            AND aa.id NOT IN (SELECT AgreementAdjustment.id FROM AgreementAdjustment
            INNER JOIN Adjustment ON Adjustment.id = AgreementAdjustment.adjustmentId
            INNER JOIN AdjustmentAgreementSection ON Adjustment.id = AdjustmentAgreementSection.adjustmentId
            INNER JOIN AgreementSection ON AgreementSection.id = AdjustmentAgreementSection.agreementSectionId
            WHERE AgreementAdjustment.agreementId = :agreementId
            AND AgreementAdjustment.deletedAt IS NULL 
            AND AgreementAdjustment.deletedBy IS NULL
            GROUP BY AgreementAdjustment.id HAVING COUNT(*) > 1)
            ORDER BY aa.id ASC`

            // This query will return all the combination discount records from AgreementAdjustment which does not include Contract as combination.
            // Valid Ex: 1) Services, Merchandise 2) Packages, Merchandise, Property
            // Invalud Ex: 1) Contract, Property 2) Packages, Merchandise, Contract
            query.combinationPromoDiscountsQuery = `SELECT DISTINCT a.code, a.adjustmentTypeId, aa.id as agreementAdjustmentId, aa.agreementId, aa.addendumId, aa.adjustmentId  FROM AgreementAdjustment aa
            INNER JOIN Adjustment a ON a.id = aa.adjustmentId
            INNER JOIN AdjustmentAgreementSection aas ON a.id = aas.adjustmentId
            INNER JOIN AgreementSection ags ON ags.id = aas.agreementSectionId
            WHERE aa.agreementId = :agreementId
            AND aa.deletedAt IS NULL 
            AND aa.deletedBy IS NULL
            AND a.code IS NOT NULL
            AND aa.id IN (SELECT aa.id FROM AgreementAdjustment aa
            INNER JOIN Adjustment a ON a.id = aa.adjustmentId
            INNER JOIN AdjustmentAgreementSection aas ON a.id = aas.adjustmentId
            INNER JOIN AgreementSection ags ON ags.id = aas.agreementSectionId
            WHERE aa.agreementId = :agreementId
            AND aa.deletedAt IS NULL 
            AND aa.deletedBy IS NULL
            GROUP BY aa.id HAVING COUNT(*) > 1) 
            AND aa.id NOT IN (SELECT DISTINCT aa.id from AgreementAdjustment AS aa
            INNER JOIN Adjustment AS a ON a.id = aa.adjustmentId
            INNER JOIN AdjustmentType AS at ON at.id = a.adjustmentTypeId
            INNER JOIN AdjustmentAgreementSection aas ON a.id = aas.adjustmentId
            INNER JOIN AgreementSection ags ON ags.id = aas.agreementSectionId
            WHERE a.adjustmentTypeId = (SELECT id FROM AdjustmentType WHERE adjustmentType = 'PromoDiscount')
            AND ags.id IN (SELECT id FROM AgreementSection WHERE area IN ('Contract'))
            AND aa.deletedAt IS NULL
            AND aa.deletedBy IS NULL
            AND aa.agreementId = :agreementId 
            AND aa.id IN (SELECT AgreementAdjustment.id FROM AgreementAdjustment
            INNER JOIN Adjustment ON Adjustment.id = AgreementAdjustment.adjustmentId
            INNER JOIN AdjustmentAgreementSection ON Adjustment.id = AdjustmentAgreementSection.adjustmentId
            INNER JOIN AgreementSection ON AgreementSection.id = AdjustmentAgreementSection.agreementSectionId
            WHERE AgreementAdjustment.agreementId = :agreementId
            AND AgreementAdjustment.deletedAt IS NULL 
            AND AgreementAdjustment.deletedBy IS NULL
            GROUP BY AgreementAdjustment.id HAVING COUNT(*) >= 1))`

            // This query will return all the discount records from AgreementAdjustment which include Contract (either single or combination).
            query.contractDiscountsQuery = `SELECT DISTINCT a.code, a.adjustmentTypeId, aa.id as agreementAdjustmentId, aa.agreementId, aa.addendumId, aa.adjustmentId from AgreementAdjustment AS aa
            INNER JOIN Adjustment AS a ON a.id = aa.adjustmentId
            INNER JOIN AdjustmentType AS at ON at.id = a.adjustmentTypeId
            INNER JOIN AdjustmentAgreementSection aas ON a.id = aas.adjustmentId
            INNER JOIN AgreementSection ags ON ags.id = aas.agreementSectionId
            WHERE a.adjustmentTypeId = (SELECT id FROM AdjustmentType WHERE adjustmentType = 'PromoDiscount')
            AND ags.id IN (SELECT id FROM AgreementSection WHERE area IN ('Contract'))
            AND aa.deletedAt IS NULL
            AND aa.deletedBy IS NULL
            AND aa.agreementId = :agreementId 
            AND aa.id IN (SELECT AgreementAdjustment.id FROM AgreementAdjustment
            INNER JOIN Adjustment ON Adjustment.id = AgreementAdjustment.adjustmentId
            INNER JOIN AdjustmentAgreementSection ON Adjustment.id = AdjustmentAgreementSection.adjustmentId
            INNER JOIN AgreementSection ON AgreementSection.id = AdjustmentAgreementSection.agreementSectionId
            WHERE AgreementAdjustment.agreementId = :agreementId
            AND AgreementAdjustment.deletedAt IS NULL 
            AND AgreementAdjustment.deletedBy IS NULL
            GROUP BY AgreementAdjustment.id HAVING COUNT(*) >= 1)
            ORDER BY aa.id ASC`

            // This query will return all the discount records from AgreementAdjustment which are 'Paid in Full Discount' and 'Veteran'
            query.pifAndVeteranQuery = `SELECT a.code, a.adjustmentTypeId, aa.id as agreementAdjustmentId, aa.agreementId, aa.addendumId, aa.adjustmentId from AgreementAdjustment AS aa
            INNER JOIN Adjustment AS a ON a.id = aa.adjustmentId
            WHERE ((a.id = 4 AND a.title = 'Paid in Full Discount') OR (a.id = 1 AND a.title = 'Veteran Discount'))
            AND aa.deletedAt IS NULL
            AND aa.deletedBy IS NULL
            AND aa.agreementId = :agreementId`

            // Pushing above 3 queries data into getAppliedAgreementPromoCodeDiscountsArr
            // We need to execute and push the data in the same order (Properties + Packages +  Services + Merchandise + CAI + AnyItemsCombinations + ContractLevel + Paid in Full Discount + Veteran)
            let getAppliedAgreementPromoCodeDiscountsArr = []
            for (const queryStr of Object.values(query)) {
                const getAppliedAgreementPromoCodeDiscounts = await models.sequelize.query(queryStr, {
                    type: models.sequelize.QueryTypes.SELECT,
                    replacements: {
                        agreementId
                    },
                    transaction
                })
                getAppliedAgreementPromoCodeDiscountsArr = [...getAppliedAgreementPromoCodeDiscountsArr, ...getAppliedAgreementPromoCodeDiscounts]
            }
            let isQuotationAgreement = await models.Quotation.count({
                where: {
                    [Op.or]: [
                        {
                            cemeteryAgreementId: agreementId
                        },
                        {
                            funeralAgreementId: agreementId
                        }
                    ]
                }
            })
            // Calling existing method createAgreementAdjustment (that will create Agreement Adjustment record) for recalculating the existing AgreementAdjustment record to update new value
            if (getAppliedAgreementPromoCodeDiscountsArr.length > 0) {
                for (let item of getAppliedAgreementPromoCodeDiscountsArr) {
                    let discountAppliedLevel
                    if (item.agreementId && item.addendumId) {
                        discountAppliedLevel = 'Addendum'
                    } else if (item.agreementId && !item.addendumId) {
                        discountAppliedLevel = 'Agreement'
                    }
                    const adjObj = {
                        agreementId: item.agreementId,
                        addendumId: item.addendumId,
                        adjustmentTypeId: item.adjustmentTypeId,
                        agreementAdjustmentId: item.agreementAdjustmentId,
                        code: item.code,
                        userId,
                        discountAppliedLevel,
                        reCalculate: true,
                        createAdjustment,
                        adjustmentId: item.adjustmentId
                    }
                    if (createAdjustment) {
                        transaction = await models.sequelize.transaction()
                    }
                    // if its quotation and not converted into case api type is required
                    if (isQuotationAgreement) {
                        adjObj.apiType = 'quotation'
                    }
                    await this.createAgreementAdjustment(adjObj, transaction)
                }
            }
        } catch (err) {
            logger.error(err)
            throw err
        }
    }
    /**
     * This method creates the unique identifier Number for the smsCode
     * @returns {String}
     * @param {*} transaction
     */
    async _createSmsIdentifier (transaction) {
        const identifier = Math.floor(Math.random() * 90000) + 10000
        const getApproval = await models.Approval.findOne({ where: { smsCode: identifier }, transaction })
        if (getApproval) await this._createSmsIdentifier(transaction)
        return identifier
    }
}
module.exports = exports = AdjustmentsController
