const models = require('../models')

function placeIncludes (asTerm) {
    return [
        {
            model: models.Place,
            as: asTerm || 'place',
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

function locationIncludes (asTerm) {
    return [
        {
            model: models.Location,
            as: asTerm,
            include: [
                {
                    model: models.Place
                }
            ]
        }
    ]
}

function createUserInclude (asTerm) {
    return [
        {
            model: models.User,
            as: asTerm,
            attributes: [
                'Name',
                'id'
            ]
        }
    ]
}

module.exports = {
    createUserInclude,
    placeIncludes,
    locationIncludes
}
