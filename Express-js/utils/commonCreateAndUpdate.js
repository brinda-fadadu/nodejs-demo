const models = require('../models')
const { formatAddress } = require('../utils/addressValidation')

exports.createOrUpdate = async function (address) {
    let result
    let formatedAddress = await formatAddress(address)
    if (address.id) {
        const result = await models.Address.update(formatedAddress, {
            where: {
                id: address.id
            }
        })
        if (result && result[0]) {
            return address
        } else {
            throw new Error('ADDRESS_NOT_FOUND')
        }
    } else {
        result = await models.Address.create(formatedAddress)
    }
    return result
}

// TODO: Camel case
exports.validatePersonAndStatement = async function (statementId) {
    const result = await models.Statement.findOne({
        where: {
            id: statementId
        }
    })
    if (result) {
        return true
    } else {
        return false
    }
}
