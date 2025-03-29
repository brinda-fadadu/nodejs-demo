const {
    chai,
    server,
    expect,
    addTestUser,
    genAuthToken
} = require("../../../helper")

let authToken, anReqBody, pnReqBody, mReqBody, gReqBody, oReqBody

describe('edit call test case', () => {
    before(async () => {
        const user = await addTestUser()
        authToken = genAuthToken(user);
        return
    })

    //finding the call
    it('should respond with call not found', async function () {
        const res = await chai.request(server)
            .put('/api/v1/calls?callId=10')
            .set("authorization", authToken)
        res.body.should.have.property('message').and.to.be.equal('Call not found')
        res.body.should.have.property('success').and.to.be.equal(false);
    })

    it('should return error message if the token is not present', async function () {
        const res = await chai.request(server)
            .put(`/api/v1/calls?callId=90`)
            .set("authorization", "")
        res.body.should.have.property('message').and.to.be.equal("Token not found");
    })


    //test case condition for AN case
    anReqBody = {
        caller : {
            prefix : "MR",
            firstName : "edit",
            middleName : "james",
            lastName : "potter",
            phone : "7364234",
            email : "harrypotter@gmail.com",
            note : {
                Content : "update from harry qwhemdgw"
            }
        },
        appointmentDateAndTime : "11/11/2018",
        status : "1",
        assignToId : "2",
        reason : {
            prefix : "mr",
            firstName : "edit",
            middleName : "edit",
            lastName : "1",
            dateOfBirth : "11/11/2018",
            relation : "3",
            note : {
                Content : "update edit panda qwehgd"
            },
            isReadyForPickUp : "false",
            preNeedFuneralInfo : "kqjwehdgqwbend",
            locationOfRemainId : "2",
            relationId : "2",
            isNok : "false",
            faaEmail : "panda@gmail.com"
        },
        informant : {
            prefix : "MR",
            firstName : "edit",
            middleName : "james",
            lastName : "potter",
            relation : "2",
            emial : "james@gamil.com",
            phone : "7364235"
        }
    }
    it('should respond with the updated call data for AN case', async function () {
        const res = await chai.request(server)
            .put('/api/v1/calls?callId=82')
            .set("authorization", authToken)
            .send(anReqBody)
        res.body.should.have.property('success').and.to.be.equal(true);
        res.body.should.have.property('call').and.to.be.a('object');
    })

    //test case condition for PN case
    pnReqBody = {
        caller : {
            prefix : "MR",
            firstName : "harry1",
            middleName : "edit",
            lastName : "potter",
            phone : "7364234",
            email : "harrypotter@gmail.com",
            note : {
                Content : "update from harry"
            }
        },
        appointmentDateAndTime : "11/11/2018",
        status : "4",
        assignToId : "2",
        reason : {
            prefix : "mr",
            firstName : "edit1",
            middleName : "edit",
            lastName : "1",
            dateOfBirth : "11/11/2018",
            relation : "3",
            note : {
                Content : "update edit panda"
            },
            requiredServices : "funeral",
            existingPN : true,
            preNeedFuneralInfo : "pre need funeral",
            preNeedCemetryInfo : "pre need cemetery "
        }
    }

    it('should respond with the updated call data for PN case', async function () {
        const res = await chai.request(server)
            .put('/api/v1/calls?callId=64')
            .set("authorization", authToken)
            .send(pnReqBody)
        res.body.should.have.property('success').and.to.be.equal(true);
        res.body.should.have.property('call').and.to.be.a('object');
    })

    //test case condition for Maintenance request
    mReqBody = {
        caller : {
            prefix : "MR",
            firstName : "lilly",
            middleName : "james",
            lastName : "potter",
            phone : "7364234",
            email : "harrypotter@gmail.com"
        },
        appointmentDateAndTime : "11/11/2018",
        status : "2",
        assignToId : "2",
        reason : {
            LocationId:2,
            MaintenanceTypes:[1,4],
            note : {
                Content : "update edit panda"
            }
        }
    }
    it('should respond with the updated call data for Maintenance request case', async function () {
        const res = await chai.request(server)
            .put('/api/v1/calls?callId=65')
            .set("authorization", authToken)
            .send(mReqBody)
        res.body.should.have.property('success').and.to.be.equal(true);
        res.body.should.have.property('call').and.to.be.a('object');
    })

    //test case condition for Geneology search request
    gReqBody = {
        caller : {
            prefix : "MR",
            firstName : "lilly",
            middleName : "james",
            lastName : "potter",
            phone : "7364234",
            email : "harrypotter@gmail.com",
            note : {
                Content : "update from harry"
            }
        },
        appointmentDateAndTime : "11/11/2018",
        status : "2",
        assignToId : "2",
        reason : {
            prefix : "mr",
            firstName : "panda",
            middleName : "edit",
            lastName : "1",
            dateOfBirth : "11/11/2018",
            relation : "3",
            note : {
                Content : "update edit panda"
            }
        }
    }
    it('should respond with the updated call data for Geneology request case', async function () {
        const res = await chai.request(server)
            .put('/api/v1/calls?callId=66')
            .set("authorization", authToken)
            .send(mReqBody)
        res.body.should.have.property('success').and.to.be.equal(true);
        res.body.should.have.property('call').and.to.be.a('object');
    })

    //test case condition for other enquires case
    oReqBody = {
        caller : {
            prefix : "MR",
            firstName : "petter",
            middleName : "enquery",
            lastName : "potter",
            phone : "7364234",
            email : "harrypotter@gmail.com",
            note : {
                Content : "update from harry"
            }
        },
        appointmentDateAndTime : "11/11/2018",
        status : "3",
        assignToId : "2",
        reason : {
            isFollowUpRequired:true,
            note:{
                Content:"Hi I am one two three"
            },
            emailContact:"wal@gmail.com",
            otherReasonFollowUps:[3,4,5, 6]
        }
    }
    it('should respond with the updated call data for other enquires case', async function () {
        const res = await chai.request(server)
            .put('/api/v1/calls?callId=67')
            .set("authorization", authToken)
            .send(mReqBody)
        res.body.should.have.property('success').and.to.be.equal(true);
        res.body.should.have.property('call').and.to.be.a('object');
    })
})
