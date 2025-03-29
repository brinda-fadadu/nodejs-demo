const models = require('../../../models/index')
const logger = require('../../../lib/logger')

async function isPersonFound (personId, isVerified) {
    const personData = await models.Person.findOne({ where: { id: personId } })
    if (!personData) {
        throw new Error('PERSON_NOT_FOUND')
    } else if (personData && !personData.isVerified) {
        throw new Error('PERSON_NOT_VERIFIED')
    }
}

function handleError (error) {
    let err, errorMsg
    switch (error.message) {
    case 'DUPLICATE_NOTIFIER':
        err = 'There is already one contact with Notifier Role'
        break
    case 'DUPLICATE_INFORMANT':
        err = 'There is already one contact with Informant Role'
        break
    case 'DUPLICATE_POWER_OF_ATTORNEY':
        err = 'There is already one contact with Power of Attorney Role'
        break
    case 'DUPLICATE_FUNERAL_AUTHORISER':
        err = 'There is already one contact with Funeral Authoriser Role'
        break
    case 'DUPLICATE_FATHER':
        err = 'There is already one contact with Father relation'
        break
    case 'DUPLICATE_MOTHER':
        err = 'There is already one contact with Mother relation'
        break
    case 'DUPLICATE_SPOUSE':
        err = 'There is already one contact with Spouse relation'
        break
    case 'DUPLICATE_ROLE_FOR_STAFF':
        err = 'This role is already assigned to this staff'
        break
    default:
        err = error
        break
    }
    errorMsg = err
    logger.error(errorMsg)
    throw errorMsg
}

async function notifierCheckForBeneficiary (personId, caseRoleId) {
    const beneficiaryPersonData = await models.Person.findOne({ where: {
        id: personId,
        IsVerified: 1,
        IsAlive: 1
    } }) // person is beneficiary or not
    if (beneficiaryPersonData) {
        const roleNotifierData = await models.Role.findOne({ where: { type: 'Contact', name: 'Notifier' } })
        if (roleNotifierData.id === caseRoleId) {
            const roleNotifierContact = await models.Contact.findOne({
                where: {
                    PersonId: personId,
                    RoleId: caseRoleId
                }
            })
            if (roleNotifierContact) {
                throw new Error('DUPLICATE_NOTIFIER')
            }
        }
    }
}

module.exports = exports = {
    isPersonFound,
    handleError,
    notifierCheckForBeneficiary
}
