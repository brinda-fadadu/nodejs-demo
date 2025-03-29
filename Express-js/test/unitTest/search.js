const PersonController = require('../../controllers/refactorControllers/personController/personController')
const OrganizationController = require('../../controllers/refactorControllers/addressController/organizationController')
const AddressController = require('../../controllers/refactorControllers/addressController/addressController')
const VerifiedPersonController = require('../../controllers/refactorControllers/personController/verifiedPersonController')
const { personSchema, addressSchema, organizationSchema } = require('./schema')
const { indexName, client } = require('../../es_models/person')
const chai = require('chai')
const faker = require('faker')
const moment = require('moment')
const models = require('../../models/index')

chai.should();


function sleep(ms = 3000) {
    return new Promise((res, rej) => {
        setTimeout(res, ms)
    })
}


describe('person lookup', () => {
    let createdPerson, lookupQuery
    before(async () => {
        const person = personSchema()
        person.isVerified = true
        createdPerson = await PersonController.createOrUpdate(person)
        await sleep()
    })

    it('should search for a person successfully', async () => {
        lookupQuery = {
            page: 1,
            limit: 5,
            q: createdPerson.phoneNumber,
            isOpi: true
        }
        const response = await PersonController.simpleSearch(lookupQuery)
        response.results.should.have.lengthOf(1)
    })

    it('should return empty array for a person that does not exist', async () => {
        lookupQuery.q = faker.random.number()
        const response = await PersonController.simpleSearch(lookupQuery)
        response.results.should.have.lengthOf(0)
    })

})

describe('organization lookup', () => {
    let place
    before(async () => {
        place = {
            address: addressSchema(),
            organization: organizationSchema()
        }
        await AddressController.managePlace(place)
        await sleep(7000)
    })

    it('should search for an organization successfully using phoneNumber', async () => {
        const data = {
            phoneNumber: place.organization.phoneNumber
        }
        const response = await OrganizationController.search(data)
        response.results.should.have.lengthOf(1)
        response.results[0].should.have.property('id')
        response.results[0].should.have.property('organizationId')
        response.results[0].should.have.property('address')
        response.results[0].address.should.have.property('id')
    })

    it('should search for an organization successfully using org name', async () => {
        const data = {
            name: place.organization.name,
            organizationType: place.organization.organizationTypeId
        }
        const response = await OrganizationController.search(data)
        response.results.length.should.be.greaterThan(0)
    })
    
    it('should return empty array for an organization that does not exist', async () => {
        const data = {
            phoneNumber: '0987654321'
        }
        const response = await OrganizationController.search(data)
        response.results.should.have.lengthOf(0)
    })

})

describe('organization caller lookup', () => {
    let createdPerson
    before(async () => {
        const person = personSchema()
        person.isVerified = true
        createdPerson = await PersonController.createOrUpdate(person, { address: addressSchema(), organization: organizationSchema() })
        await sleep()
    })
    it('should search for callers related to the organization', async () => {
        const organizationController = new OrganizationController(createdPerson.addressPlaceId)
        const callers = await organizationController.searchCallers()
        callers.should.have.lengthOf(1)
    })

    it('should return empty array for the callers of a non existing organization', async () => {
        const organizationController = new OrganizationController(faker.random.number({min: 4000}))
        const callers = await organizationController.searchCallers()
        callers.should.have.lengthOf(0)
    })

})

describe('advance search', () => {
    let createdPerson, place, data, dataStorage
    before(async () => {
        place = {
            address: { ...addressSchema() }
        }
        const person = {
            ...personSchema()
        }
        createdPerson = await PersonController.createOrUpdate(person, place)
        const personController = new PersonController(createdPerson.id)
        await personController.createOrUpdateDeathDetails({ dateOfDeath: moment().format('MM/DD/YYYY') })
        const verifiedPersonController = new VerifiedPersonController(createdPerson.id)
        const verifiedDetails = await verifiedPersonController.verifyPerson()
        createdPerson.onePortalId = verifiedDetails.onePortalId
        data = {
            page: 1,
            limit: 10,
            isVerified: true,
            matchCriteria: 'all',
            fieldCriterias: []
        }
        await sleep()
        dataCreator()
    })

    after(async () => {
        deletePersonIndex()
        await models.Person.destroy({ where: {} })
        await models.Place.destroy({ where: {} })
    })

    const simpleSearch = [
        'lastName',
        'firstName',
        'middleName',
        'onePortalId',
    ]

    function dataCreator() {
        dataStorage = {}
        simpleSearch.forEach(eachKey => {
            dataStorage[eachKey] = {
                field: 'simpleSearch',
                value: createdPerson[eachKey]
            }
        })
        return dataStorage = {
            ...dataStorage,
            'phone': {
                field: 'phone',
                value: createdPerson.phoneNumber
            },
            'birthDate': {
                field: 'birthDate',
                value: {
                    startDate: moment(createdPerson.dateOfBirth).startOf('date'),
                    endDate: moment(createdPerson.dateOfBirth).endOf('date')
                }
            },
            'deathDate': {
                field: 'deathDate',
                value: {
                    startDate: moment(createdPerson.dateOfDeath).startOf('date'),
                    endDate: moment(createdPerson.dateOfDeath).endOf('date')
                }
            },
            'callDate': {
                field: 'callDate',
                value: {
                    startDate: moment(createdPerson.createdAt).startOf('date'),
                    endDate: moment(createdPerson.createdAt).endOf('date')
                }
            }
        }
    }

    for (const eachKey of simpleSearch) {
        it(`should fetch results when searched with ${eachKey}`, async () => {
            data.fieldCriterias = [{
                field: 'simpleSearch',
                value: createdPerson[eachKey]
            }]
            const searchResults = await PersonController.advanceSearch(data)
            searchResults.should.have.property('results').and.to.have.length.greaterThan(0)
        })
    }

    it('should fetch results when searched with address', async () => {
        data.fieldCriterias = [{
            field: 'address',
            value: place.address.line1
        }]
        const searchResults = await PersonController.advanceSearch(data)
        searchResults.should.have.property('results').and.to.have.length.greaterThan(0)
    })

    it('should fetch results when searched with contains phone ', async () => {
        data.fieldCriterias = [{
            field: 'phone',
            condition: 'contains',
            value: createdPerson.phoneNumber.substring(1, 4)
        }]
        const searchResults = await PersonController.advanceSearch(data)
        searchResults.should.have.property('results').and.to.have.length.greaterThan(0)
    })

    it('should fetch results when searched with exact phone', async () => {
        data.fieldCriterias = [dataStorage.phone]
        const searchResults = await PersonController.advanceSearch(data)
        searchResults.should.have.property('results').and.to.have.length.greaterThan(0)
    })

    it('should fetch results when searched with birthdate', async () => {
        data.fieldCriterias = [dataStorage.birthDate]
        const searchResults = await PersonController.advanceSearch(data)
        searchResults.should.have.property('results').and.to.have.length.greaterThan(0)
    })

    it('should fetch results when searched with deathDate', async () => {
        data.fieldCriterias = [dataStorage.deathDate]
        const searchResults = await PersonController.advanceSearch(data)
        searchResults.should.have.property('results').and.to.have.length.greaterThan(0)
    })

    it('should fetch results when searched with callDate', async () => {
        data.fieldCriterias = [dataStorage.callDate]
        const searchResults = await PersonController.advanceSearch(data)
        searchResults.should.have.property('results').and.to.have.length.greaterThan(0)
    })

    it('should fetch results when searched with all combinations should match', async () => {
        data.fieldCriterias = [
            ...Object.keys(dataStorage).map(eachField => {
                return dataStorage[eachField]
            })
        ]
        const searchResults = await PersonController.advanceSearch(data)
        searchResults.should.have.property('results').and.to.have.length.greaterThan(0)
    })

    it('should fetch results when searched with all combinations should match', async () => {
        data.fieldCriterias = [
            ...Object.keys(dataStorage).map(eachField => {
                return dataStorage[eachField]
            })
        ]
        data.matchCriteria = ''
        const searchResults = await PersonController.advanceSearch(data)
        searchResults.should.have.property('results').and.to.have.length.greaterThan(0)
    })
})

