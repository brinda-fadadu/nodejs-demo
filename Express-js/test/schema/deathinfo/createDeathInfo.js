const faker = require('faker')
const moment = require('moment')
const {
    getCities,
    getStates,
    getCountries,
} = require('../../helper')
let cities, states, countries


async function createPersonDeathInfoObj () {
    cities = await getCities()
    states = await getStates()
    countries = await getCountries() 

    let reqData = {
        "dateOfDeath": moment(),
        "placeOfDeathTypeId": 3,
        "locationOfRemainTypeId": 2,
        "placeOfDeath": {
            line1: faker.address.streetAddress(),
            line2: faker.address.streetAddress(),
            'city': faker.address.city(),
            'state': faker.address.state(),
            'county': faker.address.county(),
            'country': faker.address.country(),
            'zipcode': faker.address.zipCode(),
            addressTypeId: 1
        },
        "locationOfRemains": {
            "name": faker.address.streetName(),
            "organizationTypeId": 1,
            "address": {
                'city': faker.address.city(),
                'state': faker.address.state(),
                'county': faker.address.county(),
                'country': faker.address.country(),
                'zipcode': faker.address.zipCode(),
                addressTypeId: 1
            }
        },
        "hospitalDeathStatus": "ER/OP"
    }
    return  reqData
}
module.exports = exports = createPersonDeathInfoObj