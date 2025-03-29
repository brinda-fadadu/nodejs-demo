'use strict'
module.exports = (sequelize, DataTypes) => {
  const User = sequelize.define(
    'User',
    {
      ldapId: DataTypes.STRING,
      name: DataTypes.STRING,
      email: DataTypes.STRING,
      profilePic: DataTypes.STRING,
      userRoleId: {
        type: DataTypes.INTEGER,
        references: {
          model: 'UserRole',
          key: 'id'
        }
      },
      businessUnitId: {
        type: DataTypes.INTEGER,
        references: {
          model: 'BusinessUnit',
          key: 'id'
        }
      },
      reportingManagerId: {
        type: DataTypes.INTEGER,
        references: {
          model: 'Employee',
          key: 'id'
        }
      },
      department: DataTypes.STRING,
      position: DataTypes.STRING,
      roleLastUpdatedAt: DataTypes.DATE,
      phoneNumber: DataTypes.STRING
    },
    {
      tableName: 'User',
      timestamps: true
    }
  )
  User.associate = function(models) {
    // associations can be defined here
    // User.hasMany(models.Address, { foreignKey: 'CreatedBy', 'sourceKey': 'id' })
    // User.hasMany(models.Address, { foreignKey: 'UpdatedBy', 'sourceKey': 'id' })
    User.belongsTo(models.UserRole, {
      foreignKey: 'userRoleId',
      as: 'UserPermissions'
    })
    // User.hasMany(models.CallVerification, { foreignKey: 'verifiedBy', 'sourceKey': 'id' })
    User.hasMany(models.Note, { foreignKey: 'createdBy' })
    User.hasMany(models.Payment, { foreignKey: 'createdBy', sourceKey: 'id' })
    User.hasMany(models.PaymentFailure, {
      foreignKey: 'createdBy',
      constraints: false
    })
    User.belongsTo(models.Employee, {
      foreignKey: 'reportingManagerId',
      as: 'reportingManager'
    })
    User.belongsTo(models.BusinessUnit, {
      foreignKey: 'businessUnitId',
      as: 'businessUnit'
    })
    User.belongsTo(models.Location, {
      foreignKey: 'locationId',
      as: 'location'
    })
    User.hasMany(models.UserTeam,{foreignKey: 'userId', sourceKey: 'id', as: 'userTeams'})
    User.addScope('withUserRole', {
      include: [
        {
          model: models.UserRole,
          as: 'UserPermissions'
        }
      ]
    })
    //User.hasMany(models.AuditRecord, { foreignKey: 'CreatedBy ', 'sourceKey': 'id' })
    //User.hasMany(models.AuditRecord, { foreignKey: 'UpdatedBy ', 'sourceKey': 'id' })
    //User.hasMany(models.AuditRecord, { foreignKey: 'DeletedBy ', 'sourceKey': 'id' })
    // User.hasMany(models.Ticket, { foreignKey: 'AssignedTo', 'sourceKey': 'id', as: 'userAssignedTickets'});
    // User.hasMany(models.Ticket, { foreignKey: 'CreatedBy', 'sourceKey': 'id', as: 'userCreatedTickets'});
    // User.hasMany(models.Ticket, { foreignKey: 'Owner', 'sourceKey': 'id', as: 'userOwnedTickets'});
    // User.hasMany(models.Ticket, { foreignKey: 'UpdatedBy', 'sourceKey': 'id', as: 'userUpdatedTickets'});
    // User.hasMany(models.TicketHistory, { foreignKey: 'AssignedTo', 'sourceKey': 'id', as: 'userAssignedTicketHistory'});
    // User.hasMany(models.TicketHistory, { foreignKey: 'CreatedBy', 'sourceKey': 'id', as: 'userCreatedTicketHistory'});
  }
  return User
}
