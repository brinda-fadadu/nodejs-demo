'use strict';
module.exports = (sequelize, DataTypes) => {
  const Note = sequelize.define('Note', {
    content: DataTypes.TEXT,
    resourceType: DataTypes.STRING,
    resourceId: DataTypes.INTEGER,
    categoryId: {
      type:DataTypes.INTEGER
    },
    level: {
      type: DataTypes.STRING
    },
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
    }
  }, {
    tableName: 'Note',
    timestamps: true
  });

  // Note.declareHooks = function (models) {
  //   Note.addHook('beforeCreate', async (note, options) => {
  //     if(!note.categoryId){
  //       let category = await models.NoteCategory.findOne({
  //         where:{
  //           name:'Call'
  //         }
  //       })
  //       note.categoryId = category.id;
  //     }
  //   })
  // }
  
  Note.associate = function(models) {
    // associations can be defined here
    
    Note.belongsTo(models.Call, { foreignKey: 'resourceId', targetKey: 'id', scope:{
      ResourceType:'Call',
    } });

    Note.belongsTo(models.Person, {
      foreignKey: 'resourceId'
    })

    Note.belongsTo(models.Call, {
      foreignKey:'resourceId', targetKey:'id', scope:{
        ResourceType:'CallReason'
      }
    });

    Note.belongsTo(models.User, {
      foreignKey: 'createdBy', targetKey: 'id', as: 'createdByUser'
    })

    Note.belongsTo(models.User, {
      foreignKey: 'updatedBy', targetKey: 'id', as: 'updatedByUser'
    })

    Note.belongsTo(models.ResourceSection, {
      foreignKey:'resourceId', targetKey:'id', scope:{
        ResourceType:'ResourceSection'
      }
    })

    Note.belongsTo(models.NoteCategory, {
      foreignKey: 'categoryId',
      targetKey:'id',
      as:'NoteCategory'
    });

    Note.hasOne(models.NoteLevel, {
      foreignKey: {
        name: 'noteId',
        allowNull: false
      },
      as: 'noteLevel'
    })

    Note.addScope('withCreatedBy', {
      include: [
        {
            model: models.User,
            as: 'createdByUser',
            attributes: [
              'id',
              'name',
              'email'
            ]
        }
      ]
    })

    Note.addScope('withUpdatedBy', {
      include: [
        {
            model: models.User,
            as: 'updatedByUser',
            attributes: [
              'id',
              'name',
              'email'
            ]
        }
      ]
    })

    Note.addScope('withLevel', {
      include: [
        {
            model: models.NoteLevel,
            as: 'noteLevel',
            attributes: [
              'id',
              'name'
            ]
        }
      ]
    })
  };
  return Note;
};