const faker = require('faker')
const sinon = require('sinon')
const models = require('../../../models')
const {personSchema, addressSchema} = require('../schema')
const AgreementController = require('../../../controllers/refactorControllers/agreementController/agreementController')
const VerifiedPersonController  = require('../../../controllers/refactorControllers/personController/verifiedPersonController')
const PersonController = require('../../../controllers/refactorControllers/personController/personController')
const chai = require('chai')
const chaiAsPromised = require('chai-as-promised')
const MiscSalesController = require('../../../controllers/refactorControllers/miscSalesController/miscSalesController')
chai.use(chaiAsPromised);
const expect = chai.expect
chai.should()

const miscSalesSchema = {
    locationId: faker.random.number({ min:1, max: 5}),
    arrangerId: faker.random.number({ min: 1, max: 5}),
    requestFrom: faker.random.number({ min:1, max: 3})
}

const miscSalesDBResponse = {
    "count":1,
    "rows":[{
      "id": 19,
      "saleTypeId": null,
      "arrangerId": 1,
      "contractNumber": "2020CFS00007",
      "status": "Completed",
      "locationId": 2,
      "type": 3,
      "needType": 1,
      "totalPrice": 42284.38,
      "totalTax": 27.29,
      "totalPurchasePrice": 42311.67,
      "totalAdjustment": 0,
      "totalCashPrice": 42311.67,
      "totalPaid": 0,
      "due": 42311.67,
      "createdBy": 10,
      "updatedBy": 10,
      "createdAt": "2020-06-26T03:55:46.116Z",
      "updatedAt": "2020-06-26T07:48:54.082Z",
      "purchaser": {
        "id": 38,
        "agreementId": 19,
        "personId": 22,
        "isOwner": null,
        "relationId": 3,
        "roleId": 1,
        "createdBy": null,
        "updatedBy": null,
        "deletedBy": null,
        "deletedAt": null,
        "createdAt": "2020-06-26T07:42:47.551Z",
        "updatedAt": "2020-06-26T07:42:47.551Z",
        "person": {
          "id": 22,
          "aka": null,
          "suffix": null,
          "stripeCustomerId": null,
          "title": null,
          "prefix": "",
          "firstName": "test",
          "middleName": "new",
          "lastName": "purchaser",
          "maidenName": null,
          "phoneNumber": "0987654321",
          "secondaryPhoneNumber": null,
          "email": "keri@gmail.com",
          "gender": null,
          "maritalStatusId": null,
          "languageId": null,
          "addressPlaceId": 30,
          "birthPlaceId": null,
          "isVerified": true,
          "isAlive": true,
          "dateOfBirth": null,
          "createdBy": null,
          "updatedBy": null,
          "deletedBy": null,
          "deletedAt": null,
          "pictureUrl": null,
          "preferredFirstName": null,
          "preferredMiddleName": null,
          "preferredLastName": null,
          "createdAt": "2020-06-26T07:42:24.738Z",
          "updatedAt": "2020-06-26T07:42:28.611Z",
          "personVerificationDetails": {
            "id": 11,
            "personId": 22,
            "onePortalId": "CS-20200626-346768",
            "ssnLastFour": null,
            "ssnSalt": "c0dcbbe89d4d82fda4891c84b202e5a7",
            "yearsAtResidentialAddress": null,
            "verifiedAt": "2020-06-26T07:38:01.973Z",
            "verifiedBy": null,
            "lastTouchedAt": "2020-06-26T07:38:01.973Z",
            "createdAt": "2020-06-26T07:42:26.768Z",
            "updatedAt": "2020-06-26T07:42:26.768Z",
            "createdBy": null,
            "updatedBy": null
          }
        }
      }
    }]
  }
const miscSalesListResponse =  {
    "count": 1,
    "rows": [
        {
            "saleId": 19,
            "contractNumber": "2020CFS00007",
            "status": "Completed",
            "saleAmount": 42311.67,
            "due": 42311.67,
            "updatedAt": "2020-06-26T07:48:54.082Z",
            "purchaser": {
              "id": 38,
              "name": "test new purchaser",
              "opi": "CS-20200626-346768"
            }
        }
    ]
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

describe('Misc sales test cases', () => {
    let personId, createdPerson

    beforeEach(async () => {
        createdPerson = await createPerson(true, faker.random.boolean())
        personId = createdPerson.id
    })

    it('should throw an error if non existing personId is being added as the purchaser for miscSales', async () => {
        const reqBody = {
            ...miscSalesSchema,
            personId: faker.random.number()
        }
        await expect(MiscSalesController.createOrEditMiscSale(reqBody)).to.be.rejectedWith('PERSON_NOT_FOUND')
    })

    it('should throw an error if non verified person is being added as purchaser to the miscSale', async () => {
        const unverifiedPerson = await createPerson(false)
        const reqBody = {
            ...miscSalesSchema,
            personId: unverifiedPerson.id
        }
        await expect(MiscSalesController.createOrEditMiscSale(reqBody)).to.be.rejectedWith('PERSON_NOT_FOUND')
    })

    it('should throw an error saying invalid locationId if non existing locationId is sent', async () => {
        const reqBody = {
            ...miscSalesSchema,
            personId: personId
        }
        reqBody.locationId = faker.random.number()
        await expect(MiscSalesController.createOrEditMiscSale(reqBody)).to.be.rejectedWith('INVALID_LOCATION_ID')
    })

    it('should successfully create a miscSale with status as Pending and type as Misc sales', async () => {
        const reqBody = {
            ...miscSalesSchema,
            personId
        }
        const miscSale = await MiscSalesController.createOrEditMiscSale(reqBody)
        expect(miscSale).to.have.property('id').and.to.be.greaterThan(0)
        expect(miscSale).to.have.property('status').and.to.be.equal('Pending')
        expect(miscSale).to.have.property('type').and.to.be.equal(AgreementController.TYPES['Miscellaneous Sales'])
    })

    it('should list all miscSales records', async () => {
        sinon.stub(models.Agreement, 'findAndCountAll').callsFake(function () {
            return miscSalesDBResponse
        })

        const miscSaleList = await MiscSalesController.getListingOfMiscSales({
            search: 'CCS',
            salesStatus: 'Completed'
        },1);

        expect(miscSaleList).to.have.property('count').and.to.be.equal(1)
        expect(miscSaleList).to.be.deep.equal(miscSalesListResponse)
    })
})