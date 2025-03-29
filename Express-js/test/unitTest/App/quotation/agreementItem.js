const chai = require('chai')
const chaiAsPromised = require('chai-as-promised')
const faker = require('faker')
chai.use(chaiAsPromised)
chai.should()
const expect = chai.expect
const models = require('../../../../models/index')
const QuotationController = require('../../../../controllers/refactorControllers/quotationController/quotationController')
const AgreementController = require('../../../../controllers/refactorControllers/agreementController/agreementController')
const AgreementPackageController = require('../../../../controllers/refactorControllers/agreementController/agreementPackageController')
const AgreementItemController = require('../../../../controllers/refactorControllers/agreementController/agreementItemController')
const CAIcontroller = require('../../../../controllers/refactorControllers/agreementController/agreementCashAdvanceItemController')


describe('quotation funeral agreement items handler', async () => {
    let quotationId, agreementSchema = {
            apiType: 'quotation',
            locationId: 2
        },
        needTypes, types, funeralAgreementId, agreementPackageController, agreementItemController, instance
    before(async () => {
        needTypes = AgreementController.NEED_TYPES
        types = AgreementController.TYPES
        let result = await QuotationController.upsertQuotation({
            userId: 1
        })
        agreementSchema.needType = needTypes['PN']
        quotationId = result.id
        agreementSchema.type = types['Funeral']
        const createdAgreement = await AgreementController.createOrEditAgreement(null, agreementSchema, 1, quotationId)
        funeralAgreementId = createdAgreement.id
        agreementPackageController = new AgreementPackageController(funeralAgreementId)
        agreementItemController = new AgreementItemController(funeralAgreementId)
        instance = new CAIcontroller(funeralAgreementId)
    })

    describe('funeral agreement items handler', async () => {
        describe('package', async () => {
            let packageId
            before(async () => {
                let packageDetails =  await models.Package.findOne({ where: { isActive: true, locationId: agreementSchema.locationId} })
                packageId = packageDetails.id
            })
            it('should add package for funeral agreement', async () => {
                let bodyData = {
                    packageId: packageId,
                    timezone: 'Asia/Calcutta',
                    userId: 1
                }
                const record = await agreementPackageController.createOrUpdatePackage(bodyData, 'add')
                record.should.have.property('id').and.to.be.an('number')
                record.should.have.property('agreementId').and.to.be.equal(funeralAgreementId)
                record.should.have.property('quantity').and.to.be.equal(1)
                record.should.have.property('packageId').and.to.equal(packageId)
                record.should.have.property('totalPaid').and.to.be.an('number')
            })
            it('should list 1 package that is added', async() => {
                const agreementItemsList = await agreementPackageController.getAgreementPackages()
                agreementItemsList.length.should.be.equal(1)
                agreementItemsList[0].should.have.property('name')
                agreementItemsList[0].should.have.property('description')
            })

            it('should return an error saying package already added for agreement', async () => {
                try {
                    let bodyData = {
                        packageId: packageId,
                        timezone: 'Asia/Calcutta',
                        userId: 1
                    }
                    await agreementPackageController.createOrUpdatePackage(bodyData, 'add')
                } catch (err) {
                    err.should.have.property('message').and.to.be.equal('PACKAGE_ALREADY_ADDED')
                }
            })
            it('should remove package for funeral agreement', async () => {
                let bodyData = {
                    packageId: packageId,
                    timezone: 'Asia/Calcutta',
                    userId: 1,
                    apiType: 'quotation'
                }
                const record = await agreementPackageController.createOrUpdatePackage(bodyData, 'remove')
                record.should.have.property('id').and.to.be.an('number')
                record.should.have.property('agreementId').and.to.be.equal(funeralAgreementId)
                record.should.have.property('packageId').and.to.equal(packageId)
                record.should.have.property('totalPaid').and.to.be.an('number')
            })
        })

        describe('services', async () => {
            let service, agreementLocationItemId
            before(async () => {
                const serviceItemType = await models.ItemType.findOne({ where: { name: 'Services' } })
                service = await models.LocationItem.findOne({
                    where: {
                        locationId: agreementSchema.locationId
                    },
                    include: [
                        {
                            model: models.Item,
                            include: [
                                {
                                    model: models.ItemCategory,
                                    where: {
                                        itemTypeId: serviceItemType.id
                                    }
                                }
                            ],
                            required: true
                        }
                    ]
                })
            })
            it('should add service item for funeral agreement', async () => {
                let bodyData = {
                    locationItemId: service.id,
                    timezone: 'Asia/Calcutta',
                    userId: 1
                }
                const record = await agreementItemController.createOrUpdate('add', bodyData)
                record.should.have.property('id').and.to.be.an('number')
                record.should.have.property('createdBy').and.to.be.an('number')
                record.should.have.property('createdBy').and.to.be.an('number')
                record.should.have.property('totalPaid').and.to.be.an('number')
                record.should.have.property('quantity').and.to.be.equal(1)
                record.should.have.property('locationItemId').and.to.be.equal(bodyData.locationItemId)
            })

            it('should list 1 agreementItem that is associated with the agreement', async() => {
                const agreementItemsList = await agreementItemController.getAgreementItems()
                agreementItemsList.length.should.be.equal(1)
                agreementItemsList[0].should.have.property('name')
                agreementItemsList[0].should.have.property('description')
                agreementItemsList[0].should.have.property('itemType').and.to.equal('services')
                agreementLocationItemId = agreementItemsList[0].id
            })

            it('should increase service item quantity for funeral agreement', async () => {
                let bodyData = {
                    locationItemId: service.id,
                    timezone: 'Asia/Calcutta',
                    agreementLocationItemId: agreementLocationItemId,
                    userId: 1
                }
                const record = await agreementItemController.createOrUpdate('add', bodyData)
                record.should.have.property('id').and.to.be.an('number')
                record.should.have.property('createdBy').and.to.be.an('number')
                record.should.have.property('createdBy').and.to.be.an('number')
                record.should.have.property('totalPaid').and.to.be.an('number')
                record.should.have.property('quantity').and.to.be.equal(2)
                record.should.have.property('locationItemId').and.to.be.equal(bodyData.locationItemId)
            })

            it('should remove service items for funeral agreement', async () => {
                let bodyData = {
                    locationItemId: service.id,
                    timezone: 'Asia/Calcutta',
                    removeAll: true,
                    agreementLocationItemId: agreementLocationItemId,
                    userId: 1,
                    apiType: 'quotation'
                }
                const record = await agreementItemController.createOrUpdate('remove', bodyData)
                record.should.have.property('id').and.to.be.an('number')
                record.should.have.property('createdBy').and.to.be.an('number')
                record.should.have.property('createdBy').and.to.be.an('number')
                record.should.have.property('totalPaid').and.to.be.an('number')
                record.should.have.property('quantity').and.to.be.equal(0)
            })
            it('should return an error saying items already removed for agreement', async () => {
                try {
                    let bodyData = {
                        locationItemId: service.id,
                        timezone: 'Asia/Calcutta',
                        removeAll: true,
                        agreementLocationItemId: faker.random.number({
                            min: 1000
                        }),
                        userId: 1,
                        apiType: 'quotation'
                    }
                    await agreementItemController.createOrUpdate('remove', bodyData)
                } catch (err) {
                    err.should.have.property('message').and.to.be.equal('LOCATION_ITEM_ALREADY_REMOVED')
                }
            })
        })

        describe('merchandise', async () => {
            let merchandise, agreementLocationItemId
            before(async () => {
                const merchandiseItemType = await models.ItemType.findOne({ where: { name: 'Merchandises' } })
                merchandise = await models.LocationItem.findOne({ 
                    where: {
                        locationId: agreementSchema.locationId
                    },
                    include: [
                        {
                            model: models.Item,
                            include: [
                                {
                                    model: models.ItemCategory,
                                    where: {
                                        itemTypeId: merchandiseItemType.id
                                    }
                                }
                            ],
                            required: true
                        }
                    ]
                })
            })
            it('should add merchandise item for funeral agreement', async () => {
                let bodyData = {
                    locationItemId: merchandise.id,
                    timezone: 'Asia/Calcutta',
                    userId: 1
                }
                const record = await agreementItemController.createOrUpdate('add', bodyData)
                record.should.have.property('id').and.to.be.an('number')
                record.should.have.property('createdBy').and.to.be.an('number')
                record.should.have.property('createdBy').and.to.be.an('number')
                record.should.have.property('totalPaid').and.to.be.an('number')
                record.should.have.property('quantity').and.to.be.equal(1)
                record.should.have.property('locationItemId').and.to.be.equal(bodyData.locationItemId)
            })

            it('should list 1 merchandise that is associated with the agreement', async() => {
                const agreementItemsList = await agreementItemController.getAgreementItems()
                agreementItemsList.length.should.be.equal(1)
                agreementItemsList[0].should.have.property('name')
                agreementItemsList[0].should.have.property('description')
                agreementItemsList[0].should.have.property('itemType').and.to.equal('merchandises')
                agreementLocationItemId = agreementItemsList[0].id
            })

            it('should increase merchandise item quantity for funeral agreement', async () => {
                let bodyData = {
                    locationItemId: merchandise.id,
                    timezone: 'Asia/Calcutta',
                    agreementLocationItemId,
                    removeAll: false,
                    userId: 1
                }
                const record = await agreementItemController.createOrUpdate('add', bodyData)
                record.should.have.property('id').and.to.be.an('number')
                record.should.have.property('createdBy').and.to.be.an('number')
                record.should.have.property('createdBy').and.to.be.an('number')
                record.should.have.property('totalPaid').and.to.be.an('number')
                record.should.have.property('quantity').and.to.be.equal(2)
            })

            it('should remove merchandise items for funeral agreement', async () => {
                let bodyData = {
                    locationItemId: merchandise.id,
                    timezone: 'Asia/Calcutta',
                    removeAll: true,
                    agreementLocationItemId: agreementLocationItemId,
                    userId: 1,
                    apiType: 'quotation'
                }
                const record = await agreementItemController.createOrUpdate('remove', bodyData)
                record.should.have.property('id').and.to.be.an('number')
                record.should.have.property('createdBy').and.to.be.an('number')
                record.should.have.property('createdBy').and.to.be.an('number')
                record.should.have.property('totalPaid').and.to.be.an('number')
                record.should.have.property('quantity').and.to.be.equal(0)
            })

            it('should return an error saying items already removed for agreement', async () => {
                try {
                    let bodyData = {
                        locationItemId: merchandise.id,
                        timezone: 'Asia/Calcutta',
                        removeAll: true,
                        agreementLocationItemId: faker.random.number({
                            min: 1000
                        }),
                        userId: 1,
                        apiType: 'quotation'
                    }
                    await agreementItemController.createOrUpdate('remove', bodyData)
                } catch (err) {
                    err.should.have.property('message').and.to.be.equal('LOCATION_ITEM_ALREADY_REMOVED')
                }
            })
        })

        describe('Cash Advance Item', async () => {
            let cashAdvanceItem, agreementLocationItemId
            before(async () => {
                const serviceItemType = await models.ItemType.findOne({ where: { name: 'Cash Advance' } })
                cashAdvanceItem = await models.LocationItem.findOne({
                    where: {
                        locationId: agreementSchema.locationId
                    },
                    include: [
                        {
                            model: models.Item,
                            include: [
                                {
                                    model: models.ItemCategory,
                                    where: {
                                        itemTypeId: serviceItemType.id
                                    }
                                }
                            ],
                            required: true
                        }
                    ]
                })
            })

            it('should add cash advance item for funeral agreement', async () => {
                let bodyData = {
                    locationItemId: cashAdvanceItem.id,
                    price: '10.00',
                    note: 'dev',
                    userId: 1,
                    quantity: 1,
                    agreementId: funeralAgreementId
                }
                const instance = new CAIcontroller()
                const record = await instance.upsertCashAdvanceItem(bodyData)
                record.should.have.property('id').and.to.be.an('number')
                record.should.have.property('note').and.to.be.equal(bodyData.note)
                record.should.have.property('locationItemId').and.to.be.equal(bodyData.locationItemId)
                record.agreementItemPriceDetails.should.have.property('quantity').and.to.be.equal(bodyData.quantity)
            })

            it('should list 1 ash advance item that is associated with the agreement', async() => {
                const agreementItemsList = await instance.getAgreementCashAdvancedItems()
                agreementItemsList[0].should.have.property('name')
                agreementItemsList[0].should.have.property('note')
                agreementItemsList[0].should.have.property('itemType').and.to.equal('cashAdvancedItems')
                agreementItemsList[0].should.have.property('locationItemId').and.to.equal(cashAdvanceItem.id)
                agreementLocationItemId = agreementItemsList[0].id
            })

            it('should update cash advance item for funeral agreement', async () => {
                let bodyData = {
                    timezone: 'Asia/Calcutta',
                    id: agreementLocationItemId,
                    locationItemId: cashAdvanceItem.id,
                    price: '10.00',
                    note: 'dev update',
                    userId: 1,
                    quantity: 1,
                    agreementId: funeralAgreementId
                }
                const record = await instance.upsertCashAdvanceItem(bodyData)
                record.should.have.property('id').and.to.be.an('number')
                record.should.have.property('note').and.to.be.equal(bodyData.note)
                record.should.have.property('locationItemId').and.to.be.equal(bodyData.locationItemId)
                record.agreementItemPriceDetails.should.have.property('quantity').and.to.be.equal(bodyData.quantity)
            })

            it('should remove cash advance item for funeral agreement', async () => {
                let bodyData = {
                    timezone: 'Asia/Calcutta',
                    id: agreementLocationItemId,
                    agreementId: funeralAgreementId,
                    userId: 1,
                    apiType: 'quotation'
                }
                await instance.removeCashAdvanceItem(bodyData)
            })
            it('should return an error saying cash advance item already removed for agreement', async () => {
                try {
                    let bodyData = {
                        timezone: 'Asia/Calcutta',
                        id: faker.random.number({
                            min: 1000
                        }),
                        agreementId: funeralAgreementId,
                        userId: 1,
                        apiType: 'quotation'
                    }
                    await instance.removeCashAdvanceItem(bodyData)
                } catch (err) {
                    err.should.have.property('message').and.to.be.equal('ITEM_NOT_FOUND_OR_ITEM_REMOVED_FROM_AGREEMENT')
                }
            })
        })
    })
})

describe('quotation cemetery agreement items handler', async () => {
    let quotationId, agreementSchema = {
            apiType: 'quotation',
            locationId: 2
        },
        needTypes, types, cemeteryAgreementId, agreementItemController
    before(async () => {
        needTypes = AgreementController.NEED_TYPES
        types = AgreementController.TYPES
        let result = await QuotationController.upsertQuotation({
            userId: 1
        })
        agreementSchema.needType = needTypes['PN']
        quotationId = result.id
        agreementSchema.type = types['Cemetry']
        const createdAgreement = await AgreementController.createOrEditAgreement(null, agreementSchema, 1, quotationId)
        cemeteryAgreementId = createdAgreement.id
        agreementItemController = new AgreementItemController(cemeteryAgreementId)
    })

    describe('services', async () => {
        let service, agreementLocationItemId
        before(async () => {
            const serviceItemType = await models.ItemType.findOne({
                where: {
                    name: 'Services'
                }
            })
            service = await models.LocationItem.findOne({
                where: {
                    locationId: agreementSchema.locationId
                },
                include: [{
                    model: models.Item,
                    include: [{
                        model: models.ItemCategory,
                        where: {
                            itemTypeId: serviceItemType.id
                        }
                    }],
                    required: true
                }]
            })
        })
        it('should add service item for funeral agreement', async () => {
            let bodyData = {
                locationItemId: service.id,
                timezone: 'Asia/Calcutta',
                userId: 1
            }
            const record = await agreementItemController.createOrUpdate('add', bodyData)
            record.should.have.property('id').and.to.be.an('number')
            record.should.have.property('createdBy').and.to.be.an('number')
            record.should.have.property('createdBy').and.to.be.an('number')
            record.should.have.property('totalPaid').and.to.be.an('number')
            record.should.have.property('quantity').and.to.be.equal(1)
            record.should.have.property('locationItemId').and.to.be.equal(bodyData.locationItemId)
        })

        it('should list 1 agreementItem that is associated with the agreement', async () => {
            const agreementItemsList = await agreementItemController.getAgreementItems()
            agreementItemsList.length.should.be.equal(1)
            agreementItemsList[0].should.have.property('name')
            agreementItemsList[0].should.have.property('description')
            agreementItemsList[0].should.have.property('itemType').and.to.equal('services')
            agreementLocationItemId = agreementItemsList[0].id

        })

        it('should increase service item quantity for funeral agreement', async () => {
            let bodyData = {
                locationItemId: service.id,
                timezone: 'Asia/Calcutta',
                agreementLocationItemId,
                userId: 1
            }
            const record = await agreementItemController.createOrUpdate('add', bodyData)
            record.should.have.property('id').and.to.be.an('number')
            record.should.have.property('createdBy').and.to.be.an('number')
            record.should.have.property('createdBy').and.to.be.an('number')
            record.should.have.property('totalPaid').and.to.be.an('number')
            record.should.have.property('quantity').and.to.be.equal(2)
            record.should.have.property('locationItemId').and.to.be.equal(bodyData.locationItemId)
        })

        it('should remove service items for funeral agreement', async () => {
            let bodyData = {
                locationItemId: service.id,
                timezone: 'Asia/Calcutta',
                removeAll: true,
                agreementLocationItemId: agreementLocationItemId,
                userId: 1,
                apiType: 'quotation'
            }
            const record = await agreementItemController.createOrUpdate('remove', bodyData)
            record.should.have.property('id').and.to.be.an('number')
            record.should.have.property('createdBy').and.to.be.an('number')
            record.should.have.property('createdBy').and.to.be.an('number')
            record.should.have.property('totalPaid').and.to.be.an('number')
            record.should.have.property('quantity').and.to.be.equal(0)
        })
        it('should return an error saying items already removed for agreement', async () => {
            try {
                let bodyData = {
                    locationItemId: service.id,
                    timezone: 'Asia/Calcutta',
                    removeAll: true,
                    agreementLocationItemId: faker.random.number({
                        min: 1000
                    }),
                    userId: 1,
                    apiType: 'quotation'
                }
                await agreementItemController.createOrUpdate('remove', bodyData)
            } catch (err) {
                err.should.have.property('message').and.to.be.equal('LOCATION_ITEM_ALREADY_REMOVED')
            }
        })
    })

    describe('merchandise', async () => {
        let merchandise, agreementLocationItemId
        before(async () => {
            const merchandiseItemType = await models.ItemType.findOne({
                where: {
                    name: 'Merchandises'
                }
            })
            merchandise = await models.LocationItem.findOne({
                where: {
                    locationId: agreementSchema.locationId
                },
                include: [{
                    model: models.Item,
                    include: [{
                        model: models.ItemCategory,
                        where: {
                            itemTypeId: merchandiseItemType.id
                        }
                    }],
                    required: true
                }]
            })
        })
        it('should add merchandise item for funeral agreement', async () => {
            let bodyData = {
                locationItemId: merchandise.id,
                timezone: 'Asia/Calcutta',
                userId: 1
            }
            const record = await agreementItemController.createOrUpdate('add', bodyData)
            record.should.have.property('id').and.to.be.an('number')
            record.should.have.property('createdBy').and.to.be.an('number')
            record.should.have.property('createdBy').and.to.be.an('number')
            record.should.have.property('totalPaid').and.to.be.an('number')
            record.should.have.property('quantity').and.to.be.equal(1)
            record.should.have.property('locationItemId').and.to.be.equal(bodyData.locationItemId)
        })

        it('should list 1 merchandise that is associated with the agreement', async () => {
            const agreementItemsList = await agreementItemController.getAgreementItems()
            agreementItemsList.length.should.be.equal(1)
            agreementItemsList[0].should.have.property('name')
            agreementItemsList[0].should.have.property('description')
            agreementItemsList[0].should.have.property('itemType').and.to.equal('merchandises')
            agreementLocationItemId = agreementItemsList[0].id
        })

        it('should increase merchandise item quantity for funeral agreement', async () => {
            let bodyData = {
                locationItemId: merchandise.id,
                timezone: 'Asia/Calcutta',
                agreementLocationItemId,
                removeAll: false,
                userId: 1
            }
            const record = await agreementItemController.createOrUpdate('add', bodyData)
            record.should.have.property('id').and.to.be.an('number')
            record.should.have.property('createdBy').and.to.be.an('number')
            record.should.have.property('createdBy').and.to.be.an('number')
            record.should.have.property('totalPaid').and.to.be.an('number')
            record.should.have.property('quantity').and.to.be.equal(2)
        })

        it('should remove merchandise items for funeral agreement', async () => {
            let bodyData = {
                locationItemId: merchandise.id,
                timezone: 'Asia/Calcutta',
                removeAll: true,
                agreementLocationItemId: agreementLocationItemId,
                userId: 1,
                apiType: 'quotation'
            }
            const record = await agreementItemController.createOrUpdate('remove', bodyData)
            record.should.have.property('id').and.to.be.an('number')
            record.should.have.property('createdBy').and.to.be.an('number')
            record.should.have.property('createdBy').and.to.be.an('number')
            record.should.have.property('totalPaid').and.to.be.an('number')
            record.should.have.property('quantity').and.to.be.equal(0)
        })

        it('should return an error saying items already removed for agreement', async () => {
            try {
                let bodyData = {
                    locationItemId: merchandise.id,
                    timezone: 'Asia/Calcutta',
                    removeAll: true,
                    agreementLocationItemId: faker.random.number({
                        min: 1000
                    }),
                    userId: 1,
                    apiType: 'quotation'
                }
                await agreementItemController.createOrUpdate('remove', bodyData)
            } catch (err) {
                err.should.have.property('message').and.to.be.equal('LOCATION_ITEM_ALREADY_REMOVED')
            }
        })
    })
})