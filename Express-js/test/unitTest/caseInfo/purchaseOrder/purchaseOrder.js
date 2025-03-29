const chai = require('chai')
const chaiAsPromised = require('chai-as-promised')
const faker = require('faker')
chai.use(chaiAsPromised)
chai.should()
const expect = chai.expect

const models = require('../../../../models')
const { personSchema, agreementSchema } = require('../../schema')
const PersonController = require('../../../../controllers/refactorControllers/personController/personController')
const VerifiedPersonController = require('../../../../controllers/refactorControllers/personController/verifiedPersonController')
const AgreementController = require('../../../../controllers/refactorControllers/agreementController/agreementController')
const AgreementItemController = require('../../../../controllers/refactorControllers/agreementController/agreementItemController')
const AgreementPackageController = require('../../../../controllers/refactorControllers/agreementController/agreementPackageController')
const PurchaseOrderController = require('../../../../controllers/refactorControllers/purchaseOrderController/purchaseOrderController')

async function getService(code, itemType, locationId) {
  let query = {
    include: [
      {
        model: models.Item,
        where: { code: code },
        required: true
      }
    ],
    where: {
      locationId
    }
  }
  if (itemType) {
    const serviceItemType = await models.ItemType.findOne({
      where: { name: itemType }
    })
    query.include[0].include = [
      {
        model: models.ItemCategory,
        where: {
          itemTypeId: serviceItemType.id
        }
      }
    ]
  }
  const service = await models.LocationItem.findOne(query)
  return service
}

describe('Purchase Order Controller', () => {
  let agreementId, personId, agreementController, onOrderPurchaseOrders, location, packages, casketService, createdPerson
  before(async () => {
    const person = { ...personSchema() }
    createdPerson = await PersonController.createOrUpdate(person, {}, {})
    personId = createdPerson.id
    const verifiedPersonController = new VerifiedPersonController(personId)
    await verifiedPersonController.verifyPerson(createdPerson)
    await verifiedPersonController.createArrangement()
    const saleTypes = await verifiedPersonController.getSaleTypeOnArrangement(
      (agreementType = 1), createdPerson.isAlive ? 1: 2 
    )
    saleTypeIds = saleTypes.map(saleType => saleType.id)
    const agreementObject = {
      ...agreementSchema(createdPerson.isAlive),
      type: 1,
      saleTypeId: faker.random.arrayElement(saleTypeIds),
      locationId:3
    }
    const agreement = await AgreementController.createOrEditAgreement(
      personId,
      agreementObject
    )
    agreementId = agreement.id
    casketService = await getService('AU541F', 'Merchandises',agreement.locationId)
    const item = await getService('CPREP-DB2', null,agreement.locationId)
    const pkg = await models.Package.findOne({
      where: { name: 'Immediate Burial' },
      include: [
        {
          model: models.PackageLocationItem,
          where: {
            locationItemId: item.id
          }
        }
      ]
    })
    let agreementItemController = new AgreementItemController(agreementId)
    location =  await agreementItemController.createOrUpdate('add', {
      itemType: 'locationItem',
      locationItemId: casketService.id,
      timezone: 'Asia/Calcutta'
    })
    let agreementPackageController = new AgreementPackageController(agreementId)
    packages = await agreementPackageController.createOrUpdatePackage(
      { packageId: pkg.id, agreementId: agreementId, timezone: 'Asia/Calcutta' },
      'add'
    )
    agreementController = new AgreementController(agreementId)
  })

  it('should create a purchase order and send email notification to the purchasing department about the new purchase order.', async () => {
    let payloads = [
      {
        agreementLocationItemId: location.id,
        id: null
      },

      {
        agreementPackageId: packages.id,
        id: null
      }
    ]
    const transaction = await models.sequelize.transaction()
    await agreementController.checkoutAgreement(agreementId, personId)
    payloads.length &&
      (await Promise.all(
        payloads.map(async payload => {
          await PurchaseOrderController.createOrEditPurchaseOrder(
            payload,
            createdPerson,
            transaction
          )
        })
      ))
    await transaction.commit()
  })
  it('should update the quantity of the purchase order item and send an email notification to the purchasing department about the updated quantity.', async () => {
    const transaction = await models.sequelize.transaction()
    let agreementItemController = new AgreementItemController(agreementId)
    location =  await agreementItemController.createOrUpdate('add', {
      locationItemId: casketService.id,
      removeAll: false,
      userId: personId,
      timezone: 'Asia/Calcutta'
    })

    let agreementLocationItemsPayload = await Promise.all([{id: location.id}].map(async (items) => {
      let ItemsPurchaseOrderId = await models.PurchaseOrder.scope('notDeleted').findOne({
        where: {
            agreementLocationItemId: items.id
        },
        transaction
      })
      return {
        agreementLocationItemId: items.id,
        id: ItemsPurchaseOrderId ? ItemsPurchaseOrderId.id : null
      }
    }))

    // Package Items
    let agreementPackageIdsPayload = await Promise.all([{id: packages.id}].map(async (agreementPackage) => {
      let packagePurchaseOrderId = await models.PurchaseOrder.scope('notDeleted').findOne({
          where: {
              agreementPackageId: agreementPackage.id
          },
          transaction
      })
      return {
          agreementPackageId: agreementPackage.id,
          id: packagePurchaseOrderId ? packagePurchaseOrderId.id : null
      }
    }))

    let payloads = [...agreementLocationItemsPayload, ...agreementPackageIdsPayload]
    await agreementController.checkoutAgreement(agreementId, personId)
    payloads.length &&
      (await Promise.all(
        payloads.map(async payload => {
          await PurchaseOrderController.createOrEditPurchaseOrder(
            payload,
            createdPerson,
            transaction
          )
        })
      ))
    await transaction.commit()
  })
  it('should list purchaseOrders with filters from FE', async () => {
    const filters = {
      order: 'DESC'
    }
    purchaseOrders = await PurchaseOrderController.getListOfPurchaseOrders(
      (status = 'ToBeOrdered'),
      filters
    )
    purchaseOrders.should.have.property('total')
    purchaseOrders.should.have.property('purchaseOrders')
  })
  it('should update the status of a purchase order to on order and send an email notification to the arranger about the purchase order which got validated.', async () => {
    const filters= {
        order: 'DESC'
    }
    let purchaseOrders = await PurchaseOrderController.getListOfPurchaseOrders(status='ToBeOrdered',filters);
    const purchaseOrderController = new PurchaseOrderController(purchaseOrders.purchaseOrders[0].id)
    let purchaseOrderPayload = {
        item: {
            id: purchaseOrders.purchaseOrders[0].items[0].id,
            price: 160,
            quantity: 5,
            shippingCost: 10
        }
    }
    await purchaseOrderController.updatePurchaseOrder(purchaseOrderPayload, personId);
    onOrderPurchaseOrders = await PurchaseOrderController.getListOfPurchaseOrders(status='OnOrder',filters);
    onOrderPurchaseOrders.should.have.property('purchaseOrders')
    onOrderPurchaseOrders.purchaseOrders.should.be.an('array')
  })
  it('should update the status of a purchase order to invalid and send an email notification to the arranger about the purchase order which got invalidated.', async () => {
    const filters= {
        order: 'DESC'
    }
    let purchaseOrders = await PurchaseOrderController.getListOfPurchaseOrders(status='OnOrder',filters);
    const purchaseOrderController = new PurchaseOrderController(purchaseOrders.purchaseOrders[0].id)
    let purchaseOrderPayload = {
        item: {
            id: purchaseOrders.purchaseOrders[0].items[0].id,
            orderDenyReason: "Item Not Available"
        }
    }
    await purchaseOrderController.updatePurchaseOrder(purchaseOrderPayload, personId);
    onOrderPurchaseOrders = await PurchaseOrderController.getListOfPurchaseOrders(status='Invalid',filters);
    onOrderPurchaseOrders.should.have.property('purchaseOrders')
    onOrderPurchaseOrders.purchaseOrders.should.be.an('array')
  })
  it('should update the status of a purchase order to received and send an email notification to the arranger about the purchase order which got received.', async () => {
    const filters= {
        order: 'DESC'
    }
    let purchaseOrders = await PurchaseOrderController.getListOfPurchaseOrders(status='OnOrder',filters);
    const purchaseOrderController = new PurchaseOrderController(purchaseOrders.purchaseOrders[0].id)
    let purchaseOrderPayload = {
        item: {
            id: purchaseOrders.purchaseOrders[0].items[0].id,
            orderDenyReason: "Pull From Inventory"
        }
    }
    await purchaseOrderController.updatePurchaseOrder(purchaseOrderPayload, personId);
    onOrderPurchaseOrders = await PurchaseOrderController.getListOfPurchaseOrders(status='Received',filters);
    onOrderPurchaseOrders.should.have.property('purchaseOrders')
    onOrderPurchaseOrders.purchaseOrders.should.be.an('array')
  })
  it('should generate a PO and send email to the purchase dept', async () => {
        const purchaseOrderForm = await PurchaseOrderController.generatePurchaseOrderForm(onOrderPurchaseOrders.purchaseOrders[0].id, onOrderPurchaseOrders.purchaseOrders[0].items[0].id, 1,'');
  
        purchaseOrderForm.should.be.equal(true)
  })
  it(' should list purchaseorderdenyresons', async () => {
    const result = await PurchaseOrderController.getPurchaseOrderDenyReason()
    result.should.to.be.an('array').of.length.greaterThan(1)
  })
  it(' should find a purchaseorderdenyresons by name', async () => {
    const result = await PurchaseOrderController.getPurchaseOrderDenyReason(
      'Pull From Inventory'
    )
    result.should.to.be.an('array').of.length.greaterThan(0)
  })
  it(' should list purchaseorder status', async () => {
    const result = await PurchaseOrderController.getPurchaseOrderStatus()
    result.should.to.be.an('array').of.length.greaterThan(1)
  })
  it(' should find a purchaseorder status by name', async () => {
    const result = await PurchaseOrderController.getPurchaseOrderStatus(
      'ToBeOrdered'
    )
    result.should.to.be.an('array').of.length.greaterThan(0)
  })
  it(' should list order status', async () => {
    const result = await PurchaseOrderController.getOrderStatus()
    result.should.to.be.an('array').of.length.greaterThan(1)
  })
  it(' should find a order status by name', async () => {
    const result = await PurchaseOrderController.getOrderStatus('Received')
    result.should.to.be.an('array').of.length.greaterThan(0)
  })
  // previewPurchaseOrderForm will work in run time, wont work in test env because we trigger redis on other env 
  // it('should generate the preview url for the purchaseOrder', async () => {
  //   const purchaseOrderController = new PurchaseOrderController(onOrderPurchaseOrders.purchaseOrders[0].id)
  //   const purchaseOrderFormPreview = await purchaseOrderController.previewPurchaseOrderForm(onOrderPurchaseOrders.purchaseOrders[0].items[0].id, personId);
  //   purchaseOrderFormPreview.should.have.property('url')
  // })
  it('should replace a purchase order item with new item and send a email notification to the arranger about the purchase order item change.', async () => {
    if (purchaseOrders.total > 0) {
        const purchaseOrderId = purchaseOrders.purchaseOrders[0].id
        const purchaseOrderItemId = purchaseOrders.purchaseOrders[0].items[0].id
        let itemPayload = {
            item: {
              id: purchaseOrderItemId,
              quantity: 3,
              replacedLocationItemId: 2256
            }
        }
        const transaction = await models.sequelize.transaction()
        const purchaseOrderControllerInstance = new PurchaseOrderController(
          purchaseOrderId
        )
        const result = await purchaseOrderControllerInstance.purchaseOrderItemChange(
          itemPayload,
          personId
        )
        await transaction.commit()
        result.should.have.property('dataValues').should.to.be.an('object')
        result.dataValues.should.have.property('quantity').and.equal(itemPayload.item.quantity)
        result.dataValues.should.have.property('replacedLocationItemId').and.equal(itemPayload.item.replacedLocationItemId)
    }
  })
  it('should throw an error purchase order not found', async () => {
    await expect(PurchaseOrderController.getPurchaseOrder(0)).to.be.rejectedWith(Error,'PURCHASE_ORDER_NOT_FOUND')
  })
  it('should throw an error agreement location not found', async () => {
    await expect(PurchaseOrderController.getItemPrice(0)).to.be.rejectedWith(Error,'AGREEMENT_LOCATION_ITEM_NOT_FOUND')
  })
  it('should delete purchase order along with purchase order items', async () => {
    const transaction = await models.sequelize.transaction()
    const filters= {
            order: 'DESC'
        }
    let purchaseOrders = await PurchaseOrderController.getListOfPurchaseOrders(status='OnOrder',filters);
    const deletePO = purchaseOrders.purchaseOrders.find(val=>val.deletedAt == null)
    const payload= { id: deletePO.id , deletedAt: new Date(), deletedBy:1}
    await PurchaseOrderController.deletePurchaseOrder(payload,1, transaction)
    // await transaction.commit()

  })
})
