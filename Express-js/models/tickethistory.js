'use strict';
module.exports = (sequelize, DataTypes) => {
  const TicketHistories = sequelize.define('TicketHistories', {
    ticketId: {
      type: DataTypes.STRING,
      references: {
        model: 'Ticket',
        key: 'ticketId'
      }
    },
    dueDate: DataTypes.DATE,
    comment: DataTypes.STRING,
    status: DataTypes.INTEGER,
    priority: DataTypes.INTEGER,
    description: DataTypes.STRING,
    assignedTo: {
      type: DataTypes.INTEGER,
      references: {
        model: 'Employee',
        key: 'id'
      }
    },
    createdBy: {
      type: DataTypes.INTEGER,
      references: {
        model: 'User',
        key: 'id'
      }
    },
    archivedAt: DataTypes.DATE,
    createdAt: DataTypes.DATE,
    updatedAt: DataTypes.DATE
  }, {
    tableName: 'TicketHistories',
    timestamps: true
  });
  TicketHistories.associate = function(models) {
    // associations can be defined here
    TicketHistories.belongsTo(models.Ticket, { foreignKey: 'ticketId', targetKey:'id' });
    TicketHistories.belongsTo(models.Employee, { foreignKey: 'assignedTo' , targetKey: 'id', as: 'TicketHistoriesAssignedTo'});
    TicketHistories.belongsTo(models.User, { foreignKey: 'createdBy', targetKey: 'id', as: 'TicketHistoriesCreatedBy' });
  };
  return TicketHistories;
};