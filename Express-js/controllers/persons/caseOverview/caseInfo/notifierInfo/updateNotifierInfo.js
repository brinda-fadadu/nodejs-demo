const models = require('../../../../../models')
const { roleAndRelationValidation } = require('../../../../../utils/helpers/contactsHelpers')
const { getroles, seed } = require('../../../../../config/seed')
const { createAddress, createOrg, deleteExistingAddress } = require('../../anRemains/updateAnRemainsTransferInfo')
const getNotifierInfoController = require('./getNotifierInfo')
const queryHelper = require('./notifierQueryHelper')
const { formatAddress } = require('../../../../../utils/addressValidation')
const moment = require('moment')

async function getContactPersonData (reqData, personId, userId) {
    let rolesList = await getroles()
    let roles = rolesList.Contact
    const newContactPersonObj = {
        personId: Number(personId),
        contactType: Number(Object.keys(seed.ContactType).find(key => seed.ContactType[key] === 'Others')),
        isOrganization: true,
        createdBy: userId,
        updatedBy: userId,
        relationId: reqData.relationId || null,
        caseRoles: []
    }
    newContactPersonObj.caseRoles = [{ roleId: roles['Notifier'] }]
    return newContactPersonObj
}
async function createNewContactAndAddExistingOrgId (reqData, personId, userId, t) {
    let contactPerson = await getContactPersonData(reqData, personId, userId)
    let includeObj = [{
        model: models.ContactCaseRole,
        as: 'caseRoles'
    }]
    contactPerson.PersonalInformation = {
        prefix: reqData.prefix,
        firstName: reqData.firstName,
        lastName: reqData.lastName,
        middleName: reqData.middleName,
        phoneNumber: reqData.phoneNumber,
        secondaryPhoneNumber: reqData.secondaryPhoneNumber,
        aka: reqData.aka,
        email: reqData.email
    }
    includeObj.push(createIncludeObj(reqData))
    const newNotifierResultWhileEditingOrgData = await models.ContactPerson.create(contactPerson, { include: includeObj }, { transaction: t })

    let toupdateOrgIdcontactPersonDetails = await models.ContactPerson.findOne({
        where: { id: newNotifierResultWhileEditingOrgData.id },
        include: [
            {
                model: models.Person,
                as: 'PersonalInformation'
            }]
    })
    toupdateOrgIdcontactPersonDetails.PersonalInformation.organizationId = reqData.organization
    await toupdateOrgIdcontactPersonDetails.PersonalInformation.save({ transaction: t })
    return true
}

async function createNewContactAndDestroyExisting (reqData, personId, userId, contactPerson, toUpdateContactPersonsList, t) {
    let query = { id: reqData.existingNotifierId }
    if (typeof reqData.organization === 'number') {
        query.organizationId = reqData.organization
    }
    let getPersonData = await models.Person.findOne({ where: query }, { transaction: t })
    if (getPersonData) {
        getPersonData.aka = reqData.aka
        getPersonData.email = reqData.email
        await getPersonData.save({ transaction: t })
        let contactPersonNewObj = await getContactPersonData(reqData, personId, userId)
        contactPersonNewObj.resourceId = getPersonData.id
        let includeObj = [{
            model: models.ContactCaseRole,
            as: 'caseRoles'
        }]
        await models.ContactPerson.create(contactPersonNewObj, { include: includeObj }, { transaction: t })
        toUpdateContactPersonsList.push({ personId: Number(personId), resourceId: contactPerson.PersonalInformation.id })
    }
    return toUpdateContactPersonsList
}

async function updateNotifier (personId, reqData, userId, res) {
    try {
        let rolesList = await getroles()
        let roles = rolesList.Contact
        const data = { roleIds: roles['Notifier'], personId }
        const isExists = await roleAndRelationValidation(data, 'CaseRoles')

        if (isExists) { // update existing notifier
            let addressDetails
            let toUpdateContactPersonsList = []
            await models.sequelize.transaction(async (t) => {
                // getting different instances of contactperson
                const contactPerson = await queryHelper.getQuery(personId)
                // updating contactperson with new req body
                Object.assign(contactPerson, {
                    isOrganization: reqData.isOrganization,
                    updatedBy: userId,
                    relationId: reqData.relationId || null
                })
                await contactPerson.save({ transaction: t })

                Object.assign(contactPerson.PersonalInformation, {
                    prefix: reqData.prefix,
                    firstName: reqData.firstName,
                    lastName: reqData.lastName,
                    middleName: reqData.middleName,
                    phoneNumber: reqData.phoneNumber,
                    secondaryPhoneNumber: reqData.secondaryPhoneNumber,
                    aka: reqData.aka,
                    email: reqData.email
                })
                // cases for updating address in personInfo
                // updating existing address with new data
                let addressPresent = Object.keys(reqData.address).length
                if (addressPresent && typeof contactPerson.PersonalInformation.PersonInformation.residentialAddressId === 'number') {
                    const existingAddress = await models.Address.findOne({
                        where: { id: contactPerson.PersonalInformation.PersonInformation.residentialAddressId }
                    }, t)
                    addressDetails = await formatAddress(reqData.address)
                    existingAddress.set(addressDetails)
                    await existingAddress.save({ transaction: t })
                    await Object.assign(contactPerson.PersonalInformation, { organizationId: null })
                    await contactPerson.PersonalInformation.save({ transaction: t })
                } else if (reqData.address && addressPresent) { // if address not found creating new address and assigning that id as residential addressid
                    addressDetails = await formatAddress(reqData.address)
                    let generatedAddress = await createAddress(addressDetails)
                    contactPerson.PersonalInformation.PersonInformation.residentialAddressId = generatedAddress ? generatedAddress.id : null
                    await contactPerson.PersonalInformation.PersonInformation.save()
                    await Object.assign(contactPerson.PersonalInformation, { organizationId: null })
                    await contactPerson.PersonalInformation.save({ transaction: t })
                } else if (reqData.isOrganization && typeof reqData.organization === 'number' && (contactPerson.PersonalInformation.organizationId !== reqData.organization)) {
                    // cases for updating org id in person
                    // i/p: isorg is true and given existing org id
                    if (reqData.existingNotifierId && contactPerson.PersonalInformation && (reqData.existingNotifierId !== contactPerson.id)) {
                        toUpdateContactPersonsList = await createNewContactAndDestroyExisting(reqData, personId, userId, contactPerson, toUpdateContactPersonsList, t)
                    } else if (contactPerson.PersonalInformation === null || reqData.firstName) {
                        if (contactPerson.PersonalInformation) {
                            toUpdateContactPersonsList.push({ personId: Number(personId), resourceId: contactPerson.PersonalInformation.id })
                        }
                        await createNewContactAndAddExistingOrgId(reqData, personId, userId, t)
                    } else {
                        await Object.assign(contactPerson.PersonalInformation, { organizationId: reqData.organization })
                        if (typeof contactPerson.PersonalInformation.PersonInformation.residentialAddressId === 'number') {
                            await deleteExistingAddress(contactPerson.PersonalInformation.PersonInformation.residentialAddressId)
                        }
                        contactPerson.PersonalInformation.PersonInformation.residentialAddressId = null
                        await contactPerson.PersonalInformation.PersonInformation.save({ transaction: t })
                        await contactPerson.PersonalInformation.save({ transaction: t })
                    }
                } else if (reqData.isOrganization && typeof reqData.organization === 'number' && (contactPerson.PersonalInformation.organizationId === reqData.organization)) {
                    if (reqData.existingNotifierId && contactPerson.PersonalInformation && (reqData.existingNotifierId !== contactPerson.id)) {
                        await createNewContactAndDestroyExisting(reqData, personId, userId, contactPerson, t)
                    } else if (contactPerson.PersonalInformation === null || reqData.firstName) {
                        if (contactPerson.PersonalInformation) {
                            toUpdateContactPersonsList.push({ personId: Number(personId), resourceId: contactPerson.PersonalInformation.id })
                        }
                        await createNewContactAndAddExistingOrgId(reqData, personId, userId, t)
                    }
                } else if (reqData.isOrganization && Object.keys(reqData.organization).length) { // isorg is true and user wants to create new org and assigning that id as org id in person
                    const newlyInsertedOrg = await createOrg({
                        organizationTypeId: reqData.organization.organizationTypeId,
                        name: reqData.organization.name,
                        phoneNumber: reqData.organization.phoneNumber,
                        Address: formatAddress(reqData.organization.address)
                    }, t)
                    contactPerson.PersonalInformation.organizationId = newlyInsertedOrg ? newlyInsertedOrg.id : null

                    if (contactPerson.PersonalInformation.PersonInformation && typeof contactPerson.PersonalInformation.PersonInformation.residentialAddressId === 'number') {
                        await deleteExistingAddress(contactPerson.PersonalInformation.PersonInformation.residentialAddressId, t)
                        contactPerson.PersonalInformation.PersonInformation.residentialAddressId = null
                        await contactPerson.PersonalInformation.PersonInformation.save({ transaction: t })
                        await contactPerson.PersonalInformation.save({ transaction: t })
                    }
                    if (reqData.existingNotifierId && contactPerson.PersonalInformation && (reqData.existingNotifierId === contactPerson.id)) {
                        if (reqData.existingNotifierId && reqData.firstName) {
                            let contactPersonNewObj = await getContactPersonData(reqData, personId, userId)
                            let includeObj = [{
                                model: models.ContactCaseRole,
                                as: 'caseRoles'
                            }]
                            contactPersonNewObj.PersonalInformation = {
                                prefix: reqData.prefix,
                                firstName: reqData.firstName,
                                lastName: reqData.lastName,
                                middleName: reqData.middleName,
                                phoneNumber: reqData.phoneNumber,
                                secondaryPhoneNumber: reqData.secondaryPhoneNumber,
                                aka: reqData.aka,
                                email: reqData.email
                            }
                            includeObj.push(createIncludeObj(reqData))
                            const newNotifierResultWhileEditingOrgData = await models.ContactPerson.create(contactPersonNewObj, { include: includeObj }, { transaction: t })

                            let toupdateOrgIdcontactPersonDetails = await models.ContactPerson.findOne({
                                where: { id: newNotifierResultWhileEditingOrgData.id },
                                include: [
                                    {
                                        model: models.Person,
                                        as: 'PersonalInformation'
                                    }]
                            }, { transaction: t })
                            toupdateOrgIdcontactPersonDetails.PersonalInformation.organizationId = newlyInsertedOrg.id
                            await toupdateOrgIdcontactPersonDetails.PersonalInformation.save({ transaction: t })
                            toUpdateContactPersonsList.push({ personId: Number(personId), resourceId: contactPerson.PersonalInformation.id })
                        }
                    }
                    if (reqData.existingNotifierId && contactPerson.PersonalInformation && (reqData.existingNotifierId !== contactPerson.id)) {
                        await createNewContactAndDestroyExisting(reqData, personId, userId, contactPerson, t)
                    } else if (contactPerson.PersonalInformation === null && reqData.firstName) {
                        await createNewContactAndAddExistingOrgId(reqData, personId, userId, t)
                    }
                } else {
                    await contactPerson.PersonalInformation.save({ transaction: t })
                }
            })
            toUpdateContactPersonsList.map(async p => {
                await models.ContactPerson.update({ deletedAt: moment().format('MM/DD/YYYY HH:mm:ss'), deletedBy: userId },
                    { where: { personId: p.personId, resourceId: p.resourceId } })
            })
        } else { // Create OR Add notifier contact
            await models.sequelize.transaction(async (t) => {
                let contactPerson = {
                    personId: Number(personId),
                    contactType: '',
                    isOrganization: false,
                    createdBy: userId,
                    updatedBy: userId,
                    relationId: reqData.relationId || null,
                    caseRoles: []
                }
                let includeObj = []
                contactPerson.caseRoles = [{ roleId: roles['Notifier'] }]
                includeObj.push({
                    model: models.ContactCaseRole,
                    as: 'caseRoles'
                })
                if (!reqData.isOrganization) {
                    contactPerson.contactType = Number(Object.keys(seed.ContactType).find(key => seed.ContactType[key] === 'Family'))
                    contactPerson.PersonalInformation = {
                        prefix: reqData.prefix,
                        firstName: reqData.firstName,
                        lastName: reqData.lastName,
                        middleName: reqData.middleName,
                        phoneNumber: reqData.phoneNumber,
                        secondaryPhoneNumber: reqData.secondaryPhoneNumber,
                        PersonInformation: {}

                    }
                    if (reqData.address && Object.keys(reqData.address).length) {
                        contactPerson.PersonalInformation.PersonInformation.PersonAddress = await formatAddress(reqData.address) // createAddressObject(reqData.address)
                    }

                    includeObj.push(createIncludeObj(reqData))
                    await models.ContactPerson.create(contactPerson, { include: includeObj })
                } else {
                    contactPerson.contactType = Number(Object.keys(seed.ContactType).find(key => seed.ContactType[key] === 'Others'))
                    contactPerson.isOrganization = true
                    if (reqData.existingNotifierId) {
                        let getPersonData = await models.Person.findOne({ where: { id: reqData.existingNotifierId } }, { transaction: t })
                        if (getPersonData) {
                            getPersonData.aka = reqData.aka
                            getPersonData.email = reqData.email
                            getPersonData.save({ transaction: t })
                            contactPerson.resourceId = getPersonData.id
                            await models.ContactPerson.create(contactPerson, { include: includeObj }, { transaction: t })
                        }
                    } else {
                        contactPerson.PersonalInformation = {
                            prefix: reqData.prefix,
                            firstName: reqData.firstName,
                            lastName: reqData.lastName,
                            middleName: reqData.middleName,
                            phoneNumber: reqData.phoneNumber,
                            secondaryPhoneNumber: reqData.secondaryPhoneNumber,
                            aka: reqData.aka,
                            email: reqData.email
                        }
                        if (reqData.isOrganization && Object.keys(reqData.organization).length) {
                            contactPerson.PersonalInformation.PersonOrganization = {
                                organizationTypeId: reqData.organization.organizationTypeId,
                                name: reqData.organization.name,
                                phoneNumber: reqData.organization.phoneNumber,
                                Address: await formatAddress(reqData.organization.address)
                            }
                        }
                        includeObj.push(createIncludeObj(reqData))
                        const newNotifierResult = await models.ContactPerson.create(contactPerson, { include: includeObj }, { transaction: t })

                        if (reqData.isOrganization && typeof reqData.organization === 'number') {
                            let toupdateOrgIdcontactPersonDetails = await models.ContactPerson.findOne({
                                where: { id: newNotifierResult.id },
                                include: [
                                    {
                                        model: models.Person,
                                        as: 'PersonalInformation'
                                    }]
                            })
                            toupdateOrgIdcontactPersonDetails.PersonalInformation.organizationId = reqData.organization
                            await toupdateOrgIdcontactPersonDetails.PersonalInformation.save({ transaction: t })
                        }
                    }
                }
            })
        }

        const result = await getNotifierInfoController.getInfo(personId)
        return result
    } catch (error) {
        console.log(error)
        throw error
    }
}

function createIncludeObj (reqDataObj) {
    try {
        let personInfoIncludeObj = {
            model: models.PersonInfo,
            as: 'PersonInformation',
            include: []
        }
        personInfoIncludeObj.include.push({
            model: models.Address,
            as: 'PersonAddress'
        }
        )

        let includeObj = {
            model: models.Person,
            as: 'PersonalInformation',
            include: [
                personInfoIncludeObj
            ]
        }
        if (reqDataObj.isOrganization && reqDataObj.organization && typeof reqDataObj.organization !== 'number') {
            includeObj.include.push(
                {
                    model: models.Organization,
                    as: 'PersonOrganization',
                    include: [
                        {
                            model: models.Address
                        },
                        {
                            model: models.OrganizationType
                        }
                    ]
                }
            )
        }
        return includeObj
    } catch (err) {
        throw err
    }
}

module.exports = { updateNotifier }
