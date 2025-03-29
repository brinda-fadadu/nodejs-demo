const {
    chai,
    server,
    expect,
    addTestUser,
    genAuthToken
} = require("../../../helper")

let authToken

describe('Update case test cases', () => {
    before(async () => {
        const user = await addTestUser()
        authToken = genAuthToken(user);
        return
    })

    it('should return error message if the token is not present', async function () {
        const res = await chai.request(server)
            .put('/api/v1/cases/1')
            .set("authorization", "")
            res.body.should.have.property('message').and.to.be.equal("Token not found");
    })

    it('should return error message if the case id is not passed', async function () {
        const res = await chai.request(server)
            .put('/api/v1/cases/')
            .set("authorization", authToken)
            res.body.should.have.property('error').and.to.be.equal("Case Id not provided");
    })

    it('should return error message if the case id is passed and it is a string', async function () {
        const res = await chai.request(server)
            .put('/api/v1/cases/abcd')
            .set("authorization", authToken)
            res.body.should.have.property('error').and.to.be.equal("Case Id not provided");
    })

    it('should return error message if a case id is passed but it is not present in database', async function () {
        const res = await chai.request(server)
            .put('/api/v1/cases/100')
            .set("authorization", authToken)
        res.body.should.have.property('error').and.to.be.equal('Case information not found')
    })


    let updateObj = {
        Identity: {
          id: 1,
          PersonalDetails: {
            id: 2,
            Prefix: "steve3",
            FirstName: "steve1",
            LastName: "smith1",
            MiddleName: "hawking1",
            Email: "steve@gmail.com",
            Phone: "123456",
            LicenseNumber: "123456789",
            SSN: "334455"
          },
          PlaceOfDeathType: "string123",
          PlaceOfBirthType: "string456",
          Type: "Decedent",
          BirthState: {
            id: 5,
            Name: "California"
          },
          BirthCountry: {
            id: 1,
            Name: "United States"
          },
          DeathState: {
            id: 6,
            Name: "Colorado"
          },
          DeathCountry: {
            id: 1,
            Name: "United States"
          },
          PlaceOfDeathId: null,
          PlaceOfBirthId: null
        },
        Certifier: {
          id: 1,
          Prefix: "MR",
          FirstName: "steve23",
          LastName: "Test2",
          SSN: "1111",
          LicenseNumber: "22222"
        },
        Contacts: [
              {
                  id: 1,
                  ContactType: "1234",
                  PrimaryContact: "test",
                  SecondaryContact: "test",
                  Source: {
                      id: 1,
                      Prefix: "MR",
                      FirstName: "stevec",
                      LastName: "Testc",
                      SSN: null,
                      LicenseNumber: null
                  }
              },
              {
                  id: 2,
                  ContactType: "456",
                  PrimaryContact: "test",
                  SecondaryContact: "test",
                  OrganizationId: 1,
                  RoleId: 1,
                  Source: {
                      id: 1,
                      Prefix: "MR",
                      FirstName: "stevecrr1",
                      LastName: "Testc",
                      SSN: null,
                      LicenseNumber: null
                  }
              }
          ],
        ArrangerId: 0,
        RecorderId: 0
      }

    it('should return success message if a valid case id is passed', async function () {
        const res = await chai.request(server)
            .put('/api/v1/cases/1')
            .set("authorization", authToken)
            .send(updateObj)
            res.body.should.have.property('success').and.to.be.equal(true);
            res.body.should.have.property('data').and.to.be.an("object");
    })
})