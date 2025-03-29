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
const getCallData = require('./schema/call') 	// Please check this path from your file path

describe(, async () => {

    before(async () => {

         const callData =await getCallData()    //Example for how to get data to insert a call. 
//Creating a call through  controller highly suggested to seed data creation

        /*Write code that need to run before test suite*/

    })

    after(async () => { 

        /*Write code that need to run after test suite*/

    })

    beforeEach(async () => {

        /*Write code that need to need run before each test case*/

    })

    afterEach(async () => {

        /*Write code that need to need run after each test case*/

    })

    it(/*Write test case name here in string*/, async () => {

    })

     /* You can write more test cases from here */
})  