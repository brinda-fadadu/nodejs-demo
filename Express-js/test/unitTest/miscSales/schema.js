const models = require('../../../models')
const { personSchema, addressSchema, financeSchema } = require('../schema')
const VerifiedPersonController = require('../../../controllers/refactorControllers/personController/verifiedPersonController')
const PersonController = require('../../../controllers/refactorControllers/personController/personController')
const faker = require('faker')
const WholeSaleCremationController = require('../../../controllers/refactorControllers/miscSalesController/wholeSalesController')

const partnersSchema = {
  partnerName: faker.random.word(),
  isActive: true,
  contact: {
    firstName: faker.name.firstName(),
    middleName: faker.name.lastName(),
    lastName: faker.name.lastName(),
    phoneNumber: faker.phone.phoneNumberFormat(1),
    email: faker.internet.email()
  },
  discountType: faker.random.arrayElement([1, 2]),
  discountValue: faker.random.number({ min: 10, max: 100 }),
  addressPlace: {
    address: {
      ...addressSchema()
    }
  }
}

const createNonVerifiedPerson = async ({ isAlive }) => {
  const personReqBody = {
    ...personSchema(),
    isAlive: isAlive
  }
  const nonVerifiedPerson = await PersonController.createOrUpdate(personReqBody)
  return nonVerifiedPerson.id
}

const createVerifiedPerson = async ({ isAlive }) => {
  const personReq = { ...personSchema(), isAlive: isAlive }
  const createdPerson = await PersonController.createOrUpdate(personReq)
  const personToVerify = new VerifiedPersonController(createdPerson.id)
  await personToVerify.verifyPerson(createdPerson)
  return createdPerson.id
}

const createDecedent = async () => {
  const decedentSchema = {
    person: {
      ...personSchema(),
      addressPlace: {
        address: {
          ...addressSchema()
        }
      }
    },
    referenceNumber: faker.random.number()
  }
  delete decedentSchema.person.isVerified
  decedentSchema.person.isAlive = false
  const decedent = await WholeSaleCremationController.createDecedents(
    decedentSchema
  )
  return decedent.id
}

const createPartner = async () => {
  const contactPerson = await PersonController.createOrUpdate(
    partnersSchema.contact
  )
  const reqBody = {
    ...partnersSchema,
    contactId: contactPerson.id
  }
  delete reqBody.contact
  const partner = await models.Partners.create(reqBody)
  return partner
}

const returnItemsForWholesale = async (type) => {
    const categories = await WholeSaleCremationController.getCategories(itemTypeId = 4)
    const category = categories.find(category => category.name === type)
    const locationItems = await models.LocationItem.findAll({
      where: {
        locationId: 2
      },
      include: [
        {
          model: models.Item,
          where: {
            itemCategoryId: category.id
          }
        }
      ]
    })
    return locationItems.map(item => item.id)
}
module.exports = {
    createNonVerifiedPerson,
    createVerifiedPerson,
    createDecedent,
    createPartner,
    returnItemsForWholesale
}