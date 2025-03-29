'use strict';
module.exports = (sequelize, DataTypes) => {
  const Ticket = sequelize.define('Ticket', {
    ticketId:{type: DataTypes.STRING, unique: true},
    title: DataTypes.STRING,
    description: DataTypes.STRING,
    callId: {
      type: DataTypes.INTEGER,
      references: {
        model: 'Call',
        key: 'id'
      }
    },
    priority: DataTypes.STRING,
    status: DataTypes.INTEGER,
    dueDate: DataTypes.DATE,
    owner: {
      type: DataTypes.INTEGER,
      references: {
        model: 'User',
        key: 'id'
      }
    },
    assignedTo: {
      type: DataTypes.INTEGER,
      references: {
        model: 'Employee',
        key: 'id'
      }
    },
    maintenanceType: DataTypes.INTEGER,
    createdBy: {
      type: DataTypes.INTEGER,
      references: {
        model: 'User',
        key: 'id'
      }
    },
    updatedBy: {
      type: DataTypes.INTEGER,
      references: {
        model: 'User',
        key: 'id'
      }
    },
    archived: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    }
  }, {
    tableName: 'Ticket',
    timestamps: true
  });
  Ticket.associate = function(models) {
    // associations can be defined here
    Ticket.belongsTo(models.Call, { foreignKey: 'callId', as: 'deceded', targetKey: 'id'});
    Ticket.hasMany(models.TicketHistories, {foreignKey: 'ticketId', as: 'ticketHistory', sourceKey:'ticketId'});
    Ticket.belongsTo(models.Employee, { foreignKey: 'assignedTo' , targetKey: 'id', as: 'assignedToId' });
    Ticket.belongsTo(models.User, { foreignKey: 'createdBy' , targetKey: 'id', as: 'createdById' });
    Ticket.belongsTo(models.User, { foreignKey: 'updatedBy' , targetKey: 'id', as: 'updatedById'});
    Ticket.belongsTo(models.User, { foreignKey: 'owner' , targetKey: 'id', as: 'ownedBy'});

    Ticket.hasMany(models.ResourceDocuments, { foreignKey: 'resourceId', constraints: false, scope: {
      resourceType: 'Ticket'
    }, as: 'ticketDocuments'})


      // define the scopes

    Ticket.addScope('withTicketDocuments', {
      include: [
        {
          model: models.ResourceDocuments,
          as: 'ticketDocuments',
          include: [{
            model: models.File,
            as: 'resourceDocumentImageUrl',
            where: {resourceName: 'ResourceDocuments'},
            required: false
          }]
        }
      ]
    })
  };

  return Ticket;
};