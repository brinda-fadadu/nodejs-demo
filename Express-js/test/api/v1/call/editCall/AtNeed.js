const {
    chai,
    server,
    expect,
    addTestUser,
    genAuthToken,
    getCities,
    getStates,
    getLanguages,
    getRelations,
    getAddressTypes,
    getCountries,
    getOrganizationTypes
} = require('../../../../helper')  //Please change the helper path if required

const moment = require('moment')
const faker = require('faker')
const _ = require('underscore')
const {getCallData,createCallData,getCallDataById,getEditCallDataAtNeed} = require('../../../../schema/call') 	// Please check this path from your file path

let editCallData,resultCall, identifier, call, organizationTypes,cities,states,countries,addressTypes

describe('Writing test cases on Some one passed reasons edit', async () => {

    before(async () => {
        
        const user = await addTestUser();
        const callData =await getCallData();    //Example for how to get data to insert a call. 
        callData.call.userId = user.id;
        
        resultCall = await createCallData(callData.call);        
        identifier = resultCall.Identifier;
        
        
        const authToken = await genAuthToken(user);   

        organizationTypes = await getOrganizationTypes();
        cities = await getCities();
        states = await getStates()
        countries = await getCountries();
        addressTypes = await getAddressTypes();
        return true;
        

    })

    after(async () => { 

        /*Write code that need to run after test suite*/

    })

    beforeEach(async () => {                
        call = await getCallDataById(identifier)        
        editCallData = await getEditCallDataAtNeed(call);        
        return true;
    })

    afterEach(async () => {

        /*Write code that need to need run after each test case*/   

    })

    it('Update Decedent first name and last name', async () => {
        const firstName = editCallData.call.caller.firstName +'_test';
        const lastName = editCallData.call.caller.lastName +'_test';

        
        editCallData.call.caller.firstName = firstName
        editCallData.call.caller.lastName = lastName 
        const res = await chai.request(server)
            .put('/api/v1/calls/'+identifier)
            .set('authorization',authToken)
            .send(editCallData);            
            res.body.call.caller.should.have.property('FirstName').and.to.be.equal(firstName);
            res.body.call.caller.should.have.property('LastName').and.to.be.equal(lastName);

    });

    it('Change location of remains details for each decedent', async () => {
        let organizations = [];

        editCallData.call.reason = editCallData.call.reason.map(reason => {            
                reason.locationOfRemain = {
                    id: reason.locationOfRemain.id,
                    name: faker.company.companyName(),
                    organizationTypeId: organizationTypes['Hospital'],
                    address:{
                        id: reason.locationOfRemain.address.id,
                        line1: faker.address.streetName(),
                        line2: faker.address.streetAddress(),
                        'city': faker.address.city(),
                        'state': faker.address.state(),
                        'county': faker.address.county(),
                        'country': faker.address.country(),
                        'zipcode': faker.address.zipCode(),
                        'addressTypeId': addressTypes['Organization']
                    }
                }                
                organizations.push(reason.locationOfRemain);
                return reason;
        })


        const res = await chai.request(server)
            .put('/api/v1/calls/'+identifier)
            .set('authorization', authToken)
            .send(editCallData);                
            res.body.call.someOneHasPassed.should.to.satisfy(ele => {
                let result = true;

                ele.forEach((individual,index) => {
                    if(individual.LocationOfRemain){
                        if(_.pluck(organizations,'name').indexOf(individual.LocationOfRemain.Name) == -1){                            
                            result = false
                        }
                    }else{
                        result = false
                    }
                })
                return result;                
            });
        });
     /* You can write more test cases from here */
})