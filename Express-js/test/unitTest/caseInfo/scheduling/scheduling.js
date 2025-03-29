const chai = require('chai')
const chaiAsPromised = require('chai-as-promised')
const faker = require('faker')
chai.use(chaiAsPromised);
chai.should();

const models = require('../../../../models')
const { personSchema, agreementSchema, addressSchema, organizationSchema } = require('../../schema')
const { getAgreementRoles } = require('../../../../controllers/refactorControllers/utils')
const PersonController = require('../../../../controllers/refactorControllers/personController/personController')
const VerifiedPersonController = require('../../../../controllers/refactorControllers/personController/verifiedPersonController')
const AgreementController = require('../../../../controllers/refactorControllers/agreementController/agreementController')
const AgreementItemController = require('../../../../controllers/refactorControllers/agreementController/agreementItemController')
const AgreementPackageController = require('../../../../controllers/refactorControllers/agreementController/agreementPackageController')
const AgreementCAIController = require('../../../../controllers/refactorControllers/agreementController/agreementCashAdvanceItemController')
const SchedulingController = require('../../../../controllers/refactorControllers/schedulingController/schedulingController')
const ChapelController = require('../../../../controllers/refactorControllers/chapelController/chapelController')
const ItemUsageCtrl = require('../../../../controllers/refactorControllers/itemUsageController/itemUsageController')
const AddressController = require('../../../../controllers/refactorControllers/addressController/addressController')
const AgreementPropertyController = require('../../../../controllers/refactorControllers/agreementController/agreementPropertiesController')
const AgreementMemorialController = require('../../../../controllers/refactorControllers/agreementController/agreementMemorialController')
const WorkOrderController = require('../../../../controllers/refactorControllers/workOrderController/workOrderController')
const { createAgreement, createItemUsage, getPropertyIds,createProperties, getAgreementLocationIds,createLocationItems, getAgreementMemorialIds, createMemorialItem } = require('../itemUsage/itemUsageHelper')
const AddendumController = require('../../../../controllers/refactorControllers/agreementController/addendum')
const { getKey } = require('../../../../lib/util')
const { seed } = require('../../../../config/seed')
const moment = require('moment')
const { findOrCreateUser } = require('./../../helper')
const _ = require('lodash')
const Op = require('sequelize').Op

async function getService (code, itemType) {
    let query = {
        include: [{
            model: models.Item,
            where: { code: code },
            required: true
        }]
    }
    if (itemType) {
        const serviceItemType = await models.ItemType.findOne({ where: { name: itemType } })
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
const createPerson = async (isVerified, isAlive) => {
    person = {
        ...personSchema(),
        isAlive
    }
    const place= {
        address: {
            ...addressSchema()
        }
    }
    createdPerson = await PersonController.createOrUpdate(person, place, {})
    const verifiedPersonController = new VerifiedPersonController(createdPerson.id)
    if(isVerified) {
        await verifiedPersonController.verifyPerson(createdPerson)
    }
    return createdPerson.toJSON()
}

describe('Scheduling Controller', () => {
    let personId, serviceId, ssLength, agreementId, agreementItemController, schedulableServices, scheduledService, emp, urnTypeId, cemeteryAgmntId, propertyId, currentUser, selectedPropId, cmtryAgmntPropId, funeralCremationUpdateObj, cemeteryCremationUpdateObj
    before(async () => {
        const service = await getService('CFSVS-TC1', 'Services')
        const agreementRoles = await getAgreementRoles('map')
        serviceId = service.id
        const person = { ...personSchema() }
        person.isAlive = false
        const purchaser = await createPerson(true,true)
        const createdPerson = await PersonController.createOrUpdate(person, {}, {})
        purchaserId = purchaser.id
        personId = createdPerson.id
        const verifiedPersonController = new VerifiedPersonController(personId)
        await verifiedPersonController.verifyPerson(createdPerson)
        await verifiedPersonController.createArrangement()
        const saleTypes = await verifiedPersonController.getSaleTypeOnArrangement(agreementType = 1, createdPerson.isAlive ? 2: 1 )
        saleTypeIds = saleTypes.map(saleType => saleType.id)
        const agreementObject = {
            ...agreementSchema(createdPerson.isAlive),
            type: 1,
            saleTypeId: faker.random.arrayElement(saleTypeIds),
            persons: [
                {
                    personId:personId,
                    agreementRoleId: agreementRoles['Beneficiary']
                },
                {
                    personId: purchaser.id,
                    agreementRoleId: agreementRoles['Purchaser']
                }
            ]
        }
        agreementObject.locationId = 1
        const agreement = await AgreementController.createOrEditAgreement(personId, agreementObject)
        agreementId = agreement.id
        agreementItemController = new AgreementItemController(agreementId)
        addedServiceAgreementItem = await agreementItemController.createOrUpdate('add', {
            itemType: 'locationItem',
            locationItemId: serviceId,
            timezone: 'Asia/Calcutta'
        })
        addedServiceAgreementItemId = addedServiceAgreementItem.id
        let agreementController = new AgreementController(agreementId)
        await agreementController.checkoutAgreement(agreementId, personId)
        let agmntSchema = {
            needType: 1,
            type: 2,
            locationId: 2,
            persons: [
                {
                    personId:personId,
                    agreementRoleId: agreementRoles['Beneficiary']
                },
                {
                    personId: purchaser.id,
                    agreementRoleId: agreementRoles['Purchaser']
                }
            ]
          }
        cemeteryAgmntId = await createAgreement(personId, agmntSchema)
    })

    describe('Get schedulable fields for added location item', async () => {
        it('Should return error itemid required', async () => {
            try {
                await SchedulingController.getFieldsForSchedulingService()
            } catch (error) {
                error.should.have.property('message').and.to.be.equal('AgreementPackageItemId Or AgreementLocationItemId Or AgreementCashAdvanceItemId Or ItemUsageId is required')
            }
        })

        it('Should return error by sending both undefined values', async () => {
            try {
                await SchedulingController.getFieldsForSchedulingService(undefined, undefined)
            } catch (error) {
                error.should.have.property('message').and.to.be.equal('AgreementPackageItemId Or AgreementLocationItemId Or AgreementCashAdvanceItemId Or ItemUsageId is required')
            }
        })

        it('Should return error by sending both null values', async () => {
            try {
                await SchedulingController.getFieldsForSchedulingService(null, null)
            } catch (error) {
                error.should.have.property('message').and.to.be.equal('AgreementPackageItemId Or AgreementLocationItemId Or AgreementCashAdvanceItemId Or ItemUsageId is required')
            }
        })

        it('Should return error by sending all null values', async () => {
            try {
                await SchedulingController.getFieldsForSchedulingService(null, null, null, null)
            } catch (error) {
                error.should.have.property('message').and.to.be.equal('AgreementPackageItemId Or AgreementLocationItemId Or AgreementCashAdvanceItemId Or ItemUsageId is required')
            }
        })

        it('Should return error item not found', async () => {
            try {
                await SchedulingController.getFieldsForSchedulingService(null, 123)
            } catch (err) {
                err.should.have.property('message').and.to.be.equal('AgreementPackageItemId / AgreementLocationItemId / AgreementCashAdvanceItemId OR scheduling sections not found for given item')
            }
        })

        it('Should return error when item not found', async () => {
            try {
                await SchedulingController.getFieldsForSchedulingService(null, null, null, 123456789)
            } catch (err) {
                err.should.have.property('message').and.to.be.equal('Scheduling Sections not found for given item')
            }
        })

        describe('Should return success for funeral service attribute value', async () => {
            it('Should return funeral service fields successfully', async () => {
                const result = await SchedulingController.getFieldsForSchedulingService(null, addedServiceAgreementItemId)
                result.should.be.an('array')
            })
        })

        describe('Should return success for receptionCenter service attribute value', async () => {
            let receptionCenterServiceId
            before(async() => {
                const rc = await getService('CRECE-TC1', 'Services')
                const rcagItem = await agreementItemController.createOrUpdate('add', {
                    itemType: 'locationItem',
                    locationItemId: rc.id,
                    timezone: 'Asia/Calcutta'
                })
                receptionCenterServiceId = rcagItem.id
            })
            it('Should return receptionCenter service fields successfully', async () => {
                const result = await SchedulingController.getFieldsForSchedulingService(null, receptionCenterServiceId, null)
                result.should.be.an('array')
            })
        })

        describe('Should return success for funeral memorial service attribute value', async () => {
            let funeralMemorialServiceId
            before(async() => {
                const fm = await getService('CMSVS-DC1', 'Services')
                const fmagItem = await agreementItemController.createOrUpdate('add', {
                    itemType: 'locationItem',
                    locationItemId: fm.id,
                    timezone: 'Asia/Calcutta'
                })
                funeralMemorialServiceId = fmagItem.id
            })
            it('Should return funeral memorial service fields successfully', async () => {
                const result = await SchedulingController.getFieldsForSchedulingService(null, funeralMemorialServiceId, null)
                result.should.be.an('array')
            })
        })
        describe('Should return success for funeral visitation service attribute value', async () => {
            let funeralVisitationServiceId
            before(async() => {
                const fv = await getService('CVISI-CT1', 'Services')
                const fvagItem = await agreementItemController.createOrUpdate('add', {
                    itemType: 'locationItem',
                    locationItemId: fv.id,
                    timezone: 'Asia/Calcutta'
                })
                funeralVisitationServiceId = fvagItem.id
            })
            it('Should return funeral visitation service fields successfully', async () => {
                const result = await SchedulingController.getFieldsForSchedulingService(null, funeralVisitationServiceId, null)
                result.should.be.an('array')
            })
        })
        describe('Should return success for funeral cremation service attribute value', async () => {
            let funeralCremationServiceId
            before(async() => {
                const fc = await getService('CCREM-CC1', 'Services')
                const fcagItem = await agreementItemController.createOrUpdate('add', {
                    itemType: 'locationItem',
                    locationItemId: fc.id,
                    timezone: 'Asia/Calcutta'
                })
                funeralCremationServiceId = fcagItem.id
            })
            it('Should return funeral cremation service fields successfully', async () => {
                const result = await SchedulingController.getFieldsForSchedulingService(null, funeralCremationServiceId, null)
                result.should.be.an('array')
            })
        })
        describe('Should return success for funeral graveside service attribute value', async () => {
            let funeralGravesideServiceId
            before(async() => {
                const fg = await getService('CCREM-CC1', 'Services')
                const fgagItem = await agreementItemController.createOrUpdate('add', {
                    itemType: 'locationItem',
                    locationItemId: fg.id,
                    timezone: 'Asia/Calcutta'
                })
                funeralGravesideServiceId = fgagItem.id
            })
            it('Should return funeral graveside service fields successfully', async () => {
                const result = await SchedulingController.getFieldsForSchedulingService(null, funeralGravesideServiceId, null)
                result.should.be.an('array')
            })
        })
        describe('Should return success for cemetery graveside service attribute value', async () => {
            let itemUsageId
            before(async() => {
                const item = await getService('CL2ndInu', 'Services')
                const agmtItem = await agreementItemController.createOrUpdate('add', {
                    itemType: 'locationItem',
                    locationItemId: item.id,
                    timezone: 'Asia/Calcutta'
                })
                let itemUsageData = {
                    "resourceType": "Services",
                    "resourceId": agmtItem.id,
                    "isDeleted": false
                }
                let itemUsageCtrl = new ItemUsageCtrl(personId)
                let itemUsage = await itemUsageCtrl.createItemUsageSelect(itemUsageData)
                itemUsageId = itemUsage.itemUsageId
            })
            it('Should return funeral graveside service fields successfully', async () => {
                const result = await SchedulingController.getFieldsForSchedulingService(null, null, null, itemUsageId)
                result.should.be.an('array').that.is.not.empty
            })
        })
        describe('Should return success for cemetery disinterment service attribute value', async () => {
            let itemUsageId
            before(async() => {
                const item = await getService('CLdintCn', 'Services')
                const agmtItem = await agreementItemController.createOrUpdate('add', {
                    itemType: 'locationItem',
                    locationItemId: item.id,
                    timezone: 'Asia/Calcutta'
                })
                let itemUsageData = {
                    "resourceType": "Services",
                    "resourceId": agmtItem.id,
                    "isDeleted": false
                }
                let itemUsageCtrl = new ItemUsageCtrl(personId)
                let itemUsage = await itemUsageCtrl.createItemUsageSelect(itemUsageData)
                itemUsageId = itemUsage.itemUsageId
            })
            it('Should return funeral graveside service fields successfully', async () => {
                const result = await SchedulingController.getFieldsForSchedulingService(null, null, null, itemUsageId)
                result.should.be.an('array').that.is.not.empty
            })
        })
        describe('Should return success for cemetery cremation service attribute value', async () => {
            let itemUsageId
            before(async() => {
                const item = await getService('CLcrinf', 'Services')
                const agmtItem = await agreementItemController.createOrUpdate('add', {
                    itemType: 'locationItem',
                    locationItemId: item.id,
                    timezone: 'Asia/Calcutta'
                })
                let itemUsageData = {
                    "resourceType": "Services",
                    "resourceId": agmtItem.id,
                    "isDeleted": false
                }
                let itemUsageCtrl = new ItemUsageCtrl(personId)
                let itemUsage = await itemUsageCtrl.createItemUsageSelect(itemUsageData)
                itemUsageId = itemUsage.itemUsageId
            })
            it('Should return funeral graveside service fields successfully', async () => {
                const result = await SchedulingController.getFieldsForSchedulingService(null, null, null, itemUsageId)
                result.should.be.an('array').that.is.not.empty
            })
        })
        describe('Should return success for cemetery witness cremation service attribute value', async () => {
            let itemUsageId
            before(async() => {
                const item = await getService('CLwcrMF', 'Services')
                const agmtItem = await agreementItemController.createOrUpdate('add', {
                    itemType: 'locationItem',
                    locationItemId: item.id,
                    timezone: 'Asia/Calcutta'
                })
                let itemUsageData = {
                    "resourceType": "Services",
                    "resourceId": agmtItem.id,
                    "isDeleted": false
                }
                let itemUsageCtrl = new ItemUsageCtrl(personId)
                let itemUsage = await itemUsageCtrl.createItemUsageSelect(itemUsageData)
                itemUsageId = itemUsage.itemUsageId
            })
            it('Should return funeral graveside service fields successfully', async () => {
                const result = await SchedulingController.getFieldsForSchedulingService(null, null, null, itemUsageId)
                result.should.be.an('array').that.is.not.empty
            })
        })
    })

    describe('Get list of Schedulable Services', async () => {
        it('Should return list of scheduling services successfully', async () => {
            const result = await SchedulingController.getSchedulableServices(personId)
            result.should.be.an('array')
            result[0].should.have.property('schedulingAttribute')
            result[0].should.have.property('schedulingAttributeId')
            result[0].should.have.property('description')
            result[0].should.have.property('agreementType')
            result[0].should.have.property('agreementId')
            result[0].should.have.property('contractNumber')
            result[0].should.have.property('addendumNumber')
            result[0].should.have.property('agreementLocationItemId')
            result[0].should.have.property('agreementPackageItemId')
            result[0].should.have.property('scheduledFuneralService')
            ssLength = result.length
        })
        it('Should return list of scheduling services with addendum', async () => {
            const person = { ...personSchema() }
            const agreementRoles = await getAgreementRoles('map')
            person.isAlive = false
            const createdPerson = await PersonController.createOrUpdate(person, {}, {})
            let newpersonId = createdPerson.id
            const verifiedPersonController = new VerifiedPersonController(newpersonId)
            await verifiedPersonController.verifyPerson(createdPerson)
            // await verifiedPersonController.createArrangement()
            let agreementSchema = {
                needType: 1,
                type: 1,
                locationId: 1,
                persons: [
                    {
                        personId:newpersonId,
                        agreementRoleId: agreementRoles['Beneficiary']
                    }
                ]
              }
            let agmtId = await createAgreement(newpersonId, agreementSchema)
            const addendumController = new AddendumController(agmtId)
            const agreementController = new AgreementController(agmtId)
            const service = await getService('CFSVS-TC1', 'Services')
            await agreementController.markAgreementComplete()
            const addendum = await addendumController.createAddendum()
           
            const agreementItemController = new AgreementItemController(agmtId)
            const payload = {
                addendumId: addendum.id,
                locationItemId: service.id,
                timezone: 'Asia/Calcutta'
            }
            await agreementItemController.createOrUpdate('add', payload)
            const result = await SchedulingController.getSchedulableServices(newpersonId)
            result.should.be.an('array')
            result[result.length-1].should.have.property('addendumNumber').to.not.equal(null)
        })
    })

    describe('Get list of Agreement Items', async () => {
        it('Should return empty array without urn/casket items in agreement', async () => {
            const result = await SchedulingController.getAgreementItems(personId, 'Urn')
            result.should.be.an('array').that.is.empty
        })
        
        it('Should return list of Urn - Agreement Items successfully for funeral ', async () => {
            const urnService = await getService('3CMPCH', 'Merchandises')
            await agreementItemController.createOrUpdate('add', {
                itemType: 'locationItem',
                locationItemId: urnService.id,
                timezone: 'Asia/Calcutta'
            })
            const result = await SchedulingController.getAgreementItems(personId, 'Urn')
            result.should.be.an('array')
            result[0].should.have.property('itemName')
            result[0].should.have.property('agreementLocationItemId')
            result[0].should.have.property('itemUsageId')
        })

        it('Should return list of Casket - Agreement Items successfully for funeral', async () => {
            const casketService = await getService('AU541F', 'Merchandises')
            await agreementItemController.createOrUpdate('add', {
                itemType: 'locationItem',
                locationItemId: casketService.id,
                timezone: 'Asia/Calcutta'
            })
            const result = await SchedulingController.getAgreementItems(personId, 'Casket')
            result.should.be.an('array')
            result[0].should.have.property('itemName')
            result[0].should.have.property('agreementLocationItemId')
            result[0].should.have.property('itemUsageId')
        })

        it('Should return list of Casket - Agreement Items successfully for cemetery', async () => {
            const casketService = await getService('AUA02302', 'Merchandises')
            const agmtItem = await agreementItemController.createOrUpdate('add', {
                itemType: 'locationItem',
                locationItemId: casketService.id,
                timezone: 'Asia/Calcutta'
            })
            let itemUsageData = {
                "resourceType": "Merchandises",
                "resourceId": agmtItem.id,
                "isDeleted": false
            }
            let itemUsageCtrl = new ItemUsageCtrl(personId)
            let itemUsage = await itemUsageCtrl.createItemUsageSelect(itemUsageData)
            itemUsageId = itemUsage.itemUsageId
            const result = await SchedulingController.getAgreementItems(personId, 'Casket')
            result.should.be.an('array')
            result[0].should.have.property('itemName')
            result[0].should.have.property('agreementLocationItemId')
            result[0].should.have.property('itemUsageId')
        })

        it('Should return list of Vault - Agreement Items successfully for cemetery', async () => {
            const casketService = await getService('CYG30865', 'Merchandises')
            const agmtItem = await agreementItemController.createOrUpdate('add', {
                itemType: 'locationItem',
                locationItemId: casketService.id,
                timezone: 'Asia/Calcutta'
            })
            let itemUsageData = {
                "resourceType": "Merchandises",
                "resourceId": agmtItem.id,
                "isDeleted": false
            }
            let itemUsageCtrl = new ItemUsageCtrl(personId)
            let itemUsage = await itemUsageCtrl.createItemUsageSelect(itemUsageData)
            itemUsageId = itemUsage.itemUsageId
            const result = await SchedulingController.getAgreementItems(personId, 'Casket')
            result.should.be.an('array')
            result[0].should.have.property('itemName')
            result[0].should.have.property('agreementLocationItemId')
            result[0].should.have.property('itemUsageId')
        })
    })

    describe('Get list of Urn Types', async () => {
        it('Should return list of Urn Types successfully', async () => {
            const result = await SchedulingController.getUrnTypes()
            result.should.be.an('array')
            result[0].should.have.property('id')
            result[0].should.have.property('name')
            urnTypeId = result[0].id
        })
    })

    describe('Get list of Sub services', async () => {
        it('Should return list of Sub services successfully', async () => {
            const result = await SchedulingController.getSubServices()
            result.should.be.an('array').of.length(8)
        })
    })

    describe('Removal Scenarios of Schedulable Services', async () => {
        describe('Removal of Agreement Location Items', async () => {
            it('Should remove Agreement Location Item successfully', async () => {
                let agreementItemController = new AgreementItemController(agreementId)
                await agreementItemController.createOrUpdate('remove', {
                    itemType: 'locationItem',
                    locationItemId: serviceId,
                    timezone: 'Asia/Calcutta',
                    agreementLocationItemId: addedServiceAgreementItemId
                })
                const result = await SchedulingController.getSchedulableServices(personId)
                result.should.be.an('array')
                result.length.should.equal(ssLength-1)
            })
        })
        describe('Removal of Agreement Package Items', async () => {
            it('Should remove Agreement Package Item successfully', async () => {
                const item = await getService('FACILVISIT', null)
                const packageDetails = await models.Package.findOne({ where: { isActive: true, name: 'Immediate Burial' } })
                
                let agreementPackageController = new AgreementPackageController(agreementId)
                await agreementPackageController.createOrUpdatePackage({ packageId: packageDetails.id, agreementId: agreementId, timezone: 'Asia/Calcutta' }, 'add')
                const ss = await SchedulingController.getSchedulableServices(personId)
                ss.should.be.an('array')
                ss.length.should.equal(ssLength)
                await agreementPackageController.createOrUpdatePackage({ packageId: packageDetails.id, agreementId: agreementId, timezone: 'Asia/Calcutta' }, 'remove')
                const result = await SchedulingController.getSchedulableServices(personId)
                result.should.be.an('array')
                result.length.should.equal(ssLength-1)
            })
        })
        describe('Removal of Cash Advanced Items', async () => {
            let cai
            before(async() => {
                const item = await getService('CCCremWIT', 'Cash Advance')
                const agreementCAIController = new AgreementCAIController(agreementId)
                cai = { quantity: 3, price: 5, note: 'test', locationItemId: item.id, agreementId: agreementId, timezone: 'Asia/Calcutta' }
                const caItem = await agreementCAIController.upsertCashAdvanceItem(cai)
                cai.id = caItem.id
                const ss = await SchedulingController.getSchedulableServices(personId)
                ssLength = ss.length
            })
            it('Should decrease quantity of Cash Advanced Item successfully', async () => {
                cai.quantity = cai.quantity-1
                const agreementCAIController = new AgreementCAIController(agreementId)
                await agreementCAIController.upsertCashAdvanceItem(cai)
                const result = await SchedulingController.getSchedulableServices(personId)
                result.should.be.an('array')
                result.length.should.equal(ssLength-1)
                ssLength = result.length
            })

            it('Should remove Cash Advanced Item successfully', async () => {
                const agreementCAIController = new AgreementCAIController(agreementId)
                await agreementCAIController.removeCashAdvanceItem({ id: cai.id, agreementId: agreementId, timezone: 'Asia/Calcutta' })
                const result = await SchedulingController.getSchedulableServices(personId)
                result.should.be.an('array')
                result.length.should.equal(ssLength-cai.quantity)
                schedulableServices = result
            })
        })
    })

    describe('Create or Update Funeral Schedule Service', async () => {
        let statusId, contactId, clCemeteryLocationId, subServiceId, chapelId, crematoryId, place, currentUser, createdWorkOrder
        let scheduling = {
            "agreementPackageItemId": null,
            "agreementCashAdvancedItemId": null,
            "schedulingDetails": {
                "date": moment(),
                "beginningTime": moment().set({'hour': 15, 'minute': 0}),
                "endingTime": moment().set({'hour': 20, 'minute': 0}),
                "clFacilityLocationId": null,
                "serviceLocationId": null,
                "reservedChapel": {
                    "chapelId": 0,
                    "reservationDate": moment(),
                    "startTime": moment().set({'hour': 16, 'minute': 0}),
                    "endTime": moment().set({'hour': 17, 'minute': 0})
                }
            },
            "cemeteryInformationDetails": {
                "clCemeteryLocationId": null,
                "cemeteryLocationId": null,
                "burialSite": null
            },
            "resourcesDetails": {
                "isHearseNeeded": false,
                "isUtilityCarNeeded": false,
                "crematoryId": null,
                "crematoryDate": null,
                "crematoryStartTime": null,
                "crematoryEndTime": null,
                "notesFromFamily": [],
                "notesFromStaff": [],
                "pallbearers": []
            },
            "subServicesDetails": [],
            "casketDetails": {
                "casketId": null,
                "casketType": null,
                "isOutSideCasket": false
            },
            "urnInformationDetails": {
                "urnId": null,
                "isFamilyOwnedUrn": false,
                "urnType": null,
                "urnStatus": null,
                "height": null,
                "width": null,
                "depth": null,
                "receivedDate": null,
                "isTransferRequired": false
            }
        } 
        before(async () => {
            // added remaining services
            currentUser = await findOrCreateUser()
            propertyid = faker.random.arrayElement(await getPropertyIds("Hill Side", "Grave"))
            await createProperties(agreementId, propertyid, currentUser)
            const fgs = await getService('CGRSVS-TC1', 'Services')
            const fs = await getService('CFSVS-TC2', 'Services')
            const fds = await getService('CDSIN', null)
            const fcs = await getService('CCREM-TC2', 'Services')
            const fvs = await getService('CVISI-CT1', 'Services')
            const frs = await getService('CRECE-TC1', 'Services')
            const fms = await getService('CMSVS-DC3', 'Services')
            let agreementItemController = new AgreementItemController(agreementId)
            await agreementItemController.createOrUpdate('add', {
                itemType: 'locationItem',
                locationItemId: fgs.id,
                timezone: 'Asia/Calcutta'
            })
            await agreementItemController.createOrUpdate('add', {
                itemType: 'locationItem',
                locationItemId: fvs.id,
                timezone: 'Asia/Calcutta'
            })
            await agreementItemController.createOrUpdate('add', {
                itemType: 'locationItem',
                locationItemId: frs.id,
                timezone: 'Asia/Calcutta'
            })
            await agreementItemController.createOrUpdate('add', {
                itemType: 'locationItem',
                locationItemId: fms.id,
                timezone: 'Asia/Calcutta'
            })
            await agreementItemController.createOrUpdate('add', {
                itemType: 'locationItem',
                locationItemId: fcs.id,
                timezone: 'Asia/Calcutta'
            })
            await agreementItemController.createOrUpdate('add', {
                itemType: 'locationItem',
                locationItemId: fs.id,
                timezone: 'Asia/Calcutta'
            })
            await agreementItemController.createOrUpdate('add', {
                itemType: 'locationItem',
                locationItemId: fds.id,
                timezone: 'Asia/Calcutta'
            })
            // addes cash advanced item (for Funeral Witness Cremation Service)
            const fwcs = await getService('CCCremWIT', 'Cash Advance')
            const agreementCAIController = new AgreementCAIController(agreementId)
            let cai = { quantity: 1, price: 5, note: 'test', locationItemId: fwcs.id, agreementId: agreementId, timezone: 'Asia/Calcutta' }
            await agreementCAIController.upsertCashAdvanceItem(cai)
            schedulableServices = await SchedulingController.getSchedulableServices(personId)
            let status = await models.WorkOrderStatus.findOne({
                where: { name: 'closed' }
            })
            statusId = status.id
            emp = await models.Employee.findOne({})
            const contactType = Number(getKey(seed.ContactType, 'Staff'))
            const pallbearerCR = await models.ContactRole.findOne({ name: 'Pallbearers' })
            const contactData = {
                contactType: contactType,
                resourceId: emp.id,
                contactRoleIds: [pallbearerCR.id]
            }
            const verifiedPersonController = new VerifiedPersonController(personId)
            const contactDetails = await verifiedPersonController.addOrUpdateContactsWithRoles(contactData)
            contactId = contactDetails.id
            const location = await models.Location.findOne({ where: { code: 'CFS' } })
            clCemeteryLocationId = location.id
            const subService = await models.SubService.findOne({})
            subServiceId = subService.id
            chapel = await ChapelController.getListOfChapels({chapelType: 'chapel', locationId: 2})
            chapelId = chapel[0].id
            let cremChapel = await ChapelController.getListOfChapels({chapelType: 'crematory'})
            crematoryId = cremChapel[0].id
            place = await AddressController._managePlace({address: addressSchema(),organization: organizationSchema()})
        })
        it('Should throw error while creating Scheduled Funeral Service without scheduling details', async () => {
            scheduling.schedulingDetails = null
            try {
                const schedulingController = new SchedulingController()
                await schedulingController.createOrUpdateScheduledFuneralService(scheduling)
            } catch (error) {
                error.should.have.property('message').and.to.be.equal('SCHEDULING_DETAILS_ARE_REQUIRED_FOR_SCHEDULING')
            }
        })

        // Funeral Cremation Service
        it('Should create Scheduled Funeral Service successfully with scheduling details for Funeral Cremation Service', async () => {
            let schedulableService = _.find(schedulableServices, ['schedulingAttribute', 'Funeral Cremation Service'])
            scheduling.agreementLocationItemId = schedulableService.agreementLocationItemId,
            scheduling.personId = personId
            scheduling.schedulingDetails = {
                "date": moment(),
                "beginningTime": moment().set({'hour': 15, 'minute': 0}),
                "endingTime": moment().set({'hour': 20, 'minute': 0}),
                "clFacilityLocationId": null,
                "serviceLocationId": null,
                "reservedChapel": {
                    "chapelId": 0,
                    "reservationDate": moment(),
                    "startTime": moment().set({'hour': 16, 'minute': 0}),
                    "endTime": moment().set({'hour': 17, 'minute': 0})
                }
            }
            const schedulingController = new SchedulingController()
            const result = await schedulingController.createOrUpdateScheduledFuneralService(scheduling)
            createdWorkOrder = await models.WorkOrder.findOne({ where: {
                resourceType: 'ScheduledFuneralService',
                resourceId: result.id
            } })
            result.should.be.an('object')
            result.should.have.property('agreementCashAdvancedItemId')
            result.should.have.property('agreementPackageItemId')
            result.should.have.property('agreementLocationItemId').to.be.equal(scheduling.agreementLocationItemId)
            result.should.have.property('casketDetails').and.to.be.an('object')
            result.casketDetails.should.have.property('id')
            result.should.have.property('cemeteryInformationDetails').and.to.be.an('object')
            result.cemeteryInformationDetails.should.have.property('id')
            result.should.have.property('person').and.to.be.an('object')
            result.person.should.have.property('id')
            result.person.should.have.property('firstName')
            result.person.should.have.property('middleName')
            result.person.should.have.property('lastName')
            result.person.should.have.property('onePortalId')
            result.should.have.property('resourcesDetails').and.to.be.an('object')
            result.resourcesDetails.should.have.property('id')
            result.resourcesDetails.should.have.property('isHearseNeeded').to.be.equal(scheduling.resourcesDetails.isHearseNeeded)
            result.resourcesDetails.should.have.property('isUtilityCarNeeded').to.be.equal(scheduling.resourcesDetails.isUtilityCarNeeded)
            result.resourcesDetails.should.have.property('notesFromFamily').and.to.be.an('array')
            result.resourcesDetails.notesFromFamily.should.be.an('array').that.is.empty
            result.resourcesDetails.should.have.property('notesFromStaff').and.to.be.an('array')
            result.resourcesDetails.notesFromStaff.should.be.an('array').that.is.empty
            result.should.have.property('schedulingDetails').and.to.be.an('object')
            result.schedulingDetails.should.have.property('date').to.not.equal(null)
            result.schedulingDetails.should.have.property('beginningTime').to.not.equal(null)
            result.schedulingDetails.should.have.property('endingTime').to.not.equal(null)
            result.should.have.property('subServicesDetails').and.to.be.an('array')
            result.subServicesDetails.length.should.equal(0)
            result.should.have.property('urnInformationDetails').and.to.be.an('object')
            result.urnInformationDetails.should.have.property('isFamilyOwnedUrn').to.be.equal(scheduling.urnInformationDetails.isFamilyOwnedUrn)
            result.urnInformationDetails.should.have.property('isTransferRequired').to.be.equal(scheduling.urnInformationDetails.isFamilyOwnedUrn)
            scheduledService = result
        })
        it('Should update Scheduled Funeral Service successfully with the given details for Funeral Cremation Service', async () => {
            scheduledService.casketDetails.casketType = "Test"
            scheduledService.casketDetails.isOutSideCasket = true
            scheduledService.resourcesDetails.crematoryDate = moment()
            scheduledService.resourcesDetails.crematoryStartTime = moment().set({'hour': 17, 'minute': 0})
            scheduledService.resourcesDetails.crematoryEndTime = moment().set({'hour': 18, 'minute': 0})
            scheduledService.resourcesDetails.isHearseNeeded = true
            scheduledService.resourcesDetails.isUtilityCarNeeded = true
            scheduledService.resourcesDetails.pallbearers = [contactId]
            scheduledService.resourcesDetails.notesFromFamily = [{id: null, content: "Test Family Note"}]
            scheduledService.resourcesDetails.notesFromStaff = [{id: null, content: "Test Staff Note"}]
            const schedulingController = new SchedulingController()
            const result = await schedulingController.createOrUpdateScheduledFuneralService(scheduledService)
            result.should.be.an('object')
            result.should.have.property('casketDetails').and.to.be.an('object')
            result.casketDetails.should.have.property('id').to.be.equal(scheduledService.casketDetails.id)
            result.casketDetails.should.have.property('casketType').to.be.equal(scheduledService.casketDetails.casketType)
            result.casketDetails.should.have.property('isOutSideCasket').to.be.equal(scheduledService.casketDetails.isOutSideCasket)
            result.should.have.property('resourcesDetails').and.to.be.an('object')
            result.resourcesDetails.should.have.property('id').to.be.equal(scheduledService.resourcesDetails.id)
            result.resourcesDetails.should.have.property('crematoryDate').to.not.equal(null)
            result.resourcesDetails.should.have.property('crematoryStartTime').to.not.equal(null)
            result.resourcesDetails.should.have.property('crematoryEndTime').to.not.equal(null)
            result.resourcesDetails.should.have.property('isHearseNeeded').to.be.equal(scheduledService.resourcesDetails.isHearseNeeded)
            result.resourcesDetails.should.have.property('isUtilityCarNeeded').to.be.equal(scheduledService.resourcesDetails.isUtilityCarNeeded)
            result.resourcesDetails.should.have.property('pallbearers').and.to.be.an('array')
            result.resourcesDetails.pallbearers.should.be.an('array').that.is.not.empty
            result.resourcesDetails.pallbearers[0].should.have.property('contactId').to.be.equal(contactId)
            result.resourcesDetails.pallbearers[0].should.have.property('name').to.be.equal(emp.name)
            result.resourcesDetails.should.have.property('notesFromFamily').and.to.be.an('array')
            result.resourcesDetails.notesFromFamily.should.be.an('array').that.is.not.empty
            result.resourcesDetails.notesFromFamily[0].should.have.property('id').to.not.equal(null)
            result.resourcesDetails.notesFromFamily[0].should.have.property('content').to.be.equal(scheduledService.resourcesDetails.notesFromFamily[0].content)
            result.resourcesDetails.should.have.property('notesFromStaff').and.to.be.an('array')
            result.resourcesDetails.notesFromStaff.should.be.an('array').that.is.not.empty
            result.resourcesDetails.notesFromStaff[0].should.have.property('id').to.not.equal(null)
            result.resourcesDetails.notesFromStaff[0].should.have.property('content').to.be.equal(scheduledService.resourcesDetails.notesFromStaff[0].content)
            scheduledService = result
        })
        it('Should update Scheduled Date and Time for Funeral Cremation Service', async () => {
            const funeralCremationObj = { ...scheduledService }

            funeralCremationUpdateObj = {
                "id": funeralCremationObj.id,
                "personId": funeralCremationObj.personId,
                "workOrderId": createdWorkOrder.id,
                "id": funeralCremationObj.schedulingDetails.id,
                "beginningTime": funeralCremationObj.schedulingDetails.beginningTime,
                "endingTime": funeralCremationObj.schedulingDetails.endingTime
            }

            const schedulingController = new SchedulingController()
            const updateResult = await schedulingController.updateScheduledDateTime(funeralCremationUpdateObj)
            updateResult.should.be.an('object')
            updateResult.should.have.property('schedulingDetails').and.to.be.an('object')
            updateResult.schedulingDetails.should.have.property('id').to.be.equal(funeralCremationUpdateObj.id)
            updateResult.schedulingDetails.should.have.property('beginningTime')
            updateResult.schedulingDetails.should.have.property('endingTime')
        })

        it('Should throw an error if we pass invalid date and time for Funeral Cremation Service', async () => {
            const funeralCremationObjWithInvalidDate = { ...funeralCremationUpdateObj }
            funeralCremationObjWithInvalidDate.beginningTime = '202-10-26T18:30:00.000Z'

            const schedulingController = new SchedulingController()
            try {
                await schedulingController.updateScheduledDateTime(funeralCremationObjWithInvalidDate)
            } catch (error) {
                error.should.have.property('message').to.be.equal('SCHEDULING_ENDING_TIME_MUST_BE_GREATERTHAN_SCHEDULING_BEGINNING_TIME')
            }
        })

        it('Should throw error while updating Scheduled Funeral Service for which work order is closed', async () => {
            try {
                // Closed Work Order
                await models.WorkOrder.update({ statusId: statusId }, {
                    where: {
                        resourceType: 'ScheduledFuneralService',
                        resourceId: scheduledService.id
                    }
                })
                const schedulingController = new SchedulingController()
                await schedulingController.createOrUpdateScheduledFuneralService(scheduledService)
            } catch (error) {
                error.should.have.property('message').and.to.be.equal('THIS_SCHEDULE_CAN_NOT_BE_EDITITED_BECAUSE_RELATED_WORK_ORDER_IS_CLOSED')
            }
        })

        // Funeral Disinterment Service
        it('Should create Scheduled Funeral Service successfully with scheduling details for Funeral Disinterment Service', async () => {
            let schedulableService = _.find(schedulableServices, ['schedulingAttribute', 'Funeral Disinterment Service'])
            scheduling.agreementLocationItemId = schedulableService.agreementLocationItemId,
            scheduling.personId = personId
            scheduling.schedulingDetails = {
                "date": moment(),
                "beginningTime": moment().set({'hour': 15, 'minute': 0}),
                "endingTime": moment().set({'hour': 20, 'minute': 0}),
                "clFacilityLocationId": null,
                "serviceLocationId": null,
                "reservedChapel": {
                    "chapelId": 0,
                    "reservationDate": moment(),
                    "startTime": moment().set({'hour': 16, 'minute': 0}),
                    "endTime": moment().set({'hour': 17, 'minute': 0})
                }
            }
            const schedulingController = new SchedulingController()
            const result = await schedulingController.createOrUpdateScheduledFuneralService(scheduling)
            result.should.be.an('object')
            result.should.have.property('agreementCashAdvancedItemId')
            result.should.have.property('agreementPackageItemId')
            result.should.have.property('agreementLocationItemId').to.be.equal(scheduling.agreementLocationItemId)
            result.should.have.property('casketDetails').and.to.be.an('object')
            result.casketDetails.should.have.property('id')
            result.should.have.property('cemeteryInformationDetails').and.to.be.an('object')
            result.cemeteryInformationDetails.should.have.property('id')
            result.should.have.property('person').and.to.be.an('object')
            result.person.should.have.property('id')
            result.person.should.have.property('firstName')
            result.person.should.have.property('middleName')
            result.person.should.have.property('lastName')
            result.person.should.have.property('onePortalId')
            result.should.have.property('resourcesDetails').and.to.be.an('object')
            result.resourcesDetails.should.have.property('id')
            result.resourcesDetails.should.have.property('isHearseNeeded').to.be.equal(scheduling.resourcesDetails.isHearseNeeded)
            result.resourcesDetails.should.have.property('isUtilityCarNeeded').to.be.equal(scheduling.resourcesDetails.isUtilityCarNeeded)
            result.resourcesDetails.should.have.property('notesFromFamily').and.to.be.an('array')
            result.resourcesDetails.notesFromFamily.should.be.an('array').that.is.empty
            result.resourcesDetails.should.have.property('notesFromStaff').and.to.be.an('array')
            result.resourcesDetails.notesFromStaff.should.be.an('array').that.is.empty
            result.should.have.property('schedulingDetails').and.to.be.an('object')
            result.schedulingDetails.should.have.property('date').to.not.equal(null)
            result.schedulingDetails.should.have.property('beginningTime').to.not.equal(null)
            result.schedulingDetails.should.have.property('endingTime').to.not.equal(null)
            result.should.have.property('subServicesDetails').and.to.be.an('array')
            result.subServicesDetails.length.should.equal(0)
            result.should.have.property('urnInformationDetails').and.to.be.an('object')
            result.urnInformationDetails.should.have.property('isFamilyOwnedUrn').to.be.equal(scheduling.urnInformationDetails.isFamilyOwnedUrn)
            result.urnInformationDetails.should.have.property('isTransferRequired').to.be.equal(scheduling.urnInformationDetails.isFamilyOwnedUrn)
            scheduledService = result
        })
        it('Should update Scheduled Funeral Service successfully with the given details for Funeral Disinterment Service', async () => {
            scheduledService.cemeteryInformationDetails.clCemeteryLocationId = clCemeteryLocationId
            scheduledService.resourcesDetails.isHearseNeeded = true
            scheduledService.resourcesDetails.isUtilityCarNeeded = true
            scheduledService.resourcesDetails.notesFromFamily = [{id: null, content: "Test Family Note"}]
            scheduledService.resourcesDetails.notesFromStaff = [{id: null, content: "Test Staff Note"}]
            const schedulingController = new SchedulingController()
            const result = await schedulingController.createOrUpdateScheduledFuneralService(scheduledService)
            result.should.be.an('object')
            result.should.have.property('cemeteryInformationDetails').and.to.be.an('object')
            result.cemeteryInformationDetails.should.have.property('id')
            result.cemeteryInformationDetails.should.have.property('clCemeteryLocation').and.to.be.an('object')
            result.cemeteryInformationDetails.clCemeteryLocation.should.have.property('id').to.be.equal(clCemeteryLocationId)
            result.cemeteryInformationDetails.should.have.property('burialSite').to.be.equal(null)
            result.cemeteryInformationDetails.should.have.property('cemeteryLocation').to.be.equal(null)
            result.should.have.property('resourcesDetails').and.to.be.an('object')
            result.resourcesDetails.should.have.property('id').to.be.equal(scheduledService.resourcesDetails.id)
            result.resourcesDetails.should.have.property('crematoryDate').to.be.equal(null)
            result.resourcesDetails.should.have.property('crematoryStartTime').to.be.equal(null)
            result.resourcesDetails.should.have.property('crematoryEndTime').to.be.equal(null)
            result.resourcesDetails.should.have.property('isHearseNeeded').to.be.equal(scheduledService.resourcesDetails.isHearseNeeded)
            result.resourcesDetails.should.have.property('isUtilityCarNeeded').to.be.equal(scheduledService.resourcesDetails.isUtilityCarNeeded)
            result.resourcesDetails.should.have.property('pallbearers').and.to.be.an('array')
            result.resourcesDetails.pallbearers.should.be.an('array').that.is.empty
            result.resourcesDetails.should.have.property('notesFromFamily').and.to.be.an('array')
            result.resourcesDetails.notesFromFamily.should.be.an('array').that.is.not.empty
            result.resourcesDetails.notesFromFamily[0].should.have.property('id').to.not.equal(null)
            result.resourcesDetails.notesFromFamily[0].should.have.property('content').to.be.equal(scheduledService.resourcesDetails.notesFromFamily[0].content)
            result.resourcesDetails.should.have.property('notesFromStaff').and.to.be.an('array')
            result.resourcesDetails.notesFromStaff.should.be.an('array').that.is.not.empty
            result.resourcesDetails.notesFromStaff[0].should.have.property('id').to.not.equal(null)
            result.resourcesDetails.notesFromStaff[0].should.have.property('content').to.be.equal(scheduledService.resourcesDetails.notesFromStaff[0].content)
            scheduledService = result
        })

        // Funeral Service
        it('Should create Scheduled Funeral Service successfully with scheduling details for Funeral Service', async () => {
            let schedulableService = _.find(schedulableServices, ['schedulingAttribute', 'Funeral Service'])
            scheduling.agreementLocationItemId = schedulableService.agreementLocationItemId,
            scheduling.personId = personId
            scheduling.schedulingDetails = {
                "date": moment(),
                "beginningTime": moment().set({'hour': 15, 'minute': 0}),
                "endingTime": moment().set({'hour': 20, 'minute': 0}),
                "clFacilityLocationId": null,
                "serviceLocationId": null,
                "reservedChapel": {
                    "chapelId": 0,
                    "reservationDate": moment(),
                    "startTime": moment().set({'hour': 16, 'minute': 0}),
                    "endTime": moment().set({'hour': 17, 'minute': 0})
                }
            }
            const schedulingController = new SchedulingController()
            const result = await schedulingController.createOrUpdateScheduledFuneralService(scheduling)
            result.should.be.an('object')
            result.should.have.property('agreementCashAdvancedItemId')
            result.should.have.property('agreementPackageItemId')
            result.should.have.property('agreementLocationItemId').to.be.equal(scheduling.agreementLocationItemId)
            result.should.have.property('casketDetails').and.to.be.an('object')
            result.casketDetails.should.have.property('id')
            result.should.have.property('cemeteryInformationDetails').and.to.be.an('object')
            result.cemeteryInformationDetails.should.have.property('id')
            result.should.have.property('person').and.to.be.an('object')
            result.person.should.have.property('id')
            result.person.should.have.property('firstName')
            result.person.should.have.property('middleName')
            result.person.should.have.property('lastName')
            result.person.should.have.property('onePortalId')
            result.should.have.property('resourcesDetails').and.to.be.an('object')
            result.resourcesDetails.should.have.property('id')
            result.resourcesDetails.should.have.property('isHearseNeeded').to.be.equal(scheduling.resourcesDetails.isHearseNeeded)
            result.resourcesDetails.should.have.property('isUtilityCarNeeded').to.be.equal(scheduling.resourcesDetails.isUtilityCarNeeded)
            result.resourcesDetails.should.have.property('notesFromFamily').and.to.be.an('array')
            result.resourcesDetails.notesFromFamily.should.be.an('array').that.is.empty
            result.resourcesDetails.should.have.property('notesFromStaff').and.to.be.an('array')
            result.resourcesDetails.notesFromStaff.should.be.an('array').that.is.empty
            result.should.have.property('schedulingDetails').and.to.be.an('object')
            result.schedulingDetails.should.have.property('date').to.not.equal(null)
            result.schedulingDetails.should.have.property('beginningTime').to.not.equal(null)
            result.schedulingDetails.should.have.property('endingTime').to.not.equal(null)
            result.should.have.property('subServicesDetails').and.to.be.an('array')
            result.subServicesDetails.length.should.equal(0)
            result.should.have.property('urnInformationDetails').and.to.be.an('object')
            result.urnInformationDetails.should.have.property('isFamilyOwnedUrn').to.be.equal(scheduling.urnInformationDetails.isFamilyOwnedUrn)
            result.urnInformationDetails.should.have.property('isTransferRequired').to.be.equal(scheduling.urnInformationDetails.isFamilyOwnedUrn)
            scheduledService = result
        })
        it('Should update Scheduled Funeral Service successfully with the given details for Funeral Service', async () => {
            scheduledService.casketDetails.casketType = "Test"
            scheduledService.casketDetails.isOutSideCasket = true
            scheduledService.subServicesDetails = [{
                subServiceId: subServiceId,
                startTime: moment().set({'hour': 18, 'minute': 0}),
                endTime: moment().set({'hour': 18, 'minute': 30})
            }]
            scheduledService.resourcesDetails.isHearseNeeded = true
            scheduledService.resourcesDetails.isUtilityCarNeeded = true
            scheduledService.resourcesDetails.notesFromFamily = [{id: null, content: "Test Family Note"}]
            scheduledService.resourcesDetails.notesFromStaff = [{id: null, content: "Test Staff Note"}]
            const schedulingController = new SchedulingController()
            const result = await schedulingController.createOrUpdateScheduledFuneralService(scheduledService)
            result.should.be.an('object')
            result.should.have.property('cemeteryInformationDetails').and.to.be.an('object')
            result.cemeteryInformationDetails.should.have.property('id')
            result.cemeteryInformationDetails.should.have.property('clCemeteryLocation').to.be.equal(null)
            result.cemeteryInformationDetails.should.have.property('burialSite').to.be.equal(null)
            result.cemeteryInformationDetails.should.have.property('cemeteryLocation').to.be.equal(null)
            result.should.have.property('casketDetails').and.to.be.an('object')
            result.casketDetails.should.have.property('id').to.be.equal(scheduledService.casketDetails.id)
            result.casketDetails.should.have.property('casketType').to.be.equal(scheduledService.casketDetails.casketType)
            result.casketDetails.should.have.property('isOutSideCasket').to.be.equal(scheduledService.casketDetails.isOutSideCasket)
            result.should.have.property('subServicesDetails').and.to.be.an('array')
            result.subServicesDetails.should.be.an('array').that.is.not.empty
            result.subServicesDetails[0].should.have.property('subServiceId').to.be.equal(subServiceId)
            result.subServicesDetails[0].should.have.property('startTime').to.not.equal(null)
            result.subServicesDetails[0].should.have.property('endTime').to.not.equal(null)
            result.should.have.property('resourcesDetails').and.to.be.an('object')
            result.resourcesDetails.should.have.property('id').to.be.equal(scheduledService.resourcesDetails.id)
            result.resourcesDetails.should.have.property('crematoryDate').to.be.equal(null)
            result.resourcesDetails.should.have.property('crematoryStartTime').to.be.equal(null)
            result.resourcesDetails.should.have.property('crematoryEndTime').to.be.equal(null)
            result.resourcesDetails.should.have.property('isHearseNeeded').to.be.equal(scheduledService.resourcesDetails.isHearseNeeded)
            result.resourcesDetails.should.have.property('isUtilityCarNeeded').to.be.equal(scheduledService.resourcesDetails.isUtilityCarNeeded)
            result.resourcesDetails.should.have.property('pallbearers').and.to.be.an('array')
            result.resourcesDetails.pallbearers.should.be.an('array').that.is.empty
            result.resourcesDetails.should.have.property('notesFromFamily').and.to.be.an('array')
            result.resourcesDetails.notesFromFamily.should.be.an('array').that.is.not.empty
            result.resourcesDetails.notesFromFamily[0].should.have.property('id').to.not.equal(null)
            result.resourcesDetails.notesFromFamily[0].should.have.property('content').to.be.equal(scheduledService.resourcesDetails.notesFromFamily[0].content)
            result.resourcesDetails.should.have.property('notesFromStaff').and.to.be.an('array')
            result.resourcesDetails.notesFromStaff.should.be.an('array').that.is.not.empty
            result.resourcesDetails.notesFromStaff[0].should.have.property('id').to.not.equal(null)
            result.resourcesDetails.notesFromStaff[0].should.have.property('content').to.be.equal(scheduledService.resourcesDetails.notesFromStaff[0].content)
            scheduledService = result
        })

        // Funeral Graveside Service
        it('Should create Scheduled Funeral Service successfully with scheduling details for Funeral Graveside Service', async () => {
            let schedulableService = _.find(schedulableServices, ['schedulingAttribute', 'Funeral Graveside Service'])
            scheduling.agreementLocationItemId = schedulableService.agreementLocationItemId,
            scheduling.personId = personId
            scheduling.schedulingDetails = {
                "date": moment(),
                "beginningTime": moment().set({'hour': 15, 'minute': 0}),
                "endingTime": moment().set({'hour': 20, 'minute': 0}),
                "clFacilityLocationId": null,
                "serviceLocationId": place.id,
                "reservedChapel": {
                    "chapelId": 0,
                    "reservationDate": moment(),
                    "startTime": moment().set({'hour': 16, 'minute': 0}),
                    "endTime": moment().set({'hour': 17, 'minute': 0})
                }
            }
            const schedulingController = new SchedulingController()
            const result = await schedulingController.createOrUpdateScheduledFuneralService(scheduling)
            result.should.be.an('object')
            result.should.have.property('agreementCashAdvancedItemId')
            result.should.have.property('agreementPackageItemId')
            result.should.have.property('agreementLocationItemId').to.be.equal(scheduling.agreementLocationItemId)
            result.should.have.property('casketDetails').and.to.be.an('object')
            result.casketDetails.should.have.property('id')
            result.should.have.property('cemeteryInformationDetails').and.to.be.an('object')
            result.cemeteryInformationDetails.should.have.property('id')
            result.should.have.property('person').and.to.be.an('object')
            result.person.should.have.property('id')
            result.person.should.have.property('firstName')
            result.person.should.have.property('middleName')
            result.person.should.have.property('lastName')
            result.person.should.have.property('onePortalId')
            result.should.have.property('resourcesDetails').and.to.be.an('object')
            result.resourcesDetails.should.have.property('id')
            result.resourcesDetails.should.have.property('isHearseNeeded').to.be.equal(scheduling.resourcesDetails.isHearseNeeded)
            result.resourcesDetails.should.have.property('isUtilityCarNeeded').to.be.equal(scheduling.resourcesDetails.isUtilityCarNeeded)
            result.resourcesDetails.should.have.property('notesFromFamily').and.to.be.an('array')
            result.resourcesDetails.notesFromFamily.should.be.an('array').that.is.empty
            result.resourcesDetails.should.have.property('notesFromStaff').and.to.be.an('array')
            result.resourcesDetails.notesFromStaff.should.be.an('array').that.is.empty
            result.should.have.property('schedulingDetails').and.to.be.an('object')
            result.schedulingDetails.should.have.property('date').to.not.equal(null)
            result.schedulingDetails.should.have.property('beginningTime').to.not.equal(null)
            result.schedulingDetails.should.have.property('endingTime').to.not.equal(null)
            result.should.have.property('subServicesDetails').and.to.be.an('array')
            result.subServicesDetails.length.should.equal(0)
            result.should.have.property('urnInformationDetails').and.to.be.an('object')
            result.urnInformationDetails.should.have.property('isFamilyOwnedUrn').to.be.equal(scheduling.urnInformationDetails.isFamilyOwnedUrn)
            result.urnInformationDetails.should.have.property('isTransferRequired').to.be.equal(scheduling.urnInformationDetails.isFamilyOwnedUrn)
            scheduledService = result
        })
        it('Should update Scheduled Funeral Service successfully with the given details for Funeral Graveside Service', async () => {
            scheduledService.urnInformationDetails = {
                id: scheduledService.urnInformationDetails.id,
                depth: "20",
                height: "50",
                isFamilyOwnedUrn: true,
                isTransferRequired: true,
                receivedDate: moment(),
                urnId: null,
                urnStatus: "test",
                urnType: urnTypeId,
                width: "50"
            }
            scheduledService.cemeteryInformationDetails.clCemeteryLocationId = clCemeteryLocationId
            scheduledService.casketDetails.casketType = "Test"
            scheduledService.casketDetails.isOutSideCasket = true
            scheduledService.resourcesDetails.isHearseNeeded = true
            scheduledService.resourcesDetails.isUtilityCarNeeded = true
            scheduledService.resourcesDetails.pallbearers = [contactId]
            scheduledService.resourcesDetails.notesFromFamily = [{id: null, content: "Test Family Note"}]
            scheduledService.resourcesDetails.notesFromStaff = [{id: null, content: "Test Staff Note"}]
            const schedulingController = new SchedulingController()
            const result = await schedulingController.createOrUpdateScheduledFuneralService(scheduledService)
            result.should.be.an('object')
            result.should.have.property('cemeteryInformationDetails').and.to.be.an('object')
            result.cemeteryInformationDetails.should.have.property('id')
            result.cemeteryInformationDetails.should.have.property('clCemeteryLocation').and.to.be.an('object')
            result.cemeteryInformationDetails.clCemeteryLocation.should.have.property('id').to.be.equal(clCemeteryLocationId)
            result.cemeteryInformationDetails.should.have.property('burialSite').to.be.equal(null)
            result.cemeteryInformationDetails.should.have.property('cemeteryLocation').to.be.equal(null)
            result.should.have.property('casketDetails').and.to.be.an('object')
            result.casketDetails.should.have.property('id').to.be.equal(scheduledService.casketDetails.id)
            result.casketDetails.should.have.property('casketType').to.be.equal(scheduledService.casketDetails.casketType)
            result.casketDetails.should.have.property('isOutSideCasket').to.be.equal(scheduledService.casketDetails.isOutSideCasket)
            result.should.have.property('resourcesDetails').and.to.be.an('object')
            result.resourcesDetails.should.have.property('id').to.be.equal(scheduledService.resourcesDetails.id)
            result.resourcesDetails.should.have.property('crematoryDate').to.be.equal(null)
            result.resourcesDetails.should.have.property('crematoryStartTime').to.be.equal(null)
            result.resourcesDetails.should.have.property('crematoryEndTime').to.be.equal(null)
            result.resourcesDetails.should.have.property('isHearseNeeded').to.be.equal(scheduledService.resourcesDetails.isHearseNeeded)
            result.resourcesDetails.should.have.property('isUtilityCarNeeded').to.be.equal(scheduledService.resourcesDetails.isUtilityCarNeeded)
            result.resourcesDetails.should.have.property('pallbearers').and.to.be.an('array')
            result.resourcesDetails.pallbearers.should.be.an('array').that.is.not.empty
            result.resourcesDetails.pallbearers[0].should.have.property('contactId').to.be.equal(contactId)
            result.resourcesDetails.pallbearers[0].should.have.property('name').to.be.equal(emp.name)
            result.resourcesDetails.should.have.property('notesFromFamily')
            result.resourcesDetails.notesFromFamily.should.be.an('array').that.is.not.empty
            result.resourcesDetails.notesFromFamily[0].should.have.property('id').to.not.equal(null)
            result.resourcesDetails.notesFromFamily[0].should.have.property('content').to.be.equal(scheduledService.resourcesDetails.notesFromFamily[0].content)
            result.resourcesDetails.should.have.property('notesFromStaff')
            result.resourcesDetails.notesFromStaff.should.be.an('array').that.is.not.empty
            result.resourcesDetails.notesFromStaff[0].should.have.property('id').to.not.equal(null)
            result.resourcesDetails.notesFromStaff[0].should.have.property('content').to.be.equal(scheduledService.resourcesDetails.notesFromStaff[0].content)
            result.should.have.property('urnInformationDetails').and.to.be.an('object')
            result.urnInformationDetails.should.have.property('id').to.be.equal(scheduledService.urnInformationDetails.id)
            result.urnInformationDetails.should.have.property('urnType').to.be.equal(urnTypeId)
            result.urnInformationDetails.should.have.property('urnStatus').to.be.equal(scheduledService.urnInformationDetails.urnStatus)
            result.urnInformationDetails.should.have.property('height').to.be.equal(scheduledService.urnInformationDetails.height)
            result.urnInformationDetails.should.have.property('width').to.be.equal(scheduledService.urnInformationDetails.width)
            result.urnInformationDetails.should.have.property('depth').to.be.equal(scheduledService.urnInformationDetails.depth)
            result.urnInformationDetails.should.have.property('receivedDate').to.not.equal(null)
            result.urnInformationDetails.should.have.property('isFamilyOwnedUrn').to.be.equal(scheduledService.urnInformationDetails.isFamilyOwnedUrn)
            result.urnInformationDetails.should.have.property('isTransferRequired').to.be.equal(scheduledService.urnInformationDetails.isTransferRequired)
            scheduledService = result
        })

        // Funeral Memorial Service
        it('Should create Scheduled Funeral Service successfully with scheduling details for Funeral Memorial Service', async () => {
            let schedulableService = _.find(schedulableServices, ['schedulingAttribute', 'Funeral Memorial Service'])
            scheduling.agreementLocationItemId = schedulableService.agreementLocationItemId,
            scheduling.personId = personId
            scheduling.schedulingDetails = {
                "date": moment(),
                "beginningTime": moment().set({'hour': 15, 'minute': 0}),
                "endingTime": moment().set({'hour': 20, 'minute': 0}),
                "clFacilityLocationId": null,
                "serviceLocationId": null,
                "reservedChapel": {
                    "chapelId": chapelId,
                    "reservationDate": moment(),
                    "startTime": moment().set({'hour': 16, 'minute': 0}),
                    "endTime": moment().set({'hour': 17, 'minute': 0})
                }
            }
            const schedulingController = new SchedulingController()
            const result = await schedulingController.createOrUpdateScheduledFuneralService(scheduling)
            result.should.be.an('object')
            result.should.have.property('agreementCashAdvancedItemId')
            result.should.have.property('agreementPackageItemId')
            result.should.have.property('agreementLocationItemId').to.be.equal(scheduling.agreementLocationItemId)
            result.should.have.property('casketDetails').and.to.be.an('object')
            result.casketDetails.should.have.property('id')
            result.should.have.property('cemeteryInformationDetails').and.to.be.an('object')
            result.cemeteryInformationDetails.should.have.property('id')
            result.should.have.property('person').and.to.be.an('object')
            result.person.should.have.property('id')
            result.person.should.have.property('firstName')
            result.person.should.have.property('middleName')
            result.person.should.have.property('lastName')
            result.person.should.have.property('onePortalId')
            result.should.have.property('resourcesDetails').and.to.be.an('object')
            result.resourcesDetails.should.have.property('id')
            result.resourcesDetails.should.have.property('isHearseNeeded').to.be.equal(scheduling.resourcesDetails.isHearseNeeded)
            result.resourcesDetails.should.have.property('isUtilityCarNeeded').to.be.equal(scheduling.resourcesDetails.isUtilityCarNeeded)
            result.resourcesDetails.should.have.property('notesFromFamily').and.to.be.an('array')
            result.resourcesDetails.notesFromFamily.should.be.an('array').that.is.empty
            result.resourcesDetails.should.have.property('notesFromStaff').and.to.be.an('array')
            result.resourcesDetails.notesFromStaff.should.be.an('array').that.is.empty
            result.should.have.property('schedulingDetails').and.to.be.an('object')
            result.schedulingDetails.should.have.property('date').to.not.equal(null)
            result.schedulingDetails.should.have.property('beginningTime').to.not.equal(null)
            result.schedulingDetails.should.have.property('endingTime').to.not.equal(null)
            result.should.have.property('subServicesDetails').and.to.be.an('array')
            result.subServicesDetails.length.should.equal(0)
            result.should.have.property('urnInformationDetails').and.to.be.an('object')
            result.urnInformationDetails.should.have.property('isFamilyOwnedUrn').to.be.equal(scheduling.urnInformationDetails.isFamilyOwnedUrn)
            result.urnInformationDetails.should.have.property('isTransferRequired').to.be.equal(scheduling.urnInformationDetails.isFamilyOwnedUrn)
            scheduledService = result
        })
        it('Should update Scheduled Funeral Service successfully with the given details for Funeral Memorial Service', async () => {
            scheduledService.urnInformationDetails = {
                id: scheduledService.urnInformationDetails.id,
                depth: "20",
                height: "50",
                isFamilyOwnedUrn: true,
                isTransferRequired: true,
                receivedDate: moment(),
                urnId: null,
                urnStatus: "test",
                urnType: urnTypeId,
                width: "50"
            }
            scheduledService.cemeteryInformationDetails.clCemeteryLocationId = clCemeteryLocationId
            scheduledService.casketDetails.casketType = "Test"
            scheduledService.casketDetails.isOutSideCasket = true
            scheduledService.subServicesDetails = [{
                subServiceId: subServiceId,
                startTime: moment().set({'hour': 18, 'minute': 0}),
                endTime: moment().set({'hour': 18, 'minute': 30})
            }]
            scheduledService.resourcesDetails.isHearseNeeded = true
            scheduledService.resourcesDetails.isUtilityCarNeeded = true
            scheduledService.resourcesDetails.pallbearers = [contactId]
            scheduledService.resourcesDetails.notesFromFamily = [{id: null, content: "Test Family Note"}]
            scheduledService.resourcesDetails.notesFromStaff = [{id: null, content: "Test Staff Note"}]
            const schedulingController = new SchedulingController()
            const result = await schedulingController.createOrUpdateScheduledFuneralService(scheduledService)
            result.should.be.an('object')
            result.should.have.property('cemeteryInformationDetails').and.to.be.an('object')
            result.cemeteryInformationDetails.should.have.property('id')
            result.cemeteryInformationDetails.should.have.property('clCemeteryLocation').and.to.be.an('object')
            result.cemeteryInformationDetails.clCemeteryLocation.should.have.property('id').to.be.equal(clCemeteryLocationId)
            result.cemeteryInformationDetails.should.have.property('burialSite').to.be.equal(null)
            result.cemeteryInformationDetails.should.have.property('cemeteryLocation').to.be.equal(null)
            result.should.have.property('casketDetails').and.to.be.an('object')
            result.casketDetails.should.have.property('id').to.be.equal(scheduledService.casketDetails.id)
            result.casketDetails.should.have.property('casketType').to.be.equal(scheduledService.casketDetails.casketType)
            result.casketDetails.should.have.property('isOutSideCasket').to.be.equal(scheduledService.casketDetails.isOutSideCasket)
            result.should.have.property('subServicesDetails').and.to.be.an('array')
            result.subServicesDetails.should.be.an('array').that.is.not.empty
            result.subServicesDetails[0].should.have.property('subServiceId').to.be.equal(subServiceId)
            result.subServicesDetails[0].should.have.property('startTime').to.not.equal(null)
            result.subServicesDetails[0].should.have.property('endTime').to.not.equal(null)
            result.should.have.property('resourcesDetails').and.to.be.an('object')
            result.should.have.property('resourcesDetails').and.to.be.an('object')
            result.resourcesDetails.should.have.property('id').to.be.equal(scheduledService.resourcesDetails.id)
            result.resourcesDetails.should.have.property('crematoryDate').to.be.equal(null)
            result.resourcesDetails.should.have.property('crematoryStartTime').to.be.equal(null)
            result.resourcesDetails.should.have.property('crematoryEndTime').to.be.equal(null)
            result.resourcesDetails.should.have.property('isHearseNeeded').to.be.equal(scheduledService.resourcesDetails.isHearseNeeded)
            result.resourcesDetails.should.have.property('isUtilityCarNeeded').to.be.equal(scheduledService.resourcesDetails.isUtilityCarNeeded)
            result.resourcesDetails.should.have.property('pallbearers').and.to.be.an('array')
            result.resourcesDetails.pallbearers.should.be.an('array').that.is.not.empty
            result.resourcesDetails.pallbearers[0].should.have.property('contactId').to.be.equal(contactId)
            result.resourcesDetails.pallbearers[0].should.have.property('name').to.be.equal(emp.name)
            result.resourcesDetails.should.have.property('notesFromFamily').and.to.be.an('array')
            result.resourcesDetails.notesFromFamily.should.be.an('array').that.is.not.empty
            result.resourcesDetails.notesFromFamily[0].should.have.property('id').to.not.equal(null)
            result.resourcesDetails.notesFromFamily[0].should.have.property('content').to.be.equal(scheduledService.resourcesDetails.notesFromFamily[0].content)
            result.resourcesDetails.should.have.property('notesFromStaff').and.to.be.an('array')
            result.resourcesDetails.notesFromStaff.should.be.an('array').that.is.not.empty
            result.resourcesDetails.notesFromStaff[0].should.have.property('id').to.not.equal(null)
            result.resourcesDetails.notesFromStaff[0].should.have.property('content').to.be.equal(scheduledService.resourcesDetails.notesFromStaff[0].content)
            result.should.have.property('urnInformationDetails').and.to.be.an('object')
            result.urnInformationDetails.should.have.property('id').to.be.equal(scheduledService.urnInformationDetails.id)
            result.urnInformationDetails.should.have.property('urnType').to.be.equal(urnTypeId)
            result.urnInformationDetails.should.have.property('urnStatus').to.be.equal(scheduledService.urnInformationDetails.urnStatus)
            result.urnInformationDetails.should.have.property('height').to.be.equal(scheduledService.urnInformationDetails.height)
            result.urnInformationDetails.should.have.property('width').to.be.equal(scheduledService.urnInformationDetails.width)
            result.urnInformationDetails.should.have.property('depth').to.be.equal(scheduledService.urnInformationDetails.depth)
            result.urnInformationDetails.should.have.property('receivedDate').to.not.equal(null)
            result.urnInformationDetails.should.have.property('isFamilyOwnedUrn').to.be.equal(scheduledService.urnInformationDetails.isFamilyOwnedUrn)
            result.urnInformationDetails.should.have.property('isTransferRequired').to.be.equal(scheduledService.urnInformationDetails.isTransferRequired)
            scheduledService = result
        })

        // Reception Center Service
        it('Should create Scheduled Funeral Service successfully with scheduling details for Reception Center Service', async () => {
            let schedulableService = _.find(schedulableServices, ['schedulingAttribute', 'Reception Center Service'])
            scheduling.agreementLocationItemId = schedulableService.agreementLocationItemId,
            scheduling.personId = personId
            scheduling.schedulingDetails = {
                "date": moment(),
                "beginningTime": moment().set({'hour': 15, 'minute': 0}),
                "endingTime": moment().set({'hour': 20, 'minute': 0}),
                "clFacilityLocationId": null,
                "serviceLocationId": null,
                "reservedChapel": {
                    "chapelId": chapelId,
                    "reservationDate": moment(),
                    "startTime": moment().set({'hour': 16, 'minute': 0}),
                    "endTime": moment().set({'hour': 17, 'minute': 0})
                }
            }
            const schedulingController = new SchedulingController()
            const result = await schedulingController.createOrUpdateScheduledFuneralService(scheduling)
            result.should.be.an('object')
            result.should.have.property('agreementCashAdvancedItemId')
            result.should.have.property('agreementPackageItemId')
            result.should.have.property('agreementLocationItemId').to.be.equal(scheduling.agreementLocationItemId)
            result.should.have.property('casketDetails').and.to.be.an('object')
            result.casketDetails.should.have.property('id')
            result.should.have.property('cemeteryInformationDetails').and.to.be.an('object')
            result.cemeteryInformationDetails.should.have.property('id')
            result.should.have.property('person').and.to.be.an('object')
            result.person.should.have.property('id')
            result.person.should.have.property('firstName')
            result.person.should.have.property('middleName')
            result.person.should.have.property('lastName')
            result.person.should.have.property('onePortalId')
            result.should.have.property('resourcesDetails').and.to.be.an('object')
            result.resourcesDetails.should.have.property('id')
            result.resourcesDetails.should.have.property('isHearseNeeded').to.be.equal(scheduling.resourcesDetails.isHearseNeeded)
            result.resourcesDetails.should.have.property('isUtilityCarNeeded').to.be.equal(scheduling.resourcesDetails.isUtilityCarNeeded)
            result.resourcesDetails.should.have.property('notesFromFamily').and.to.be.an('array')
            result.resourcesDetails.notesFromFamily.should.be.an('array').that.is.empty
            result.resourcesDetails.should.have.property('notesFromStaff').and.to.be.an('array')
            result.resourcesDetails.notesFromStaff.should.be.an('array').that.is.empty
            result.should.have.property('schedulingDetails').and.to.be.an('object')
            result.schedulingDetails.should.have.property('date').to.not.equal(null)
            result.schedulingDetails.should.have.property('beginningTime').to.not.equal(null)
            result.schedulingDetails.should.have.property('endingTime').to.not.equal(null)
            result.should.have.property('subServicesDetails').and.to.be.an('array')
            result.subServicesDetails.length.should.equal(0)
            result.should.have.property('urnInformationDetails').and.to.be.an('object')
            result.urnInformationDetails.should.have.property('isFamilyOwnedUrn').to.be.equal(scheduling.urnInformationDetails.isFamilyOwnedUrn)
            result.urnInformationDetails.should.have.property('isTransferRequired').to.be.equal(scheduling.urnInformationDetails.isFamilyOwnedUrn)
            scheduledService = result
        })
        it('Should update Scheduled Funeral Service successfully with the given details for Reception Center Service', async () => {
            scheduledService.resourcesDetails.notesFromFamily = [{id: null, content: "Test Family Note"}]
            scheduledService.resourcesDetails.notesFromStaff = [{id: null, content: "Test Staff Note"}]
            const schedulingController = new SchedulingController()
            const result = await schedulingController.createOrUpdateScheduledFuneralService(scheduledService)
            result.should.be.an('object')
            result.resourcesDetails.should.have.property('notesFromFamily').and.to.be.an('array')
            result.resourcesDetails.notesFromFamily.should.be.an('array').that.is.not.empty
            result.resourcesDetails.notesFromFamily[0].should.have.property('id').to.not.equal(null)
            result.resourcesDetails.notesFromFamily[0].should.have.property('content').to.be.equal(scheduledService.resourcesDetails.notesFromFamily[0].content)
            result.resourcesDetails.should.have.property('notesFromStaff').and.to.be.an('array')
            result.resourcesDetails.notesFromStaff.should.be.an('array').that.is.not.empty
            result.resourcesDetails.notesFromStaff[0].should.have.property('id').to.not.equal(null)
            result.resourcesDetails.notesFromStaff[0].should.have.property('content').to.be.equal(scheduledService.resourcesDetails.notesFromStaff[0].content)
            scheduledService = result
        })

        // Funeral Visitation Service
        it('Should create Scheduled Funeral Service successfully with scheduling details for Funeral Visitation Service', async () => {
            let schedulableService = _.find(schedulableServices, ['schedulingAttribute', 'Funeral Visitation Service'])
            scheduling.agreementLocationItemId = schedulableService.agreementLocationItemId,
            scheduling.personId = personId
            scheduling.schedulingDetails = {
                "date": moment(),
                "beginningTime": moment().set({'hour': 15, 'minute': 0}),
                "endingTime": moment().set({'hour': 20, 'minute': 0}),
                "clFacilityLocationId": null,
                "serviceLocationId": null,
                "reservedChapel": {
                    "chapelId": chapelId,
                    "reservationDate": moment(),
                    "startTime": moment().set({'hour': 16, 'minute': 0}),
                    "endTime": moment().set({'hour': 17, 'minute': 0})
                }
            }
            const schedulingController = new SchedulingController()
            const result = await schedulingController.createOrUpdateScheduledFuneralService(scheduling)
            result.should.be.an('object')
            result.should.have.property('agreementCashAdvancedItemId')
            result.should.have.property('agreementPackageItemId')
            result.should.have.property('agreementLocationItemId').to.be.equal(scheduling.agreementLocationItemId)
            result.should.have.property('casketDetails').and.to.be.an('object')
            result.casketDetails.should.have.property('id')
            result.should.have.property('cemeteryInformationDetails').and.to.be.an('object')
            result.cemeteryInformationDetails.should.have.property('id')
            result.should.have.property('person').and.to.be.an('object')
            result.person.should.have.property('id')
            result.person.should.have.property('firstName')
            result.person.should.have.property('middleName')
            result.person.should.have.property('lastName')
            result.person.should.have.property('onePortalId')
            result.should.have.property('resourcesDetails').and.to.be.an('object')
            result.resourcesDetails.should.have.property('id')
            result.resourcesDetails.should.have.property('isHearseNeeded').to.be.equal(scheduling.resourcesDetails.isHearseNeeded)
            result.resourcesDetails.should.have.property('isUtilityCarNeeded').to.be.equal(scheduling.resourcesDetails.isUtilityCarNeeded)
            result.resourcesDetails.should.have.property('notesFromFamily').and.to.be.an('array')
            result.resourcesDetails.notesFromFamily.should.be.an('array').that.is.empty
            result.resourcesDetails.should.have.property('notesFromStaff').and.to.be.an('array')
            result.resourcesDetails.notesFromStaff.should.be.an('array').that.is.empty
            result.should.have.property('schedulingDetails').and.to.be.an('object')
            result.schedulingDetails.should.have.property('date').to.not.equal(null)
            result.schedulingDetails.should.have.property('beginningTime').to.not.equal(null)
            result.schedulingDetails.should.have.property('endingTime').to.not.equal(null)
            result.should.have.property('subServicesDetails').and.to.be.an('array')
            result.subServicesDetails.length.should.equal(0)
            result.should.have.property('urnInformationDetails').and.to.be.an('object')
            result.urnInformationDetails.should.have.property('isFamilyOwnedUrn').to.be.equal(scheduling.urnInformationDetails.isFamilyOwnedUrn)
            result.urnInformationDetails.should.have.property('isTransferRequired').to.be.equal(scheduling.urnInformationDetails.isFamilyOwnedUrn)
            scheduledService = result
        })
        it('Should update Scheduled Funeral Service successfully with the given details for Funeral Visitation Service', async () => {
            scheduledService.urnInformationDetails = {
                id: scheduledService.urnInformationDetails.id,
                depth: "20",
                height: "50",
                isFamilyOwnedUrn: true,
                isTransferRequired: true,
                receivedDate: moment(),
                urnId: null,
                urnStatus: "test",
                urnType: urnTypeId,
                width: "50"
            }
            scheduledService.casketDetails.casketType = "Test"
            scheduledService.casketDetails.isOutSideCasket = true
            scheduledService.subServicesDetails = [{
                subServiceId: subServiceId,
                startTime: moment().set({'hour': 18, 'minute': 0}),
                endTime: moment().set({'hour': 18, 'minute': 30})
            }]
            scheduledService.resourcesDetails.isHearseNeeded = true
            scheduledService.resourcesDetails.isUtilityCarNeeded = true
            scheduledService.resourcesDetails.notesFromFamily = [{id: null, content: "Test Family Note"}]
            scheduledService.resourcesDetails.notesFromStaff = [{id: null, content: "Test Staff Note"}]
            const schedulingController = new SchedulingController()
            const result = await schedulingController.createOrUpdateScheduledFuneralService(scheduledService)
            result.should.be.an('object')
            result.should.have.property('cemeteryInformationDetails').and.to.be.an('object')
            result.cemeteryInformationDetails.should.have.property('id')
            result.cemeteryInformationDetails.should.have.property('clCemeteryLocation').to.be.equal(null)
            result.cemeteryInformationDetails.should.have.property('burialSite').to.be.equal(null)
            result.cemeteryInformationDetails.should.have.property('cemeteryLocation').to.be.equal(null)
            result.should.have.property('casketDetails').and.to.be.an('object')
            result.casketDetails.should.have.property('id').to.be.equal(scheduledService.casketDetails.id)
            result.casketDetails.should.have.property('casketType').to.be.equal(scheduledService.casketDetails.casketType)
            result.casketDetails.should.have.property('isOutSideCasket').to.be.equal(scheduledService.casketDetails.isOutSideCasket)
            result.should.have.property('subServicesDetails').and.to.be.an('array')
            result.subServicesDetails.should.be.an('array').that.is.not.empty
            result.subServicesDetails[0].should.have.property('subServiceId').to.be.equal(subServiceId)
            result.subServicesDetails[0].should.have.property('startTime').to.not.equal(null)
            result.subServicesDetails[0].should.have.property('endTime').to.not.equal(null)
            result.should.have.property('resourcesDetails').and.to.be.an('object')
            result.should.have.property('resourcesDetails').and.to.be.an('object')
            result.resourcesDetails.should.have.property('id').to.be.equal(scheduledService.resourcesDetails.id)
            result.resourcesDetails.should.have.property('crematoryDate').to.be.equal(null)
            result.resourcesDetails.should.have.property('crematoryStartTime').to.be.equal(null)
            result.resourcesDetails.should.have.property('crematoryEndTime').to.be.equal(null)
            result.resourcesDetails.should.have.property('isHearseNeeded').to.be.equal(scheduledService.resourcesDetails.isHearseNeeded)
            result.resourcesDetails.should.have.property('isUtilityCarNeeded').to.be.equal(scheduledService.resourcesDetails.isUtilityCarNeeded)
            result.resourcesDetails.should.have.property('pallbearers').and.to.be.an('array')
            result.resourcesDetails.pallbearers.should.be.an('array').that.is.empty
            result.resourcesDetails.should.have.property('notesFromFamily').and.to.be.an('array')
            result.resourcesDetails.notesFromFamily.should.be.an('array').that.is.not.empty
            result.resourcesDetails.notesFromFamily[0].should.have.property('id').to.not.equal(null)
            result.resourcesDetails.notesFromFamily[0].should.have.property('content').to.be.equal(scheduledService.resourcesDetails.notesFromFamily[0].content)
            result.resourcesDetails.should.have.property('notesFromStaff').and.to.be.an('array')
            result.resourcesDetails.notesFromStaff.should.be.an('array').that.is.not.empty
            result.resourcesDetails.notesFromStaff[0].should.have.property('id').to.not.equal(null)
            result.resourcesDetails.notesFromStaff[0].should.have.property('content').to.be.equal(scheduledService.resourcesDetails.notesFromStaff[0].content)
            result.should.have.property('urnInformationDetails').and.to.be.an('object')
            result.urnInformationDetails.should.have.property('id').to.be.equal(scheduledService.urnInformationDetails.id)
            result.urnInformationDetails.should.have.property('urnType').to.be.equal(urnTypeId)
            result.urnInformationDetails.should.have.property('urnStatus').to.be.equal(scheduledService.urnInformationDetails.urnStatus)
            result.urnInformationDetails.should.have.property('height').to.be.equal(scheduledService.urnInformationDetails.height)
            result.urnInformationDetails.should.have.property('width').to.be.equal(scheduledService.urnInformationDetails.width)
            result.urnInformationDetails.should.have.property('depth').to.be.equal(scheduledService.urnInformationDetails.depth)
            result.urnInformationDetails.should.have.property('receivedDate').to.not.equal(null)
            result.urnInformationDetails.should.have.property('isFamilyOwnedUrn').to.be.equal(scheduledService.urnInformationDetails.isFamilyOwnedUrn)
            result.urnInformationDetails.should.have.property('isTransferRequired').to.be.equal(scheduledService.urnInformationDetails.isTransferRequired)
            scheduledService = result
        })

        // Funeral Witness Cremation Service
        it('Should create Scheduled Funeral Service successfully with scheduling details for Funeral Witness Cremation Service', async () => {
            let schedulableService = _.find(schedulableServices, ['schedulingAttribute', 'Funeral Witness Cremation Service'])
            scheduling.agreementCashAdvancedItemId = schedulableService.agreementCashAdvancedItemId,
            scheduling.personId = personId
            scheduling.schedulingDetails = {
                "date": moment(),
                "beginningTime": moment().set({'hour': 15, 'minute': 0}),
                "endingTime": moment().set({'hour': 20, 'minute': 0}),
                "clFacilityLocationId": null,
                "serviceLocationId": null,
                "reservedChapel": {
                    "chapelId": chapelId,
                    "reservationDate": moment(),
                    "startTime": moment().set({'hour': 16, 'minute': 0}),
                    "endTime": moment().set({'hour': 17, 'minute': 0})
                }
            }
            const schedulingController = new SchedulingController()
            const result = await schedulingController.createOrUpdateScheduledFuneralService(scheduling)
            result.should.be.an('object')
            result.should.have.property('agreementCashAdvancedItemId').to.be.equal(scheduling.agreementCashAdvancedItemId)
            result.should.have.property('agreementPackageItemId')
            result.should.have.property('agreementLocationItemId')
            result.should.have.property('casketDetails').and.to.be.an('object')
            result.casketDetails.should.have.property('id')
            result.should.have.property('cemeteryInformationDetails').and.to.be.an('object')
            result.cemeteryInformationDetails.should.have.property('id')
            result.should.have.property('person').and.to.be.an('object')
            result.person.should.have.property('id')
            result.person.should.have.property('firstName')
            result.person.should.have.property('middleName')
            result.person.should.have.property('lastName')
            result.person.should.have.property('onePortalId')
            result.should.have.property('resourcesDetails').and.to.be.an('object')
            result.resourcesDetails.should.have.property('id')
            result.resourcesDetails.should.have.property('isHearseNeeded').to.be.equal(scheduling.resourcesDetails.isHearseNeeded)
            result.resourcesDetails.should.have.property('isUtilityCarNeeded').to.be.equal(scheduling.resourcesDetails.isUtilityCarNeeded)
            result.resourcesDetails.should.have.property('notesFromFamily').and.to.be.an('array')
            result.resourcesDetails.notesFromFamily.should.be.an('array').that.is.empty
            result.resourcesDetails.should.have.property('notesFromStaff').and.to.be.an('array')
            result.resourcesDetails.notesFromStaff.should.be.an('array').that.is.empty
            result.should.have.property('schedulingDetails').and.to.be.an('object')
            result.schedulingDetails.should.have.property('date').to.not.equal(null)
            result.schedulingDetails.should.have.property('beginningTime').to.not.equal(null)
            result.schedulingDetails.should.have.property('endingTime').to.not.equal(null)
            result.should.have.property('subServicesDetails').and.to.be.an('array')
            result.subServicesDetails.length.should.equal(0)
            result.should.have.property('urnInformationDetails').and.to.be.an('object')
            result.urnInformationDetails.should.have.property('isFamilyOwnedUrn').to.be.equal(scheduling.urnInformationDetails.isFamilyOwnedUrn)
            result.urnInformationDetails.should.have.property('isTransferRequired').to.be.equal(scheduling.urnInformationDetails.isFamilyOwnedUrn)
            scheduledService = result
        })
        it('Should update Scheduled Funeral Service successfully with the given details for Funeral Witness Cremation Service', async () => {
            scheduledService.urnInformationDetails = {
                id: scheduledService.urnInformationDetails.id,
                depth: "20",
                height: "50",
                isFamilyOwnedUrn: true,
                isTransferRequired: true,
                receivedDate: moment(),
                urnId: null,
                urnStatus: "test",
                urnType: urnTypeId,
                width: "50"
            }
            scheduledService.casketDetails.casketType = "Test"
            scheduledService.casketDetails.isOutSideCasket = true
            scheduledService.resourcesDetails.isHearseNeeded = true
            scheduledService.resourcesDetails.isUtilityCarNeeded = true
            scheduledService.resourcesDetails.crematoryId = crematoryId
            scheduledService.resourcesDetails.crematoryDate = moment()
            scheduledService.resourcesDetails.crematoryStartTime = moment().set({'hour': 16, 'minute': 30})
            scheduledService.resourcesDetails.crematoryEndTime = moment().set({'hour': 17, 'minute': 0})
            scheduledService.resourcesDetails.notesFromFamily = [{id: null, content: "Test Family Note"}]
            scheduledService.resourcesDetails.notesFromStaff = [{id: null, content: "Test Staff Note"}]
            const schedulingController = new SchedulingController()
            const result = await schedulingController.createOrUpdateScheduledFuneralService(scheduledService)
            result.should.be.an('object')
            result.should.have.property('cemeteryInformationDetails').and.to.be.an('object')
            result.cemeteryInformationDetails.should.have.property('id')
            result.cemeteryInformationDetails.should.have.property('clCemeteryLocation').to.be.equal(null)
            result.cemeteryInformationDetails.should.have.property('burialSite').to.be.equal(null)
            result.cemeteryInformationDetails.should.have.property('cemeteryLocation').to.be.equal(null)
            result.should.have.property('casketDetails').and.to.be.an('object')
            result.casketDetails.should.have.property('id').to.be.equal(scheduledService.casketDetails.id)
            result.casketDetails.should.have.property('casketType').to.be.equal(scheduledService.casketDetails.casketType)
            result.casketDetails.should.have.property('isOutSideCasket').to.be.equal(scheduledService.casketDetails.isOutSideCasket)
            result.should.have.property('subServicesDetails').and.to.be.an('array')
            result.subServicesDetails.should.be.an('array').that.is.empty
            result.should.have.property('resourcesDetails').and.to.be.an('object')
            result.should.have.property('resourcesDetails').and.to.be.an('object')
            result.resourcesDetails.should.have.property('id').to.be.equal(scheduledService.resourcesDetails.id)
            result.resourcesDetails.should.have.property('crematory').and.to.be.an('object')
            result.resourcesDetails.crematory.should.have.property('id').to.be.equal(crematoryId)
            result.resourcesDetails.should.have.property('crematoryDate').to.not.equal(null)
            result.resourcesDetails.should.have.property('crematoryStartTime').to.not.equal(null)
            result.resourcesDetails.should.have.property('crematoryEndTime').to.not.equal(null)
            result.resourcesDetails.should.have.property('isHearseNeeded').to.be.equal(scheduledService.resourcesDetails.isHearseNeeded)
            result.resourcesDetails.should.have.property('isUtilityCarNeeded').to.be.equal(scheduledService.resourcesDetails.isUtilityCarNeeded)
            result.resourcesDetails.should.have.property('pallbearers').and.to.be.an('array')
            result.resourcesDetails.pallbearers.should.be.an('array').that.is.empty
            result.resourcesDetails.should.have.property('notesFromFamily').and.to.be.an('array')
            result.resourcesDetails.notesFromFamily.should.be.an('array').that.is.not.empty
            result.resourcesDetails.notesFromFamily[0].should.have.property('id').to.not.equal(null)
            result.resourcesDetails.notesFromFamily[0].should.have.property('content').to.be.equal(scheduledService.resourcesDetails.notesFromFamily[0].content)
            result.resourcesDetails.should.have.property('notesFromStaff').and.to.be.an('array')
            result.resourcesDetails.notesFromStaff.should.be.an('array').that.is.not.empty
            result.resourcesDetails.notesFromStaff[0].should.have.property('id').to.not.equal(null)
            result.resourcesDetails.notesFromStaff[0].should.have.property('content').to.be.equal(scheduledService.resourcesDetails.notesFromStaff[0].content)
            result.should.have.property('urnInformationDetails').and.to.be.an('object')
            result.urnInformationDetails.should.have.property('id').to.be.equal(scheduledService.urnInformationDetails.id)
            result.urnInformationDetails.should.have.property('urnType').to.be.equal(urnTypeId)
            result.urnInformationDetails.should.have.property('urnStatus').to.be.equal(scheduledService.urnInformationDetails.urnStatus)
            result.urnInformationDetails.should.have.property('height').to.be.equal(scheduledService.urnInformationDetails.height)
            result.urnInformationDetails.should.have.property('width').to.be.equal(scheduledService.urnInformationDetails.width)
            result.urnInformationDetails.should.have.property('depth').to.be.equal(scheduledService.urnInformationDetails.depth)
            result.urnInformationDetails.should.have.property('receivedDate').to.not.equal(null)
            result.urnInformationDetails.should.have.property('isFamilyOwnedUrn').to.be.equal(scheduledService.urnInformationDetails.isFamilyOwnedUrn)
            result.urnInformationDetails.should.have.property('isTransferRequired').to.be.equal(scheduledService.urnInformationDetails.isTransferRequired)
            scheduledService = result
        })


        it('It should create a funeral scheduling casket , vault, urnInformation Details with resource type agreement locaion item', async ()=>{
            let casket= []
            let urn= []
            let casketIds = await getAgreementLocationIds(agreementId, 3, 'casket')
            casket.push(await createLocationItems(agreementId, faker.random.arrayElement(casketIds), currentUser.id))
            let urnIds = await getAgreementLocationIds(agreementId, 3, 'urn')
            urn.push(await createLocationItems(agreementId, faker.random.arrayElement(urnIds), currentUser.id))
            scheduledService.casketDetails.casketId = faker.random.arrayElement(casket)
            scheduledService.casketDetails.resourceType = 'AgreementLocationItem'
            scheduledService.urnInformationDetails.urnId = faker.random.arrayElement(urn)
            scheduledService.urnInformationDetails.resourceType = 'AgreementLocationItem'

            const schedulingController = new SchedulingController();
            const result = await schedulingController.createOrUpdateScheduledFuneralService(scheduledService)      
            result.should.have.property('casketDetails').and.to.be.an('object')
            result.casketDetails.should.have.property('id').to.be.gte(1)
            result.casketDetails.should.have.property('casket').to.not.equal(null)
            result.casketDetails.casket.should.have.property('resourceType').to.equal('AgreementLocationItem')
            result.should.have.property('urnInformationDetails').and.to.be.an('object')
            result.urnInformationDetails.should.have.property('id').to.be.gte(1)
            result.urnInformationDetails.should.have.property('urn').not.equal(null)
            result.urnInformationDetails.urn.should.have.property('resourceType').to.equal('AgreementLocationItem')
        })

        it('It should create a funeral scheduling casket , vault, urnInformation Details with resource type itemUsage', async ()=>{
            let casket=[]
            let casketIds = await getAgreementLocationIds(agreementId, 3, 'casket')
            casket.push(await createLocationItems(agreementId, faker.random.arrayElement(casketIds), currentUser.id))
            let itemUsageBody = {
                resourceType: "Merchandises",
                resourceId: faker.random.arrayElement(casket),
                isDeleted: false,
                createdBy: currentUser.id
              }
            let itemUsageCasket = await createItemUsage(personId , itemUsageBody)
            scheduledService.casketDetails.casketId = itemUsageCasket.itemUsageId
            scheduledService.casketDetails.resourceType = 'ItemUsage'
            const schedulingController = new SchedulingController();
            const result = await schedulingController.createOrUpdateScheduledFuneralService(scheduledService)     
            result.should.have.property('casketDetails').and.to.be.an('object')
            result.casketDetails.should.have.property('id').to.be.gte(1)
            result.casketDetails.should.have.property('casket').to.not.equal(null)
            result.casketDetails.casket.should.have.property('resourceType').to.equal('ItemUsage')
        })

        describe('Get scheduled funeral director and locations', async () => {
            it('Should return error person not found ', async () => {
                try {
                    await SchedulingController.getFuneralArrangementDetails(personId+100, 'Cemetry Graveside Service')
                } catch (error) {
                    error.should.have.property('message').and.to.be.equal('PERSON_NOT_FOUND')
                }
            })
            it('Should return error funeral location ', async () => {
                    const result =  await SchedulingController.getFuneralArrangementDetails(personId, 'Cemetery Graveside Service')
                    result.should.have.property('funeralDirectorDetails').and.to.be.equal(null)
                    result.funeralLocationDetails.should.have.property('clFacilityLocation').and.to.be.equal(null)
                    result.funeralLocationDetails.should.have.property('serviceLocation').and.to.be.not.equal(null)
            })
        })

        describe('Removal Scenarios of Services in Funeral statement', async () => {

            let locationItems = {
                merchandises: [],
                services: [],
                memorial:null
              }
            let services = []
            let merchandises = []
            let newagreementId
            let newpersonId
            before( async ()=>{
            const person = { ...personSchema() }
            const agreementRoles = await getAgreementRoles('map')
            person.isAlive = false
            const createdPerson = await PersonController.createOrUpdate(person, {}, {})
            newpersonId = createdPerson.id
            const verifiedPersonController = new VerifiedPersonController(newpersonId)
            await verifiedPersonController.verifyPerson(createdPerson)
                const agreementObject = {
                    ...agreementSchema(false),
                    type: 1,
                    saleTypeId: faker.random.arrayElement(saleTypeIds),
                    persons: [
                        {
                            personId:newpersonId,
                            agreementRoleId: agreementRoles['Beneficiary']
                        }
                    ]
                }
                agreementObject.locationId = 1
                newagreementId = await createAgreement(newpersonId,agreementObject)
                let serviceData = await getService('CFSVS-TC1', 'Services')
                locationItems.merchandises = await getAgreementLocationIds(agreementId, 3,'casket')
                locationItems.services.push(serviceData.id)
              services.push(await createLocationItems(newagreementId, faker.random.arrayElement(locationItems.services), currentUser.id))
            })
            it("It should remove item(service) scheduling is done but not completed ", async ()=>{
            scheduling.agreementLocationItemId = faker.random.arrayElement(services),
            scheduling.personId = newpersonId
            scheduling.schedulingDetails = {
                "date": moment(),
                "beginningTime": moment().set({'hour': 15, 'minute': 0}),
                "endingTime": moment().set({'hour': 20, 'minute': 0}),
                "clFacilityLocationId": null,
                "serviceLocationId": null,
                "reservedChapel": {
                    "chapelId": 0,
                    "reservationDate": moment(),
                    "startTime": moment().set({'hour': 16, 'minute': 0}),
                    "endTime": moment().set({'hour': 17, 'minute': 0})
                }
            }
            const schedulingController = new SchedulingController()
            await schedulingController.createOrUpdateScheduledFuneralService(scheduling)
             const agreementItemController = new AgreementItemController(newagreementId)
            addedServiceAgreementItem = await agreementItemController.createOrUpdate('remove', { 
                itemType: 'locationItem',
                locationItemId: faker.random.arrayElement(locationItems.services),
                agreementLocationItemId: faker.random.arrayElement(services)
            })
            services=[]
            const result = await SchedulingController.getSchedulableServices(newpersonId)
            addedServiceAgreementItem.should.have.property('id')
            addedServiceAgreementItem.should.have.property('quantity').and.to.equal(0)
            result.should.be.an('array').that.is.empty
            })
            it("It should remove item(service) were one item is scheduling done and  one item is not yet scheduling done", async ()=>{
                services.push(await createLocationItems(newagreementId, faker.random.arrayElement(locationItems.services), currentUser.id))
                services.push(await createLocationItems(newagreementId, faker.random.arrayElement(locationItems.services), currentUser.id,services[0]))
                scheduling.agreementLocationItemId = faker.random.arrayElement(services),
                scheduling.personId = newpersonId
                scheduling.schedulingDetails = {
                    "date": moment(),
                    "beginningTime": moment().set({'hour': 15, 'minute': 0}),
                    "endingTime": moment().set({'hour': 20, 'minute': 0}),
                    "clFacilityLocationId": null,
                    "serviceLocationId": null,
                    "reservedChapel": {
                        "chapelId": 0,
                        "reservationDate": moment(),
                        "startTime": moment().set({'hour': 16, 'minute': 0}),
                        "endTime": moment().set({'hour': 17, 'minute': 0})
                    }
                }
                const schedulingController = new SchedulingController()
                await schedulingController.createOrUpdateScheduledFuneralService(scheduling)
                 const agreementItemController = new AgreementItemController(newagreementId)
                addedServiceAgreementItem = await agreementItemController.createOrUpdate('remove', { 
                    itemType: 'locationItem',
                    locationItemId: faker.random.arrayElement(locationItems.services),
                    agreementLocationItemId: faker.random.arrayElement(services)
                })
                const result = await SchedulingController.getSchedulableServices(newpersonId)
                addedServiceAgreementItem.should.have.property('id')
                addedServiceAgreementItem.should.have.property('quantity').and.to.equal(1)
                result.should.be.an('array').of.length(1)
            })
            it("It should remove item(service) were one item is scheduling complted and one item is scheduling  is done", async ()=>{
                    services.push(await createLocationItems(newagreementId, faker.random.arrayElement(locationItems.services), currentUser.id,services[0]))
                    scheduling.agreementLocationItemId = faker.random.arrayElement(services),
                    scheduling.personId = newpersonId
                    scheduling.schedulingDetails = {
                        "date": moment(),
                        "beginningTime": moment().set({'hour': 3, 'minute': 0}),
                        "endingTime": moment().set({'hour': 4, 'minute': 0}),
                        "clFacilityLocationId": null,
                        "serviceLocationId": null,
                        "reservedChapel": {
                            "chapelId": 0,
                            "reservationDate": moment(),
                            "startTime": moment().set({'hour': 16, 'minute': 0}),
                            "endTime": moment().set({'hour': 17, 'minute': 0})
                        }
                    }
                    const workOrderPayload = {"serviceType":"Funeral",
                                     "funeralDirectorId":2,
                                     "notes":[],
                                     "isWarningShown":false,
                                     "completedOn": moment().set({'hour': 11, 'minute': 0}),
                                     "employees":[],
                                     "resources":[]}
                    const schedulingController = new SchedulingController()
                    const schedulingData = await schedulingController.createOrUpdateScheduledFuneralService(scheduling)
                    const workOrderDeatls = await models.WorkOrder.findOne({ where : {resourceId: schedulingData.id, resourceType: 'ScheduledFuneralService' } })
                    const workOrderController = new WorkOrderController(workOrderDeatls.id)
                    await workOrderController.createOrEditResourcesForWorkOrder(workOrderPayload)
                     const agreementItemController = new AgreementItemController(newagreementId)
                    addedServiceAgreementItem = await agreementItemController.createOrUpdate('remove', { 
                        itemType: 'locationItem',
                        locationItemId: faker.random.arrayElement(locationItems.services),
                        agreementLocationItemId: faker.random.arrayElement(services)
                    })
                    const result = await SchedulingController.getSchedulableServices(newpersonId)
                    addedServiceAgreementItem.should.have.property('id')
                    addedServiceAgreementItem.should.have.property('quantity').and.to.equal(1)
                    result.should.be.an('array').of.length(1)
            })
            it("It should not remove item(service) were scheduling completed(remove one all)", async ()=>{
                try{
               const agreementItemController = new AgreementItemController(newagreementId)
              addedServiceAgreementItem = await agreementItemController.createOrUpdate('remove', { 
                  itemType: 'locationItem',
                  locationItemId: faker.random.arrayElement(locationItems.services),
                  agreementLocationItemId: faker.random.arrayElement(services),
                  removeAll: true
              })
              const result = await SchedulingController.getSchedulableServices(newpersonId)
              } catch(error){
              error.should.have.property('message').and.to.equal('ITEM(S)_UTILIZED_CANNOT_BE_UPDATED_OR_REMOVED')
               }
            })
            it("It should not remove item(service) were scheduling completed(remove one item)", async ()=>{
              try{
             const agreementItemController = new AgreementItemController(newagreementId)
            addedServiceAgreementItem = await agreementItemController.createOrUpdate('remove', { 
                itemType: 'locationItem',
                locationItemId: faker.random.arrayElement(locationItems.services),
                agreementLocationItemId: faker.random.arrayElement(services)
            })
            const result = await SchedulingController.getSchedulableServices(newpersonId)
            } catch(error){
            error.should.have.property('message').and.to.equal('ITEM(S)_UTILIZED_CANNOT_BE_UPDATED_OR_REMOVED')
             }
            })
            it("It should remove item(merchandise) scheduling is done but not completed ", async ()=>{
                const agreementObject = {
                    ...agreementSchema(false),
                    type: 1,
                    saleTypeId: faker.random.arrayElement(saleTypeIds)
                }
                agreementObject.locationId = 2
                newagreementId = await createAgreement(newpersonId,agreementObject)
                let serviceData = await getService('CFSVS-TC1', 'Services')
                locationItems.merchandises = await getAgreementLocationIds(agreementId, 3,'AUA02302')
                locationItems.services.push(serviceData.id)
                merchandises.push(await createLocationItems(newagreementId, locationItems.merchandises[0], currentUser.id))
                services.push(await createLocationItems(newagreementId, faker.random.arrayElement(locationItems.services), currentUser.id))
                scheduling.agreementLocationItemId = faker.random.arrayElement(services),
                services=[]
                scheduling.personId = newpersonId
                scheduling.schedulingDetails = {
                    "date": moment(),
                    "beginningTime": moment().set({'hour': 15, 'minute': 0}),
                    "endingTime": moment().set({'hour': 20, 'minute': 0}),
                    "clFacilityLocationId": null,
                    "serviceLocationId": null,
                    "reservedChapel": {
                        "chapelId": 0,
                        "reservationDate": moment(),
                        "startTime": moment().set({'hour': 16, 'minute': 0}),
                        "endTime": moment().set({'hour': 17, 'minute': 0})
                    }
                }
                scheduling.casketDetails = {
                    "casketId": merchandises[0],
                    "casketType": null,
                    "isOutSideCasket": false,
                    "resourceType":"AgreementLocationItem"
                }
         
                const schedulingController = new SchedulingController()
                await schedulingController.createOrUpdateScheduledFuneralService(scheduling)
                 const agreementItemController = new AgreementItemController(newagreementId)
                addedServiceAgreementItem = await agreementItemController.createOrUpdate('remove', { 
                    itemType: 'locationItem',
                    locationItemId: locationItems.merchandises[0],
                    agreementLocationItemId: faker.random.arrayElement(merchandises)
                })
                merchandises=[]
                addedServiceAgreementItem.should.have.property('id')
                addedServiceAgreementItem.should.have.property('quantity').and.to.equal(0)
                })
                it("It should remove item(merchandise) were one item is scheduling done and  one item is not yet scheduling done", async ()=>{
                    merchandises.push(await createLocationItems(newagreementId, locationItems.merchandises[0], currentUser.id))
                    merchandises.push(await createLocationItems(newagreementId, locationItems.merchandises[0], currentUser.id,merchandises[0]))
                    services.push(await createLocationItems(newagreementId, faker.random.arrayElement(locationItems.services), currentUser.id))
                    scheduling.agreementLocationItemId = faker.random.arrayElement(services),
                    services=[]
                    scheduling.personId = newpersonId
                    scheduling.schedulingDetails = {
                        "date": moment(),
                        "beginningTime": moment().set({'hour': 15, 'minute': 0}),
                        "endingTime": moment().set({'hour': 20, 'minute': 0}),
                        "clFacilityLocationId": null,
                        "serviceLocationId": null,
                        "reservedChapel": {
                            "chapelId": 0,
                            "reservationDate": moment(),
                            "startTime": moment().set({'hour': 16, 'minute': 0}),
                            "endTime": moment().set({'hour': 17, 'minute': 0})
                        }
                    }
                    scheduling.casketDetails = {
                        "casketId": merchandises[0],
                        "casketType": null,
                        "isOutSideCasket": false,
                        "resourceType":"AgreementLocationItem"
                    }
                  
                    const schedulingController = new SchedulingController()
                    await schedulingController.createOrUpdateScheduledFuneralService(scheduling)
                     const agreementItemController = new AgreementItemController(newagreementId)
                    addedServiceAgreementItem = await agreementItemController.createOrUpdate('remove', { 
                        itemType: 'locationItem',
                        locationItemId: locationItems.merchandises[0],
                        agreementLocationItemId: merchandises[0]
                    })
                    service = []
                    addedServiceAgreementItem.should.have.property('id')
                    addedServiceAgreementItem.should.have.property('quantity').and.to.equal(1)
                })
                it("It should remove item(merchandise) were one item is scheduling complted and one item is scheduling  is done", async ()=>{
                        merchandises.push(await createLocationItems(newagreementId, locationItems.merchandises[0], currentUser.id,merchandises[0]))
                        services.push(await createLocationItems(newagreementId, faker.random.arrayElement(locationItems.services), currentUser.id))
                        scheduling.agreementLocationItemId = faker.random.arrayElement(services),
                        scheduling.personId = newpersonId
                        scheduling.schedulingDetails = {
                            "date": moment(),
                            "beginningTime": moment().set({'hour': 3, 'minute': 0}),
                            "endingTime": moment().set({'hour': 4, 'minute': 0}),
                            "clFacilityLocationId": null,
                            "serviceLocationId": null,
                            "reservedChapel": {
                                "chapelId": 0,
                                "reservationDate": moment(),
                                "startTime": moment().set({'hour': 16, 'minute': 0}),
                                "endTime": moment().set({'hour': 17, 'minute': 0})
                            }
                        }
                        scheduling.casketDetails = {
                            "casketId": merchandises[0],
                            "casketType": null,
                            "isOutSideCasket": false,
                            "resourceType":"AgreementLocationItem"
                        }
                        const workOrderPayload = {"serviceType":"Funeral",
                                         "funeralDirectorId":2,
                                         "notes":[],
                                         "isWarningShown":false,
                                         "completedOn": moment().set({'hour': 11, 'minute': 0}),
                                         "employees":[],
                                         "resources":[]}
                        const schedulingController = new SchedulingController()
                        const schedulingData = await schedulingController.createOrUpdateScheduledFuneralService(scheduling)
                        const workOrderDeatls = await models.WorkOrder.findOne({ where : {resourceId: schedulingData.id, resourceType: 'ScheduledFuneralService' } })
                        const workOrderController = new WorkOrderController(workOrderDeatls.id)
                        await workOrderController.createOrEditResourcesForWorkOrder(workOrderPayload)
                         const agreementItemController = new AgreementItemController(newagreementId)
                        addedServiceAgreementItem = await agreementItemController.createOrUpdate('remove', { 
                            itemType: 'locationItem',
                            locationItemId: locationItems.merchandises[0],
                            agreementLocationItemId: merchandises[0]
                        })
                        service = []
                        addedServiceAgreementItem.should.have.property('id')
                        addedServiceAgreementItem.should.have.property('quantity').and.to.equal(1)
                })
                it("It should not remove item(merchandise) were scheduling completed(remove one all)", async ()=>{
                    try{
                   const agreementItemController = new AgreementItemController(newagreementId)
                  addedServiceAgreementItem = await agreementItemController.createOrUpdate('remove', { 
                      itemType: 'locationItem',
                      locationItemId: locationItems.merchandises[0],
                      agreementLocationItemId: merchandises[0],
                      removeAll: true
                  })
                  } catch(error){
                  error.should.have.property('message').and.to.equal('ITEM(S)_UTILIZED_CANNOT_BE_UPDATED_OR_REMOVED')
                   }
                })
                it("It should not remove item(merchandise) were scheduling completed(remove one item)", async ()=>{
                  try{
                 const agreementItemController = new AgreementItemController(newagreementId)
                addedServiceAgreementItem = await agreementItemController.createOrUpdate('remove', { 
                    itemType: 'locationItem',
                    locationItemId: locationItems.merchandises[0],
                    agreementLocationItemId: merchandises[0]
                })
                } catch(error){
                error.should.have.property('message').and.to.equal('ITEM(S)_UTILIZED_CANNOT_BE_UPDATED_OR_REMOVED')
                 }
                })
        })
        after(async ()=>{
            const propertyController = new AgreementPropertyController(agreementId)
            await propertyController.releaseProperty(propertyid, currentUser)
        })
    
    })

    describe('Get scheduled funeral service', async () => {
        it('Should return error without passing personId and scheduledFuneralServiceId', async () => {
            try {
                const schedulingController = new SchedulingController()
                await schedulingController.getScheduledFuneralServiceDetails()
            } catch (error) {
                error.should.have.property('message').and.to.be.equal('PERSONID_AND_SCHEDULEDFUNERALSERVICEID_ARE_REQUIRED')
            }
        })

        it('Should return Scheduled Funeral Services successfully', async () => {
            const schedulingController = new SchedulingController()
            const result = await schedulingController.getScheduledFuneralServiceDetails(scheduledService.personId, scheduledService.id)
            result.should.be.an('object')
            result.should.have.property('agreementCashAdvancedItemId')
            result.should.have.property('agreementPackageItemId')
            result.should.have.property('agreementLocationItemId')
            result.should.have.property('casketDetails').and.to.be.an('object')
            result.casketDetails.should.have.property('id').to.be.equal(scheduledService.casketDetails.id)
            result.casketDetails.should.have.property('casketType').to.be.equal(scheduledService.casketDetails.casketType)
            result.casketDetails.should.have.property('isOutSideCasket').to.be.equal(scheduledService.casketDetails.isOutSideCasket)
            result.should.have.property('cemeteryInformationDetails').and.to.be.an('object')
            result.cemeteryInformationDetails.should.have.property('id')
            result.should.have.property('person').and.to.be.an('object')
            result.person.should.have.property('id')
            result.person.should.have.property('firstName')
            result.person.should.have.property('middleName')
            result.person.should.have.property('lastName')
            result.person.should.have.property('onePortalId')
            result.should.have.property('resourcesDetails').and.to.be.an('object')
            result.resourcesDetails.should.have.property('id').to.be.equal(scheduledService.resourcesDetails.id)
            result.resourcesDetails.should.have.property('crematoryDate')
            result.resourcesDetails.should.have.property('crematoryStartTime')
            result.resourcesDetails.should.have.property('crematoryEndTime')
            result.resourcesDetails.should.have.property('isHearseNeeded').to.be.equal(scheduledService.resourcesDetails.isHearseNeeded)
            result.resourcesDetails.should.have.property('isUtilityCarNeeded').to.be.equal(scheduledService.resourcesDetails.isUtilityCarNeeded)
            result.should.have.property('schedulingDetails').and.to.be.an('object')
            result.schedulingDetails.should.have.property('date')
            result.schedulingDetails.should.have.property('beginningTime')
            result.schedulingDetails.should.have.property('endingTime')
            result.should.have.property('subServicesDetails').and.to.be.an('array')
            result.subServicesDetails.length.should.equal(0)
            result.should.have.property('urnInformationDetails').and.to.be.an('object')
            result.urnInformationDetails.should.have.property('isFamilyOwnedUrn').to.be.equal(scheduledService.urnInformationDetails.isFamilyOwnedUrn)
            result.urnInformationDetails.should.have.property('isTransferRequired').to.be.equal(scheduledService.urnInformationDetails.isFamilyOwnedUrn)
        })
        
    })

    describe('Get Selected and Used Properties of a Person', async () => {
        it('Should return empty arrays without selecting any properties', async () => {
            const itemUsageCtrl = new ItemUsageCtrl(personId)
            const result = await itemUsageCtrl.getConsumedProperties(personId, null, null)
            result.should.be.an('object')
            result.should.have.property('selectedProperties').and.to.be.an('array')
            result.selectedProperties.length.should.equal(0)
            result.should.have.property('usedProperties').and.to.be.an('array')
            result.usedProperties.length.should.equal(0)
        })

        it('Should return Selected Properties successfully', async () => {
            await models.AgreementProperty.destroy({where : {
                propertyid: { [Op.in]: [766,668,843,399] }
            }})
            currentUser = await findOrCreateUser()
            propertyId = 766
            cmtryAgmntPropId = await createProperties(cemeteryAgmntId, propertyId, currentUser)
            const itemUsageCtrl = new ItemUsageCtrl(personId)
            const propsList = await itemUsageCtrl.getAvailableItemsForItemUsage({ filter: 'Properties' })
            let itemUsageData = {
                resourceType: "Properties",
                resourceId: cmtryAgmntPropId,
                lotSpaceIds: propsList.finalResult[0].lotSpaceId,
                isDeleted: false,
                createdBy: currentUser.id
            }
            let propSelected = await itemUsageCtrl.createItemUsageSelect(itemUsageData)
            selectedPropId = propSelected.itemUsageId
            const result = await itemUsageCtrl.getConsumedProperties(personId, null, null)
            result.should.be.an('object')
            result.should.have.property('selectedProperties').and.to.be.an('array')
            result.selectedProperties.length.should.not.equal(0)
            result.should.have.property('usedProperties').and.to.be.an('array')
            result.usedProperties.length.should.equal(0)
        })

        it('Should return Used Properties successfully', async () => {
            const itemUsageCtrl = new ItemUsageCtrl(personId)
            const propsList = await itemUsageCtrl.getAvailableItemsForItemUsage({ filter: 'Properties' })
            let itemUsageData = {
                resourceType: "Properties",
                resourceId: cmtryAgmntPropId,
                lotSpaceIds: propsList.finalResult[1].lotSpaceId,
                isDeleted: false,
                createdBy: currentUser.id
            }
            let selectedProp = await itemUsageCtrl.createItemUsageSelect(itemUsageData)
            await models.ItemUsage.update({
                usageStatus: 2,
                updatedBy: currentUser.id
            }, {
                where: {
                    id: selectedProp.itemUsageId
                }
            })
            const result = await itemUsageCtrl.getConsumedProperties(personId, null,null)
            result.should.be.an('object')
            result.should.have.property('selectedProperties').and.to.be.an('array')
            result.selectedProperties.length.should.not.equal(0)
            result.should.have.property('usedProperties').and.to.be.an('array')
            result.usedProperties.length.should.not.equal(0)
        })
        
    })

    describe('Create or Update Cemetery Schedule Service', async ()=>{
        let locationItems = {
            merchandise: [],
            services: []
        }
        let cemeterySchedulingData = {
            "personId": 1,
            "itemUsageId": 2,
            "intermentInformationDetails": {
                "id": 0,
                "propertyId": null,
                "beginningTime": moment().set({'hour': 15, 'minute': 0}),
                "endingTime": moment().set({'hour': 20, 'minute': 0}),
                "temporaryBurialLocationId": 0,
                "temporaryDisintermentLocationId": 0,
                "memorialInformation": "memorialinfo",
                "isPreburied": true
            },
            "intermentRequestDetails": {
                "isWitnessLoweringOrEntombment": false,
                "isWitnessCoveringOrSealings": false,
                "isWitnessFilling": false,
                "isReopenBottom": false,
                "isBurningPot": false,
                "isMoundOfDirtByFootend": false,
                "isUseOfTent": false,
                "isPlaceAndNotify": false,
                "isReopenTop": false
            },
            "disintermentInformationDetails": {
                "propertyId": 0,
                "beginningTime": moment().set({'hour': 15, 'minute': 0}),
                "endingTime": moment().set({'hour': 20, 'minute': 0}),
                "disintermentReason": "",
                "disintermentType": "",
                "instruction": ""
            },
            "casketDetails": {
                "isOutSideCasket": false,
                "casketId": null,
                "resourceType": null,
                "casketType": ""
            },
            "vaultDetails": {
                "isVaultFromDisinterment": false,
                "vaultId": null,
                "resourceType": null,
                "disinteredVaultDetails": ""
            },
            "urnInformationDetails": {
                "isFamilyOwnedUrn": false,
                "urnId": null,
                "resourceType": null,
                "height": "",
                "width": "",
                "depth": "",
                "urnType": 2,
                "urnStatus": "",
                "receivedDate": null,
                "isTransferRequired": false
            },
            "merchandiseAdditionalInfoDetails": {
                "isVasesSelected": false,
                "noOfVases": 0,
                "instruction": ""
            },
            "genericDetails": {
                "isLocationVerifiedWithFamily": false,
                "isLocationVerifiedWithPlattedRecord": false,
                "isElectronicCIF": false,
                "reviewedTrustStatement": false,
                "confirmedExpectedMerchandiseDelivery": false,
                "confirmedPlacementScheduleWithFuneralDirector": false,
                "isPermitted": false,
                "isWitnessedCremation": false,
                "noOfWitness": 0,
                "instruction": ""
            },
            "funeralArrangementDetails": {
                "clFacilityLocationId": null,
                "serviceLocationId": null,
                "funeralHomePhone": "",
                "phone": "",
                "funeralDirectorId": null,
                "instruction": "",
                "funeralArrangementSectionLocations": [
                    {
                        "id": 0,
                        "type": "viewing",
                        "location": "asss",
                        "startTime":null,
                        "endTime": null
                    }
                ]
            },
            "notesFromFamily": [],
            "notesFromStaff": []
        }
        const cemetersSubServices = {
            'Interment Information':'intermentInformationDetails',
            'Interment Request': 'intermentRequestDetails',
            'Vault': 'vaultDetails',
            'Casket': 'casketDetails',
            'Urn Information': 'urnInformationDetails',
            'Additional Information': 'merchandiseAdditionalInfoDetails',
            'Generic': 'genericDetails',
            'Funeral Arrangement Details': 'funeralArrangementDetails',
            'Notes from Family': 'notesFromFamily',
            'Notes from Staff': 'notesFromStaff'
        }
        let cemeteryScheduling={},services=[],casket=[],urn=[],vault=[],itemUsageId,place
        before( async ()=>{
            propertyid = faker.random.arrayElement(await getPropertyIds("Hill Side", "Grave"))
            currentUser = await findOrCreateUser()
            await createProperties(cemeteryAgmntId, propertyid, currentUser)
            locationItems.services = await getAgreementLocationIds(cemeteryAgmntId, 4, 'CL2ndInt')
            services.push(await createLocationItems(cemeteryAgmntId, faker.random.arrayElement(locationItems.services), currentUser.id))
            locationItems.casket = await getAgreementLocationIds(cemeteryAgmntId, 3, 'AUA02302')
            casket.push(await createLocationItems(cemeteryAgmntId, faker.random.arrayElement(locationItems.casket), currentUser.id))
            locationItems.casket = await getAgreementLocationIds(cemeteryAgmntId, 3, 'urn')
            urn.push(await createLocationItems(cemeteryAgmntId, faker.random.arrayElement(locationItems.casket), currentUser.id))
            locationItems.casket = await getAgreementLocationIds(cemeteryAgmntId, 3, 'CYG30865')
            vault.push(await createLocationItems(cemeteryAgmntId, faker.random.arrayElement(locationItems.casket), currentUser.id))
            let itemUsageBody = {
                resourceType: "Services",
                resourceId: faker.random.arrayElement(services),
                isDeleted: false,
                createdBy: currentUser.id
            }
           const itemUsage = await createItemUsage(personId,itemUsageBody)
           itemUsageId = itemUsage.itemUsageId
           const fieldsSections = await SchedulingController.getFieldsForSchedulingService(null, null, null, itemUsage.itemUsageId)
           fieldsSections.map((fields)=>{
               if(cemetersSubServices[fields.section]){
                cemeteryScheduling[cemetersSubServices[fields.section]] = cemeterySchedulingData[cemetersSubServices[fields.section]]
               }
           })
           cemeteryScheduling.personId = personId
           cemeteryScheduling.itemUsageId = itemUsageId
            place = await AddressController._managePlace({address: addressSchema(),organization: organizationSchema()})
        })
        it('It should create scheduling personId not found',async ()=>{
            try{
            const schedulingData  =  Object.assign({},cemeteryScheduling)
            schedulingData.personId = personId+100
            const schedulingController = new SchedulingController();
            const result = await schedulingController.createOrUpdateScheduledCemeteryService(schedulingData)               
            } catch(error){
                error.should.have.property('message').and.to.be.equal('PERSON_NOT_FOUND')
            }
        })
        it('It should create scheduling Item Usage not found', async ()=>{
            try{
                const schedulingData  = Object.assign({},cemeteryScheduling)
                schedulingData.itemUsageId = itemUsageId+1
                const schedulingController = new SchedulingController();
                const result = await schedulingController.createOrUpdateScheduledCemeteryService(schedulingData)               
                } catch(error) {
                    error.should.have.property('message').and.to.be.equal('ITEM_USAGE_NOT_FOUND')
                }
        })

        it('It should create scheduling with Interment Informationn', async ()=>{
            const schedulingData  = Object.assign({},cemeteryScheduling)
            const schedulingController = new SchedulingController();
            const result = await schedulingController.createOrUpdateScheduledCemeteryService(schedulingData)     
            result.should.have.property('itemUsageId').to.be.equal(itemUsageId)   
            result.intermentInformationDetails.should.have.property('beginningTime').to.not.equal(null)               
            result.intermentInformationDetails.should.have.property('endingTime').to.not.equal(null)   
            result.intermentInformationDetails.should.have.property('propertyDetails').to.equal(null)               
            result.intermentInformationDetails.should.have.property('temporaryBurialLocation').to.equal(null)               
            result.intermentInformationDetails.should.have.property('temporaryDisintermentLocation').to.equal(null)                   
        })

        it('It should create a scheduling Interment Request information', async ()=>{
            const schedulingData  = Object.assign({},cemeteryScheduling)
            schedulingData.intermentRequestDetails.isWitnessFilling = true
            schedulingData.intermentRequestDetails.isMoundOfDirtByFootend = true
            const schedulingController = new SchedulingController();
            const result = await schedulingController.createOrUpdateScheduledCemeteryService(schedulingData)     
            result.should.have.property('itemUsageId').to.be.equal(itemUsageId)   
            result.intermentRequestDetails.should.have.property('isWitnessLoweringOrEntombment').to.be.equal(false)               
            result.intermentRequestDetails.should.have.property('isWitnessCoveringOrSealings').to.be.equal(false)  
            result.intermentRequestDetails.should.have.property('isWitnessFilling').to.be.equal(true) 
            result.intermentRequestDetails.should.have.property('isReopenBottom').to.be.equal(false)      
            result.intermentRequestDetails.should.have.property('isBurningPot').to.be.equal(false) 
            result.intermentRequestDetails.should.have.property('isMoundOfDirtByFootend').to.be.equal(true) 
            result.intermentRequestDetails.should.have.property('isUseOfTent').to.be.equal(false) 
            result.intermentRequestDetails.should.have.property('isPlaceAndNotify').to.be.equal(false) 
            result.intermentRequestDetails.should.have.property('isReopenTop').to.be.equal(false) 
        })

        it('It should create a scheduling generic Deatils', async ()=>{
            const schedulingData  = Object.assign({},cemeteryScheduling)
            schedulingData.genericDetails.instruction = 'hello'
            schedulingData.genericDetails.noOfWitness = 1
            schedulingData.genericDetails.isPermitted = true
            const schedulingController = new SchedulingController();
            const result = await schedulingController.createOrUpdateScheduledCemeteryService(schedulingData)     
            result.should.have.property('itemUsageId').to.be.equal(itemUsageId)  
            result.genericDetails.should.have.property('instruction').to.be.equal('hello')               
            result.genericDetails.should.have.property('isLocationVerifiedWithFamily').to.be.equal(false)  
            result.genericDetails.should.have.property('isLocationVerifiedWithPlattedRecord').to.be.equal(false)
            result.genericDetails.should.have.property('isElectronicCIF').to.be.equal(false)               
            result.genericDetails.should.have.property('reviewedTrustStatement').to.be.equal(false)  
            result.genericDetails.should.have.property('confirmedExpectedMerchandiseDelivery').to.be.equal(false)
            result.genericDetails.should.have.property('confirmedPlacementScheduleWithFuneralDirector').to.be.equal(false)               
            result.genericDetails.should.have.property('isPermitted').to.be.equal(true)  
            result.genericDetails.should.have.property('isWitnessedCremation').to.be.equal(false)
            result.genericDetails.should.have.property('noOfWitness').to.be.equal(1)
        })
        it('It should create scheduling with merchandise additional Informationn', async ()=>{
            const schedulingData  = Object.assign({},cemeteryScheduling)
            const schedulingController = new SchedulingController();
            schedulingData.merchandiseAdditionalInfoDetails.isVasesSelected = true
            schedulingData.merchandiseAdditionalInfoDetails.noOfVases = 1
            schedulingData.merchandiseAdditionalInfoDetails.instruction = 'hello'
            const result = await schedulingController.createOrUpdateScheduledCemeteryService(schedulingData)     
            result.should.have.property('itemUsageId').to.be.equal(itemUsageId)   
            result.merchandiseAdditionalInfoDetails.should.have.property('isVasesSelected').to.be.equal(true)               
            result.merchandiseAdditionalInfoDetails.should.have.property('noOfVases').to.be.equal(1)  
            result.merchandiseAdditionalInfoDetails.should.have.property('instruction').to.be.equal('hello')      
        })
        it('It should create a scheduling casket , vault, urnInformation Details without any resource type', async ()=>{
            const schedulingData  = Object.assign({},cemeteryScheduling)
            schedulingData.casketDetails.casketType ="casket new"
            schedulingData.casketDetails.isOutSideCasket = true
            schedulingData.vaultDetails.isVaultFromDisinterment =true
            schedulingData.vaultDetails.disinteredVaultDetails ="vault new"
            schedulingData.urnInformationDetails = {
                depth: "20",
                height: "50",
                isFamilyOwnedUrn: true,
                isTransferRequired: true,
                receivedDate: moment(),
                urnId: null,
                urnStatus: "test",
                urnType: urnTypeId,
                resourceType: null,
                width: "50"
            }
            const schedulingController = new SchedulingController();
            const result = 
            await schedulingController.createOrUpdateScheduledCemeteryService(schedulingData)     
            result.should.have.property('itemUsageId').to.be.equal(itemUsageId)  
            result.should.have.property('casketDetails').and.to.be.an('object')
            result.casketDetails.should.have.property('id').to.be.gte(1)
            result.casketDetails.should.have.property('casket').to.be.equal(null)
            result.should.have.property('vaultDetails').and.to.be.an('object')
            result.vaultDetails.should.have.property('id').to.be.gte(1)
            result.vaultDetails.should.have.property('vault').to.be.equal(null)
            result.should.have.property('urnInformationDetails').and.to.be.an('object')
            result.urnInformationDetails.should.have.property('id').to.be.gte(1)
            result.urnInformationDetails.should.have.property('urn').to.be.equal(null)
        })
        
        it('It should create a scheduling casket , vault, urnInformation Details with resource type agreement locaion item', async ()=>{
            const schedulingData  = Object.assign({},cemeteryScheduling)
            schedulingData.casketDetails.casketId = faker.random.arrayElement(casket)
            schedulingData.casketDetails.resourceType = 'AgreementLocationItem'
            schedulingData.vaultDetails.vaultId = faker.random.arrayElement(vault)
            schedulingData.vaultDetails.resourceType = 'AgreementLocationItem'
            schedulingData.urnInformationDetails.urnId = faker.random.arrayElement(urn)
            schedulingData.urnInformationDetails.resourceType = 'AgreementLocationItem'

            const schedulingController = new SchedulingController();
            const result = await schedulingController.createOrUpdateScheduledCemeteryService(schedulingData)     
            result.should.have.property('itemUsageId').to.be.equal(itemUsageId)  
            result.should.have.property('casketDetails').and.to.be.an('object')
            result.casketDetails.should.have.property('id').to.be.gte(1)
            result.casketDetails.should.have.property('casket').to.not.equal(null)
            result.casketDetails.casket.should.have.property('resourceType').to.equal('AgreementLocationItem')
            result.should.have.property('vaultDetails').and.to.be.an('object')
            result.vaultDetails.should.have.property('id').to.be.gte(1)
            result.vaultDetails.should.have.property('vault').to.not.equal(null)
            result.vaultDetails.vault.should.have.property('resourceType').to.equal('AgreementLocationItem')
            result.should.have.property('urnInformationDetails').and.to.be.an('object')
            result.urnInformationDetails.should.have.property('id').to.be.gte(1)
            result.urnInformationDetails.should.have.property('urn').not.equal(null)
            result.urnInformationDetails.urn.should.have.property('resourceType').to.equal('AgreementLocationItem')
        })

        it('It should create a scheduling casket , vault, urnInformation Details with resource type itemUsage', async ()=>{
            const schedulingData  = Object.assign({},cemeteryScheduling)
            let itemUsageBody = {
                resourceType: "Merchandises",
                resourceId: faker.random.arrayElement(casket),
                isDeleted: false,
                createdBy: currentUser.id
              }
              let itemUsageBody1 = {
                resourceType: "Merchandises",
                resourceId: faker.random.arrayElement(vault),
                isDeleted: false,
                createdBy: currentUser.id
              }
            let itemUsageCasket = await createItemUsage(personId , itemUsageBody)
            let itemUsageVault = await createItemUsage(personId , itemUsageBody1)
            schedulingData.casketDetails.casketId = itemUsageCasket.itemUsageId
            schedulingData.casketDetails.resourceType = 'ItemUsage'
            schedulingData.vaultDetails.vaultId = itemUsageVault.itemUsageId
            schedulingData.vaultDetails.resourceType = 'ItemUsage'
            const schedulingController = new SchedulingController();
            const result = await schedulingController.createOrUpdateScheduledCemeteryService(schedulingData)     
            result.should.have.property('itemUsageId').to.be.equal(itemUsageId)  
            result.should.have.property('casketDetails').and.to.be.an('object')
            result.casketDetails.should.have.property('id').to.be.gte(1)
            result.casketDetails.should.have.property('casket').to.not.equal(null)
            result.casketDetails.casket.should.have.property('resourceType').to.equal('ItemUsage')
            result.should.have.property('vaultDetails').and.to.be.an('object')
            result.vaultDetails.should.have.property('id').to.be.gte(1)
            result.vaultDetails.should.have.property('vault').to.not.equal(null)
            result.vaultDetails.vault.should.have.property('resourceType').to.equal('ItemUsage')
        })

        it('It should create a scheduling with notes sections ', async ()=>{
            const schedulingData  = Object.assign({},cemeteryScheduling)
            schedulingData.notesFromFamily.push({
                content:'note for family'
            })
            schedulingData.notesFromStaff.push({
                content:'note for staff'
            })
            const schedulingController = new SchedulingController();
            const result = await schedulingController.createOrUpdateScheduledCemeteryService(schedulingData)     
            result.should.have.property('itemUsageId').to.be.equal(itemUsageId)  
            result.notesFromFamily.should.be.an('array').of.length(1)
            result.notesFromStaff.should.be.an('array').of.length(1)
        })

        it('It should create a scheduling funeral arrangement details', async ()=>{
            const schedulingData  = Object.assign({},cemeteryScheduling)
            schedulingData.funeralArrangementDetails.serviceLocationId = place.id
            const schedulingController = new SchedulingController();
            const result = await schedulingController.createOrUpdateScheduledCemeteryService(schedulingData)   
            schedulingUpdatedDetails = result
            result.should.have.property('itemUsageId').to.be.equal(itemUsageId)  
            result.funeralArrangementDetails.should.have.property('id').to.be.gte(1)
            result.funeralArrangementDetails.should.have.property('serviceLocation').to.not.equal(null)
            result.funeralArrangementDetails.serviceLocation.should.have.property('id').to.be.gte(1)
            result.funeralArrangementDetails.funeralArrangementSectionLocations.should.be.an('array').of.length(1)
        })

        it('It should update a scheduling', async ()=>{
            const schedulingData  = Object.assign({},cemeteryScheduling)
             schedulingData.id = schedulingUpdatedDetails.id
             schedulingData.intermentInformationDetails.id = schedulingUpdatedDetails.intermentInformationDetails.id
             schedulingData.intermentRequestDetails.id = schedulingUpdatedDetails.intermentRequestDetails.id
             schedulingData.intermentRequestDetails.isWitnessFilling = false
             schedulingData.genericDetails.id = schedulingUpdatedDetails.genericDetails.id
             schedulingData.genericDetails.noOfWitness = 2
             schedulingData.casketDetails.id = schedulingUpdatedDetails.casketDetails.id
             schedulingData.casketDetails.casketId = schedulingUpdatedDetails.casketDetails.casket.id
             schedulingData.casketDetails.resourceType = schedulingUpdatedDetails.casketDetails.casket.resourceType
             const schedulingController = new SchedulingController();
             schedulingData.notesFromFamily = schedulingUpdatedDetails.notesFromFamily
             schedulingData.notesFromStaff = schedulingUpdatedDetails.notesFromStaff
             const result = await schedulingController.createOrUpdateScheduledCemeteryService(schedulingData)   
            result.should.have.property('itemUsageId').to.be.equal(itemUsageId)  
            result.should.have.property('id').to.be.equal(schedulingUpdatedDetails.id)
            result.intermentRequestDetails.should.have.property('isWitnessFilling').to.be.equal(false)
            result.genericDetails.should.have.property('noOfWitness').to.be.equal(2)
        })

        it('It should create a scheduling for sub sections dis interment information details', async ()=>{
            let cemeteryScheduling={}
            let services=[]
            locationItems.services = await getAgreementLocationIds(cemeteryAgmntId, 4, 'CL2ndDisn')
            services.push(await createLocationItems(cemeteryAgmntId, faker.random.arrayElement(locationItems.services), currentUser.id))
            let itemUsageBody = {
                resourceType: "Services",
                resourceId: faker.random.arrayElement(services),
                isDeleted: false,
                createdBy: currentUser.id
              }
           const itemUsage = await createItemUsage(personId,itemUsageBody)
           let itemUsageId = itemUsage.itemUsageId
           const fieldsSections = await SchedulingController.getFieldsForSchedulingService(null, null, null, itemUsage.itemUsageId)
           fieldsSections.map((fields)=>{
               if(cemetersSubServices[fields.section]){
                cemeteryScheduling[cemetersSubServices[fields.section]] = cemeterySchedulingData[cemetersSubServices[fields.section]]
               }
           })
           cemeteryScheduling.personId = personId
           cemeteryScheduling.itemUsageId = itemUsageId
            const schedulingController = new SchedulingController();
            const result = await schedulingController.createOrUpdateScheduledCemeteryService(cemeteryScheduling)     
            result.should.have.property('itemUsageId').to.be.equal(itemUsageId)  
            result.intermentInformationDetails.should.have.property('beginningTime').to.not.equal(null)
            result.intermentInformationDetails.should.have.property('endingTime').to.not.equal(null)   
            result.intermentInformationDetails.should.have.property('propertyDetails').to.equal(null)                  
        })
        
        describe('Get cemetery scheduling deatails',()=>{
           before(async ()=>{

           })
           it('It should get scheduling person id and cemetery id  are requried',async ()=>{
            try{
            const schedulingController = new SchedulingController();
            const result = await schedulingController.getScheduledCemeteryServiceDetails()               
            } catch(error){
                error.should.have.property('message').and.to.be.equal('PERSONID_AND_SCHEDULEDCEMETERYSERVICEID_ARE_REQUIRED')
            }
           })
           it('It should get scheduling personId is not found',async ()=>{
            try{
            const schedulingController = new SchedulingController();
            const result = await schedulingController.getScheduledCemeteryServiceDetails(personId+100,schedulingUpdatedDetails.id)               
            } catch(error){
                error.should.have.property('message').and.to.be.equal('PERSON_NOT_FOUND')
            }
           })
           it('It should get scheduling cemetery service is not found',async ()=>{
            try{
            const schedulingController = new SchedulingController();
            const result = await schedulingController.getScheduledCemeteryServiceDetails(personId,schedulingUpdatedDetails.id+100)               
            } catch(error){
                error.should.have.property('message').and.to.be.equal('SCHEDULABLE_CEMETERY_SERVICE_NOT_FOUND')
            }
           })
               
           it('It should get scheduling data', async ()=>{
                const schedulingController = new SchedulingController();
                const result = await schedulingController.getScheduledCemeteryServiceDetails(personId,schedulingUpdatedDetails.id)  
                result.should.have.property('itemUsageId').to.be.equal(itemUsageId)  
                result.should.have.property('id').to.be.equal(schedulingUpdatedDetails.id)
                result.intermentInformationDetails.should.have.property('beginningTime').to.not.equal(null)               
                result.intermentInformationDetails.should.have.property('endingTime').to.not.equal(null)   
                result.intermentInformationDetails.should.have.property('propertyDetails').to.equal(null)               
                result.intermentInformationDetails.should.have.property('temporaryBurialLocation').to.equal(null)               
                result.intermentInformationDetails.should.have.property('temporaryDisintermentLocation').to.equal(null)  
                result.intermentRequestDetails.should.have.property('isWitnessLoweringOrEntombment').to.be.equal(false)               
                result.intermentRequestDetails.should.have.property('isWitnessCoveringOrSealings').to.be.equal(false)  
                result.intermentRequestDetails.should.have.property('isWitnessFilling').to.be.equal(false) 
                result.intermentRequestDetails.should.have.property('isReopenBottom').to.be.equal(false)      
                result.intermentRequestDetails.should.have.property('isBurningPot').to.be.equal(false) 
                result.intermentRequestDetails.should.have.property('isMoundOfDirtByFootend').to.be.equal(true) 
                result.intermentRequestDetails.should.have.property('isUseOfTent').to.be.equal(false) 
                result.intermentRequestDetails.should.have.property('isPlaceAndNotify').to.be.equal(false) 
                result.intermentRequestDetails.should.have.property('isReopenTop').to.be.equal(false) 
                result.merchandiseAdditionalInfoDetails.should.have.property('isVasesSelected').to.be.equal(true)               
                result.merchandiseAdditionalInfoDetails.should.have.property('noOfVases').to.be.equal(1)  
                result.merchandiseAdditionalInfoDetails.should.have.property('instruction').to.be.equal('hello') 
                result.genericDetails.should.have.property('instruction').to.be.equal('hello')               
                result.genericDetails.should.have.property('isLocationVerifiedWithFamily').to.be.equal(false)  
                result.genericDetails.should.have.property('isLocationVerifiedWithPlattedRecord').to.be.equal(false)
                result.genericDetails.should.have.property('isElectronicCIF').to.be.equal(false)               
                result.genericDetails.should.have.property('reviewedTrustStatement').to.be.equal(false)  
                result.genericDetails.should.have.property('confirmedExpectedMerchandiseDelivery').to.be.equal(false)
                result.genericDetails.should.have.property('confirmedPlacementScheduleWithFuneralDirector').to.be.equal(false)               
                result.genericDetails.should.have.property('isPermitted').to.be.equal(true)  
                result.genericDetails.should.have.property('isWitnessedCremation').to.be.equal(false)
                result.genericDetails.should.have.property('noOfWitness').to.be.equal(2)
                result.should.have.property('itemUsageId').to.be.equal(itemUsageId)  
                result.should.have.property('casketDetails').and.to.be.an('object')
                result.casketDetails.should.have.property('id').to.be.gte(1)
                result.casketDetails.should.have.property('casket').to.not.equal(null)
                result.casketDetails.casket.should.have.property('resourceType').to.equal('ItemUsage')
                result.should.have.property('vaultDetails').and.to.be.an('object')
                result.vaultDetails.should.have.property('id').to.be.gte(1)
                result.vaultDetails.should.have.property('vault').to.not.equal(null)
                result.vaultDetails.vault.should.have.property('resourceType').to.equal('ItemUsage')
                result.should.have.property('itemUsageId').to.be.equal(itemUsageId)  
                result.funeralArrangementDetails.should.have.property('id').to.be.gte(1)
                result.funeralArrangementDetails.should.have.property('serviceLocation').to.not.equal(null)
                result.funeralArrangementDetails.serviceLocation.should.have.property('id').to.be.gte(1)
                result.funeralArrangementDetails.funeralArrangementSectionLocations.should.be.an('array').of.length(1)
                result.notesFromFamily.should.be.an('array').of.length(1)
                result.notesFromStaff.should.be.an('array').of.length(1)
          })
    })

        after(async ()=>{
            const propertyController = new AgreementPropertyController(cemeteryAgmntId)
            await propertyController.releaseProperty(propertyid,currentUser)
        })
    })

    describe('Removal Scenarios in Cemetery Contract', async () => {
        let agreementRoles, person1Id, agmntSchema, propertyid, cmtryAgmntId, service, merchandise, memorial, memorialLocationId, mids, mbids, maoids, memorialId, serviveItemId,merchandiseItemId,purchaser1
        before(async () => {
            agreementRoles = await getAgreementRoles('map')
            const person1 = { ...personSchema() }
            person1.isAlive = false
            const createdPerson = await PersonController.createOrUpdate(person1, {}, {})
            person1Id = createdPerson.id
            purchaser1 = await createPerson(true,true)
            const verifiedPersonController = new VerifiedPersonController(person1Id)
            await verifiedPersonController.verifyPerson(createdPerson)
            agmntSchema = {
                needType: 1,
                type: 2,
                locationId: 1,
                persons: [
                    {
                        personId: person1Id,
                        agreementRoleId: agreementRoles['Beneficiary']
                    },
                    {
                        personId: purchaser1.id,
                        agreementRoleId: agreementRoles['Purchaser']
                    }
                ]
            }
            cmtryAgmntId = await createAgreement(personId, agmntSchema)
            propertyid = faker.random.arrayElement(await getPropertyIds("Hill Side", "Grave"))
            currentUser = await findOrCreateUser()
            await createProperties(cemeteryAgmntId, propertyid, currentUser)
            service = await getService('CL2ndEnt', 'Services')
            merchandise = await getService('AUA02302', 'Merchandises')
            memorial = await getAgreementMemorialIds()
            memorialLocationId = [memorial.memorialIds[faker.random.number({ min: 1, max: 3 })], memorial.memorialBaseIds[faker.random.number({ min: 1, max: 3 })], memorial.memorialAddOnsIds[faker.random.number({ min: 1, max: 3 })]]
        })

        describe('Removal Scenarios of Beneficiaries in Cemetery Contract', async () => {
            it('Should throw error while removing the Beneficiary if Services are used by that Beneficiary', async () => {
                // Add Service Item to Agreement
                let agreementItemController = new AgreementItemController(cmtryAgmntId)
                const agmtItem = await agreementItemController.createOrUpdate('add', {
                    itemType: 'locationItem',
                    locationItemId: service.id,
                    timezone: 'Asia/Calcutta'
                })
                let itemUsageData = {
                    "resourceType": "Services",
                    "resourceId": agmtItem.id,
                    "isDeleted": false
                }
                serviveItemId = agmtItem.id
                let itemUsageCtrl = new ItemUsageCtrl(person1Id)
                let itemUsage = await itemUsageCtrl.createItemUsageSelect(itemUsageData)
                await itemUsageCtrl.updateItemUsageConfirm([itemUsage.itemUsageId])
                try {
                    await AgreementController.createOrEditAgreement(person1Id, agmntSchema)
                } catch (error) {
                    error.should.have.property('message').and.to.be.equal('BENEFICIARY_CANNOT_BE_REPLACED')
                }
            })
    
            it('Should throw error while removing the Beneficiary if Merchandises are used by that Beneficiary', async () => {
                // Add Merchandise Item to Agreement
                let agreementItemController = new AgreementItemController(cmtryAgmntId)
                const agmtItem = await agreementItemController.createOrUpdate('add', {
                    itemType: 'locationItem',
                    locationItemId: merchandise.id,
                    timezone: 'Asia/Calcutta'
                })
                let itemUsageData = {
                    "resourceType": "Merchandises",
                    "resourceId": agmtItem.id,
                    "isDeleted": false
                }
                merchandiseItemId = agmtItem.id
                let itemUsageCtrl = new ItemUsageCtrl(personId)
                let itemUsage = await itemUsageCtrl.createItemUsageSelect(itemUsageData)
                await itemUsageCtrl.updateItemUsageConfirm([itemUsage.itemUsageId])
                try {
                    await AgreementController.createOrEditAgreement(person1Id, agmntSchema)
                } catch (error) {
                    error.should.have.property('message').and.to.be.equal('BENEFICIARY_CANNOT_BE_REPLACED')
                }
            })

            it('Should throw error while removing the Beneficiary if Memorials are used by that Beneficiary', async () => {
                // Add Memorial Item to Agreement
                [mid, mids, mbids, maoids] = await createMemorialItem(cemeteryAgmntId, memorialLocationId)
                memorialId = mid
                let itemUsageData = {
                    resourceType: "Memorial",
                    resourceIds: [mids, mbids, maoids],
                    isDeleted: false,
                    createdBy: currentUser.id
                }
                await createItemUsage(personId, itemUsageData)
                try {
                    await AgreementController.createOrEditAgreement(person1Id, agmntSchema)
                } catch (error) {
                    error.should.have.property('message').and.to.be.equal('BENEFICIARY_CANNOT_BE_REPLACED')
                }
            })
        })
        describe ('Removal Scenarios of Services in Cemetery Contract', async () => {
            it('Should throw error while removing the used Service Item', async () => {
                try {
                    let agreementItemController = new AgreementItemController(cmtryAgmntId)
                    await agreementItemController.createOrUpdate('remove', {
                        itemType: 'locationItem',
                        locationItemId: service.id,
                        timezone: 'Asia/Calcutta',
                        agreementLocationItemId: serviveItemId

                    })
                } catch (error) {
                    error.should.have.property('message').and.to.be.equal('Item(s) utilized in service schedule cannot be updated/removed')
                }
            })
        })

        describe ('Removal Scenarios of Merchandises in Cemetery Contract', async () => {
            it('Should throw error while removing the used Merchandise Item', async () => {
                try {
                    let agreementItemController = new AgreementItemController(cmtryAgmntId)
                    await agreementItemController.createOrUpdate('remove', {
                        itemType: 'locationItem',
                        locationItemId: merchandise.id,
                        timezone: 'Asia/Calcutta',
                        agreementLocationItemId: merchandiseItemId
                    })
                } catch (error) {
                    error.should.have.property('message').and.to.be.equal('Item(s) utilized in service schedule cannot be updated/removed')
                }
            })
        })

        describe ('Removal Scenarios of Memorials in Cemetery Contract', async () => {

            it('Should throw error while deleting the used Memorial Item', async () => {
                try {
                    let agreementMemorialCtrl = new AgreementMemorialController(cmtryAgmntId)
                    await agreementMemorialCtrl.deleteMemorial(memorialId)
                } catch (error) {
                    error.should.have.property('message').and.to.be.equal('USED_MEMORIAL_CANNOT_BE_UPDATED_OR_DELETED')
                }
            })

            it('Should throw error while updating the used Memorial Item', async () => {
                try {
                    let agreementMemorialCtrl = new AgreementMemorialController(cmtryAgmntId)
                    await agreementMemorialCtrl.createOrUpdate('edit', { id: memorialId })
                } catch (error) {
                    error.should.have.property('message').and.to.be.equal('USED_MEMORIAL_CANNOT_BE_UPDATED_OR_DELETED')
                }
            })

            it('Should throw error while decreasing the quantity of Memorial Item less than the number of items used', async () => {
                try {
                    let agreementMemorialCtrl = new AgreementMemorialController(cmtryAgmntId)
                    await agreementMemorialCtrl.editMemorialItemQuantity(memorialId, memorialLocationId[2], 0, null)
                } catch (error) {
                    error.should.have.property('message').and.to.be.equal("UNABLE_TO_UPDATE_ITEM'S_QUANTITY")
                }
            })
        })

        describe ('Removal Scenarios of Properties in Cemetery Contract', async () => {

            it('Should throw error while Releasing the used Property', async () => {
                try {
                    let agmtPropCtrl = new AgreementPropertyController(cemeteryAgmntId)
                    await agmtPropCtrl.releaseProperty(propertyid, currentUser)
                } catch (error) {
                    error.should.equal('Property with Right(s) in ‘Used’ status cannot be released')
                }
            })

            it('Should throw error while Confirming the Other Garden Property when already a Property is Used', async () => {
                try {
                    let agmtPropCtrl = new AgreementPropertyController(cemeteryAgmntId)
                    let propId = faker.random.arrayElement(
                        await getPropertyIds('Hill Side', 'Grave')
                    )
                    await agmtPropCtrl.reserveProperty(propId, currentUser, 'reserved')
                    await agmtPropCtrl.confirmProperty(propId, 'confirmed' , currentUser)
                } catch (error) {
                    error.should.have.property('message').and.to.be.equal('Property with Right(s) in ‘Used’ status cannot be released')
                }
            })
        })

        after(async ()=>{
            const propertyController = new AgreementPropertyController(cemeteryAgmntId)
            await propertyController.releaseProperty(propertyid, currentUser)
        })
    })
})
