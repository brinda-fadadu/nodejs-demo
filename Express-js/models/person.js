'use strict';

const esPerson = require('../es_models/person')
const {placeIncludes} = require('../controllers/refactorControllers/commonIncludes')


module.exports = (sequelize, DataTypes) => {
  const Person = sequelize.define('Person', {
    aka:{
      type: DataTypes.STRING
    },
    suffix:{
      type: DataTypes.STRING
    },
    stripeCustomerId:{
      type: DataTypes.STRING
    },
    title: DataTypes.STRING,
    prefix: DataTypes.STRING,
    firstName: DataTypes.STRING,
    middleName: DataTypes.STRING,
    lastName: DataTypes.STRING,
    maidenName: DataTypes.STRING,
    phoneNumber: DataTypes.STRING,
    secondaryPhoneNumber: DataTypes.STRING,
    email: DataTypes.STRING,
    gender: DataTypes.INTEGER,
    maritalStatusId: DataTypes.INTEGER,
    languageId: {
      type: DataTypes.INTEGER,
      references: {
        model: 'Language',
        key: 'id'
      }
    },
    addressPlaceId: {
      type: DataTypes.INTEGER,
      references: {
        model: 'Place',
        key: 'id'
      }
    },
    birthPlaceId: {
      type: DataTypes.INTEGER,
      references: {
        model: 'Place',
        key: 'id'
      }
    },
    isVerified: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    },
    isAlive: {
      type: DataTypes.BOOLEAN,
      defaultValue: true
    },
    dateOfBirth: DataTypes.DATE,
    createdBy:{
      type: DataTypes.INTEGER,
      references:{
        model:'User',
        key:'id'
      }
    },
    updatedBy:{
      type: DataTypes.INTEGER,
      references:{
        model:'User',
        key:'id'
      }
    },
    deletedBy:{
      type: DataTypes.INTEGER,
      references:{
        model:'User',
        key:'id'
      }
    },
    deletedAt:{
      type: DataTypes.DATE
    },
    pictureUrl: {
      type: DataTypes.STRING
    },
    preferredFirstName: {
      type: DataTypes.STRING
    },
    preferredMiddleName: {
      type: DataTypes.STRING
    },
    preferredLastName: {
      type: DataTypes.STRING
    },
    hmisNameId: {
      type: DataTypes.INTEGER
    },
    createdAtApp: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    }
  }, {
    tableName: 'Person',
    timestamps: true
  });

  Person.associate = function(models) {
    // Associations can be defined here
    Person.belongsTo(models.User, {foreignKey:'createdBy'});
    Person.hasOne(models.CaseInfoForm, { sourceKey: 'id',targetKey:'personId' });
    Person.belongsTo(models.User, {foreignKey:'updatedBy'});
    Person.belongsTo(models.User, {foreignKey: 'deletedBy'});
    Person.hasOne(models.SomeOnePassed, {sourceKey: 'id', foreignKey:'decedentId'})
    Person.hasOne(models.FamilyArranger, {sourceKey: 'id', foreignKey:'decedentId'})
    Person.hasOne(models.GenealogySearchReason, {sourceKey: 'id', foreignKey:'decedentId'});
    Person.hasOne(models.PreArrangement, {sourceKey: 'id', foreignKey:'beneficiaryId'});
    Person.hasOne(models.DeathDetails, {sourceKey: 'id', foreignKey:'personId', as: 'deathDetails'});
    Person.belongsTo(models.MaritalStatus, {foreignKey:'maritalStatusId', as:'maritalStatus'});    
    Person.hasOne(models.PersonRemainsInfo, {foreignKey: 'personId'})    
    Person.belongsTo(models.Place, { foreignKey: 'addressPlaceId', as: 'addressPlace'})    
    Person.belongsTo(models.Place, { foreignKey: 'birthPlaceId', as: 'birthPlace'})    
    // Person.hasOne(models.Arrangement, {sourceKey: 'id', foreignKey:'personId', as:'PersonAsArrangement'})
    Person.hasMany(models.PersonContact, { foreignKey: 'personId'})
    Person.hasMany(models.PersonContact, { foreignKey: 'resourceId', constraints: false, scope: {
      resourceType: 'Person'
    }})
    Person.hasOne(models.PersonVerificationDetails, { foreignKey: 'personId', as: 'personVerificationDetails'})
    Person.hasMany(models.PersonRemainsTransfer, { foreignKey: 'personId'})
    Person.hasMany(models.Obituary, {foreignKey: 'personId', as: 'obituaryDetails'})
    Person.hasMany(models.ObituaryFile, {foreignKey: 'personId', as: 'obituaryFileDetails'})
    Person.hasMany(models.PersonRemainsTransfer, { foreignKey: 'personId', as:'personRemainsTransferInfo'})
    Person.hasOne(models.PersonEthnicity, { foreignKey: 'personId'})
    Person.hasOne(models.EducationDetails, { foreignKey: 'personId'})
    Person.hasOne(models.Veteran, { foreignKey: 'personId'})
    Person.hasOne(models.File, {
      sourcekey: 'id',
      foreignKey: 'resourceId',
      as: 'personPictureUrl'
    })
    // Person.hasMany(models.Payment, {foreignKey: 'payorId', as: 'Transactions'})
    Person.hasMany(models.AgreementPerson, {foreignKey: 'personId', as: 'agreementPersons'})
    Person.hasMany(models.ScheduledFuneralService, {foreignKey: 'personId', as: 'scheduledFuneralServices'})
    Person.hasMany(models.ScheduledCemeteryService, {foreignKey: 'personId', as: 'scheduledCemeteryServices'})

    Person.hasMany(models.Note, {
      as: 'PersonNotes',
      foreignKey: 'resourceId'
    })

    Person.hasMany(models.ItemUsage, {
      foreignKey: 'personId',
      as: 'itemUsages'
    })

    Person.addScope('notDeleted', {
      where: {
        deletedAt: null,
        deletedBy: null
      }
    })

    Person.addScope('withDeathDetails', {
      include: [
        {
            model: models.DeathDetails,
            as: 'deathDetails',
            include: [
              {
                model: models.Place,
                as: 'lor',
                include: [
                    {
                        model: models.Organization,
                        as: 'organization'
                    },
                    {
                        model: models.Address,
                        as: 'address'
                    }
                ]
              },
              {
                model: models.Place,
                as: 'deathPlace',
                include: [
                    {
                        model: models.Organization,
                        as: 'organization',
                        include: [
                            {
                              model: models.OrganizationType,
                              as: 'organizationType'
                            }
                          ]
                    },
                    {
                        model: models.Address,
                        as: 'address'
                    }
                ]
            }
            ]
        }
      ]
    })
    Person.addScope('withDeathAndCertifierDetails', {
      include: [
        {
          model: models.DeathDetails,
          as: 'deathDetails',
          include: [
            {
              model: models.Place,
              as: 'lor',
              include: [
                {
                  model: models.Organization,
                  as: 'organization'
                },
                {
                  model: models.Address,
                  as: 'address'
                }
              ]
            },
            {
              model: models.Place,
              as: 'deathPlace',
              include: [
                {
                  model: models.Organization,
                  as: 'organization',
                  include: [
                    {
                      model: models.OrganizationType,
                      as: 'organizationType'
                    }
                  ]
                },
                {
                  model: models.Address,
                  as: 'address'
                }
              ]
            },
            {
              model: models.Certifier,
              as: 'certifier',
              include: [
                {
                  model: models.Person,
                  as: 'certifierPerson',
                  where: {
                    deletedAt: null,
                    deletedBy: null
                  },
                  include: [
                    {
                      model: models.Place,
                      as: 'addressPlace',
                      include: [
                        {
                          model: models.Organization,
                          as: 'organization'
                        },
                        {
                          model: models.Address,
                          as: 'address'
                        }
                      ]
                    }
                  ]
                }
              ]
            }
          ]
        }
      ]
    })
    Person.addScope('withPlace', {
      include: [
        {
          model: models.Place,
          as: 'addressPlace',
          include: [
            {
                model: models.Organization,
                as: 'organization'
            },
            {
                model: models.Address,
                as: 'address'
            }
        ]
        }
      ]
    })

    Person.addScope('withBirthPlace', {
      include: [
        {
          model: models.Place,
          as: 'birthPlace',
          include: [
            {
                model: models.Organization,
                as: 'organization'
            },
            {
                model: models.Address,
                as: 'address'
            }
        ]
        }
      ]
    })

    Person.addScope('withVerificationDetails', {
      include: [
        {
          model: models.PersonVerificationDetails,
          as: 'personVerificationDetails'
        }
      ]
    })

    Person.addScope('withVerificationDetailsUnscoped', {
      include: [
        {
          model: models.PersonVerificationDetails.unscoped(),
          as: 'personVerificationDetails'
        }
      ]
    })
    
    Person.addScope('withMaritalStatus', {
      include: [
        {
          model: models.MaritalStatus,
          as: 'maritalStatus'
        }
      ]
    })

    Person.addScope('withObituaryDetails', {
      include: [
        {
            model: models.Obituary,
            as: 'obituaryDetails',
            include: [
                {
                    model: models.User,
                    attributes: ['name']
                }
            ],
            order: [
                ['createdAt', 'DESC']
            ],
            limit: 1
        },
        {
            model: models.ObituaryFile,
            as: 'obituaryFileDetails',
            include: [
                {
                    model: models.User,
                    attributes: ['name']
                }, {
                  model: models.File,
                  as: 'obituaryFileAudioUrl',
                  where: { resourceName: 'ObituaryFile' },
                  required: false
              }
            ],
            order: [
                ['createdAt', 'DESC']
            ],
            limit: 1
        },
        {
            model: models.DeathDetails,
            as: 'deathDetails',
            attributes: ['dateOfDeath']
        },
        {
            model: models.File,
            as: 'personPictureUrl',
            where: { resourceName: 'Person' },
            required: false
        }
    ]
    })
  };

  // Person.beforeCreate(function(person) {
  //   person.setDataValue('ssnSalt', encryptionUtil.generateSalt())
  // })
  Person.afterDestroy(esPerson.delete)

  Person.afterUpdate(async (person, options) => {
    const changed = person.changed()
    if(changed && changed.includes('email') && person.stripeCustomerId){
      const { stripeClient } = require('../services').stripe
      const updatedCustomer = await stripeClient.updateCustomer(person, {})
      
    }
  })

  Person.prototype.toJSON = function(){
    const values = Object.assign({}, this.get())
    delete values.ssnSalt
    delete values.ssnEncrypted
    return values
  }

  return Person;
};
