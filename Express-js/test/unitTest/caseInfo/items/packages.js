const chai = require('chai')
const chaiAsPromised = require('chai-as-promised')
chai.use(chaiAsPromised);
chai.should();

const PackagesController = require('../../../../controllers/refactorControllers/itemController/packagesController')

describe('Packages Controller', () => {
    describe('Get Package Categories', () => {
        it('Should return a list of Categories',async () => {
            const categories = await PackagesController.getPackageCategories()
            categories.should.be.an('array')
        })
    }),
    describe('Get Packages', () => {
        it('Should have count property', async () => {
            const categories = await PackagesController.getPackages({
                locationId: 1
            })
            categories.should.have.property('count')
        })
        it('Should have rows property', async () => {
            const categories = await PackagesController.getPackages({
                locationId: 1
            })
            categories.should.have.property('rows').and.to.be.an('array')
        })
    }),
    describe('Get Package Items', () => {
        it('Should return a list of Packages Items', async () => {
            const categories = await PackagesController.getPackageItems(1)
            categories.should.be.an('array')
        })
    })
})
