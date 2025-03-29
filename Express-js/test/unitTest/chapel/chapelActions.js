
const chai = require('chai')
const moment = require('moment')
const chaiAsPromised = require('chai-as-promised')
const faker = require('faker')
chai.use(chaiAsPromised);
chai.should();

const ChapelController = require('../../../controllers/refactorControllers/chapelController/chapelController')

describe('Chapel Controller', () => {
    describe('Get list of chapels', async () => {
        it('Return error saying chapel type is required', async () => {
            try {
                await ChapelController.getListOfChapels()
            } catch (err) {
                err.should.have.property('message').and.to.be.equal('CHAPEL_TYPE_IS_REQUIRED')
            }
        })

        it('Return error saying chapels not found', async () => {
            try {
                await ChapelController.getListOfChapels({chapelType: 'abcd'})
            } catch (err) {
                err.should.have.property('message').and.to.be.equal('CHAPELS_NOT_FOUND_FOR_GIVEN_CHAPELTYPE_OR_LOCATION_ID')
            }
        })

        it('should return result for chapel type chapel', async () => {
            const result = await ChapelController.getListOfChapels({chapelType: 'chapel'})
            result.should.be.an('array').of.length(16)
        })

        it('should return result for chapel type crematory', async () => {
            const result = await ChapelController.getListOfChapels({chapelType: 'crematory'})
            result.should.be.an('array').of.length(2)
        })

        it('should return empty result for chapel type chapel with locationId 1', async () => {
            try {
                await ChapelController.getListOfChapels({chapelType: 'chapel', locationId: 1})
            } catch (err) {
                err.should.have.property('message').and.to.be.equal('CHAPELS_NOT_FOUND_FOR_GIVEN_CHAPELTYPE_OR_LOCATION_ID')
            }
        })

        it('should return result for chapel type chapel with locationId 2', async () => {
            const result = await ChapelController.getListOfChapels({chapelType: 'chapel', locationId: 2})
            result.should.be.an('array').of.length(9)
        })

        it('should return result for chapel type chapel with locationId 2 and chapel id as 1', async () => {
            const result = await ChapelController.getListOfChapels({chapelType: 'chapel', locationId: 2, chapelId: 1})
            result.should.be.an('array').of.length(1)
        })
    })

    describe('Get availability of chapel', async () => {
        it('Return error saying chapel type is required', async () => {
            try {
                await ChapelController.getAvailabilityOfChapel()
            } catch (err) {
                err.should.have.property('message').and.to.be.equal('REQUIRED_PARAMETERS_MISSING')
            }
        })
        it('Return result', async () => {
            const result = await ChapelController.getAvailabilityOfChapel({chapelId: 1, chapelDate: new Date(), startTime: new Date(), endTime: new Date()})
            result.should.have.property('availability').and.to.equal(true)
        })
    })
})
