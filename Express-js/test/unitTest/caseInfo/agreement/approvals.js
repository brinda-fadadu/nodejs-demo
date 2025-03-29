const chai = require('chai')
const moment = require('moment')
const chaiAsPromised = require('chai-as-promised')
const faker = require('faker')
chai.use(chaiAsPromised)
chai.should()

const ApprovalsController = require('../../../../controllers/refactorControllers/adjustmentController/approvalsController')

describe('Adjustments Approvals Controller', () => {
  before(async () => {})

  it('Get list of other discounts and adjustments', async () => {
    listOfAdjustments = await ApprovalsController.getListOfApprovals({})
    listOfAdjustments.should.be.an('object')
    listOfAdjustments.should.have.property('count').and.to.be.equal(1)
    listOfAdjustments.should.have
      .property('rows')
      .and.to.be.an('array')
      .of.length(1)
  })
})
