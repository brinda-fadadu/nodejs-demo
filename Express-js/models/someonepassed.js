'use strict';
module.exports = (sequelize, DataTypes) => {
  const SomeOnePassed = sequelize.define('SomeOnePassed', {
    callId: DataTypes.INTEGER,
    isReadyForPickup: DataTypes.BOOLEAN,
    callerDecedentRelationId: {
      type: DataTypes.INTEGER,
      references: {
        model: 'Relation',
        key: 'id'
      }
    },
    haveFuneralPN: {
      type: DataTypes.BOOLEAN
    },
    haveCemeteryPN: {
      type: DataTypes.BOOLEAN
    },
    funeralHomeChoice: DataTypes.STRING,
    isCallerNok: DataTypes.BOOLEAN,
    cemeteryHomeChoice: DataTypes.STRING,
    isInformantSameAsCaller: DataTypes.BOOLEAN,
    decedentId: DataTypes.INTEGER,
    informantId: DataTypes.INTEGER,
    arrangerEmail: DataTypes.STRING,
    requiredService: DataTypes.STRING,
    informantDecedentRelationId:{
      type: DataTypes.INTEGER,
      references: {
        model: 'Relation',
        key: 'id'
      }
    },
    createdAt: {
      type: DataTypes.DATE,
      defaultValue: Date.now()
    },
    updatedAt: {
      type: DataTypes.DATE,
      defaultValue: Date.now()
    },
    createdBy: {
      type: DataTypes.INTEGER,
      references: {
        model: 'User',
        key: 'id'
      }
    },
    deletedAt: {
      type: DataTypes.DATE
    },
    deletedBy: {
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
    familyArrangerId: {
      type: DataTypes.INTEGER,
      references: {
        model: 'FamilyArranger',
        key: 'id'
      }
    },
    isFaaLocked: DataTypes.BOOLEAN,
  }, {
    tableName: 'SomeOnePassed'
  });
  SomeOnePassed.associate = function(models) {
    // associations can be defined here
    SomeOnePassed.belongsTo(models.Call, {foreignKey: 'callId'} )
    SomeOnePassed.belongsTo(models.Person, {foreignKey: 'decedentId', as: 'decedent'} )
    SomeOnePassed.belongsTo(models.Person, {foreignKey: 'informantId', as: 'informant'} )
    SomeOnePassed.belongsTo(models.Relation, {
      foreignKey: 'callerDecedentRelationId', targetKey: 'id', as: 'callerDecedentRelation'
    })
    SomeOnePassed.belongsTo(models.Relation,{
      foreignKey: 'informantDecedentRelationId', targetKey: 'id', as: 'informantDecedentRelation'
    })
    SomeOnePassed.belongsTo(models.FamilyArranger, {
      foreignKey: 'decedentId', targetKey: 'decedentId', as: 'familyArranger'
    })

    SomeOnePassed.addScope('withVerificationDetails', {
      include: [
        {
          // including the person table as decedent for the someOneHasPassed reason
          model: models.Person.scope('withVerificationDetails', 'withPlace', 'withDeathAndCertifierDetails'),
          as: 'decedent'
        },
        {
          // including the person table as decedent for the someOneHasPassed reason
          model: models.Person.scope('withVerificationDetails', 'withPlace'),
          as: 'informant'
        }
      ]
    })

  };
  return SomeOnePassed;
};