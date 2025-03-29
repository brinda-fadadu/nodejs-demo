const {
    getLanguages,
} = require('../helper')
const moment = require('moment')

const faker = require('faker')
const { generateOnePortalId } = require('../../utils/dbGetFunctions')
let languages


async function personSchemaCreation() {
    try {
        languages = await getLanguages()
    
        personObj = {
            prefix: faker.name.prefix(),
            onePortalId: await generateOnePortalId(),
            licenseNumber: faker.internet.password(8),
            firstName: faker.name.firstName(),
            middleName: faker.name.firstName(),
            lastName: faker.name.lastName(),
            phoneNumber: faker.phone.phoneNumberFormat(1),
            secondaryPhoneNumber: faker.phone.phoneNumberFormat(1),
            email: faker.internet.email(),
            maritalStatus: 1,
            gender: 1,
            ssn: faker.random.number(),
            languageId: languages['English'],
            organizationId: 1,
            isVerified: true,
            verifiedAt: Date.now(),
            dateOfBirth: moment().subtract(60, 'year').format(),
            dateOfDeath: moment().subtract(1, 'day').format(),
            aka: faker.random.word(),
            suffix: 'abcd'
        }
    
        return personObj
    } catch (error) {
        console.log(error)
    }
}

module.exports = exports = personSchemaCreation;
