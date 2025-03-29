const _ = require('lodash')
const models = require('../../../models')
const ReservationController = require('../agreementController/propertyReservationTypeController')
// const AgreementController = require('./../agreementController/agreementController')
const Sequelize = require('sequelize')
const Op = Sequelize.Op
const moment = require('moment')
const logger = require('../../../lib/logger')
const { commonDownloadFileWithSignature, isTableExist } = require('../utils')

class ApprovalsController {
    constructor (approvalId, currentUser) {
        this.approvalId = approvalId
        this.currentUser = currentUser
    }

    async _loadApproval (transaction) {
        const approval = await models.Approval.scope('commonIncludes', 'withOutDeleted').findOne({
            where: {
                id: this.approvalId
            },
            transaction
        })
        if (approval) {
            this.approval = approval
            return approval
        } else {
            throw new Error('APPROVAL_NOT_FOUND')
        }
    }

    /**
   * this method return the statuses a approval request can have
   */
    static get ApprovalStatus () {
        return {
            Pending: 1,
            Approved: 2,
            Declined: 3,
            AutoDeclined: 4,
            AutoApproved: 5
        }
    }
    /**
     * Remove All other discounts
     * @param {Integer} agreementAdjustmentId
     * @param {Integer} ajustmentId
     * @param {Integer} userId
     * @param {transaction} transaction
     */
    static async deleteAllOtherDiscounts (agreementId, agreementAdjustmentId, ajustmentId, userId, transaction) {
        try {
            const result = await models.AgreementAdjustment.update({
                deletedBy: userId,
                deletedAt: moment().format('MM/DD/YYYY HH:mm:ss')
            }, {
                where: {
                    id: {
                        [Op.ne]: [agreementAdjustmentId]
                    },
                    adjustmentId: {
                        [Op.ne]: [ajustmentId]
                    },
                    agreementId
                },
                transaction
            })
            return result
        } catch (err) {
            throw err
        }
    }

    static ApprovalStatusStr (status) {
        if (this.ApprovalStatus.Pending === status) {
            return 'Pending'
        } else if (this.ApprovalStatus.Approved === status) {
            return 'Approved'
        } else if (this.ApprovalStatus.Declined === status) {
            return 'Declined'
        } else if (this.ApprovalStatus.AutoDeclined === status) {
            return 'Auto Declined'
        } else if (this.ApprovalStatus.AutoApproved === status) {
            return 'Auto Approved'
        } else {
            return 'Approved'
        }
    }

    /**
   * this method added the users who can approve the request into the approvalParticpants table
   * @param {number} approvalId id of the approval request added
   * @param {number} roleId role id which can approve the request
   */
    static async createApproval (approvalReqBody, transaction) {
        const approval = await models.Approval.create(approvalReqBody, { transaction })
        return approval
    }

    static createApprovalRoles (reqBody, transaction) {
        return models.ApprovalRoles.create(reqBody, {
            transaction
        })
    }

    /**
     * This method is used to approve or reject the approval requests
     * @param {Object} reqBody
     * @param {String} reqBody.status status is the action(Approved/Rejected) we are taking on the request
     * @param {Object} reqBody.currentUser it is the cyrrently logged in user details
     * @param {String} reqBody.actionNotes notes given while taking action on the request
     * @param {String} reqBody.resourceType it is the resourceType(AgreementAdjustment, AgreementFinance, AgreementProperty) of the request on which we are taking action
     */
    async approveOrRejectRequest (reqBody) {
        const transaction = await models.sequelize.transaction()
        try {
            if (reqBody.resourceType === 'AgreementProperty') {
                const reservationController = new ReservationController()
                const approvalDetails = await reservationController.updateExpiryApprovalRequest(this.approvalId, reqBody, transaction)
                await transaction.commit()
                return approvalDetails
            }
            const { queueNames, queues } = require('../../../appQueues')
            const AgreementController = require('./../agreementController/agreementController')
            const approvalStatusEmailWorker = queues[queueNames.approvalStatusEmailWorker]
            const approvalStatusSMSWorker = queues[queueNames.approvalStatusSMSWorker]
            await this._loadApproval(transaction)
            const resourceType = ApprovalsController.fetchAgreementOrAddendumDetails(this.approval)
            const agreementDetails = this.approval[resourceType].agreement
            if (this.approval.status !== ApprovalsController.ApprovalStatus['Pending']) {
                throw new Error(`REQUEST_IS_${ApprovalsController.ApprovalStatusStr(this.approval.status).toUpperCase()}`)
            }
            const approvalStatuses = [
                'Approved',
                'AutoApproved'
            ]
            if (approvalStatuses.includes(reqBody.status) && this.approval.agreementAdjustment) {
                let ChangeLog = require('../agreementController/changeLog')
                const DiscountController = require('./discountsAndAdjustmentsHandler')
                const discountController = new DiscountController()
                const isOnlyDiscountApplied = await discountController.getIsOnlyDiscountForAgreement(this.approval.agreementAdjustment.agreementId)
                if (isOnlyDiscountApplied) {
                    throw new Error(`IS_ONLY_DISCOUNT_ALREADY_APPLIED`)
                }
                if (this.approval.agreementAdjustment.Adjustment.isOnlyDiscount) {
                    let refundAdjustment = await models.Adjustment.findOne({
                        where: { title: 'Refund Issued' },
                        attributes: ['id'],
                        transaction
                    })
                    if (refundAdjustment && refundAdjustment.id) {
                        await ApprovalsController.deleteAllOtherDiscounts([agreementDetails.id],
                            this.approval.agreementAdjustment.id, refundAdjustment.id,
                            _.get(reqBody, 'currentUser.id'), transaction)
                    } else {
                        await ApprovalsController.deleteAllOtherDiscounts([agreementDetails.id],
                            this.approval.agreementAdjustment.id, null,
                            _.get(reqBody, 'currentUser.id'), transaction)
                    }
                    agreementDetails.totalAdjustment = 0
                }
                await models.Agreement.updateSpecificAdjustment(
                    agreementDetails,
                    this.approval.agreementAdjustment.amount,
                    transaction)
                await ChangeLog.recordAdjustmentsAction('add', this.approval.agreementAdjustment.agreementId, this.approval.agreementAdjustment.id, this.approval.agreementAdjustment.amount, transaction)
            }
            const agreement = await models.Agreement.scope('withAgreementPersons').findByPk(agreementDetails.id, { transaction })
            this.approval.set({
                status: ApprovalsController.ApprovalStatus[reqBody.status],
                approvedOrRejectedBy: _.get(reqBody, 'currentUser.id'),
                updatedBy: _.get(reqBody, 'currentUser.id'),
                actionNotes: _.get(reqBody, 'actionNotes', ''),
                approvedOrRejectedAt: moment().format('YYYY-MM-DD HH:mm:ss')
            })
            let isQuotationAgreement
            // checking if request is linked with quotaion
            if (!ApprovalsController.fetchAgreementOrAddendumDetails(this.approval, 'contractNumber')) {
                let agreementId = (this.approval.agreementAdjustment || {}).agreementId ? (this.approval.agreementAdjustment || {}).agreementId : (this.approval.agreementFinance || {}).agreementId
                let isExist = await isTableExist('Quotation')
                if (agreementId && isExist) {
                    [isQuotationAgreement] = await models.sequelize.query(`
                    SELECT 
                       quotationNumber 
                    FROM 
                       Quotation 
                    WHERE 
                       (cemeteryAgreementId = :agreementId OR funeralAgreementId = :agreementId)
                    `, {
                        type: models.sequelize.QueryTypes.SELECT,
                        replacements: {
                            agreementId: agreementId
                        }
                    })
                }
            }
            const dataToSend = {
                requesterName: this.approval.requestedUser.name,
                requesterEmail: this.approval.requestedUser.email,
                requesterPhoneNumber: this.approval.requestedUser.phoneNumber,
                agreementType: AgreementController.TYPES.Funeral === agreementDetails.type ? 'Statement' : 'Contract',
                contractNumber: ApprovalsController.fetchAgreementOrAddendumDetails(this.approval, 'contractNumber') || (isQuotationAgreement || {}).quotationNumber,
                adjustmentType: this.approval.agreementAdjustment ? this.approval.agreementAdjustment.Adjustment.title : 'Special Finance',
                OPI: _.get(agreement, 'beneficiary', []).length > 0 ? agreement.beneficiary.map(ben => ((ben.person || {}).personVerificationDetails || {}).onePortalId || []).join(',') : '',
                status: reqBody.status,
                approvedOrRejectedByUser: _.get(reqBody, 'currentUser.name'),
                approvedOrRejectedByUserRole: _.get(reqBody, 'currentUser.UserPermissions.description') || (reqBody.currentUser || {})['UserPermissions.description'] || '',
                actionNotes: _.get(reqBody, 'actionNotes', ''),
                smsCode: this.approval.smsCode,
                isQuotationRequest: (isQuotationAgreement || {}).quotationNumber ? true : false
            }
            if (reqBody.status === 'AutoApproved') {
                dataToSend.isAutoApproved = true
            }
            await this.approval.save({ transaction })
            await models.Agreement.updateAndGetTotal(agreementDetails.id, _.get(reqBody, 'currentUser.id'), transaction)
            await transaction.commit()
            approvalStatusEmailWorker.add('approvalStatusEmailWorker', dataToSend)
            approvalStatusSMSWorker.add('approvalStatusSMSWorker', dataToSend)
            return this.approval
        } catch (error) {
            await transaction.rollback()
            logger.error(error)
            throw error
        }
    }

    _getListQuery (queryObj, isPagination, currentUser, isQuotationTable) {
        let sortOrder = []
        let whereClause = ' where [deletedAt] is NULL'
        let whereClauseAdjustment = ` and approvalTableRoleId =${currentUser.role}`
        let status
        let pagination = ''

        if (queryObj.requestedBy) {
            whereClause += ` and [requestedBy]=:requestedBy`
        } else {
            whereClause += ` and [requestedBy] != ${currentUser.id}`
        }

        if (queryObj.requestType) {
            whereClauseAdjustment += ` and requestType =:adjustmentTypeId`
        }

        if (queryObj.contractNumber) {
            if (isQuotationTable) {
                whereClauseAdjustment += ` and (combinedContractNumber like '%${queryObj.contractNumber}%' OR quotationNumber like '%${queryObj.contractNumber}%') `
            } else {
                whereClauseAdjustment += ` and (combinedContractNumber like '%${queryObj.contractNumber}%') `
            }
        }

        whereClause += ` and [status] in (:status)`

        if (queryObj.viewHistory && queryObj.viewHistory === 'true') {
            sortOrder = ` ORDER BY [updatedAt] DESC, [createdAt] DESC `
            status = [
                ApprovalsController.ApprovalStatus['Approved'],
                ApprovalsController.ApprovalStatus['Declined'],
                ApprovalsController.ApprovalStatus['AutoDeclined'],
                ApprovalsController.ApprovalStatus['AutoApproved']
            ]
        } else {
            sortOrder = ` ORDER BY [createdAt] DESC `
            status = [ApprovalsController.ApprovalStatus.Pending]
        }

        if (isPagination) {
            pagination = ` offset :offset rows  FETCH next :limit rows only`
        } else {
            sortOrder = ''
        }

        let newQuery = `SELECT * FROM  
        (SELECT

            Approval.*,
            ${isQuotationTable ? ' fa.quotationNumber as quotationNumber, ' : ''}
            Approval.id as approvalId,
            ApprovalRoles.roleId as approvalTableRoleId,
            RequestedByUser.id as requestedByUserId,
            RequestedByUser.name as requestedByUserName,
            ApprovedOrRejectedByUser.id as approvedOrRejectedByUserId,
            ApprovedOrRejectedByUser.name as approvedOrRejectedByUserName,
            AgreementAdjustment.id as agreementAdjustmentId,
            AgreementAdjustment.adjustmentId,
            AgreementAdjustment.description,
            Adjustment.id as adjustmentTableId,
            Adjustment.title,
            Adjustment.adjustmentTypeId,
            Addendum.id as addendumTableId,
            null as agreementFinanceId,
            null as financeAgreementId,
            null as financeType,
            null as agreementTableIdForFinance,
            null as contractNumberForFinance,
            AgreementAdjustment.agreementId AS agreementId,
            AgreementAdjustment.addendumId AS addendumId,
            CASE 
                WHEN Addendum.id is not null
                THEN Addendum.addendumNumber
                ELSE Agreement.contractNumber
            END AS combinedContractNumber,
            Adjustment.adjustmentTypeId AS requestType,
            Adjustment.title AS adjustmentType

            -- Agreement adjustment modules
            FROM Approval
            INNER JOIN ApprovalRoles ON ApprovalRoles.approvalId = Approval.id
            INNER JOIN AgreementAdjustment ON Approval.resourceId = AgreementAdjustment.id AND Approval.resourceType = 'AgreementAdjustment'
            INNER JOIN Adjustment ON AgreementAdjustment.adjustmentId = Adjustment.id
            INNER JOIN Agreement ON AgreementAdjustment.agreementId = Agreement.id
            LEFT OUTER JOIN Addendum ON AgreementAdjustment.addendumId = Addendum.id
            LEFT OUTER JOIN [User] RequestedByUser ON RequestedByUser.id = Approval.requestedBy
            LEFT OUTER JOIN [User] ApprovedOrRejectedByUser ON ApprovedOrRejectedByUser.id = Approval.approvedOrRejectedBy
            ${isQuotationTable ? 'LEFT OUTER JOIN [Quotation] AS [fa] ON (AgreementAdjustment.agreementId = [fa].[cemeteryAgreementId] or AgreementAdjustment.agreementId = [fa].[funeralAgreementId])' : ''}

            UNION ALL

            SELECT
            Approval.*,
            ${isQuotationTable ? ' fa.quotationNumber as quotationNumber, ' : ''}
            Approval.id as approvalId,
            ApprovalRoles.roleId as approvalTableRoleId,
            RequestedByUser.id as requestedByUserId,
            RequestedByUser.name as requestedByUserName,
            ApprovedOrRejectedByUser.id as approvedOrRejectedByUserId,
            ApprovedOrRejectedByUser.name as approvedOrRejectedByUserName,
            null as agreementAdjustmentId,
            null as adjustmentId,
            null as description,
            null as adjustmentTableId,
            null as title,
            null as adjustmentTypeId,
            Addendum.id as addendumTableId,
            AgreementFinance.id as agreementFinanceId,
            AgreementFinance.agreementId as financeAgreementId,
            AgreementFinance.financeType,
            Agreement.id as agreementTableIdForFinance,
            Agreement.contractNumber as contractNumberForFinance,
            AgreementFinance.agreementId AS agreementId,
            AgreementFinance.addendumId AS addendumId,
            CASE 
                WHEN Addendum.id is not null
                THEN Addendum.addendumNumber
                ELSE Agreement.contractNumber
            END AS combinedContractNumber,
            4 AS requestType,
            AgreementFinance.financeType AS adjustmentType

            -- Agreement finance modules
            FROM Approval
            INNER JOIN ApprovalRoles ON ApprovalRoles.approvalId = Approval.id
            INNER JOIN AgreementFinance ON Approval.resourceId = AgreementFinance.id AND Approval.resourceType = 'AgreementFinance'
            INNER JOIN Agreement ON AgreementFinance.agreementId = Agreement.id
            ${isQuotationTable ? 'LEFT OUTER JOIN [Quotation] AS [fa] ON (AgreementFinance.agreementId = [fa].[cemeteryAgreementId] or AgreementFinance.agreementId = [fa].[funeralAgreementId])' : ''}
            LEFT OUTER JOIN Addendum ON AgreementFinance.addendumId = Addendum.id
            LEFT OUTER JOIN [User] RequestedByUser ON RequestedByUser.id = Approval.requestedBy
            LEFT OUTER JOIN [User] ApprovedOrRejectedByUser ON ApprovedOrRejectedByUser.id = Approval.approvedOrRejectedBy
            
            UNION ALL

            SELECT
            Approval.*,
            ${isQuotationTable ? ' fa.quotationNumber as quotationNumber, ' : ''}
            Approval.id as approvalId,
            ApprovalRoles.roleId as approvalTableRoleId,
            RequestedByUser.id as requestedByUserId,
            RequestedByUser.name as requestedByUserName,
            ApprovedOrRejectedByUser.id as approvedOrRejectedByUserId,
            ApprovedOrRejectedByUser.name as approvedOrRejectedByUserName,
            null as agreementAdjustmentId,
            null as adjustmentId,
            null as description,
            null as adjustmentTableId,
            null as title,
            null as adjustmentTypeId,
            Addendum.id as addendumTableId,
            null as agreementFinanceId,
            null as financeAgreementId,
            null as financeType,
            null as agreementTableIdForFinance,
            null as contractNumberForFinance,
            AgreementProperty.agreementId AS agreementId,
            AgreementProperty.addendumId AS addendumId,
            CASE 
                WHEN Addendum.id is not null
                THEN Addendum.addendumNumber
                ELSE Agreement.contractNumber
            END AS combinedContractNumber,
            5 AS requestType, -- This is a wrong way. Don't know why this is being followed
            null AS adjustmentType

            -- Agreement property modules
            FROM Approval
            INNER JOIN ApprovalRoles ON ApprovalRoles.approvalId = Approval.id
            INNER JOIN AgreementProperty ON Approval.resourceId = AgreementProperty.id AND Approval.resourceType = 'AgreementProperty'
            INNER JOIN Agreement ON AgreementProperty.agreementId = Agreement.id
            ${isQuotationTable ? 'LEFT OUTER JOIN [Quotation] AS [fa] ON (AgreementProperty.agreementId = [fa].[cemeteryAgreementId] or AgreementProperty.agreementId = [fa].[funeralAgreementId])' : ''}
            LEFT OUTER JOIN Addendum ON AgreementProperty.addendumId = Addendum.id
            LEFT OUTER JOIN [User] RequestedByUser ON RequestedByUser.id = Approval.requestedBy
            LEFT OUTER JOIN [User] ApprovedOrRejectedByUser ON ApprovedOrRejectedByUser.id = Approval.approvedOrRejectedBy
            WHERE AgreementProperty.deletedAt IS NULL) result
            ${whereClause} ${whereClauseAdjustment} ${sortOrder} ${pagination}`

        return {
            query: newQuery,
            status
        }
    }

    /**
   * this method added the users who can approve the request into the approvalParticpants table
   * @param {*} queryObj includes viewHistory, page, limit. requestedBy, requestType based on adjustmenttype
   * @returns {Object[]} approvals[] The list of approvals based on query akf s
   * page, no from where next data is to be fetched
   * limit, no of records to be served per request
   * viewHistory,  toggle to show either the pending requests or the accepted/Declined list, by default false
   * requestedBy id of the requesting user
   * requestType, of the adjustment
   */

    static async getListOfApprovals (queryObj, currentUser) {
        try {
            let isExist = await isTableExist('Quotation')
            let query = this.prototype._getListQuery(queryObj, 1, currentUser, isExist)
            let countQuery = this.prototype._getListQuery(queryObj, 0, currentUser, isExist)

            let approvalList = await models.sequelize.query(`${query.query}`, {
                type: models.sequelize.QueryTypes.SELECT,
                replacements: {
                    status: query.status,
                    adjustmentTypeId: Number(queryObj.requestType),
                    requestedBy: Number(queryObj.requestedBy),
                    offset: queryObj.page
                        ? (Number(queryObj.page) - 1) * Number(queryObj.limit)
                        : 0,
                    limit: queryObj.limit ? Number(queryObj.limit) : 10
                }
            })
            let count = await models.sequelize.query(`select count(*) as count from (${countQuery.query}) as approval`, {
                type: models.sequelize.QueryTypes.SELECT,
                replacements: {
                    status: query.status,
                    adjustmentTypeId: parseInt(queryObj.requestType),
                    requestedBy: queryObj.requestedBy
                }
            })

            approvalList = approvalList.map(approval => {
                let approvedOrRejectedBy = {}
                if (approval.approvedOrRejectedByUserId && approval.approvedOrRejectedByUserName) {
                    approvedOrRejectedBy = {
                        id: approval.approvedOrRejectedByUserId, name: approval.approvedOrRejectedByUserName
                    }
                }
                return ({
                    approvalId: approval.approvalId,
                    contractNumber: approval.combinedContractNumber || approval.quotationNumber,
                    requestedAt: approval.createdAt,
                    requestedBy: { id: approval.requestedByUserId, name: approval.requestedByUserName },
                    approvedOrRejectedOn: approval.approvedOrRejectedAt,
                    approvedOrRejectedBy,
                    status: this.ApprovalStatusStr(approval.status),
                    requestType: approval.requestType,
                    adjustmentType: approval.adjustmentType
                })
            })
            return {
                count: count[0].count,
                rows: approvalList
            }
        } catch (err) {
            throw new Error(err)
        }
    }

    async getAjustmentApprovalDetails (resourceType) {
        try {
            if (resourceType === 'AgreementProperty') {
                const reservationController = new ReservationController()
                const approvalDetails = await reservationController.getApprovalDetails(this.approvalId)
                return approvalDetails
            }
            await this._loadApproval()
            let approvalRoles
            if (this.approval.approvalRoles.roleId) {
                approvalRoles = [this.approval.approvalRoles.userId]
            } else {
                approvalRoles = _.map(
                    this.approval.approvalRoles,
                    'roleId'
                )
            }

            if (!approvalRoles.find(roleId => roleId === this.currentUser.userRoleId)) {
                throw new Error('User doesnot have permission to access this resource')
            }
            let isQuotationAgreement
            // checking if request is linked with quotaion
            if (!ApprovalsController.fetchAgreementOrAddendumDetails(this.approval, 'contractNumber')) {
                let agreementId = (this.approval.agreementAdjustment || {}).agreementId ? (this.approval.agreementAdjustment || {}).agreementId : (this.approval.agreementFinance || {}).agreementId
                let isExist = await isTableExist('Quotation')
                if (agreementId && isExist) {
                    [isQuotationAgreement] = await models.sequelize.query(`
                    SELECT 
                       quotationNumber 
                    FROM 
                       Quotation 
                    WHERE 
                       (cemeteryAgreementId = :agreementId OR funeralAgreementId = :agreementId)
                    `, {
                        type: models.sequelize.QueryTypes.SELECT,
                        replacements: {
                            agreementId: agreementId
                        }
                    })
                }
            }
            let docs = this.approval.agreementAdjustment ? (this.approval.agreementAdjustment.adjustmentDocuments).concat(this.approval.agreementAdjustment.agreementAdjustmentDocuments) : []
            const containerName = process.env.AZURE_CONTAINERNAME + '/'
            return {
                approvalId: this.approval.id,
                contractNumber: ApprovalsController.fetchAgreementOrAddendumDetails(this.approval, 'contractNumber') || (isQuotationAgreement || {}).quotationNumber,
                requestedAt: this.approval.createdAt,
                requestedBy: this.approval.requestedUser,
                approvedOrRejectedOn: this.approval.approvedOrRejectedAt,
                approvedOrRejectedBy: this.approval.approvedOrRejectedByUser,
                status: ApprovalsController.ApprovalStatusStr(this.approval.status),
                requestType: this.approval.agreementAdjustment ? this.approval.agreementAdjustment.Adjustment.adjustmentTypeId : (this.approval.agreementFinance ? 4 : '-'),
                adjustmentType: this.approval.agreementAdjustment ? this.approval.agreementAdjustment.Adjustment.title : this.approval.agreementFinance.financeType,
                amount: ApprovalsController.fetchAgreementOrAddendumDetails(this.approval, 'totalPrice'),
                percentage: ApprovalsController.fetchAgreementOrAddendumDetails(this.approval, 'percentage'),
                adjustmentAmount: ApprovalsController.fetchAgreementOrAddendumDetails(this.approval, 'adjustmentAmount'),
                approvalReason: this.approval.agreementAdjustment ? this.approval.agreementAdjustment.description : '',
                documents: docs && docs.length ? await Promise.all(docs.map(async row => {
                    row = row.toJSON()
                    if ((row.originalFileName) || row.fileUrl) {
                        if (row.fileUrl) {
                            row.originalFileName = row.fileUrl.split(`${containerName}`)[1].split('?')[0]
                            return row
                        } else {
                            row.fileUrl = await commonDownloadFileWithSignature(row, row.originalFileName)
                            return row
                        }
                    }
                })
                ) : [],
                actionNotes: this.approval.actionNotes,
                ...this._returnFinanceDetails()
            }
        } catch (error) {
            throw error
        }
    }

    _returnFinanceDetails () {
        if (this.approval.agreementFinance) {
            const financeDetails = this.approval.agreementFinance
            return {
                financedAmount: financeDetails.financedAmount,
                downPaymentAmount: financeDetails.downPaymentAmount,
                downPaymentPercent: financeDetails.downPaymentPercent,
                interestAmount: financeDetails.interestAmount,
                tenureMonths: financeDetails.tenureMonths,
                mothlyRepayment: financeDetails.financeType === 'Special-equal' ? financeDetails.agreementFinanceSchedule[0].expectedPaymentAmount : '',
                agreementFinanceSchedule: _.sortBy(financeDetails.agreementFinanceSchedule, payment => {
                    return payment.paymentIndex
                })
            }
        }
        return null
    }

    static fetchAgreementOrAddendumDetails (approvalDetails, field) {
        const AgreementController = require('../agreementController/agreementController')
        // added the above import as fix for CCS-9753

        let resourceType = ''
        if (approvalDetails.resourceType === 'AgreementFinance') {
            resourceType = 'agreementFinance'
        } else if (approvalDetails.resourceType === 'AgreementAdjustment') {
            resourceType = 'agreementAdjustment'
        }

        switch (field) {
        case 'contractNumber':
            const contractNumber = _.get(approvalDetails[resourceType], 'agreement.contractNumber')
            return _.get(approvalDetails[resourceType], 'addendum.addendumNumber', contractNumber)
        case 'type':
            const agreementType = _.get(approvalDetails[resourceType], 'agreement.type')
            const type = AgreementController.TYPES['Funeral'] === _.get(approvalDetails[resourceType], 'addendum.Agreement.type', agreementType) ? 'Statement' : 'Contract'
            return type
        case 'totalPrice':
            return _.get(approvalDetails[resourceType], 'addendum.agreement.totalPrice', _.get(approvalDetails[resourceType], 'agreement.totalPrice'))
        case 'adjustmentAmount':
            return _.get(approvalDetails[resourceType], 'amount') || _.get(approvalDetails[resourceType], 'totalAmount')
        case 'percentage':
            const amount = _.get(approvalDetails[resourceType], 'amount') || _.get(approvalDetails[resourceType], 'totalAmount')
            const totalPrice = _.get(approvalDetails[resourceType], 'addendum.agreement.totalPrice', _.get(approvalDetails[resourceType], 'agreement.totalPrice'))
            const percentage = _.get(approvalDetails[resourceType], 'percentage') || ((amount * 100) / totalPrice).toFixed(2)
            return percentage
        default:
            return resourceType
        }
    }

    static removeApprovalRequest (whereConditions, userId, transaction) {
        return models.Approval.update({
            deletedBy: userId,
            deletedAt: moment().format('YYYY/MM/DD HH:mm:ss')
        }, {
            where: whereConditions,
            transaction
        })
    }

    async smsApproval (reqBody) {
        const { queueNames, queues } = require('../../../appQueues')
        let fromNo = _.get(reqBody, 'from.phoneNumber', false)
        if (fromNo) {
            const adjustmentStatusWebhookWorker = queues[queueNames.adjustmentStatusWebhookWorker]
            adjustmentStatusWebhookWorker.add('adjustmentStatusWebhookWorker', reqBody)
            return reqBody
        }
    }
}

module.exports = exports = ApprovalsController
