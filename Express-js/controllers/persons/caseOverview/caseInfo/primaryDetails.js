const { sequelize, Person, PersonInfo } = require('../../../../models')

async function updatePrimaryDetails (personId, reqBody) {
    const t = await sequelize.transaction()

    try {
        const person = await Person.findByPk(personId)

        if (!person) {
            throw new Error('PERSON_NOT_FOUND')
        }

        if (!person.isVerified) {
            throw new Error('PERSON_NOT_VERIFIED')
        }

        const personInfo = reqBody.PersonInformation
        delete reqBody.PersonInformation

        // updating personDetails
        await person.update(reqBody, { individualHooks: true })

        // updating personInfo details
        await PersonInfo.update(personInfo, {
            where: {
                personId: personId
            }
        })

        await t.commit()
        return true
    } catch (error) {
        await t.rollback()
        throw error
    }
}

async function getPrimaryDetails (personId, isJson) {
    try {
        const primaryDetails = await Person.findOne({
            where: {
                id: personId
            },
            attributes: { include: ['ssn'] },
            include: [
                {
                    model: PersonInfo,
                    as: 'PersonInformation',
                    attributes: ['birthState', 'birthCountry', 'maidenName']
                }
            ]
        })
        if (primaryDetails) {
            if (isJson) {
                let details = primaryDetails.toJSON()
                let resObj = {
                    ...details
                }
                resObj.birthState = details.PersonInformation.birthState
                resObj.birthCountry = details.PersonInformation.birthCountry
                resObj.maidenName = details.PersonInformation.maidenName
                delete resObj.PersonInformation
                return resObj
            } else {
                return primaryDetails
            }
        } else {
            throw new Error('PERSON_NOT_FOUND')
        }
    } catch (error) {
        throw error
    }
}

module.exports = {
    updatePrimaryDetails,
    getPrimaryDetails
}
