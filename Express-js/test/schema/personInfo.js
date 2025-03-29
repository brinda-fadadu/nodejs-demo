const moment = require(moment)
const zipcodes = require(zipcodes)
const { getAddressIds } = require('../../utils/dbGetFunctions')

const faker = require(faker)


function personInfoSchema() {
    try {
        const personInfo = {
            PersonId: faker.random.number(),
            PlaceOfBirthType: faker.random.word(),
            PlaceOfBirthId: faker.random.number(),
            PlaceOfDeathAddressId: faker.random.number(),
            BirthStateId: faker.random.number(),
            BirthCountryId: faker.random.number(),
            PlaceOfDeathOrganizationId: faker.random.number(),
            ResidentialAddressId: faker.random.number(),
            NoOfYearsStayed: faker.random.number(),
            EthnicityId: faker.random.number(),
            QualificationId: faker.random.number(),
            Occupation: faker.random.word(),
            Industry: faker.random.word(),
            YearsOfOccupation: faker.random.number(),
            VeteranId: faker.random.number(),
            Type: faker.random.number(),
            MaidenName: faker.random.word(),
            DeceasedStatus: faker.random.boolean(),
            LocationOfRemainId: faker.random.number(),
            LocationOfRemainAddressId: faker.random.number(),
            ArrangerEmail: faker.internet.email(),
            CertifierId: faker.random.number(),
            HospitalDeathStatus: faker.random.word()
        }

        return personInfo
    } catch (error) {
        console.log(error)
    }
}

function veteranSchema() {
    const veteran = {
        IsUnknown: faker.random.boolean(),
        ServiceEra: faker.random.word(),
        ServiceBranchId: faker.random.number(),
    }
    return veteran
}

function ethnicitySchema() {
    const ethnicity = {
        RaceOneId: faker.random.number(),
        RaceTwoId: faker.random.number(),
        HispanicId: faker.random.number(),
        IsHispanic: faker.random.boolean(),
        RaceThreeId: faker.random.number(),
        EthnicityOneId: faker.random.number(),
        EthnicityTwoId: faker.random.number(),
        EthnicityThreeId: faker.random.number()
    }
    return ethnicity
}

function certifierSchema() {
    const certifier = {
        Prefix: faker.random.word(),
        FirstName: faker.random.word(),
        LastName: faker.random.word(),
        MiddleName: faker.random.word(),
        LicenseNumber: faker.random.word(),
        PhoneNumber: faker.phone.phoneNumberFormat(1),
        FaxNumber: faker.phone.phoneNumberFormat(1)
    }
    return certifier
}

async function createAddress() {
    let { addressTypeIds } = await getAddressIds()

    const randomAddressTypeId = faker.random.arrayElement(addressTypeIds)
    const address = {
        line1: faker.random.word(),
        line2: faker.random.word(),
        city: faker.address.city(),
        state: faker.address.state(),
        county: faker.address.county(),
        country: faker.address.country(),
        zipcode: faker.address.zipCode(),
        addressTypeId: randomAddressTypeId
    }
    return address
}

module.exports = exports = {
    createAddress,
    veteranSchema,
    certifierSchema,
    ethnicitySchema,
    personInfoSchema
};
