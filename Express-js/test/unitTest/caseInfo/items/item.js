const chai = require('chai')
const faker = require('faker')

const expect = chai.expect
const chaiAsPromised = require('chai-as-promised')
chai.use(chaiAsPromised);
chai.should();

const ItemController = require('../../../../controllers/refactorControllers/itemController/itemController')
const ItemCategoryController = require('../../../../controllers/refactorControllers/itemController/categoryController')

const { personSchema, agreementSchema } = require('../../schema')

describe('Item Controller', () => {
    describe('Item Category', () => {
        describe('Get ItemCategory Attributes', () => {
            describe('Get list of Item Category Attributes', () => {
                it('Should return a list of Item Category Attributes', async () => {
                    const attributesList = await ItemCategoryController.getCategoryAttributes(1)
                    attributesList.should.be.an('array')
                })
                it('Each Item in a list of Item Category Attributes should be a list of AttributeValues', async () => {
                    const attributesList = await ItemCategoryController.getCategoryAttributes(3)
                    attributesList[0].should.have.property('attributeValues').and.to.be.an('array').of.length.greaterThan(1)
                })
            })
        }),
        describe('Item Categories', () => {
            describe('Get list of Item categories', () => {
                it('Should return a list of Item Categories', async () => {
                    const categoryList = await ItemCategoryController.getCategories(1,1)
                    categoryList.should.be.an('array').of.length.greaterThan(1)
                })
            })
        })
    }),
    describe('Item', () => {
        describe('Get list of Items', () => {
            it('Should return a list of Items', async () => {
                itemList = await ItemController.getItemsByFilter({
                    locationId: 1,
                    itemCategoryId: 1,
                    limit: 10,
                    offset: 0
                })
                itemList.should.have.property('items').and.to.be.an('array')
            })
            it('Should return a list of Items with itemTypeId and industryTypeId', async () =>{
                itemList = await ItemController.getItemsByFilter({
                    locationId: 1,
                    itemTypeId: 1,
                    itemIndustryId: 1,
                    limit: 10,
                    offset: 0
                })
                itemList.should.have.property('items').and.to.be.an('array')
            })
            it('Should return a list of Items with search term', async () =>{
                itemList = await ItemController.getItemsByFilter({
                    locationId: 1,
                    itemTypeId: 1,
                    itemIndustryId: 1,
                    limit: 10,
                    offset: 0,
                    searchTerm: 'Acco'
                })
                itemList.should.have.property('items').and.to.be.an('array')
            })
        })
    })
})

