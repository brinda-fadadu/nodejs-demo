const models = require('../../../models')
const _ = require('underscore')
const { isPersonFound } = require('../contact/contactHelper')
const { getRoleIdsForStatements } = require('../../../lib/util')

async function getStatements (reqParams) {
    let resObj = { 'funeral': { 'total': 0, 'statements': [], 'inProgress': 0, 'submitted': 0, 'totalDue': 0 }, 'cemetery': { 'total': 0, 'statements': [], 'inProgress': 0, 'submitted': 0, 'totalDue': 0 } }
    try {
        await isPersonFound(reqParams.personId) // checking person exists and verified or not
        let rolesObj = await getRoleIdsForStatements()
        let roleIds = Object.entries(rolesObj).map(e => {
            return e[1]
        })
        const beneficiaryId = rolesObj['Beneficiary']
        let statementsOfPerson = await models.AgreementPerson.findAll({
            where: {
                personId: reqParams.personId
            },
            attributes: ['statementId'],
            include: [
                {
                    model: models.AgreementPersonRole,
                    as: 'AgreementRoles',
                    where: {
                        roleId: Number(beneficiaryId)
                    }
                }
            ]
        })
        let statementIds = statementsOfPerson.map(e => {
            return e.statementId
        })
        const agreementDetails = await models.Statement.getStatements(roleIds, statementIds)
        if (agreementDetails.length > 0) {
            resObj.funeral.statements = await getStatementsMap(agreementDetails, 'funeral')
            resObj.funeral.total = resObj.funeral.statements.length
            resObj.funeral.inProgress = await getStatementsStatusCount(agreementDetails, 'funeral', 'In progress')
            resObj.funeral.submitted = await getStatementsStatusCount(agreementDetails, 'funeral', 'Submitted')
            resObj.funeral.totalDue = resObj.funeral.statements.reduce((accumulator, ele) => {
                return ele.due + accumulator
            }, 0)

            resObj.cemetery.statements = await getStatementsMap(agreementDetails, 'cemetery')
            resObj.cemetery.total = resObj.cemetery.statements.length
            resObj.cemetery.inProgress = await getStatementsStatusCount(agreementDetails, 'cemetery', 'In progress')
            resObj.cemetery.submitted = await getStatementsStatusCount(agreementDetails, 'cemetery', 'Submitted')
            resObj.cemetery.totalDue = resObj.cemetery.statements.reduce((accumulator, ele) => {
                return ele.due + accumulator
            }, 0)

            // resObj.total = agreementDetails.length
            // resObj.inProgress = await getStatementsStatusCount(agreementDetails, 'In progress')
            // resObj.submitted = await getStatementsStatusCount(agreementDetails, 'Submitted')
            // resObj.totalDue = resObj.statements.reduce((accumulator, ele) => {
            //     return ele.due + accumulator
            // }, 0)
        }
        // else {
        //     resObj.total = 0
        //     resObj.inProgress = 0
        //     resObj.submitted = 0
        //     resObj.totalDue = 0
        //     resObj.statements = []
        // }
        return resObj
    } catch (error) {
        console.log(error)
        throw error
    }
}

async function getStatementsMap (data, agreementTypeValue) {
    let filteredData = data.filter(e => {
        return e.agreementType === agreementTypeValue
    })
    const finalData = await getStructuredResObj(filteredData)
    // let totalNo = count.length
    return finalData
}

function getStatementsStatusCount (data, agreementTypeValue, statusToFilter) {
    let count = data.filter(e => {
        return (e.agreementType === agreementTypeValue && e.status === statusToFilter)
    })
    let totalNo = count.length
    return totalNo
}

function getStructuredResObj (data) {
    let statementsRes = data.map((e, key) => {
        return {
            id: e.id,
            status: e.status,
            agreementType: e.agreementType,
            statementNumber: e.contractNumber,
            locationId: e.locationId,
            arranger: {
                id: e && e.Arranger ? e.Arranger.id : '',
                name: e && e.Arranger ? e.Arranger.Name : ''
            },
            agreementPersons: e.AgreementPersons.length > 0 ? e.AgreementPersons.map(e => {
                return {
                    id: e.AgreementPersonDetails.id,
                    primaryAgreementPerson: e.primaryAgreementPerson,
                    firstName: e.AgreementPersonDetails.firstName,
                    middleName: e.AgreementPersonDetails.middleName,
                    lastName: e.AgreementPersonDetails.lastName,
                    roles: e.AgreementRoles.length > 0 ? e.AgreementRoles.map(role => {
                        return role.roleId
                    }) : [],
                    phoneNumber: e.AgreementPersonDetails.phoneNumber,
                    email: e.AgreementPersonDetails.email,
                    relation: e.AgreementPersonRelation ? {
                        id: e.AgreementPersonRelation.id,
                        name: e.AgreementPersonRelation.name
                    } : ''
                }
            }) : [],
            saleType: e.saleTypeId,
            total: e.finalAmount,
            due: e && e.Payments ? e.finalAmount - _.reduce(e.Payments, (memo, num) => {
                return memo + num.amount
            }, 0) : 0

        }
    })
    return statementsRes
}
module.exports = exports = getStatements
