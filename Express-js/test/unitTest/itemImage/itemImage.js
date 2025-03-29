const chai = require('chai')
const sinon = require('sinon')
const chaiAsPromised = require('chai-as-promised')

const models = require('../../../models')
const ItemImageUploadController = require('../../../controllers/refactorControllers/adminController/itemImageUploadController')

chai.use(chaiAsPromised)
chai.should()

const expect = chai.expect
const { findOrCreateUser } = require('../helper')
let itemImageUploadInstance, user, itemId, imageId, itemType
const item = {
    'id': 1,
    'code': '',
    'name': 'Direct Cremation',
    'description': '',
    'price': 123,
    'isActive': true,
    'packageCategoryId': 1,
    'createdAt': '2020-05-28T04:13:22.843Z',
    'updatedAt': '2020-05-28T04:13:22.843Z',
    'locationId': 1,
    'isTaxable': true
}

let itemImages = [
    {
        'id': 70,
        'resourceType': 'Package',
        'resourceId': 1,
        'imageUrl': 'https://clcimagesdev.blob.core.windows.net/opi-dev/itemImages%2F7189778788987173-logo.png',
        'isPrimary': true,
        'deletedAt': null,
        'deletedBy': null,
        'createdBy': 5,
        'updatedBy': 7,
        'createdAt': '2020-06-22T07:34:49.021Z',
        'updatedAt': '2020-06-22T20:06:00.687Z'
    },
    {
        'id': 71,
        'resourceType': 'Package',
        'resourceId': 1,
        'imageUrl': 'https://clcimagesdev.blob.core.windows.net/opi-dev/itemImages%2F05356257732202896-pwa.png',
        'isPrimary': false,
        'deletedAt': null,
        'deletedBy': 7,
        'createdBy': 4,
        'updatedBy': 4,
        'createdAt': '2020-06-22T11:04:38.537Z',
        'updatedAt': '2020-06-22T20:05:59.199Z'
    },
    {
        'id': 72,
        'resourceType': 'Package',
        'resourceId': 1,
        'imageUrl': 'https://clcimagesdev.blob.core.windows.net/opi-dev/itemImages%2F21817775361166447-bot-icon.png',
        'isPrimary': false,
        'deletedAt': null,
        'deletedBy': null,
        'createdBy': 4,
        'updatedBy': 7,
        'createdAt': '2020-06-22T11:07:06.900Z',
        'updatedAt': '2020-06-22T20:06:00.375Z'
    }
]
let itemImagesResponse = { count: 3, rows: itemImages }

describe('Upload, Update and Delete Item Images', () => {
    before(async () => {
        itemId = 1
        imageId = 70
        itemType = 'Packages'
        itemImageUploadInstance = new ItemImageUploadController(itemId, itemType)
        itemImageUploadInstanceItem = new ItemImageUploadController(itemId, 'item')
        user = await findOrCreateUser()

        sinon.stub(models.Package, 'findOne').callsFake(function () {
            return item
        })
        sinon.stub(models.ItemImages, 'findAndCountAll').callsFake(function () {
            return itemImagesResponse
        })
        sinon.stub(models.ItemImages, 'bulkCreate')
        sinon.stub(models.ItemImages, 'update')
    })

    it('should upload image for item', async () => {
        let response = await itemImageUploadInstance.createItemImages([], user)
        return expect(response).to.equal(itemImages)
    })

    it('should throw an error when 3 images are already present', async () => {
        await expect(itemImageUploadInstance.createItemImages([{ file: true }], user)).to.be.rejectedWith('CANNOT ADD MORE THAN THREE IMAGES PER ITEM')
    })

    it('should delete primary images item', async () => {
        let deleteResponseRows = itemImages.filter(image => image.id != 70)
        deleteResponseRows[0].isPrimary = true
        let response = await itemImageUploadInstance.deleteItemImage(imageId, user)
        itemImagesResponse = { ...response }
        return expect(response.rows.length).to.equal(2)
    })

    it('should throw an error when image doesnot belong to item', async () => {
        itemImageUploadInstanceError = new ItemImageUploadController(1, 'Item')
        await expect(itemImageUploadInstanceError.deleteItemImage(12, user)).to.be.rejectedWith('IMAGE DOESNOT BELONG TO THIS ITEM')
    })

    it('should toggle primary images', async () => {
        imageId = 72
        let response = await itemImageUploadInstance.makePrimary(imageId, user)
        response.should.be.an('object')
        response.should.have.property('count').and.to.be.equal(2)
        response.should.have.property('rows').and.to.be.an('array').of.length(2)
        return expect(response.rows.length).to.equal(2)
    })
})
