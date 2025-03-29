const moment = require('moment')
const models = require('../../../models')
const logger = require('../../../lib/logger')

class Program {
    /**
     *
     * @param {Object<{onePortalId: String}>} queryObj
     */
    static async getProgram (queryObj) {
        try {
            if (!queryObj.onePortalId) {
                throw new Error('INVALID_ONE_PORTAL_ID')
            }
            const decedent = await models.PersonVerificationDetails.findOne({
                where: queryObj
            })
            const program = await models.Program.findOne({
                where: {
                    personId: decedent.personId
                }
            })
            return {
                program
            }
        } catch (error) {
            logger.error(error)
            throw error
        }
    }

    /**
     *
     * @param {Number} decedentId
     * @param {Object<{mainPageURL: String, leftPageURL: String, rightPageURL: String, backPageURL: String}>} data
     */
    static async saveProgram (decedentId, data, transaction) {
        try {
            if (!decedentId) {
                throw new Error('INVALID_DECEDENT_ID')
            }
            if (!data.mainPageURL) {
                throw new Error('INVALID_MAIN_PAGE_URL')
            }
            if (!data.leftPageURL) {
                throw new Error('INVALID_LEFT_PAGE_URL')
            }
            if (!data.rightPageURL) {
                throw new Error('INVALID_RIGHT_PAGE_URL')
            }
            if (!data.backPageURL) {
                throw new Error('INVALID_BACK_PAGE_URL')
            }

            let programObj = {
                personId: decedentId,
                mainPageURL: data.mainPageURL,
                leftPageURL: data.leftPageURL,
                rightPageURL: data.rightPageURL,
                backPageURL: data.backPageURL,
                isLocked: false,
                lastSubmittedAt: moment().format()
            }
            let program = await models.Program.findOne({
                where: {
                    personId: decedentId
                },
                transaction
            })
            if (program) {
                program.set(programObj)
                await program.save({ transaction })
            } else {
                await models.Program.create(programObj, { transaction })
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
    static async setProgramLock (decedentId, lockStatus) {
        const transaction = await models.sequelize.transaction()
        try {
            if (!decedentId) {
                throw new Error('INVALID_DECEDENT_ID')
            }
            const program = await models.Program.findOne({
                where: { personId: decedentId },
                transaction
            })
            program.set({ isLocked: lockStatus })
            await program.save({ transaction })
            await transaction.commit()
        } catch (err) {
            await transaction.rollback()
            logger.error(err)
            throw err
        }
    }
}

module.exports = Program
