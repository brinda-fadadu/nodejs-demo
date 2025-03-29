const moment = require('moment')
const models = require('../../../models')
const { upsert } = require('../utils')
const AgreementPropertyAdditionalRights = require('./agreementPropertyAdditionalRights')

class SideBySidePropertyController {
    constructor (agreementId, sideBySidePropertyId) {
        this.agreementId = agreementId
        this.sideBySidePropertyId = sideBySidePropertyId
    }

    /**
     * update or create a new sideBySideProperty
     * @param {object} data is the reqBody object
     * @param {object} user is the object containing user details
     */
    async upsertSideBySideProperty (data, user) {
        const AgreementController = require('./agreementController')
        const sideBySidePayload = {
            id: this.sideBySidePropertyId,
            agreementId: this.agreementId,
            ...data
        }
        // Checking the existence of agreement
        const agreementController = new AgreementController(this.agreementId)
        await agreementController.getAgreementDetails()

        // Checking the existence of agreementProperty
        if (data.leftAgreementPropertyId || data.rightAgreementPropertyId) {
            const leftAdditionalRightController = new AgreementPropertyAdditionalRights(this.agreementId, data.leftAgreementPropertyId)
            const rightAdditionalRightController = new AgreementPropertyAdditionalRights(this.agreementId, data.rightAgreementPropertyId)
            await leftAdditionalRightController.fetchCompletedAgreementProperty()
            await rightAdditionalRightController.fetchCompletedAgreementProperty()
        }
        return upsert('SideBySideProperty', sideBySidePayload, undefined, { userId: user.id })
    }

    /**
     * get sideBySideProperty details
     */
    async getSideBySideProperty () {
        const sideBySideProperty = await models.SideBySideProperty.findOne({
            where: {
                id: this.sideBySidePropertyId
            }
        })
        if (!sideBySideProperty) {
            throw new Error('SIDE_BY_SIDE_PROPERTY_NOT_AVAILABLE')
        }
    }

    /**
     * delete Side By Side Property while releasing the property
     * @param {array} otherGardenProperties is the array of otherGardenProperties
     * @param {object} user is the object containing user details
     * @param {object} transaction is the object for DB transaction
     */
    deleteSideBySideWhileRelease (otherGardenProperties, user = {}, transaction) {
        const agreementPropertyIds = otherGardenProperties.map(x => x.id)
        return models.SideBySideProperty.update(
            {
                deletedAt: moment().format(),
                deletedBy: user.id
            }, {
                where: {
                    agreementId: this.agreementId,
                    [models.Sequelize.Op.or]: [
                        {
                            leftAgreementPropertyId: {
                                [models.Sequelize.Op.in]: agreementPropertyIds
                            }
                        },
                        {
                            rightAgreementPropertyId: {
                                [models.Sequelize.Op.in]: agreementPropertyIds
                            }
                        }
                    ]
                },
                transaction
            }
        )
    }

    /**
     * soft delete sideBySideProperty
     * @param {object} user is the object containing user details
     */
    deleteSideBySideProperty (user) {
        const deleteSideBySidePayload = {
            deletedAt: moment().format(),
            deletedBy: user.id
        }
        return this.upsertSideBySideProperty(deleteSideBySidePayload, user)
    }

    /**
     * Listing all the sideBySideProperties of an agreement
     */
    listSideBySideProperties () {
        return models.SideBySideProperty.findAll({
            where: {
                agreementId: this.agreementId,
                deletedBy: null,
                deletedAt: null
            }
        })
    }
}

module.exports = SideBySidePropertyController
