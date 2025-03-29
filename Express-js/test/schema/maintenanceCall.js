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
    getOrganizationTypes,
    getMaintenanceTypes
} = require('../helper')
const moment = require('moment')
const faker = require('faker')
const _ = require('underscore')
let cities, states, languages, reqData, addressTypes,user,relations,organizationTypes, seedValues=false,maintenanceTypes
const {createCall} = require('../../controllers/Calls/CreateCall/create');
const {getCall} = require('../../controllers/Calls/CallInfo/getCall');
const {getCallerData,getBeneficiaryData,createCallData,getCallDataById} = require('./call');


async function getSeedValues(){
    // cities = await getCities()
    languages = await getLanguages()
    // states = await getStates()
    // countries = await getCountries()
    addressTypes = await getAddressTypes()
    user = await addTestUser()
    relations = await getRelations()
    organizationTypes = await getOrganizationTypes()
    authToken = genAuthToken(user);
    maintenanceTypes = await getMaintenanceTypes()    
    seedValues = true;
}

exports.getMaintenanceCallData = async function(){

    if(!seedValues){
        await getSeedValues()
    }
    let reqData = {
      call:{
        'callType': 'Call',
        'caller': await getCallerData(),
        'callStatus':1,
        'appointmentDateTime': moment().add(1, 'day').format(),
        'note':[{
            "content": "Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.",
            "resourceType": "Call",
            "createdAt": moment().format()
        },{
            "content": "Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.",
            "resourceType": "Call",
            "createdAt": moment().format()
        }],
        'reasonNote': [{
            "content": "Loremmnbmnb ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.",
            "resourceType": "CallReason",
            "createdAt": moment().format()
        }],
        'assignedToId': user.id,
        'callReceivedLocationId': 1,
        'isCallFromOrganization': true,
        'reasonTypeId': 3        
    }
}

reqData.call.reason = [{
    "graveMarkerLocation": faker.random.word(),
    "serviceLocation": faker.random.word(),
    "reasons": [
        maintenanceTypes['Monument & Marker'],
        maintenanceTypes['Mowing & Trimming'],
        maintenanceTypes['Plants & Trees']
    ]
}]

return reqData
}

exports.getMaintenanceEditCallData = async function(data){
    let reqData = {
        "call": {
            "id": data.id,
            "callType": data.type,
            "caller": {
                "id": data.caller.id,
                "prefix": data.caller.prefix,
                "firstName": data.caller.firstName,
                "lastName": data.caller.lastName,
                "middleName": data.caller.middleName,
                "phone": data.caller.phoneNumber,
                "email": data.caller.email,
                "languageId": data.caller.languageId
            },
            "appointmentDateTime": moment(data.appointmentDateTime),
            "note": [{}],
            "reasonNote": [{}],
            "assignedToId": data.assignedTo,
            "callReceivedLocationId": data.receivedLocationId,
            "isCallFromOrganization": data.isCallFromOrganization,
            "callStatus": data.callStatus,
            "reasonTypeId": data.reason
        }
    }
    reqData.call.reason = []

    data.maintenanceRequestReason.forEach(ele => {
        reqData.call.reason.push({
            "id": ele.id,
			"serviceLocation": ele.GraveMarkerLocation,
			"graveMarkerLocation": ele.ServiceLocation,
			"reasons": _.pluck(ele.maintenanceRequestReasonType,'MaintenanceReasonTypeId')
        })
    })

    return reqData
}