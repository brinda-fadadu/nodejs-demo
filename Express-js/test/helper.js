// Set default env to "test"
try{

  if (!process.env.NODE_ENV) {
    process.env.NODE_ENV = 'test'
  }

const ldap = require('ldapjs')

// Mock Ldap create client
// ldap.createClient = function(config) {
//   console.log("MOCKED Ldap CreateClient")
// }

const chai = require('chai')
const chaiHttp = require('chai-http')
const JWT = require('jsonwebtoken')
const faker = require('faker')
const server = require('../index')
const models = require("../models")
const _ = require('underscore')
const should = chai.should();
const {
  JsonArrayToJson,
  generateOnePortalId 
} = require('../utils/dbGetFunctions')
chai.use(chaiHttp);
const { User } = models
let testUser
const {verifyCall} = require('../controllers/Calls/VerifyCall/verifyCall')
const seedValues = require('../config/seed').seed
let reasons = seedValues.CallReasons
const callController = require('../controllers/Calls/CallInfo/getCall')
const {createArrangement} = require('../controllers/arrangement/create')
const {createStatement} = require('../controllers/statement/createStatement')
require('./ssnfakerPlugin')
const sendForms = require('../controllers/forms/sendForms')
const previewForm = require('../controllers/forms/previewForm')

function genAuthToken(user){
  return JWT.sign({
    id: user.ldapId,
    role: user.role || 1,
    exp: Math.floor(Date.now() / 1000) + (60 * 60 * 24 *7),
  }, process.env.JWT_SECRET_TOKEN)
}

async function addTestUser(){
  let user = await models.User.findOne({
    where: { ldapId: "product" }
  });
  if(!user){
    user = await User.create({
      name: "john",
      email: "test@test.com",
      ldapId: "product",
    })
  }
  return user
}

async function getCities() {
  const cities = await models.City.findAll({ where: {}, raw: true });   
  return JsonArrayToJson(cities,'name','id')
}

async function getStates() {
  const states = await models.State.findAll({ where: {}, raw: true });
  return JsonArrayToJson(states,'name','id')
}

async function getCountries() {
  const countries = await models.Country.findAll({ where: {}, raw: true });
  return JsonArrayToJson(countries,'name','id')
}

async function getRelations(){
  const relations = await models.Relation.findAll({ where: {}, raw: true });
  return JsonArrayToJson(relations,'name','id')
}

async function getMaintenanceTypes(){
  let maintenanceTypes
  maintenanceTypes = await models.MaintenanceType.findAll({
      attributes: ['id']
  })
  let maintenanceTypeIds = maintenanceTypes.map(e => {
      return Number(e.id)
  })
  return maintenanceTypeIds
}

async function getFollowupTypes(){
  const followupTypes = await models.FollowUpType.findAll({ where: {}, raw: true });
  return JsonArrayToJson(followupTypes,'Name','id')
}

async function getLanguages(){  
  const languages = await models.Language.findAll({ where: {}, raw: true });
  return JsonArrayToJson(languages,'name','id')
}

async function getAddressTypes(){
  const addressTypes = await models.AddressType.findAll({ where:{}, raw:true});
  return JsonArrayToJson(addressTypes, 'Type', 'id')
}

async function getOrganizationTypes(){
  const organizationTypes = await models.OrganizationType.findAll({ where:{}, raw:true});
  return JsonArrayToJson(organizationTypes, 'type','id')
}

async function getPersonCount () {
  const persons = await models.Person.findAll({ where:{}, raw:true});
  return persons.length
}

async function getANCount () {
  const an = await models.SomeOnePassed.findAll({ where:{}, raw:true});
  return an.length
}

async function getCaseRoles (type){
  const caseRoles = await models.Role.findAll({ where:{ Type: type }, raw:true});
  return JsonArrayToJson(caseRoles, 'name', 'id')
}

async function getCallById(id){
  const callData = await callController.getCall(id,'json');
  return callData;
}

async function getDeleteActionReasons () {
  const deleteReasons = await models.ActionReason.findAll({ where:{ Type: 'DELETE' }, raw:true});
  return deleteReasons.length
}

function getCallReasonTypes() {
  const reasonTypes = Object.keys(seedValues.CallReasons).map(Number)
  return reasonTypes
}

function getTransferLocationTypes () {
  const transferLocationTypes = Object.keys(seedValues.TransferLocationTypes).map(Number)
  return transferLocationTypes

}
async function getServicesList() {
  const services = await models.Service.findAll({where:{IsDisabled:false}})
  return services
}

async function verifyPerson(data){
  const verifyData = {
    params:{
      callId: data.callId
    },
    body:{
      person:{
        personId: data.personId,
        userType: data.userType,
        reasonId: data.reasonId
      }
      
    },
    currentUser:{ 
      id: data.currentUserId 
    }
  }

  const result = await verifyCall(verifyData)
  return result
  
}

async function createArrangementWithData(data){
  const result = await createArrangement(data)
  return result
}

async function createStatementForArrangement(data){
  try{
    const t = await models.sequelize.transaction()
    console.log('data sending to create statement')
    console.log(data);
    const result = await createStatement(data, t)
    await t.commit()
    return result
  }catch(err){
    console.log(err)
  }
}

async function getLocations() {
  const locations = await models.Location.findAll({where:{}})
  return JsonArrayToJson(locations, 'Name', 'id')
}

async function getUserRoles () {
  const userRoles = await models.UserRole.findAll({ where: { }, raw: true })
    const allUserRoles = {}
    userRoles.forEach(ele => {
        allUserRoles[ele.Name] = ele.id
    })
    return allUserRoles
}

async function createVerifiedPerson(){
  const onePortalId = await generateOnePortalId()
  const person = await models.Person.create({
    onePortalId,
    prefix: faker.name.prefix(),
    suffix: faker.name.suffix(),
    firstName: faker.name.firstName(),
    middleName: 'M',
    lastName: faker.name.lastName(),
    phoneNumber: faker.phone.phoneNumber(),
    email: faker.internet.email(),
    maritalStatus: 1,
    gender: 1,
    isVerified: true
  })

  return person
}

async function cleanupStatementData(){
  await models.StatementLocationItem.destroy({ truncate: true })
  await models.Statement.destroy({ truncate: true })
  await models.Arrangement.destroy({ truncate: true })
  await models.StatementCounter.destroy({ truncate: true })
}

async function getAuthTokensWithNoWriteAndDeletePermissions(user){
  const getModuleData = await models.Module.findOne({ where: { name: 'Maintenance' } })
  const permissionsData = await models.Permission.findAll({ where: { moduleId: getModuleData.id } })
  const noWritePermissions = _.filter(permissionsData, function (eachObj) { return eachObj.write === false; });
  const noDeletePermissions = _.filter(permissionsData, function (eachObj) { return eachObj.delete === false; });
  noWritePermissionAuthTokens = _.map(noWritePermissions, function (permission) {
    user.role = permission.userRoleId
    noWritePermissionAuthToken = genAuthToken(user);
    return noWritePermissionAuthToken;
  });
  noDeletePermissionAuthTokens = _.map(noDeletePermissions, function (permission) {
      user.role = permission.userRoleId
      noDeletePermissionAuthToken = genAuthToken(user);
      return noDeletePermissionAuthToken;
  });
  return {noWritePermissionAuthTokens: noWritePermissionAuthTokens, noDeletePermissionAuthTokens: noDeletePermissionAuthTokens}
}

async function checkTokensWithNoPermission(token, url, data, method, description) {
  if (method === 'post') {
      describe(description, function () {
      it('Should return forebidden error without permission', async () => {
          const res = await chai.request(server)
              .post(url)
              .set('authorization', token)
              .send(data)
          res.should.have.status(403);
      })
  })

  } else if (method === 'put') {
      describe(description, function () {
          it('Should return forebidden error without permission', async () => {
              const res = await chai.request(server)
                  .put(url)
                  .set('authorization', token)
                  .send(data)
              res.should.have.status(403);
          })
      })
  }
}

async function sendFormsToDocusign(personId, data, user){
  const result = await sendForms(personId, data, user)
  return result
}

async function getPreviewFormFromDocusign(formId, personId, data, user){
  const result = await previewForm(formId, personId, data, user)
  return result
}

async function getItemTypes() {
  const result = await models.ItemType.findAll({ raw: true})
  return result
}

module.exports = {
  server: server,
  chai: chai,
  expect: chai.expect,
  models: models,
  genAuthToken: genAuthToken,
  addTestUser: addTestUser,
  getCallReasonTypes: getCallReasonTypes,
  getCities,
  getStates,
  getCountries,
  getLanguages,
  getMaintenanceTypes,
  getFollowupTypes,
  getRelations,
  getAddressTypes,
  getOrganizationTypes,
  //getVerifiedPersonIds,
  getCallById,
  getPersonCount,
  getCaseRoles,
  getANCount,
  getDeleteActionReasons,
  getTransferLocationTypes,
  verifyPerson,
  createArrangementWithData,
  getServicesList,
  createStatementForArrangement,
  getLocations,
  getUserRoles,
  createVerifiedPerson,
  cleanupStatementData,
  getAuthTokensWithNoWriteAndDeletePermissions,
  checkTokensWithNoPermission,
  sendFormsToDocusign,
  getPreviewFormFromDocusign,
  getItemTypes
}

}catch(err){
  console.log(err)
}
