const getEmployees = require('../../controllers/employees/getEmployees')

async function getEmployeesHandler (req, res, next) {
    try {
        let email = req.query ? req.query.email : null
        let userRole = req.query ? req.query.userRole : null
        const employees = await getEmployees(req.query.type, req.query.name, email, userRole)
        res.status(200).json(employees)
    } catch (error) {
        res.status(404).json({
            error
        })
    }
}

module.exports = exports = getEmployeesHandler
