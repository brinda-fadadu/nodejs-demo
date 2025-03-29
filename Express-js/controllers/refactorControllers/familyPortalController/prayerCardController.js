const moment = require('moment')
const models = require('../../../models')
const logger = require('../../../lib/logger')

class PrayerCardController {
    /**
     *
     * @param {Object<{onePortalId: String}>} queryObj
     */
    static async getPrayerCard (queryObj) {
        try {
            if (!queryObj.onePortalId) {
                throw new Error('INVALID_ONE_PORTAL_ID')
            }
            const decedent = await models.PersonVerificationDetails.findOne({
                where: queryObj
            })
            const prayerCard = await models.PrayerCard.findOne({
                where: {
                    personId: decedent.personId
                }
            })
            return {
                prayerCard
            }
        } catch (error) {
            logger.error(error)
            throw error
        }
    }

    /**
     *
     * @param {Number} decedentId
     * @param {Object<{frontPageURL: String, backPageURL: String}>} data
     */
    static async savePrayerCard (decedentId, data, transaction) {
        try {
            if (!decedentId) {
                throw new Error('INVALID_DECEDENT_ID')
            }
            if (!data.frontPageURL) {
                throw new Error('INVALID_FRONT_PAGE_URL')
            }
            if (!data.backPageURL) {
                throw new Error('INVALID_BACK_PAGE_URL')
            }

            let prayerCardObj = {
                personId: decedentId,
                frontPageURL: data.frontPageURL,
                backPageURL: data.backPageURL,
                isLocked: false,
                lastSubmittedAt: moment().format(),
                isCustom: data.isCustom
            }
            let prayerCard = await models.PrayerCard.findOne({
                where: {
                    personId: decedentId
                },
                transaction
            })
            if (prayerCard) {
                prayerCard.set(prayerCardObj)
                await prayerCard.save({ transaction })
            } else {
                await models.PrayerCard.create(prayerCardObj, { transaction })
            }
        } catch (error) {
            logger.error(error)
            throw error
        }
    }

    /**
     *
     * @param {Number} decedentId
     * @param {Boolean} lockStatus
     */
    static async setPrayerCardLock (decedentId, lockStatus) {
        const transaction = await models.sequelize.transaction()
        try {
            if (!decedentId) {
                throw new Error('INVALID_DECEDENT_ID')
            }
            const prayerCard = await models.PrayerCard.findOne({
                where: { personId: decedentId },
                transaction
            })
            prayerCard.set({ isLocked: lockStatus })
            await prayerCard.save({ transaction })
            await transaction.commit()
        } catch (err) {
            await transaction.rollback()
            logger.error(err)
            throw err
        }
    }
}

module.exports = PrayerCardController
