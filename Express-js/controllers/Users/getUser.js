const models = require('../../models/index')

async function getUserDetails (userId) {
    try {
        const userDetails = await models.User.findOne({
            where: {
                ldapId: userId
            }
        })
        return userDetails
    } catch (error) {
        throw error
    }
}

module.exports = exports = getUserDetails
