const {
	chai,
	server,
	addTestUser,
	genAuthToken,
    getCallReasonTypes
} = require('../../../../helper')
const faker = require('faker')
const moment = require('moment')
const { getCallData } = require('../../../../schema/call')
let authToken, reqData, reasonTypes;

async function apiCall() {
	return chai.request(server)
	.post('/api/v1/calls')
	.set('authorization', authToken)
	.send(reqData)
}

async function callerTest(reasonTypeId = 1) {
	describe('Test Caller object', function () {
		before(async () => {
			const user = await addTestUser()
			authToken = genAuthToken(user);
			reqData = await getCallData(reasonTypeId)
			reasonTypes = getCallReasonTypes()        
			return
		})

		this.beforeEach(async () => {
			reqData = await getCallData(reasonTypeId)
		})

		it('should return Token not found response without sending the authToken', async () => {
			const res = await chai.request(server)
				.post('/api/v1/calls')
				.set('authorization', '')
				.send(reqData)
			res.should.have.status(401);
		})

		it('should return validation error as phone number should be of length 10 for phone', async () => {
			reqData.call.caller.phone = '123456789'
			const res = await apiCall()
			res.should.have.status(422)
			res.body.should.have.property('message').and.to.be.equal('Enter a valid phoneNumber of length 10')
		})

		it('should return assignedTo user is not found', async () => {
			reqData.call.assignedToId = faker.random.number({ min: 30 })
			const res = await apiCall()
			res.should.have.status(422);
			res.body.should.have.property('message').and.to.be.equal(`Assign an existing userId`)
		})

		it('should return callType is not found', async () => {
			reqData.call.callType = faker.random.word()
			const res = await apiCall()
			res.should.have.status(422);
			res.body.should.have.property('message').and.to.be.equal(`Enter a callType of either Call or WalkIn`)
		})

		it('should return an error saying reasonType id is not found', async () => {
			reqData.call.reasonTypeId = reasonTypes.length + 1
			const res = await apiCall()
			res.should.have.status(422);
			res.body.should.have.property('message').and.to.be.equal(`Give a valid Reason Id for the call`)
		})

		it('should respond with an error saying reasonType id is required', async () => {
			delete reqData.call.reasonTypeId
			const res = await apiCall()
			res.should.have.status(422);
			res.body.should.have.property('message').and.to.be.equal('Give a valid Reason Id for the call')
		})

		it('should respond with an error saying call status is invalid', async () => {
			reqData.call.callStatus = faker.random.number({ min: 100 })
			const res = await apiCall()
			res.should.have.status(422);
			res.body.should.have.property('message').and.to.be.equal('Enter a valid Call status')
		})

		it('should respond with an error saying note must be an array', async () => {
			reqData.call.note = "test"
			const res = await apiCall()
			res.should.have.status(422);
			res.body.should.have.property('message').and.to.be.equal('child "call" fails because [child "note" fails because ["note" must be an array]]')
		})

		it('should respond with an error saying reason note must be an array', async () => {
			reqData.call.reasonNote = "test"
			const res = await apiCall()
			res.should.have.status(422);
			res.body.should.have.property('message').and.to.be.equal('child "call" fails because [child "reasonNote" fails because ["reasonNote" must be an array]]')
		})

		it('should respond with a status 422 because of the resonType and reason object mismatch', async () => {
			reqData.call.reasonTypeId = faker.random.number({ min: 10 })
			const res = await apiCall()
			res.should.have.status(422);
		})

		it('should respond with and error saying caller firstName is required', async () => {
			reqData.call.caller.firstName = ""
			const res = await apiCall()
			res.should.have.status(422);
			res.body.should.have.property('message').and.to.be.equal(`First Name is required`)
		})

		it('should respond with an error saying that appointment date should be in future', async () => {
			reqData.call.appointmentDateTime = moment().format('MM/DD/YYYY HH:mm')
			const res = await apiCall()
			res.should.have.status(422);
			res.body.should.have.property('message').and.to.be.equal(`Appointment Date must be greater than your current date and time.`)
		})

		it ('should respond with an error saying that the caller language id is not found', async () => {
			reqData.call.caller.languageId = faker.random.number({ min: 50 })
			const res = await apiCall()
			res.should.have.status(422);
		})

		it('should respond with an error saying that email validation is failed for caller email', async () => {
			reqData.call.caller.email = faker.name.firstName()
			const res = await apiCall()
			res.should.have.status(422);
			res.body.should.have.property('message').and.to.be.equal(`Enter a valid Email address`)
		})

		it('should respond with error message if we pass callReceivedLocationId which is not present in database', async () => {
			reqData.call.callReceivedLocationId = faker.random.number({ min: 30 })
			const res = await apiCall()
			res.should.have.status(422);
			res.body.should.have.property('message').and.to.be.equal('Enter a valid Call Received Location')
		})

	});

	describe('Test Caller with isCallFromOrganisation true', () => {
		beforeEach(async () => {
			reqData = await getCallData(reasonTypeId, true)
		})
		
		it('should respond with an error saying that line1 validation is failed', async () => {
			reqData.call.caller.organization.address.line1 = faker.random.number()
			const res = await apiCall()
			res.should.have.status(422);
			res.body.should.have.property('message').and.to.be.equal('Line1 should be string')
		})

		it('should respond with an error saying that line2 validation is failed', async () => {
			reqData.call.caller.organization.address.line2 = faker.random.number()
			const res = await apiCall()
			res.should.have.status(422);
			res.body.should.have.property('message').and.to.be.equal('Line2 should be string')
		})

		it('should respond with an error saying that apartment validation is failed', async () => {
			reqData.call.caller.organization.address.apt = faker.random.number()
			const res = await apiCall()
			res.should.have.status(422);
			res.body.should.have.property('message').and.to.be.equal('Apartment should be string')
		})

		it('should respond with an error saying that city validation is failed', async () => {
			reqData.call.caller.organization.address.city = faker.random.number()
			const res = await apiCall()
			res.should.have.status(422);
			res.body.should.have.property('message').and.to.be.equal('City should be string')
		})

		it('should respond with an error saying that state validation is failed', async () => {
			reqData.call.caller.organization.address.state = faker.random.number()
			const res = await apiCall()
			res.should.have.status(422);
			res.body.should.have.property('message').and.to.be.equal('State should be string')
		})

		it('should respond with an error saying that country validation is failed', async () => {
			reqData.call.caller.organization.address.country = faker.random.number()
			const res = await apiCall()
			res.should.have.status(422);
			res.body.should.have.property('message').and.to.be.equal('Country should be string')
		})

		it('should respond with an error saying that county validation is failed', async () => {
			reqData.call.caller.organization.address.county = faker.random.number()
			const res = await apiCall()
			res.should.have.status(422);
			res.body.should.have.property('message').and.to.be.equal('County should be string')
		})

		it('should respond with an error saying that zipcode validation is failed', async () => {
			reqData.call.caller.organization.address.zipcode = faker.random.number()
			const res = await apiCall()
			res.should.have.status(422);
			res.body.should.have.property('message').and.to.be.equal('Zipcode should contain only numbers')
		})

		it('should respond with an error saying that addressTypeId validation is failed', async () => {
			reqData.call.caller.organization.address.addressTypeId = faker.random.number({ min: 50 })
			const res = await apiCall()
			res.should.have.status(422);
			res.body.should.have.property('message').and.to.be.equal('Address Type Id should be number')
		})

		it('should respond with an error saying that organizationTypeId validation is failed', async () => {
			reqData.call.caller.organization.organizationTypeId = faker.random.number({ min: 50 })
			const res = await apiCall()
			res.should.have.status(422);
			res.body.should.have.property('message')
		})

		it('should respond with an error saying that organization phoneNumber validation is failed', async () => {
			reqData.call.caller.organization.phoneNumber = faker.random.number({ min: 50 })
			const res = await apiCall()
			res.should.have.status(422);
			res.body.should.have.property('message')
		})

		it('should respond with an error saying that organization name validation is failed', async () => {
			reqData.call.caller.organization.name = faker.random.number({ min: 50 })
			const res = await apiCall()
			res.should.have.status(422);
			res.body.should.have.property('message')
		})

	})

	describe('Test Caller with isCallFromOrganisation false', () => {
		beforeEach(async () => {
			reqData = await getCallData(reasonTypeId, false)
		})
		
		it('should respond with an error saying that line1 validation is failed', async () => {
			reqData.call.caller.address.line1 = faker.random.number()
			const res = await apiCall()
			res.should.have.status(422);
			res.body.should.have.property('message').and.to.be.equal('Line1 should be string')
		})

		it('should respond with an error saying that line2 validation is failed', async () => {
			reqData.call.caller.address.line2 = faker.random.number()
			const res = await apiCall()
			res.should.have.status(422);
			res.body.should.have.property('message').and.to.be.equal('Line2 should be string')
		})

		it('should respond with an error saying that apartment validation is failed', async () => {
			reqData.call.caller.address.apt = faker.random.number()
			const res = await apiCall()
			res.should.have.status(422);
			res.body.should.have.property('message').and.to.be.equal('Apartment should be string')
		})

		it('should respond with an error saying that city validation is failed', async () => {
			reqData.call.caller.address.city = faker.random.number()
			const res = await apiCall()
			res.should.have.status(422);
			res.body.should.have.property('message').and.to.be.equal('City should be string')
		})

		it('should respond with an error saying that state validation is failed', async () => {
			reqData.call.caller.address.state = faker.random.number()
			const res = await apiCall()
			res.should.have.status(422);
			res.body.should.have.property('message').and.to.be.equal('State should be string')
		})

		it('should respond with an error saying that country validation is failed', async () => {
			reqData.call.caller.address.country = faker.random.number()
			const res = await apiCall()
			res.should.have.status(422);
			res.body.should.have.property('message').and.to.be.equal('Country should be string')
		})

		it('should respond with an error saying that county validation is failed', async () => {
			reqData.call.caller.address.county = faker.random.number()
			const res = await apiCall()
			res.should.have.status(422);
			res.body.should.have.property('message').and.to.be.equal('County should be string')
		})

		it('should respond with an error saying that zipcode validation is failed', async () => {
			reqData.call.caller.address.zipcode = faker.random.number()
			const res = await apiCall()
			res.should.have.status(422);
			res.body.should.have.property('message').and.to.be.equal('Zipcode should contain only numbers')
		})

		it('should respond with an error saying that addressTypeId validation is failed', async () => {
			reqData.call.caller.address.addressTypeId = faker.random.number({ min: 50 })
			const res = await apiCall()
			res.should.have.status(422);
			res.body.should.have.property('message').and.to.be.equal('Address Type Id should be number')
		})

	})
	

}

module.exports = exports = callerTest