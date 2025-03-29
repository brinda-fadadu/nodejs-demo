'use strict';
const emailWorker = require('../workers/email_worker/CallEmailWorker')
const smsWorker = require('../workers/sms_worker/CallSMSWorker')

module.exports = (sequelize, DataTypes) => {
  const Call = sequelize.define('Call', {
    identifier: {
      type: DataTypes.STRING,
      unique: true
    },
    languageId: {
      type: DataTypes.INTEGER,
      references: {
        model: 'Language',
        key: 'id'
      }
    },
    status: DataTypes.INTEGER,
    receivedLocationId: {
      type: DataTypes.INTEGER,
      references: {
        model: 'Location',
        key: 'id'
      }
    },
    callerId: {
      type: DataTypes.INTEGER,
      references: {
        model: 'Person',
        key: 'id'
      }
    },
    appointmentDate: DataTypes.DATE,
    active: {
      type: DataTypes.BOOLEAN,
      defaultValue: true
    },
    type: {
      type: DataTypes.INTEGER
    },
    reasonId: {
      type: DataTypes.INTEGER
    },
    createdAt: {
      type: DataTypes.DATE
    },
    updatedAt: {
      type: DataTypes.DATE
    },
    createdBy: {
      type: DataTypes.INTEGER,
      references: {
        model: 'User ',
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
    deletedBy: {
      type: DataTypes.INTEGER,
      references: {
        model: 'User',
        key: 'id'
      }
    },
    deletedAt: {
      type: DataTypes.INTEGER,
      references: {
        model: 'User',
        key: 'id'
      }
    },
    archivedAt: {
      type: DataTypes.DATE
    },
    deletedReasonId: {
      type: DataTypes.INTEGER
    },
    // isVerified: {
    //   type: DataTypes.BOOLEAN,
    //   defaultValue: false
    // }
  }, {
    tableName: 'Call'
    });

  Call.declareHooks = function (models) {
    Call.addHook ('beforeCreate', async (call,option) => {
     
    });

    Call.addHook('afterCreate', async (call, options) => {

      const identifier = 'CLS-'+call.id
      call.identifier = identifier

      await call.save({
       ...options,
       hooks: false
      })
    })
  }

  Call.associate = function(models) {
    // associations can be defined here
    Call.hasMany(models.PreArrangement, {foreignKey: 'callId', as: 'preNeedReason'})
    Call.hasMany(models.SomeOnePassed, {foreignKey: 'callId', as: 'someOneHasPassed'})
    Call.hasOne(models.MaintenanceRequest, {foreignKey: 'callId', as: 'maintenanceRequestReason'})
    Call.hasMany(models.GenealogySearchReason, {foreignKey: 'callId', as: 'genealogySearchReason'})
    Call.hasOne(models.OtherRequest, {foreignKey: 'callId', as: 'otherRequest'})
    // Call.hasMany(models.MemorialRestorationReason, {foreignKey: 'callId', as: 'memorialRestoration'})

    Call.belongsTo(models.Location, { foreignKey: 'receivedLocationId', targetKey: 'id', as: 'receivedLocation' })
    // Call.belongsTo(models.Employee, { foreignKey: 'assignedToId', targetKey: 'id', as: 'assignedTo' })
    // joining assigneedTo to many employees
    Call.hasMany(models.CallAssignment, { foreignKey: 'callId', as: 'callsAssigned' })
    Call.belongsTo(models.Person, { foreignKey: 'callerId', targetKey: 'id', as: 'caller' })

    // Call.hasMany(models.CallVerification, { foreignKey: 'callId', as: 'AsCallToCallVerification' })
    // Call.hasMany(models.Note, {
    //   as: 'CallerNotes',
    //   foreignKey: 'ResourceId'
    // });
    // Call.hasMany(models.Note, {
    //   as: 'CallReasonNotes',
    //   foreignKey: 'resourceId'
    // });
    Call.hasMany(models.Ticket, {foreignKey: 'callId', as: 'callTickets',sourceKey:'id'})
    Call.belongsTo(models.User, {foreignKey: 'createdBy'});
    Call.belongsTo(models.User, {foreignKey: 'updatedBy'});
    Call.belongsTo(models.User, {foreignKey: 'deletedBy'});
    // Call.belongsTo(models.Address, {foreignKey:'callerAddressId',as:'CallerAddress'});
    // Call.belongsTo(models.Organization, {foreignKey:'callerOrganizationId',as:'CallerOrganization'});

    Call.hasMany(models.ResourceDocuments, { foreignKey: 'resourceId', constraints: false, scope: {
      resourceType: 'Call'
    }, as: 'callDocuments'})
    
    // defining scopes
    Call.addScope('withCallDocuments', {
      include: [
        {
          model: models.ResourceDocuments,
          as: 'callDocuments',
          include: [{
            model: models.File,
            as: 'resourceDocumentImageUrl',
            where: {resourceName: 'ResourceDocuments'},
            required: false
          }]
        }
      ]
    })

    Call.addScope('fetchingMaintenanceTickets', {
      include: [
        {
          model: models.MaintenanceRequest,
          as: 'maintenanceRequestReason',
          attributes: ['id'],
          required: false,
          include: [
            {
              model: models.MaintenanceRequestCause,
              as: 'maintenanceRequestReasonType',
              attributes: ['id']
            }
          ]
        }
      ]
    })
  };
  return Call;
};
