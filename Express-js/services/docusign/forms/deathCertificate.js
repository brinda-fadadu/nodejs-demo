const moment = require('moment-timezone')
const _ = require('underscore')

const models = require('../../../models')
const BaseForm = require('./baseForm')
const genderTypes = require('../../../config/seed').seed.Gender

const ROLES = {
    FuneralDirector: 'FuneralDirector',
    Informant: 'Informant'
}

class DeathCertificateForm extends BaseForm {
    constructor (caseInfoData) {
        let caseInfoFormId = caseInfoData.caseInfoFormId
        super({ caseInfoFormId })
        this.personId = caseInfoData.personId
        this.formId = caseInfoData.formId
    }

    async envelopeData () {
        return [
            await this.funeralDirectorPreFillData(),
            this.decedentPreFillData()
        ]
    }
    getssnData (ssn) {
        let data = ''
        let value = ssn.match(/\d{3}-\d{2}-\d{4}/gmi)
        if (value && value.length) {
            data = value[0]
        }
        return data
    }
    async getStateOrCountryDetails (countryDetails) {
        const stateOrCountry = countryDetails && (countryDetails.country !== 'United States' || !countryDetails.state) ? await this.getCountry(countryDetails.country) : countryDetails && countryDetails.state ? await this.getState(countryDetails.state) : ''
        return stateOrCountry
    }

    async funeralDirectorPreFillData () {
        const funeralAssignedTo = this.getSignerByRole(ROLES.FuneralDirector, this.formId)

        // let metaData = this.caseInfoForm.metaData ? JSON.parse(this.caseInfoForm.metaData.replace(/'/g, '"')) : ''
        let metaData = this.caseInfoForm.metaData ? JSON.parse(this.caseInfoForm.metaData) : ''

        let timezone = metaData.timezone ? metaData.timezone : null

        let personDetails = await this.fetchEDRSDetails()
        let fName = personDetails.firstName
        let mName = personDetails.middleName
        let lName = personDetails.lastName
        if (personDetails.preferredFirstName || personDetails.preferredMiddleName || personDetails.preferredLastName) {
            fName = personDetails.preferredFirstName
            mName = personDetails.preferredMiddleName
            lName = personDetails.preferredLastName
        }
        let deathDetails = personDetails.deathDetails
        let birthPlace = personDetails.birthPlace ? personDetails.birthPlace.address : null
        let decPlace = personDetails.addressPlace ? personDetails.addressPlace.address : null
        let maritalStatus = personDetails.maritalStatus ? personDetails.maritalStatus : null
        let eduDetails = personDetails.EducationDetail
        let qualification = eduDetails ? eduDetails.qualification : null
        let contactsInfo = await this.fetchContactDetails()
        let inf = contactsInfo.informant
        let informant = inf ? inf.person : null
        let infAddress = informant && informant.addressPlace && informant.addressPlace.address ? informant.addressPlace.address : null
        let spouse = contactsInfo.spouse
        let spouseInf = spouse ? spouse.person : null
        let mother = contactsInfo.mother
        let motherInf = mother ? mother.person : null
        let mbp = motherInf && motherInf.birthPlace && motherInf.birthPlace.address ? motherInf.birthPlace.address : null
        let father = contactsInfo.father
        let fatherInf = father ? father.person : null
        let fbp = fatherInf && fatherInf.birthPlace && fatherInf.birthPlace.address ? fatherInf.birthPlace.address : null

        let verificationDetails = personDetails.personVerificationDetails
        let veteranInfo = personDetails.Veteran
        let ethnicityInfo = personDetails.PersonEthnicity
        let race1 = ethnicityInfo && ethnicityInfo.raceOne ? ethnicityInfo.raceOne.name : null
        let race2 = ethnicityInfo && ethnicityInfo.raceTwo ? ethnicityInfo.raceTwo.name : null
        let race3 = ethnicityInfo && ethnicityInfo.raceThree ? ethnicityInfo.raceThree.name : null
        let dod = deathDetails && deathDetails.dateOfDeath ? moment(deathDetails.dateOfDeath) : null
        let dob = personDetails.dateOfBirth ? moment(personDetails.dateOfBirth) : null
        if (timezone) {
            dod = deathDetails && deathDetails.dateOfDeath ? moment(deathDetails.dateOfDeath).tz(timezone) : null
            dob = personDetails.dateOfBirth ? moment(personDetails.dateOfBirth).tz(timezone) : null
        }
        let age = ''
        let months = ''
        let days = ''
        let minutes = ''
        let hours = ''
        if (dob && dod) {
            age = dod.diff(dob, 'year')
            dob.add(age, 'years')
            if (age < 1) {
                months = dod.diff(dob, 'months')
                dob.add(months, 'months')
                days = dod.diff(dob, 'days')
                if (days < 1) {
                    dod.add(days, 'days')
                    minutes = dod.diff(dob, 'minutes')
                    dod.add(minutes, 'minutes')
                    hours = dod.diff(dob, 'hours')
                }
            }
        }
        let pod = personDetails.deathDetails && personDetails.deathDetails.deathPlace ? personDetails.deathDetails.deathPlace : null
        let podAddress = pod && pod.address ? pod.address : null
        let podOrg = pod && pod.organization ? pod.organization : null
        let facilityType = podOrg && podOrg.organizationType ? podOrg.organizationType.type : null
        let hospDeathStatus = deathDetails && deathDetails.hospitalDeathStatus ? deathDetails.hospitalDeathStatus : null
        let certifier = deathDetails ? deathDetails.certifier : null
        let agmnt = await this.fetchANStatement()

        const textData = {
            dec_FirstName: fName || '',
            dec_MiddleName: mName || '',
            dec_LastName: lName || '',
            dec_AKA: personDetails.aka || '',
            dec_DOB_MMDDYYYY: dob ? moment(personDetails.dateOfBirth).tz(timezone).format('MM/DD/YYYY') : '',
            decdeath_Age: age,
            decdeath_Under1YearMonths: months,
            decdeath_Under1YearDays: days,
            decdeath_Under1DayHours: hours,
            decdeath_Under1DayMins: minutes,
            dec_Gender_MorF: genderTypes[personDetails.gender],
            dec_BirthState_Or_Country: await this.getStateOrCountryDetails(birthPlace),
            dec_SSN_WithDashes: verificationDetails && verificationDetails.ssn ? this.getssnData(verificationDetails.ssn) : '',
            dec_MaritalStatus: maritalStatus && maritalStatus.name ? maritalStatus.name : '',
            decdeath_DOD_MMDDYYYY: dod ? dod.format('MM/DD/YYYY') : '',
            decdeath_TimeOfDeathHourAs24HR: dod ? dod.format('HH:mm:ss') : '',
            dec_Degree: qualification && qualification.name ? qualification.name : '',
            dec_Hispanic_IfYesListOrigin: ethnicityInfo && ethnicityInfo.isHispanic && ethnicityInfo.hispanic ? ethnicityInfo.hispanic.name : '',
            dec_Race: this.getComaSeparatedValues([race1, race2, race3]),
            dec_Occupation: eduDetails && eduDetails.occupation ? eduDetails.occupation : '',
            dec_Industry: eduDetails && eduDetails.industry ? eduDetails.industry : '',
            dec_YearsInOccupation: eduDetails ? eduDetails.yearsOfOccupation : '',
            dec_Addr1Addr2AptSuite: decPlace ? this.getComaSeparatedValues([decPlace.line1, decPlace.line2, decPlace.apartment]) : '',
            dec_City: decPlace && decPlace.city ? decPlace.city : '',
            dec_CountyOfResidence: decPlace && decPlace.county ? decPlace.county : '',
            dec_Zip: decPlace && decPlace.zipcode ? decPlace.zipcode : '',
            dec_YearsResidedinCounty: verificationDetails && verificationDetails.yearsAtResidentialAddress ? verificationDetails.yearsAtResidentialAddress : '',
            dec_FullStateOrCountry: await this.getStateOrCountryDetails(decPlace),
            inf_FullName: informant ? `${informant.firstName || ''} ${informant.middleName || ''} ${informant.lastName || ''}` : '',
            inf_Relationship: inf && inf.relation ? inf.relation.name : '',
            'inf_Addr1|inf_Addr2|inf_AptSuite|inf_CSZ': infAddress ? this.getComaSeparatedValues([infAddress.line1, infAddress.line2, infAddress.apt, infAddress.city, await this.getState(infAddress.state), infAddress.county, infAddress.country !== 'United States' ? this.getCountry(infAddress.country) : null, infAddress.zipcode]) : '',
            spouse_FirstName: spouseInf && spouseInf.firstName ? spouseInf.firstName : '',
            spouse_MiddleName: spouseInf && spouseInf.middleName ? spouseInf.middleName : '',
            'spouse_LastName|spouse_MaidenName': spouseInf && spouseInf.lastName ? spouseInf.lastName : spouseInf && spouseInf.maidenName ? spouseInf.maidenName : '',
            dec_FatherFirstName: fatherInf && fatherInf.firstName ? fatherInf.firstName : '',
            dec_FatherMiddleName: fatherInf && fatherInf.middleName ? fatherInf.middleName : '',
            dec_FatherLastName: fatherInf && fatherInf.lastName ? fatherInf.lastName : '',
            dec_FatherBirthStateFullOrCountry: await this.getStateOrCountryDetails(fbp),
            dec_MotherFirstName: motherInf && motherInf.firstName ? motherInf.firstName : '',
            dec_MotherMiddleName: motherInf && motherInf.middleName ? motherInf.middleName : '',
            dec_MotherMaiden: motherInf && motherInf.maidenName ? motherInf.maidenName : '',
            dec_MotherBirthStateFullOrCountry: await this.getStateOrCountryDetails(mbp),
            disposition_Date_MMDDYYYY: '',
            disposition_Place: '',
            disposition_MethodOf: '',
            embalming_EmbalmerLicense: '',
            chapel_Name: agmnt ? agmnt.location.name : '',
            chapel_License: agmnt ? agmnt.location.license : '',
            CurrentDate_MMDDY: '',
            // decdeath_PlaceOfDeath: !podOrg && podAddress ? this.getComaSeparatedValues([podAddress.line1, podAddress.line2]) : '',
            decdeath_PlaceOfDeath: podOrg ? podOrg.name : (podAddress ? this.getComaSeparatedValues([podAddress.line1, podAddress.line2]) : ''),
            decdeath_PlaceOfDeathCounty: (podAddress && podAddress.county) ? podAddress.county : '',
            'decdeath_PlaceOfDeathAddr1|decdeath_PlaceOfDeathAddr2': podOrg && podAddress ? this.getComaSeparatedValues([podAddress.line1, podAddress.line2, podAddress.apt, podAddress.city, await this.getState(podAddress.state), podAddress.county, podAddress.country !== 'United States' ? this.getCountry(podAddress.country) : null, podAddress.zipcode]) : '',
            decdeath_PlaceOfDeathCity: podAddress && podAddress.city ? podAddress.city : '',
            certifier_License: certifier ? certifier.licenseNumber : ''
        }
        let checkBoxData = {
            dec_MilitaryYes_X: !!(veteranInfo && !veteranInfo.isUnknown && veteranInfo.serviceBranchId),
            dec_MilitaryNo_X: veteranInfo ? !!(!veteranInfo.isUnknown && !veteranInfo.serviceBranchId) : false,
            dec_MilitaryUnknown_X: !!((veteranInfo && veteranInfo.isUnknown)),
            dec_HispanicYes_X: !!(ethnicityInfo && ethnicityInfo.isHispanic),
            dec_HispanicNo_X: !(ethnicityInfo && ethnicityInfo.isHispanic),
            decdeath_Inpatient_X: !!(hospDeathStatus && hospDeathStatus === 'IP'),
            decdeath_ER_X: !!(hospDeathStatus && hospDeathStatus === 'ER/OP'),
            decdeath_DOA_X: !!(hospDeathStatus && hospDeathStatus === 'DOA'),
            decdeath_Hospice_X: !!(facilityType && facilityType === 'Hospice'),
            decdeath_NursingHome_X: !!(facilityType && facilityType === 'Nursing Home'),
            decdeath_Residence_X: !!(personDetails.addressPlaceId && deathDetails && deathDetails.deathPlaceId && personDetails.addressPlaceId === deathDetails.deathPlaceId),
            decdeath_OtherHosp: !!(facilityType && facilityType !== 'Hospital' && facilityType !== 'Hospice' && facilityType !== 'Nursing Home')
        }
        return this.convertToTextTabsLatest(funeralAssignedTo, textData, checkBoxData)
    }

    decedentPreFillData () {
        const informant = this.getSignerByRole(ROLES.Informant, this.formId)
        const data = {}
        return this.convertToTextTabsLatest(informant, data)
    }

    async fetchEDRSDetails () {
        let scope = ['withPlace', 'withBirthPlace', 'withVerificationDetailsUnscoped', 'withMaritalStatus']
        let person = await models.Person.scope(scope).findOne({
            where: { id: this.personId },
            include: [
                {
                    model: models.PersonEthnicity,
                    include: [
                        {
                            model: models.Race,
                            as: 'raceOne'
                        },
                        {
                            model: models.Race,
                            as: 'raceTwo'
                        },
                        {
                            model: models.Race,
                            as: 'raceThree'
                        },
                        {
                            model: models.Ethnicity,
                            as: 'hispanic'
                        }
                    ]
                },
                {
                    model: models.EducationDetails.scope('commonIncludes')
                },
                {
                    model: models.DeathDetails.scope('commonIncludes'),
                    as: 'deathDetails',
                    include: [
                        {
                            model: models.Certifier,
                            as: 'certifier'
                        }
                    ]
                },
                {
                    model: models.Veteran
                }
            ]
        })
        return person
    }

    async fetchContactDetails () {
        let contactInfo = await models.PersonContact.findAll({
            where: { personId: this.personId, deletedAt: null, deletedBy: null },
            include: [
                {
                    model: models.Person.scope(['withPlace', 'withBirthPlace']),
                    as: 'person',
                    attributes: [
                        'id', 'prefix', 'firstName', 'middleName', 'lastName', 'maidenName', 'phoneNumber', 'email', 'secondaryPhoneNumber'
                    ]
                },
                {
                    model: models.PersonContactRole,
                    as: 'contactRoles',
                    include: [
                        {
                            model: models.ContactRole,
                            as: 'role',
                            where: { name: 'Informant' }
                        }
                    ]
                },
                {
                    model: models.Relation,
                    as: 'relation'
                }
            ]
        })
        let informant = _.find(contactInfo, function (contact) {
            let [cRole] = contact.contactRoles
            if (cRole && cRole.role && cRole.role.name === 'Informant') {
                return contact
            }
        })
        let spouse = await this.getRelationContacts(contactInfo, 'Spouse')
        let mother = await this.getRelationContacts(contactInfo, 'Mother')
        let father = await this.getRelationContacts(contactInfo, 'Father')
        return { informant: informant, spouse: spouse, mother: mother, father: father }
    }

    async getRelationContacts (contacts, relation) {
        let relDetails = _.find(contacts, function (contact) {
            if (contact && contact.relation && contact.relation.name === relation) {
                return contact
            }
        })
        return relDetails
    }

    getComaSeparatedValues (valuesArray) {
        let string = ''
        let valArray = _.compact(valuesArray)
        if (valArray.length) {
            string = valArray.join(', ')
        }
        return string
    }

    async fetchANStatement () {
        const AgmtCtrl = require('../../../controllers/refactorControllers/agreementController/agreementController')
        let [agmnt] = await models.Agreement.findAll({
            where: {
                type: AgmtCtrl.TYPES.Funeral,
                needType: AgmtCtrl.NEED_TYPES.AN
            },
            include: [
                {
                    model: models.Location,
                    as: 'location',
                    required: true
                }, {
                    model: models.AgreementPerson,
                    as: 'beneficiary',
                    where: { personId: this.personId },
                    required: true
                }
            ]
        })
        return agmnt
    }
}
module.exports = DeathCertificateForm
