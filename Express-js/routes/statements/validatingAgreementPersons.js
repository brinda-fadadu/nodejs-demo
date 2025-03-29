const models = require('../../models')
const _ = require('underscore')

async function validateAgreementPersons (personIds, t) {
    try {
        const uniquePersons = _.uniq(personIds)
        const persons = await models.Person.findAll({
            where: {
                id: uniquePersons
            },
            transaction: t
        })
        const isNotVerified = _.filter(persons, (e) => {
            return !e.isVerified
        })
        if (persons && persons.length === uniquePersons.length && isNotVerified.length > 0) {
            throw new Error('ENTER_VERIFIED_PERSONS')
        } if (persons && persons.length > 0 && persons.length !== uniquePersons.length) {
            throw new Error('ENTER_VERIFIED_AND_EXISTING_PERSONS')
        } else {
            return true
        }
    } catch (error) {
        throw error
    }
}

async function validateMultipleSameCoPurchasers (agreementPersons, coPurchaserRoleId) {
    try {
        let coPurchasers = _.filter(agreementPersons, (e) => {
            return e.roleId === coPurchaserRoleId
        })
        let tofilterIds = coPurchasers.map(e => {
            return e.personId
        })
        let hasDuplicates = false
        for (let index = 0; index < tofilterIds.length; index++) {
            const lastIndex = _.findLastIndex(tofilterIds, x => {
                return x === tofilterIds[index]
            })
            if (index !== lastIndex) {
                hasDuplicates = true
                break
            }
        }
        if (hasDuplicates) {
            throw new Error('MULTIPLE_SAME_COPURCHASERS')
        } else {
            return true
        }
    } catch (error) {
        throw error
    }
}
module.exports = {
    validateAgreementPersons,
    validateMultipleSameCoPurchasers
}
