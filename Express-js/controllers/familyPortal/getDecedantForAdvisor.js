const models = require('../../models')

exports.listDecedant = async (queryObj) => {
    try {
        let decedent = await models.SomeOnePassed.findAll({
            where: queryObj,
            include: [
                {
                    model: models.Person,
                    as: 'decedent',
                    attributes: ['id', 'prefix', 'onePortalId', 'firstName', 'lastName', 'middleName', 'phoneNumber', 'email', 'dateOfBirth', 'dateOfDeath'],
                    where: {
                        isVerified: true
                    }
                }
            ],
            attributes: ['id', 'requiredService', 'arrangerEmail'],
            distinct: true
        })
        return decedent
    } catch (err) {
        throw err
    }
}
