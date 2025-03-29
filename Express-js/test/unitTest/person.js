const { personSchema, addressSchema, organizationSchema } = require('./schema')
const PersonController = require('../../controllers/refactorControllers/personController/personController')
const AddressController = require('../../controllers/refactorControllers/addressController/addressController')
const models = require('../../models/index')
const chai = require('chai')
const { indexName } = require('../../es_models/person')
const { fetchSingleInstanceFromES } = require('../../controllers/refactorControllers/utils')
const chaiAsPromised = require('chai-as-promised');
chai.use(chaiAsPromised);

const expect = chai.expect
chai.should();

const cases = [
    [{
        ...personSchema(),
        addressPlace: {
            address: addressSchema(),
        }
    },
    [
        'id', 'addressPlaceId'
    ], 'onlyAddress'
    ],
    [{
        ...personSchema(),
        addressPlace: {
            organization: organizationSchema(),
        }
    },
    [
        'id', 'addressPlaceId'
    ], 'onlyOrganization'],
    [{
        ...personSchema(),
        addressPlace: {
            address: addressSchema(),
            organization: organizationSchema(),
        }
    },
    [
        'id', 'addressPlaceId'
    ], 'fullPlace'],
]



const cache = {};

function sleep(ms = 3000) {
    return new Promise((res, rej) => {
        setTimeout(res, ms)
    })
}


describe('new person', () => {
    cases.forEach((testCase) => {
        const [eachCase, tests, cacheName] = testCase;
        it(`should create a new person object with ${cacheName}`, async function () {

            const transaction = await models.sequelize.transaction()
            const createdPerson = await PersonController.createOrUpdate(eachCase, eachCase.addressPlace, {}, transaction)
            /* waiting for the sequelize after hook to insert the ES doc */
            if (cacheName === 'onlyAddress') {
                await sleep()
            }
            await transaction.commit()
            
            cache[cacheName] = createdPerson;
            
            tests.forEach(test => {
                createdPerson.should.have.property(test).and.to.be.greaterThan(0)
            })
            if (cacheName === 'onlyAddress') {
                const fetchedPersonFromEs = await fetchSingleInstanceFromES(indexName, createdPerson.id)
                fetchedPersonFromEs.hits.hits[0]._source.should.have.property('id').and.to.equal(createdPerson.id)
            }
        })
    })

    it('should create a new person object without address', async () => {
        const transaction = await models.sequelize.transaction()
        const createdPerson = await PersonController.createOrUpdate({...personSchema()}, {}, {}, transaction)
        /* waiting for the sequelize after hook to insert the ES doc */
        await sleep()
        await transaction.commit()

        cache['noAddressPlace'] = createdPerson;

        createdPerson.should.have.property('id').and.to.be.greaterThan(0)
        createdPerson.should.have.property('addressPlaceId').and.to.be.equal(undefined)
        createdPerson.should.have.property('birthPlaceId').and.to.be.equal(undefined)
        
        const fetchedPersonFromEs = await fetchSingleInstanceFromES(indexName, createdPerson.id)
        fetchedPersonFromEs.hits.hits[0]._source.should.have.property('id').and.to.equal(createdPerson.id)
        fetchedPersonFromEs.hits.hits[0]._source.should.not.have.property('address')
    })
})

describe('edit person', async function () {
    it('should update the existing person for noAddressPlace', async () => {
        const person = cache['noAddressPlace'].toJSON()
        person.firstName = 'testFirstName'
        const transaction = await models.sequelize.transaction()
        const createdPerson = await PersonController.createOrUpdate({ ...person }, { address: addressSchema() }, {}, transaction)
        /* waiting for the sequelize after hook to insert the ES doc */
        await sleep()
        await transaction.commit()
        createdPerson.firstName.should.be.equal('testFirstName')
        createdPerson.should.have.property('addressPlaceId').and.to.not.equal(undefined)
        
        const fetchedPersonFromEs = await fetchSingleInstanceFromES(indexName, createdPerson.id)
        fetchedPersonFromEs.hits.hits[0]._source.should.have.property('id').and.to.equal(createdPerson.id)
        fetchedPersonFromEs.hits.hits[0]._source.should.have.property('firstName').and.to.equal(createdPerson.firstName)
    });

    it('should update the existing person for onlyAddress', async () => {
        const person = cache['onlyAddress'].toJSON()
        person.firstName = 'testFirstName'
        const transaction = await models.sequelize.transaction()
        /* Fetching the existing place */
        const addressPlaceId = person.addressPlaceId
        let fetchedPlace = await AddressController.getDetails({ id: addressPlaceId }, transaction)
        fetchedPlace = fetchedPlace.toJSON()
        fetchedPlace.address.line1 = 'test line1'
        /* Updating the person with place */
        const updatedPerson = await PersonController.createOrUpdate({ ...person }, fetchedPlace, {}, transaction)
        const updatedPlace = await AddressController.getDetails({ id: addressPlaceId }, transaction)
        /* waiting for the sequelize after hook to insert the ES doc */
        await sleep()
        await transaction.commit()
        updatedPerson.firstName.should.be.equal('testFirstName')
        updatedPerson.should.have.property('addressPlaceId').and.to.equal(addressPlaceId)
        updatedPlace.address.line1.should.be.equal('test line1')
    
        const fetchedPersonFromEs = await fetchSingleInstanceFromES(indexName, updatedPerson.id)
        fetchedPersonFromEs.hits.hits[0]._source.should.have.property('id').and.to.equal(updatedPerson.id)
        fetchedPersonFromEs.hits.hits[0]._source.should.have.property('firstName').and.to.equal(updatedPerson.firstName)
        fetchedPersonFromEs.hits.hits[0]._source.address.should.have.property('id').and.to.equal(addressPlaceId)
        fetchedPersonFromEs.hits.hits[0]._source.address.should.have.property('line1').and.to.equal('test line1')
    })

    it('should update the existing person for onlyOrganization', async () => {
        const person = cache['onlyOrganization'].toJSON()
        person.firstName = 'testFirstName'
        const transaction = await models.sequelize.transaction()
        /* Fetching the existing place */
        const addressPlaceId = person.addressPlaceId
        let fetchedPlace = await AddressController.getDetails({ id: addressPlaceId }, transaction)
        fetchedPlace = fetchedPlace.toJSON()
        fetchedPlace.organization.name = 'test organization name'
        /* Updating the person with place */
        const updatedPerson = await PersonController.createOrUpdate({ ...person }, fetchedPlace, {}, transaction)
        const updatedPlace = await AddressController.getDetails({ id: addressPlaceId }, transaction)
        await transaction.commit()
        updatedPerson.firstName.should.be.equal('testFirstName')
        updatedPerson.should.have.property('addressPlaceId').and.to.equal(addressPlaceId)
        updatedPlace.organization.name.should.be.equal('test organization name')
    })

    it('should update the existing person for fullPlace', async () => {
        const person = cache['fullPlace'].toJSON()
        person.firstName = 'testFirstName'
        const transaction = await models.sequelize.transaction()
        /* Fetching the existing place */
        const addressPlaceId = person.addressPlaceId
        let fetchedPlace = await AddressController.getDetails({ id: addressPlaceId }, transaction)
        fetchedPlace = fetchedPlace.toJSON()
        fetchedPlace.address.line1 = 'test line1'
        fetchedPlace.organization.name = 'test organization name'
        /* Updating the person with place */
        const updatedPerson = await PersonController.createOrUpdate({ ...person }, fetchedPlace, {}, transaction)
        const updatedPlace = await AddressController.getDetails({ id: addressPlaceId }, transaction)
        await transaction.commit()
        updatedPerson.firstName.should.be.equal('testFirstName')
        updatedPerson.should.have.property('addressPlaceId').and.to.equal(addressPlaceId)
        updatedPlace.organization.name.should.be.equal('test organization name')
        updatedPlace.address.line1.should.be.equal('test line1')
    })

    after(async () => {
        await models.Person.destroy({ where: {} })
        await models.Place.destroy({ where: {} })
    })
})

