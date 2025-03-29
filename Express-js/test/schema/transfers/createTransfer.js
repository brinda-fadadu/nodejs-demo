const faker = require('faker')
const moment = require('moment')
const {
    getCities,
    getStates,
    getCountries,
    getTransferLocationTypes,
    getUser
} = require('../../helper')
let cities, states, countries


async function createTransferObj () {
    const transferLocationIds = await getTransferLocationTypes()
    cities = await getCities()
    states = await getStates()
    countries = await getCountries()              

    transferObj = {
        primaryDriverId: faker.random.number({ min: 1, max: 9 }),
        secondaryDriverId: faker.random.number({ min: 1, max: 9 }),
        neededByDateTime: moment().add(1, 'day').format('MM/DD/YYYY'),
        transferDateTime: moment().add(1, 'day').format('MM/DD/YYYY HH:mm'),
        isTransferReady: faker.random.boolean(),
        isTransferCompleted: faker.random.boolean(),
        transferType: 1,
        fromLocationTypeId: 2,
        toLocationTypeId: 2,
        fromLocation: {
            name: faker.address.streetName(),
            organizationTypeId: 1,
            address: {
                line1: faker.address.streetAddress(),
                line2: faker.address.streetAddress(),
                'city': faker.address.city(),
                'state': faker.address.state(),
                'county': faker.address.county(),
                'country': faker.address.country(),
                'zipcode': faker.address.zipCode(),
                addressTypeId: 1
            }
        },
        toLocation: {
            name: faker.address.streetName(),
            organizationTypeId: 1,
            address: {
                line1: faker.address.streetAddress(),
                line2: faker.address.streetAddress(),
                'city': faker.address.city(),
                'state': faker.address.state(),
                'county': faker.address.county(),
                'country': faker.address.country(),
                'zipcode': faker.address.zipCode(),
                addressTypeId: 1
            }
        }
    }
    return  transferObj
}
module.exports = exports = createTransferObj