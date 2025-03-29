const models = require('../../../../models')
const moment = require('moment')
const Sequelize = require('sequelize')
const Op = Sequelize.Op

async function deleteAnRemainsInfoTransferInfo (personId, transferId, userId) {
    try {
        let anRemainsInfo = await models.AnRemainsInfo.findOne({
            where: {
                PersonId: personId
            }
        })
        if (anRemainsInfo) {
            let updateObj = { UpdatedBy: userId, DeletedBy: userId, DeletedAt: moment().format('YYYY-MM-DD') }
            let result = await models.AnRemainsTransfer.update(updateObj, {
                where: { AnRemainsId: anRemainsInfo.id, Identifier: transferId, IsTransferComplete: { [Op.or]: [false, null] } }
            })
            if (result[0] === 1) {
                const message = 'Transfer has been deleted successfully'
                return message
            } else if (result[0] === 0) {
                throw new Error('Transfer can not be deleted')
            } else {
                throw new Error('Transfer not found')
            }
        } else {
            throw new Error('Person not found')
        }
    } catch (error) {
        throw error
    }
}

module.exports = exports = deleteAnRemainsInfoTransferInfo
