const {
    addTestUser,
    genAuthToken,
    getLanguages,
    getRelations,
    getAddressTypes,
    getMaintenanceTypes,
    getOrganizationTypes
} = require('../helper')
const moment = require('moment')
const faker = require('faker')
const _ = require('underscore')
let languages, reqData, maintenanceTypes, addressTypes, user, relations, organizationTypes, seedValues = false
const {createCall} = require('../../controllers/Calls/CreateCall/create');
const {getCall} = require('../../controllers/Calls/CallInfo/getCall');


async function getSeedValues(){
    user = await addTestUser()
    authToken = genAuthToken(user); 
    languages = await getLanguages()
    relations = await getRelations()
    seedValues = true;
    addressTypes = await getAddressTypes()        
    maintenanceTypes = await getMaintenanceTypes()
    organizationTypes = await getOrganizationTypes()
}

async function getOrganizationData(){
    if(!seedValues){
        await getSeedValues();
    }
    return {
        'name': faker.company.companyName(),
        'organizationTypeId': organizationTypes['Hospital'],
        'address': addressGenerator()
    }
}

function addressGenerator() {
    return {
        'line1': faker.address.streetName(),
        'line2': faker.address.streetAddress(),
        'city': faker.address.city(),
        'state': faker.address.state(),
        'county': faker.address.county(),
        'country': faker.hacker.noun(),
        'zipcode': '32323',
        'addressTypeId': addressTypes ? addressTypes['Residential'] : faker.random.number({ min: 1, max: 2 })
    }
}

exports.getCallerData = async function(isCallFromOrganization = true){

    if(!seedValues){
        await getSeedValues();
    }
    const result = {
        'prefix': faker.name.prefix(),
        'firstName': faker.name.firstName(),
        'lastName': faker.name.lastName(),
        'middleName': faker.name.findName(),
        'phone': faker.phone.phoneNumberFormat(1),
        'email': faker.internet.email(),
        'languageId': languages['English'],                    
    }
    if (isCallFromOrganization) {
        result.organization = await getOrganizationData()
    } else {
        result.address = addressGenerator()
    }
    return result
}


exports.getBeneficiaryData = async function(){
    if(!seedValues){
        await getSeedValues();
    }
    return {
        "isSelf": false,
        "prefix": faker.name.prefix(),
        "firstName": faker.name.firstName(),
        "lastName": faker.name.lastName(),
        "middleName": faker.name.findName(),
        "dateOfBirth":  moment().subtract(60, 'year').format(),
        "relationshipId": relations['Aunt']
    }
}

exports.getCallData = async function(reasonTypeId = 1, isCallFromOrganization = true){
        const call = this;
        if(!seedValues){
            await getSeedValues();
        }
        reqData = {
            'call': {
                'callType': 'Call',
                'caller': await exports.getCallerData(isCallFromOrganization),
                'callStatus': 1,
                'appointmentDateTime': moment().add(1, 'day').format(),
                'note':[{
                    "content": faker.lorem.sentences(),
                    "resourceType": "Call",
                    "createdAt": moment().format()
                },{
                    "content": faker.lorem.sentences(),
                    "resourceType": "Call",
                    "createdAt": moment().format()
                }],
                'reasonNote': [{
                    "content": faker.lorem.sentences(),
                    "resourceType": "CallReason",
                    "createdAt": moment().format()
                }],
                'assignedToId': user.id,
                'callReceivedLocationId': 1,
                'isCallFromOrganization': isCallFromOrganization,
                'reasonTypeId': reasonTypeId, 
                'reason': reasonSelector(reasonTypeId)
            }
        }        
        return reqData;
}


exports.createCallData = async function(data){

    const call = await createCall(data);
    return call;
   
}


exports.getCallDataById = async function(callId){
    try{
    const callData = await getCall(callId, 'json');
    return callData;
    }catch(err){
        console.log('Error::::');
        console.log(err);
    }
}

exports.getEditCallDataAtNeed = async function(data){
    

    const callData =  {
        "call": {
            "id": data.id,
            "callType": "Call",
            "caller": {
                "id": data.caller.id,
                "prefix": data.caller.Prefix,
                "firstName": data.caller.FirstName,
                "lastName": data.caller.LastName,
                "middleName": data.caller.MiddleName,
                "phone": data.caller.PhoneNumber,
                "email": data.caller.Email,
                "languageId": data.caller.LanguageId                
            },
            "appointmentDateTime": "2019-06-04T18:30:00.000Z",
            "note": [],
            "reasonNote": [{}],
            "assignedToId": 1,
            "callReceivedLocationId": 1,
            "isCallFromOrganization": false,
            "callStatus": 1,
            "reasonTypeId": 1,
            "personVerify": false            
        }
    }

    if(data.CallerAddress){
        callData.caller.address ={
            "id": data.CallerAddress.id,
            "line1": data.CallerAddress.line1,
            "line2": data.CallerAddress.line2,
            'city': data.CallerAddress.city,
            'state': data.CallerAddress.state,
            'county': data.CallerAddress.county,
            'country': data.CallerAddress.country,
            'zipcode': data.CallerAddress.zipcode,
        }
    }

    callData.call.reason = []

    data.someOneHasPassed.forEach(ele => {
        let reason = {
            id: ele.id,
            decedent:{
                firstName: ele.decedent.FirstName,
                lastName: ele.decedent.LirstName,
                middleName: ele.decedent.MiddleName,
                dateOfBirth: ele.decedent.DateOfBirth,
                dateOfDeath: ele.decedent.DateOfDeath,
                relationshipId: ele.CallerDecentRelationshipId
            },
            isReadyForPickup: ele.IsReadyForPickup,
            preNeedFuneralInfo: ele.FuneralHomeChoice,
            preNeedCemetryInfo: ele.CemeteryHomeChoice,
            isFuneralPN: ele.HaveFuneralPN,
            isCemeteryPN: ele.HaveCemetryPN,
            isNok: ele.NextOfKin,
            informantSameAsCaller: ele.InformantAsCaller
        }

        if(!ele.InformantAsCaller){
            reason.informant = {
                "id": 3,
                "prefix":ele.informant.Prefix,
                "firstName": ele.informant.FirstName,
                "middleName": ele.informant.MiddleName,
                "lastName": ele.informant.LastName,
                "email": ele.informant.Email,
                "phone": ele.informant.PhoneNumber,
                "relationshipId": ele.InformantRelationId
            }
        }

        if(ele.LocationOfRemain){
            reason.locationOfRemain = {
                id: ele.LocationOfRemain.id,
                organizationTypeId: ele.LocationOfRemain.OrganizationTypeId,
                name: ele.LocationOfRemain.Name,
                address:{
                    id: ele.LocationOfRemain.Address.id,
                    line1: ele.LocationOfRemain.Address.line1,
                    line2: ele.LocationOfRemain.Address.line2,
                    city: ele.LocationOfRemain.Address.city,
                    state: ele.LocationOfRemain.Address.state,
                    county: ele.LocationOfRemain.Address.county,
                    country: ele.LocationOfRemain.Address.country,
                    zipcode: ele.LocationOfRemain.Address.zipcode
                }

            }
        }
        callData.call.reason.push(reason);
    })


    return callData;
}

exports.getOrganizationData = getOrganizationData
exports.addressGenerator = addressGenerator




function reasonSelector(reasonTypeId) {
    switch (reasonTypeId) {
        case 1:
            return [
                {
                    'decedent': {
                        'prefix': faker.name.prefix(),
                        'firstName':faker.name.firstName(),
                        'lastName': faker.name.lastName(),
                        'middleName': faker.name.findName(),
                        'dateOfBirth': moment().subtract(60, 'year').format(),
                        'dateOfDeath': moment().subtract(1, 'day').format(),
                        'relationshipId': relations['Aunt']
                    },
                    'isReadyForPickup': true,
                    'locationOfRemainId': null,
                    'isLorSameAsCallerOrg': false,
                    'locationOfRemain': {
                        'name': faker.company.companyName(),
                        'organizationTypeId':1,
                        'address': addressGenerator()
                    },
                    'preNeedFuneralInfo': 'funeral',
                    'preNeedCemetryInfo': 'cemetry',
                    'isNok': true,
                    'informantSameAsCaller': false,
                    'informant': {
                        'prefix': faker.name.prefix(),
                        'firstName':faker.name.firstName(),
                        'lastName': faker.name.lastName(),
                        'middleName': faker.name.findName(),
                        'email': faker.internet.email(),
                        'phone': faker.phone.phoneNumberFormat(1),
                        'relationshipId': relations['Aunt']
                    },
                    'arrangerEmail': faker.internet.email(),
                    'requiredService': 'Funeral',
                    'isNok':true,
                    'informantSameAsCaller':false
                },
                {
                    'decedent': {                            
                        'prefix': faker.name.prefix(),
                        'firstName':faker.name.firstName(),
                        'lastName': faker.name.lastName(),
                        'middleName': faker.name.findName(),
                        'dateOfBirth': moment().subtract(70, 'year').format(),
                        'dateOfDeath': moment().subtract(1, 'day').format(),
                        'relationshipId': relations['Aunt']
                    },
                    'isReadyForPickup': true,
                    'locationOfRemainId': null,
                    'isLorSameAsCallerOrg': false,
                    'locationOfRemain': {
                        'address': addressGenerator()
                    },
                    'preNeedFuneralInfo': 'string',
                    'preNeedCemetryInfo': 'string',
                    'isNok': true,
                    'informantSameAsCaller': false,
                    'informant': {                            
                        'prefix': faker.name.prefix(),
                        'firstName':faker.name.firstName(),
                        'lastName': faker.name.lastName(),
                        'middleName': faker.name.findName(),
                        'email': faker.internet.email(),
                        'phone': faker.phone.phoneNumberFormat(1),
                        'relationshipId': relations['Aunt']
                    },
                    'arrangerEmail': faker.internet.email(),
                    'requiredService': 'Funeral',
                    'isNok':true,
                    'informantSameAsCaller':false
                }
            ]
        case 2:
            return [
                {
                    "beneficiary": {
                        "isSelf": true,
                        "prefix": "Mr",
                        "firstName": "jake",
                        "lastName": "peralta",
                        "middleName": "M",
                        "dateOfBirth": "2019-02-20T08:21:56.276Z",
                        "relationshipId": 1
                    },
                    "needFuneralService": true,
                    "needCemetryService": true,
                    "isExistingPreNeed": true,
                    "funeralContractNumber": "skjhf23",
                    "cemetryContractNumber": "askdjh234"
                },
                {
                    "beneficiary": {
                        "isSelf": true,
                        "prefix": "Mr",
                        "firstName": "kjdhfdkj",
                        "lastName": "asdlkjasd",
                        "middleName": "M",
                        "dateOfBirth": "2019-02-20T08:21:56.276Z",
                        "relationshipId": 3,
                        "relationshipName": "newRelations"
                    },
                    "needFuneralService": true,
                    "needCemetryService": true,
                    "isExistingPreNeed": true,
                    "funeralContractNumber": "sdfs7df",
                    "cemetryContractNumber": "sdf34234"
                }
            ]
        case 3:
            return [
                {
                    "serviceLocation": faker.random.word(),
                    "graveMarkerLocation": faker.random.word(),
                    "reasons": [Math.floor(Math.random() * maintenanceTypes.length) + 1]
                }
            ]
        case 4:
            return [
                {
                    "graveLocation": "string",
                    "graveNumber": "string",
                    "reasons": [1, 2]
                }
            ]
        case 5:
            return [
                {
                    "decedent": {
                        "prefix": faker.name.prefix(),
                        "firstName": faker.name.firstName(),
                        "lastName": faker.name.lastName(),
                        "middleName": faker.name.lastName(),
                        "aka": faker.random.word(),
                        "dateOfBirth": moment().subtract(60, 'year').format(),
                        "dateOfDeath": moment().subtract(1, 'day').format(),
                        "relationshipId": relations['Aunt'],
                        "isVerified": false
                    },
                    "isNok": true
                },
                {
                    "decedent": {
                        "prefix": faker.name.prefix(),
                        "firstName": faker.name.firstName(),
                        "lastName": faker.name.lastName(),
                        "middleName": faker.name.lastName(),
                        "aka": faker.random.word(),
                        "dateOfBirth": moment().subtract(60, 'year').format(),
                        "dateOfDeath": moment().subtract(1, 'day').format(),
                        "relationshipName": faker.random.word(),
                        "isVerified": false
                    },
                    "isNok": true
                }
            ]
        case 6:
            return [{
                "isFollowUpRequired":true,
                "email":"wal@gmail.com",
                "otherReasonFollowUps": [
                    1
                ]
            }]

        default:
            break;
    }
}