const models = require('../../models/index')
const Sequelize = require('sequelize')
const Op = Sequelize.Op

async function findOrCreateUser(){
    let user = await models.User.findOne({
      where: { ldapId: "product" }
    });
    if(!user){
      user = await models.User.create({
        name: "john",
        email: "test@test.com",
        ldapId: "product",
      })
    }
    return user
  }

  async function getRolesOnContactType (contactType, noUniqueRoles) {
    const contactRoles = await models.ContactTypeRole.findAll({
      where: {
        contactType
      },
      include: [
        {
          model: models.ContactRole,
          where: noUniqueRoles ? {
            name: {
              [Op.notIn]: [
                'Notifier', 'Informant', 'Power of Attorney', 'Funeral Authorizer'
              ]
            }
          } : {}
        }
      ],
      attributes: ['roleId']
    })
    return contactRoles.map(e => e.roleId)
  }

  async function getRelationsForContacts (noUniqueRelations) {
    const relations = await models.Relation.findAll({
      where: noUniqueRelations ? {
        name : {
          [Op.notIn]: [
            'Father', 'Mother', 'Spouse'
          ]
        }
      } : {
        name : {
          [Op.in]: [
            'Father', 'Mother', 'Spouse'
          ]
        }
      }
    })
    return relations.map(e => e.id)
  }


async function getEmployeeIds () {
  const employees = await models.Employee.findAll({})
  return employees.map(e => e.id)
}

async function getLocationsIds () {
  const locations = await models.Location.findAll({})
  return locations.map(e => e.id)
}

  module.exports = {
    findOrCreateUser,
    getRolesOnContactType,
    getRelationsForContacts,
    getEmployeeIds,
    getLocationsIds
  }