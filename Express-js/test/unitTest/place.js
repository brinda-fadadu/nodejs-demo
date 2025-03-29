const { addressSchema, organizationSchema } = require('./schema')
const models = require('../../models/index')
const AddressController = require('../../controllers/refactorControllers/addressController/addressController')
const { fetchSingleInstanceFromES } = require('../../controllers/refactorControllers/utils')
const { indexName } = require('../../es_models/organization')
const chai = require('chai')
const chaiAsPromised = require('chai-as-promised');
chai.use(chaiAsPromised);

const expect = chai.expect
chai.should();

const cases = [
    [{
        address: addressSchema(),
    },
    [
        'id', 'addressId'
    ], 'onlyAddress'
    ],
    [{
        organization: organizationSchema()
    },
    [
        'id', 'organizationId'
    ], 'onlyOrganization'],
    [{
        address: addressSchema(),
        organization: organizationSchema()
    },
    [
        'id', 'addressId', 'organizationId'
    ], 'full'],
]


const cache = {};


function sleep(ms = 3000) {
    return new Promise((res, rej) => {
        setTimeout(res, ms)
    })
}

describe('new place', () => {
    cases.forEach((testCase) => {
        const [eachCase, tests, cacheName] = testCase;
        it(`should create a new place object with ${cacheName}`, async function () {

            const transaction = await models.sequelize.transaction()
            const createdPlace = await AddressController.managePlace(eachCase, transaction)
            await transaction.commit()

            this.place = createdPlace;
            cache[cacheName] = createdPlace;

            tests.forEach(test => {
                this.place.should.have.property(test)
            })

        })
    })
})

describe('edit place', async function () {
    it('should update the existing address details', async () => {
        const place = cache['onlyAddress'].toJSON()
        place.address.line1 = 'test line1'
        
        const createdPlace = await AddressController.managePlace({
            ...place,
            address: place.address,
        })
        createdPlace.address.line1.should.be.equal('test line1')
    });

    it('should update the existing organization details', async () => {
        const place = cache['onlyOrganization'].toJSON()
        place.organization.name = 'new Organization'
        
        const createdPlace = await AddressController.managePlace({
            ...place,
            organization: place.organization,
        })
        createdPlace.organization.name.should.be.equal('new Organization')

        await sleep()
        const fetchedOrganizationFromEs = await fetchSingleInstanceFromES(indexName, createdPlace.id)
        fetchedOrganizationFromEs.hits.hits[0]._source.should.have.property('id').and.to.equal(createdPlace.id)
        fetchedOrganizationFromEs.hits.hits[0]._source.should.have.property('name').and.to.equal('new Organization')
    });

    it('should update the existing place details', async () => {
        const place = cache['full'].toJSON()
        place.organization.name = 'organization with place'
        place.address.line1 = 'address with place'
        
        const createdPlace = await AddressController.managePlace({
            ...place,
            organization: place.organization,
            address: place.address,
        })
        createdPlace.address.line1.should.be.equal('address with place')
        createdPlace.organization.name.should.be.equal('organization with place')
        cache['full'] = createdPlace;

        await sleep()
        const fetchedOrganizationFromEs = await fetchSingleInstanceFromES(indexName, createdPlace.id)
        fetchedOrganizationFromEs.hits.hits[0]._source.should.have.property('id').and.to.equal(createdPlace.id)
        fetchedOrganizationFromEs.hits.hits[0]._source.should.have.property('name').and.to.equal('organization with place')
        fetchedOrganizationFromEs.hits.hits[0]._source.address.should.have.property('line1').and.to.equal('address with place')
    });

    it('should not create a place with existing organization', async () => {
        const place = cache['full'].toJSON()
        delete place.id
        await expect(AddressController.managePlace(place)).to.be.rejected
    })

    after(async () => {
        await models.Place.destroy({ where: {} })
    })
})

