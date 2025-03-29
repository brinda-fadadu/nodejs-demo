function placeIncludes (alias) {
    const models = require('../../models')

    return [
        {
            model: models.Place,
            as: alias || 'place',
            include: [
                {
                    model: models.Organization,
                    as: 'organization'
                },
                {
                    model: models.Address,
                    as: 'address'
                }
            ]
        }
    ]
}

function personContactIncludes (roleId) {
    const models = require('../../models')
    return [
        {
            model: models.PersonContactRole,
            as: 'contactRoles',
            where: roleId ? {
                roleId: roleId
            } : {}
        }
    ]
}

function createUserInclude (asTerm, attributesList) {
    const models = require('../../models')
    try {
        return [
            {
                model: models.User,
                as: asTerm,
                attributes: attributesList
            }
        ]
    } catch (err) {
        console.log(err)
        throw err
    }
}

module.exports = {
    placeIncludes,
    personContactIncludes,
    createUserInclude
}
