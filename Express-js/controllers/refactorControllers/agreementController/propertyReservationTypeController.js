const models = require('../../../models')
const moment = require('moment')
const _ = require('lodash')
const { Op } = require('sequelize')

const RESERVATION_TYPE = {
    GURANTEED: 'Guaranteed',
    NON_GURANTEED: 'Non-Guaranteed',
    AT_NEED: 'At-Need'
}

class PropertyReservationController {
    constructor (agreementId) {
        this.agreementId = agreementId
    }

    /**
     * Fetch AN / PN Case Detail for Agreement
     */
    async getANorPN () {
        const query = `SELECT
        p.isAlive
        FROM AgreementPerson agp
        INNER JOIN Person AS p ON p.id = agp.personId
        WHERE agreementId=${this.agreementId} AND isAlive = 0`
        const isANorPN = await models.sequelize.query(query,
            { type: models.sequelize.QueryTypes.SELECT })

        return isANorPN
    }

    /**
     * Get Reservation type for PN Case
     */
    async getReservationTypeForPN (agreementId) {
        const PayorController = require('../paymentController/payerController')
        let reservation = RESERVATION_TYPE.NON_GURANTEED
        let expiry = moment().add(7, 'days').format()
        const payorController = new PayorController()
        payorController.setResource(agreementId)
        const payment = await payorController.getCartDetails()
        const minimumPaymentRequired = payment.totalCashPrice * 5 / 100
        if (payment.totalPaid !== 0 && payment.totalPaid >= minimumPaymentRequired) {
            reservation = RESERVATION_TYPE.GURANTEED
            expiry = null
        }
        return {
            reservationType: reservation,
            expiryDate: expiry
        }
    }

    /**
     * Get Reservation type for AN Case
     */
    async getReservationTypeForAN () {
        return RESERVATION_TYPE.AT_NEED
    }

    /**
     * Get Reservation type for Property
     */
    async getReservationType () {
        const isANorPN = await this.getANorPN()
        let reservationType, expiryDate

        if (isANorPN && isANorPN.length) {
            reservationType = await this.getReservationTypeForAN()
            expiryDate = null
        } else {
            const reservationObj = await this.getReservationTypeForPN(this.agreementId)
            reservationType = reservationObj.reservationType
            expiryDate = reservationObj.expiryDate
        }

        return {
            reservationType,
            expiryDate
        }
    }

    /**
     * Method to fetch the reserved agreementProperty
     * @param {*} agreementPropertyId is the id of the agreement property
     * @param {*} transaction is the object for DB transaction
     */
    async _getReservedAgreementProperty (agreementPropertyId, transaction) {
        const agreementProperty = await models.AgreementProperty.findOne({
            where: {
                id: agreementPropertyId
            },
            transaction
        })
        if (!agreementProperty) {
            throw new Error('RESERVATION_NOT_FOUND')
        }
        return agreementProperty
    }

    /**
     * Method to update the extended expiry date
     * @param {*} agreementPropertyId is the id of the agreement property
     * @param {*} data is the req body for that contains extended expiry date and notes
     * @param {*} user is the object of current user details
     */
    async extendExpiryDate (agreementPropertyId, data, user = {}) {
        let transaction
        const ApprovalsController = require('../adjustmentController/approvalsController')
        try {
            transaction = await models.sequelize.transaction()
            let agreementProperty = await this._getReservedAgreementProperty(agreementPropertyId, transaction)
            const { extensionDate, note } = data
            const existingExpiryDate = _.get(agreementProperty, 'expiryDate')
            if (!existingExpiryDate || moment(existingExpiryDate).format() > extensionDate) {
                throw new Error('EXTENDED_EXPIRY_DATE_INCORRECT')
            }

            const approvalDetails = await models.Approval.findOne({
                where: {
                    resourceId: agreementProperty.id,
                    resourceType: 'AgreementProperty',
                    deletedBy: null
                },
                transaction
            })
            if (approvalDetails) {
                throw new Error('ALREADY_REQUESTED_FOR_EXTENSION')
            }

            // Adding a new row in approval table
            const approvalReqBody = {
                resourceType: 'AgreementProperty',
                resourceId: agreementProperty.id,
                status: ApprovalsController.ApprovalStatus['Pending'],
                requestedBy: user.id,
                createdBy: user.id,
                updatedBy: user.id,
                requestInformation: JSON.stringify({
                    'extensionDate': moment(extensionDate).format(), 'notes': note
                })
            }
            const createdApproval = await ApprovalsController.createApproval(approvalReqBody, transaction)
            const approvalRolePayload = await this._fetchPayloadForApprovalRoles(createdApproval.id, transaction)
            await models.ApprovalRoles.bulkCreate(approvalRolePayload, { transaction })
            const { queueNames, queues } = require('../../../appQueues')
            const reservationEmailWorker = queues[queueNames.reservation_email_queue]
            const agreementDetails = await models.Agreement.findOne({
                where: {
                    id: this.agreementId
                },
                attributes: ['contractNumber'],
                transaction
            })
            const dataToSend = {
                approvalId: createdApproval.id,
                requestor: _.get(user, 'name', ''),
                contractNumber: _.get(agreementDetails, 'contractNumber', ''),
                extensionDate: moment(extensionDate).format('MM/DD/YYYY'),
                notes: note,
                propertyId: agreementProperty.propertyId,
                expiryDate: moment(existingExpiryDate).format('MM/DD/YYYY'),
                approvalRoles: _.map(approvalRolePayload, 'roleId'),
                reservationType: agreementProperty.reservationType,
                agreementPropertyId: agreementPropertyId
            }
            reservationEmailWorker.add('reservationEmailWorker', dataToSend)
            await transaction.commit()
            return agreementProperty
        } catch (error) {
            await transaction.rollback()
            throw error
        }
    }

    /**
     * Method to create payload for approval roles bulk insert
     * @param {*} approvalId is the id of the approval
     * @param {*} transaction is the object for sequelize transaction
     */
    async _fetchPayloadForApprovalRoles (approvalId, transaction) {
        const approvalRoles = await models.AgreementPropertyApprovalRoles.findAll({ transaction })
        return approvalRoles.map(eachApprovalRole => {
            return {
                roleId: eachApprovalRole.roleId,
                approvalId
            }
        })
    }

    /**
     * Get approval details with property info
     * @param {*} approvalId is the id of the approval instance
     * @param {*} transaction is the object of DB transaction
     */
    async getApprovalDetails (approvalId, transaction) {
        const ApprovalsController = require('../adjustmentController/approvalsController')
        const query = `SELECT 
        Approval.id,
        ad.addendumNumber,
        a.contractNumber as agreementNumber,
        CASE WHEN ad.addendumNumber IS NOT NULL
            THEN ad.addendumNumber
            ELSE a.contractNumber
        END as contractNumber,
        Approval.resourceId as agreementPropertyId,
        p.ecfAmount,
        ap.expiryDate,
        CASE WHEN pt.name = 'Grave'
        THEN 1 
        ELSE 
        ISNULL(itr.rights,0)
        END AS rights, 
        CASE WHEN pt.name = 'Grave' THEN 4 ELSE 
            ISNULL(itr.maxRights,0) END AS maxRights, 
        CASE WHEN pt.name = 'Grave'  THEN 1 ELSE 
        ISNULL(itr.graves,0) END AS graves,
        (
            SELECT Count(*) FROM
            AgreementPropertyAdditionalRight apr
            WHERE apr.deletedBy is NULL AND apr.deletedAt is NULL AND apr.agreementPropertyId = ap.id
        ) AS totalRights,
        p.name,
        p.price,
        pc.name as propertyCampus,
        pg.name AS propertyGarden,
        p.propertyGardenId,
        p.propertyItemCode,
        ap.reservationStatus,
        ap.reservationType,
        aip.totalPrice as total,
        Approval.requestInformation,
        Approval.resourceType,
        Approval.status,
        Approval.approvedOrRejectedAt,
        5 AS requestType, -- This is a wrong way. Don't know why this is being followed
        ApprovedOrRejectedByUser.name as approvedOrRejectedByUserName,
        Person.firstName as beneficiaryFirstName,
        Person.middleName as beneficiaryMiddleName,
        Person.lastName as beneficiaryLastName,
        RequestedByUser.name as requestedByUserName

        FROM Approval
        INNER JOIN AgreementProperty ap ON Approval.resourceId = ap.id AND Approval.resourceType='AgreementProperty'
        INNER JOIN Agreement a ON ap.agreementId = a.id
        INNER JOIN AgreementPerson agp ON a.id = agp.agreementId AND agp.isOwner = 1
        INNER JOIN Person ON agp.personId = Person.id
        LEFT OUTER JOIN Addendum ad ON ad.id = ap.addendumId 
        LEFT OUTER JOIN AgreementItemPrice aip ON ap.agreementItemPriceId = aip.id
        INNER JOIN Property p ON ap.propertyId = p.id
        INNER JOIN PropertyGarden pg ON pg.id = p.propertyGardenId
        INNER JOIN PropertyCampus pc ON pc.id = pg.propertyCampusId 
        INNER JOIN PropertyTypeCode ptc ON ptc.id = p.propertyTypeCodeId  
        INNER JOIN PropertyType pt ON pt.id = ptc.propertyTypeId  
        LEFT OUTER JOIN [User] RequestedByUser ON RequestedByUser.id = Approval.requestedBy
        LEFT OUTER JOIN IntermentRights itr ON itr.propertyCampusId = pc.id AND itr.propertyTypeId = pt.id
        LEFT OUTER JOIN [User] ApprovedOrRejectedByUser ON ApprovedOrRejectedByUser.id = Approval.approvedOrRejectedBy
        WHERE Approval.id = ${approvalId} AND ap.deletedAt IS NULL AND itr.graves = (CASE WHEN pt.name = 'Grave' THEN 1 ELSE itr.graves END )`

        const [approvalDetailsResult] = await models.sequelize.query(query, {
            type: models.sequelize.QueryTypes.SELECT,
            transaction
        })

        if (!approvalDetailsResult) {
            throw new Error('APPROVAL_NOT_FOUND')
        }

        approvalDetailsResult.status = ApprovalsController.ApprovalStatusStr(approvalDetailsResult.status)
        approvalDetailsResult.requestInformation = JSON.parse(approvalDetailsResult.requestInformation)
        approvalDetailsResult.totalRights = approvalDetailsResult.rights + approvalDetailsResult.totalRights
        return approvalDetailsResult
    }

    /**
     * Update the approval status for agreement property
     * @param {*} approvalId is the id of the approval instance
     * @param {*} transaction is the object of DB transaction
     */
    async _getApproval (approvalId, transaction) {
        const approvalDetailsResult = await models.Approval.findOne({
            where: {
                id: approvalId
            },
            include: [
                {
                    model: models.AgreementProperty,
                    as: 'agreementProperty'
                }
            ],
            transaction
        })
        if (!approvalDetailsResult || approvalDetailsResult.resourceType !== 'AgreementProperty') {
            throw new Error('APPROVAL_NOT_FOUND')
        }
        return approvalDetailsResult
    }

    /**
     * Update the approval status for agreement property
     * @param {*} approvalId is the id of the approval instance
     * @param {*} data is the req body
     * @param {*} transaction is the object of DB transaction
     */
    async updateExpiryApprovalRequest (approvalId, data, transaction) {
        const ApprovalsController = require('../adjustmentController/approvalsController')
        let approvalDetails = await this._getApproval(approvalId, transaction)
        if (approvalDetails.status !== ApprovalsController.ApprovalStatus['Pending']) {
            throw new Error(`REQUEST_IS_${ApprovalsController.ApprovalStatusStr(approvalDetails.status).toUpperCase()}`)
        }
        if (data.status.toUpperCase() === 'APPROVED') {
            const extendedExpiryDate = _.get(JSON.parse(approvalDetails.requestInformation), 'extensionDate', null)
            approvalDetails.agreementProperty.set({ expiryDate: extendedExpiryDate })
            await approvalDetails.agreementProperty.save({ transaction })
        }
        approvalDetails.set({
            status: ApprovalsController.ApprovalStatus[data.status],
            approvedOrRejectedBy: data.currentUser.id,
            updatedBy: data.currentUser.id,
            actionNotes: data.actionNotes,
            approvedOrRejectedAt: moment().format('YYYY-MM-DD HH:mm:ss')
        })
        approvalDetails = await approvalDetails.save({ transaction })
        return approvalDetails
    }

    /**
     * Update Reservation Type
     */
    static async updateReservationType () {
        try {
            const AgreementProperty = require('./agreementPropertiesController')
            const query = `SELECT 
                *
                FROM AgreementProperty
                WHERE expiryDate IS NOT NULL AND deletedAt IS NULL 
                AND expiryDate < GETDATE()`

            let expiredProperty = await models.sequelize.query(query,
                { type: models.sequelize.QueryTypes.SELECT })

            for (const eachAgreementProperty of expiredProperty) {
                const propertyReservationController = new PropertyReservationController(eachAgreementProperty.agreementId)
                const { reservationType } = await propertyReservationController.getReservationTypeForPN(eachAgreementProperty.agreementId)
                const payload = { expiryDate: null }
                if (reservationType === RESERVATION_TYPE.GURANTEED) {
                    payload.reservationType = RESERVATION_TYPE.GURANTEED
                } else {
                    const agreementProperty = new AgreementProperty(eachAgreementProperty.agreementId)
                    await agreementProperty.releaseProperty(eachAgreementProperty.propertyId, {})
                }
                await models.AgreementProperty.update(payload, {
                    where: { id: eachAgreementProperty.id }
                })
            }
        } catch (err) {
            throw err
        }
    }

    /**
     * Update Reservation Type on payments
     */
    async updateReservationTypeOnPayment () {
        const { reservationType } = await this.getReservationTypeForPN(this.agreementId)
        const isNonGuaranteedPropertyExist = await models.AgreementProperty.findOne({
            where: {
                agreementId: this.agreementId,
                expiryDate: { [Op.ne]: null },
                reservationType: RESERVATION_TYPE.NON_GURANTEED
            }
        })
        if (reservationType === RESERVATION_TYPE.GURANTEED && isNonGuaranteedPropertyExist) {
            await models.AgreementProperty.update({
                reservationType: RESERVATION_TYPE.GURANTEED,
                expiryDate: null
            }, {
                where: {
                    agreementId: this.agreementId
                }
            })
        }
    }
}

module.exports = PropertyReservationController
