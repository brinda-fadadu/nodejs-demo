const models = require('../../models/index')
const UserController = require('../../controllers/refactorControllers/userController')
const chai = require('chai')
const faker = require('faker')
const chaiAsPromised = require('chai-as-promised');
chai.use(chaiAsPromised);

const expect = chai.expect
chai.should();

describe('user permissions', () => {
    let userRoles = []
    before(async () => {
        userRoles = await models.UserRole.findAll()
    })

    const permissionSet = ['read', 'write', 'delete']

    it('should find all the permissions', async () => {
        const userController = new UserController(faker.random.number({ min: 1, max: userRoles.length }))
        const roleAndPermissions = await userController.getPermission()
        for (const [key, value] of Object.entries(roleAndPermissions.permissions)) {
            permissionSet.forEach(definedPermission => {
                value.should.have.property(definedPermission)
                chai.assert.isBoolean(value.read)
            })
        }
    })
    
})
