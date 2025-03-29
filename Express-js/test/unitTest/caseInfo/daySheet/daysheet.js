const chai = require('chai')
const chaiAsPromised = require('chai-as-promised')
const Op = require('sequelize').Op
const faker = require('faker')
const models = require('../../../../models')
const moment = require('moment')
chai.use(chaiAsPromised)
chai.should()
const { findOrCreateUser } = require('./../../helper')
const AgreementPropertyController = require('../../../../controllers/refactorControllers/agreementController/agreementPropertiesController')
const CemeteryDaySheetController = require('../../../../controllers/refactorControllers/daySheetController/cemeteryDaySheetController')
const SchedulingController = require('../../../../controllers/refactorControllers/schedulingController/schedulingController')
const {
  createAgreement,
  createLocationItems,
  createPerson,
  createProperties,
  createItemUsage,
  getPropertyIds,
  getAgreementLocationIds,
} = require('./../itemUsage/itemUsageHelper')

describe('Day Sheet Test Cases', () => {
  let personId
  let currentUser
  let agreementId
  let agreementSchema = {
    needType: 1,
    type: 2,
    locationId: 2
  }
  let merchandise = []
  let services = []

  let propertyid
  let locationItems = {
    merchandises: [],
    services: [],
  }
  let cemeterySchedulingData = {
    personId: 1,
    itemUsageId: 2,
    intermentInformationDetails: {
      id: 0,
      propertyId: 0,
      beginningTime: moment().add(1,'days').set({ hour: 7, minute: 0 }),
      endingTime: moment().add(1,'days').set({ hour: 11, minute: 0 }),
      temporaryBurialLocationId: 0,
      temporaryDisintermentLocationId: 0,
      memorialInformation: 'memorialinfo',
      isPreburied: true
    },
    intermentRequestDetails: {
      isWitnessLoweringOrEntombment: false,
      isWitnessCoveringOrSealings: false,
      isWitnessFilling: false,
      isReopenBottom: false,
      isBurningPot: false,
      isMoundOfDirtByFootend: false,
      isUseOfTent: false,
      isPlaceAndNotify: false,
      isReopenTop: false
    },
    disintermentInformationDetails: {
      propertyId: 0,
      beginningTime: moment().add(1,'days').set({ hour: 7, minute: 0 }),
      endingTime: moment().add(1,'days').set({ hour: 11, minute: 0 }),
      disintermentReason: '',
      disintermentType: '',
      instruction: ''
    },
    casketDetails: {
      isOutSideCasket: false,
      casketId: null,
      resourceType: null,
      casketType: ''
    },
    vaultDetails: {
      isVaultFromDisinterment: false,
      vaultId: null,
      resourceType: null,
      disinteredVaultDetails: ''
    },
    urnInformationDetails: {
      isFamilyOwnedUrn: false,
      urnId: null,
      resourceType: null,
      height: '',
      width: '',
      depth: '',
      urnType: 2,
      urnStatus: '',
      receivedDate: null,
      isTransferRequired: false
    },
    merchandiseAdditionalInfoDetails: {
      isVasesSelected: false,
      noOfVases: 0,
      instruction: ''
    },
    genericDetails: {
      isLocationVerifiedWithFamily: false,
      isLocationVerifiedWithPlattedRecord: false,
      isElectronicCIF: false,
      reviewedTrustStatement: false,
      confirmedExpectedMerchandiseDelivery: false,
      confirmedPlacementScheduleWithFuneralDirector: false,
      isPermitted: false,
      isWitnessedCremation: false,
      noOfWitness: 0,
      instruction: ''
    },
    funeralArrangementDetails: {
      clFacilityLocationId: null,
      serviceLocationId: null,
      funeralHomePhone: '',
      phone: '',
      funeralDirectorId: null,
      instruction: '',
      funeralArrangementSectionLocations: [
        {
          id: 0,
          type: 'viewing',
          location: 'asss',
          startTime: null,
          endTime: null
        }
      ]
    },
    notesFromFamily: [],
    notesFromStaff: []
  }
  const cemetersSubServices = {
    'Interment Information': 'intermentInformationDetails',
    'Interment Request': 'intermentRequestDetails',
    Vault: 'vaultDetails',
    Casket: 'casketDetails',
    'Urn Information': 'urnInformationDetails',
    'Additional Information': 'merchandiseAdditionalInfoDetails',
    Generic: 'genericDetails',
    'Funeral Arrangement Details': 'funeralArrangementDetails',
    'Notes from Family': 'notesFromFamily',
    'Notes from Staff': 'notesFromStaff'
  }
  let cemeteryScheduling = {}
  before(async () => {
    currentUser = await findOrCreateUser()
    personId = await createPerson()
    await models.AgreementProperty.destroy({
      where: {
        propertyid: { [Op.in]: [766, 668, 843, 399] }
      }
    })
    propertyid = faker.random.arrayElement(
      await getPropertyIds('Hill Side', 'Companion Grave')
    )
    agreementId = await createAgreement(personId, agreementSchema)
    await createProperties(agreementId, propertyid, currentUser)
    locationItems.services = await getAgreementLocationIds(
      agreementId,
      4,
      "CLcrinf"
    )
    locationItems.merchandises = await getAgreementLocationIds(agreementId, 3)
    services.push(
      await createLocationItems(
        agreementId,
        faker.random.arrayElement(locationItems.services),
        currentUser.id
      )
    )
    merchandise.push(
      await createLocationItems(
        agreementId,
        faker.random.arrayElement(locationItems.merchandises),
        currentUser.id
      )
    )
    let itemUsageBody = {
      resourceType: 'Services',
      resourceId: faker.random.arrayElement(services),
      isDeleted: false,
      createdBy: currentUser.id
    }
    const itemUsage = await createItemUsage(personId, itemUsageBody)
    itemUsageId = itemUsage.itemUsageId
    const fieldsSections = await SchedulingController.getFieldsForSchedulingService(
      null,
      null,
      null,
      itemUsage.itemUsageId
    )
    fieldsSections.map(fields => {
      if (cemetersSubServices[fields.section]) {
        cemeteryScheduling[cemetersSubServices[fields.section]] =
          cemeterySchedulingData[cemetersSubServices[fields.section]]
      }
    })
    cemeteryScheduling.personId = personId
    cemeteryScheduling.itemUsageId = itemUsageId
  })

  describe('cemetery day sheet details', async () => {
    it('Should return empty array within the given range', async ()=>{
      let fromDate = moment().set({ hour: 21, minute: 0 }).format()
      let toDate = moment().set({ hour: 22, minute: 0 }).format()
      let locations = [2]
      let res = await CemeteryDaySheetController.getCemeteryDaySheet(fromDate, toDate, locations, true, 1, 10)
      res.should.have.property('count').and.to.be.equal(0)
    })

    it('Should return records within the given range', async ()=>{
      const schedulingData  = Object.assign({},cemeteryScheduling)
      const schedulingController = new SchedulingController();
      await schedulingController.createOrUpdateScheduledCemeteryService(schedulingData)
      let fromDate = moment().add(1,'days').set({ hour: 1, minute: 0 }).format()
      let toDate = moment().add(1,'days').set({ hour: 20, minute: 0 }).format()
      let locations = [2]
      let res = await CemeteryDaySheetController.getCemeteryDaySheet(fromDate, toDate, locations, true, 1, 10)
      res.should.have.property('count').and.to.not.equal(0)
    })
  })

  describe('cemetery day sheet email sending', async () => {
    it('It should return error no schedulings are persent',async ()=>{
      try{
        let reqBody = {
          serviceFromDate:moment().set({ hour: 20, minute: 0 }).format(),
          serviceToDate:moment().set({ hour: 20, minute: 0 }).format(),
          locations:[2],
          timezone: moment.tz.guess(),
          agreementType: 'cemetery'
        }
        const result = await CemeteryDaySheetController.sendEmailDaySheet(reqBody)  
      } catch(error){
        error.should.have.property('message').and.to.be.equal('No Schedules found with in given from date, to date and locations')
      }
    })

    it('It should return success message of scheduling are present',async ()=>{ 
    let reqBody = {
      serviceFromDate:moment().add(1,'days').set({ hour: 1, minute: 0 }).format(),
      serviceToDate:moment().add(1,'days').set({ hour: 20, minute: 0 }).format(),
      locations:[2],
      timezone: moment.tz.guess(),
      agreementType: 'cemetery'
    }
   const result = await CemeteryDaySheetController.sendEmailDaySheet(reqBody,currentUser)  
   result.should.have.property('message').and.to.be.equal('Logged in user will receive email. If Not try after 5 minutes')
   })
  })

  after(async () => {
    const propertyController = new AgreementPropertyController(agreementId)
    await propertyController.releaseProperty(propertyid, currentUser)
    await models.ItemUsage.destroy({ where: { personId } })
  })
})
