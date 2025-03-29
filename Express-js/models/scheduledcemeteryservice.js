'use strict'
module.exports = (sequelize, DataTypes) => {
  const ScheduledCemeteryService = sequelize.define(
    'ScheduledCemeteryService',
    {
      personId: DataTypes.INTEGER,
      itemUsageId: DataTypes.INTEGER,
      intermentInformationSectionId: DataTypes.INTEGER,
      disintermentInfoSectionId: DataTypes.INTEGER,
      intermentRequestSectionId: DataTypes.INTEGER,
      vaultSectionId: DataTypes.INTEGER,
      casketSectionId: DataTypes.INTEGER,
      urnInformationSectionId: DataTypes.INTEGER,
      merchandiseAdditionalInfoSectionId: DataTypes.INTEGER,
      genericSectionId: DataTypes.INTEGER,
      funeralArrangementSectionId: DataTypes.INTEGER,
      createdBy: DataTypes.INTEGER,
      updatedBy: DataTypes.INTEGER,
      deletedBy: DataTypes.INTEGER,
      deletedAt: DataTypes.DATE,
      agreementLocationItemId: DataTypes.INTEGER
    },
    {
      tableName: 'ScheduledCemeteryService',
      timestamps: true
    }
  )
  ScheduledCemeteryService.associate = function(models) {
    // associations can be defined here
    ScheduledCemeteryService.belongsTo(models.IntermentInformationSection, {
      foreignKey: 'intermentInformationSectionId',
      as: 'intermentInformationDetails'
    })
    ScheduledCemeteryService.belongsTo(models.IntermentRequestSection, {
      foreignKey: 'intermentRequestSectionId',
      as: 'intermentRequestDetails'
    })

    ScheduledCemeteryService.belongsTo(models.VaultSection, {
      foreignKey: 'vaultSectionId',
      as: 'vaultItemUsageDetails',
      scope: {
        ResourceType: 'ItemUsage'
      }
    })
    ScheduledCemeteryService.belongsTo(models.VaultSection, {
      foreignKey: 'vaultSectionId',
      as: 'vaultItemDetails',
      scope: {
        ResourceType: 'AgreementLocationItem'
      }
    })

    ScheduledCemeteryService.belongsTo(models.VaultSection, {
      foreignKey: 'vaultSectionId',
      as: 'vaultDetails',
      scope: {
        ResourceType: null
      }
    })
    ScheduledCemeteryService.belongsTo(models.MerchandiseAdditionalInfoSection, {
        foreignKey: 'merchandiseAdditionalInfoSectionId',
        as: 'merchandiseAdditionalInfoDetails'
    })
    ScheduledCemeteryService.belongsTo(models.GenericSection, {
      foreignKey: 'genericSectionId',
      as: 'genericDetails'
    })
    ScheduledCemeteryService.belongsTo(models.DisintermentInfoSection, {
      foreignKey: 'disintermentInfoSectionId',
      as: 'disintermentInformationDetails'
    })
    ScheduledCemeteryService.belongsTo(models.FuneralArrangementSection, {
      foreignKey: 'funeralArrangementSectionId',
      as: 'funeralArrangementDetails'
    })
    ScheduledCemeteryService.belongsTo(models.CasketSection, {
      foreignKey: 'casketSectionId',
      as: 'casketItemUsageDetails',
      scope: {
        ResourceType: 'ItemUsage'
      }
    })
    ScheduledCemeteryService.belongsTo(models.CasketSection, {
      foreignKey: 'casketSectionId',
      as: 'casketItemDetails',
      scope: {
        ResourceType: 'AgreementLocationItem'
      }
    })
    ScheduledCemeteryService.belongsTo(models.CasketSection, {
      foreignKey: 'casketSectionId',
      as: 'casketDetails',
      scope: {
        ResourceType: null
      }
    })
    ScheduledCemeteryService.belongsTo(models.UrnInformationSection, {
      foreignKey: 'urnInformationSectionId',
      as: 'urnInformationItemUsageDetails',
      scope: {
        ResourceType: 'ItemUsage'
      }
    })
    ScheduledCemeteryService.belongsTo(models.UrnInformationSection, {
      foreignKey: 'urnInformationSectionId',
      as: 'urnInformationItemDetails',
      scope: {
        ResourceType: 'AgreementLocationItem'
      }
    })
    ScheduledCemeteryService.belongsTo(models.UrnInformationSection, {
      foreignKey: 'urnInformationSectionId',
      as: 'urnInformationDetails',
      scope: {
        ResourceType: null
      }
    })
    ScheduledCemeteryService.hasMany(models.Note, {
      as: 'notesSections',
      foreignKey: 'resourceId'
    })
    ScheduledCemeteryService.hasOne(models.WorkOrder, {
      foreignKey: 'resourceId',
      as: 'workOrder',
      scope: {
        resourceType: 'ScheduledCemeteryService'
      }
    })
    ScheduledCemeteryService.hasOne(models.SchedulingFile, { foreignKey: 'schedulingId', as: 'schedulingFile' })
    ScheduledCemeteryService.addScope('intermentInformationSectionScope', {
      include: [
        {
          model: models.IntermentInformationSection.scope('intermentInfoPropertiesScope'),
          as: 'intermentInformationDetails',
          attributes: [
            'id',
            'beginningTime',
            'endingTime',
            'memorialInformation',
            'isPreburied',
            'temporaryBurialLocationId',
            'temporaryDisintermentLocationId',
            'cremationType'
          ]
        }
      ]
    })
    ScheduledCemeteryService.addScope('intermentRequestSectionScope', {
      include: [
        {
          model: models.IntermentRequestSection,
          as: 'intermentRequestDetails'
        }
      ]
    })
    ScheduledCemeteryService.addScope('merchandiseAdditionalInfoSectionScope', {
      include: [
        {
          model: models.MerchandiseAdditionalInfoSection,
          as: 'merchandiseAdditionalInfoDetails'
        }
      ]
    })
    ScheduledCemeteryService.addScope('genericSectionScope', {
      include: [
        {
          model: models.GenericSection,
          as: 'genericDetails'
        }
      ]
    })
    ScheduledCemeteryService.addScope('disintermentInfoSectionScope', {
      include: [
        {
          model: models.DisintermentInfoSection.scope('disintermentInfoPropertiesScope'),
          as: 'disintermentInformationDetails'
        }
      ]
    })
    ScheduledCemeteryService.belongsTo(models.Person, { foreignKey: 'personId', as: 'person'})
    ScheduledCemeteryService.belongsTo(models.ItemUsage, { foreignKey: 'itemUsageId', as: 'itemUsage'})
    ScheduledCemeteryService.belongsTo(models.AgreementLocationItem, { foreignKey: 'agreementLocationItemId', as: 'agreementLocationItem'})
    ScheduledCemeteryService.addScope('FuneralArrangementSectionScope', {
      include: [
        {
          model: models.FuneralArrangementSection,
          as: 'funeralArrangementDetails',
          attributes: { exclude: ['clFacilityLocationId', 'serviceLocationId', 'funeralDirectorId'] },
          include: [
            {
              model: models.Location,
              as: 'clFacilityLocation'
            },
            {
              model: models.Place,
              as: 'serviceLocation',
              attributes: ['id'],
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
              model: models.Employee,
              as: 'funeralDirectorDetails',
              attributes: ['id', 'name', 'phoneNumber', 'email'],
              include: [
                {
                  model: models.EmployeeType,
                  as: 'employeeType',
                  attributes: ['id', 'code', 'description']
                }
              ]
            },
            {
              model: models.FuneralArrangementSectionLocation,
              attributes: { exclude: ['funeralArrangementSectionId'] },
              as: 'funeralArrangementSectionLocations'
            }
          ]
        }
      ]
    })
    ScheduledCemeteryService.addScope('casketSectionScope', {
      include: [
        {
          model: models.CasketSection,
          where: { resourceType: 'ItemUsage' },
          attributes: { exclude: ['casketId'] },
          required: false,
          as: 'casketItemUsageDetails',
          include: [
            {
              model: models.ItemUsage,
              attributes: ['id'],
              include: [
                {
                  model: models.AgreementLocationItem,
                  as: 'agreementItems',
                  attributes: ['id'],
                  include: [
                    {
                      model: models.Agreement,
                      as: 'agreementDetails',
                      attributes: ['contractNumber', 'type']
                    },
                    {
                      model: models.Addendum,
                      as: 'addendumDetails',
                      attributes: ['addendumNumber']
                    },
                    {
                      model: models.LocationItem,
                      as: 'locationItem',
                      attributes: ['id'],
                      include: [
                        {
                          model: models.Item,
                          attributes: ['id', 'name'],
                          include: [
                              {
                                  model: models.ItemAttributeValue,
                                  as: 'itemAttributes',
                                  attributes: ['id'],
                                  required: false,
                                  include: [
                                      {
                                          model: models.AttributeValue,
                                          attributes: ['id', 'name'],
                                          required: false
                                      }
                                  ]
                              }
                          ]
                        }
                      ]
                    }
                  ]
                },
                {
                  model: models.PurchaseOrderItem,
                  as: 'poItemDetails'
                }
              ]
            }
          ]
        },
        {
          model: models.CasketSection,
          where: { resourceType: 'AgreementLocationItem' },
          required: false,
          attributes: { exclude: ['casketId'] },
          as: 'casketItemDetails',
          include: [
            {
              model: models.AgreementLocationItem,
              as: 'casket',
              attributes: ['id'],
              include: [
                {
                  model: models.Agreement,
                  as: 'agreementDetails',
                  attributes: ['contractNumber', 'type']
                },
                {
                  model: models.Addendum,
                  as: 'addendumDetails',
                  attributes: ['addendumNumber']
                },
                {
                  model: models.LocationItem,
                  as: 'locationItem',
                  attributes: ['id'],
                  include: [
                    {
                      model: models.Item,
                      attributes: ['id', 'name'],
                      include: [
                          {
                              model: models.ItemAttributeValue,
                              as: 'itemAttributes',
                              attributes: ['id'],
                              required: false,
                              include: [
                                  {
                                      model: models.AttributeValue,
                                      attributes: ['id', 'name'],
                                      required: false
                                  }
                              ]
                          }
                      ]
                    }
                  ]
                },
                {
                  model: models.PurchaseOrder,
                  as: 'purchaseOrder',
                  include: [
                    {
                      model: models.PurchaseOrderItem,
                      as: 'purchaseOrderItems'
                    }
                  ]
                }
              ]
            }
          ]
        },{
          model: models.CasketSection,
          where: { resourceType: null },
          required: false,
          attributes: { exclude: ['casketId'] },
          as: 'casketDetails', 
        }
      ]
    })

    ScheduledCemeteryService.addScope('vaultSectionScope', {
      include: [
        {
          model: models.VaultSection,
          where: { resourceType: 'ItemUsage' },
          required: false,
          attributes: { exclude: ['vaultId'] },
          as: 'vaultItemUsageDetails',
          include: [
            {
              model: models.ItemUsage,
              attributes: ['id'],
              include: [
                {
                  model: models.AgreementLocationItem,
                  as: 'agreementItems',
                  attributes: ['id'],
                  include: [
                    {
                      model: models.Agreement,
                      as: 'agreementDetails',
                      attributes: ['contractNumber', 'type']
                    },
                    {
                      model: models.Addendum,
                      as: 'addendumDetails',
                      attributes: ['addendumNumber']
                    },
                    {
                      model: models.LocationItem,
                      as: 'locationItem',
                      attributes: ['id'],
                      include: [
                        {
                          model: models.Item,
                          attributes: ['id', 'name']
                        }
                      ]
                    }
                  ]
                },
                {
                  model: models.PurchaseOrderItem,
                  as: 'poItemDetails'
                }
              ]
            }
          ]
        },
        {
          where: { resourceType: 'AgreementLocationItem' },
          required: false,
          model: models.VaultSection,
          as: 'vaultItemDetails',
          attributes: { exclude: ['vaultId'] },
          include: [
            {
              model: models.AgreementLocationItem,
              as: 'vault',
              attributes: ['id'],
              include: [
                {
                  model: models.Agreement,
                  as: 'agreementDetails',
                  attributes: ['contractNumber', 'type']
                },
                {
                  model: models.Addendum,
                  as: 'addendumDetails',
                  attributes: ['addendumNumber']
                },
                {
                  model: models.LocationItem,
                  as: 'locationItem',
                  attributes: ['id'],
                  include: [
                    {
                      model: models.Item,
                      attributes: ['id', 'name']
                    }
                  ]
                },
                {
                  model: models.PurchaseOrder,
                  as: 'purchaseOrder',
                  include: [
                    {
                      model: models.PurchaseOrderItem,
                      as: 'purchaseOrderItems'
                    }
                  ]
                }
              ]
            }
          ]
        },
        {
          where: { resourceType: null },
          required: false,
          model: models.VaultSection,
          as: 'vaultDetails',
          attributes: { exclude: ['vaultId'] }
        }
      ]
    })

    ScheduledCemeteryService.addScope('urnInformationScope', {
      include: [
        {
          model: models.UrnInformationSection,
          where: { resourceType: 'ItemUsage' },
          required: false,
          attributes: { exclude: ['urnId'] },
          as: 'urnInformationItemUsageDetails',
          include: [
            {
              model: models.ItemUsage,
              attributes: ['id'],
              include: [
                {
                  model: models.AgreementLocationItem,
                  as: 'agreementItems',
                  attributes: ['id'],
                  include: [
                    {
                      model: models.Agreement,
                      as: 'agreementDetails',
                      attributes: ['contractNumber', 'type']
                    },
                    {
                      model: models.Addendum,
                      as: 'addendumDetails',
                      attributes: ['addendumNumber']
                    },
                    {
                      model: models.LocationItem,
                      as: 'locationItem',
                      attributes: ['id'],
                      include: [
                        {
                          model: models.Item,
                          attributes: ['id', 'name']
                        }
                      ]
                    }
                  ]
                },
                {
                  model: models.PurchaseOrderItem,
                  as: 'poItemDetails'
                }
              ]
            },
            {
              model: models.AttributeValue,
              as: 'urnTypeDetails',
              attributes: ['id', 'name']
            }
          ]
        },
        {
          model: models.UrnInformationSection,
          where: { resourceType: 'AgreementLocationItem' },
          attributes: { exclude: ['urnId'] },
          required: false,
          as: 'urnInformationItemDetails',
          include: [
            {
              model: models.AgreementLocationItem,
              as: 'urn',
              attributes: ['id'],
              include: [
                {
                  model: models.Agreement,
                  as: 'agreementDetails',
                  attributes: ['contractNumber', 'type']
                },
                {
                  model: models.Addendum,
                  as: 'addendumDetails',
                  attributes: ['addendumNumber']
                },
                {
                  model: models.LocationItem,
                  as: 'locationItem',
                  attributes: ['id'],
                  include: [
                    {
                      model: models.Item,
                      attributes: ['id', 'name']
                    }
                  ]
                },
                {
                  model: models.PurchaseOrder,
                  as: 'purchaseOrder',
                  include: [
                    {
                      model: models.PurchaseOrderItem,
                      as: 'purchaseOrderItems'
                    }
                  ]
                }
              ]
            },
            {
              model: models.AttributeValue,
              as: 'urnTypeDetails',
              attributes: ['id', 'name']
            }
          ]
        },
        {
          where: { resourceType: null },
          required: false,
          model: models.UrnInformationSection,
          as: 'urnInformationDetails',
          attributes: { exclude: ['urnId'] },
          include:[{
            model: models.AttributeValue,
            as: 'urnTypeDetails',
            attributes: ['id', 'name'],
            include: [
              {
                  model: models.Attribute,
                  as: 'attribute',
                  where: {
                      name: 'Urn Type'
                  },
                  attributes: []
              }
          ]
          }]
        }
      ]
    })

    ScheduledCemeteryService.addScope('noteSectionsScope', {
      include: [
        {
          model: models.Note,
          as: 'notesSections',
          required: false,
          where: { resourceType: 'ScheduledCemeteryService' },
          attributes: ['id', 'content', 'categoryId', 'createdAt'],
          include: [
            {
              model: models.User,
              as: 'createdByUser',
              attributes: ['name']
            },
            {
              model: models.NoteLevel,
              as: 'noteLevel',
              attributes: ['name']
            },
            {
              model: models.NoteCategory,
              as: 'NoteCategory',
              where: { name: 'Cemetery Scheduling' },
              attributes: []
            }
          ]
        }
      ]
    })
    ScheduledCemeteryService.addScope('personScope', {
      include: [{
        model: models.Person.scope('withVerificationDetails'),
        as: 'person',
        attributes: ['id', 'firstName', 'middleName', 'lastName',]
      }]
    })
    ScheduledCemeteryService.addScope('itemUsageScope', {
      include: [{
        model: models.ItemUsage,
        as: 'itemUsage',
        where: { resourceType: 'AgreementLocationItem' },
        attributes: ['id'],
        include: [
          {
            model: models.AgreementLocationItem,
            as: 'agreementItems',
            attributes: ['id'],
            include: [
              {
                model: models.LocationItem.scope('withSchedulingService'),
                as: 'locationItem',
                attributes: ['id']
              }, 
              {
                model: models.Agreement,
                as: 'agreementDetails',
                attributes: ['type', 'contractNumber', 'arrangerId'],
                include: [
                  {
                    model: models.Employee,
                    as: 'arranger'
                  },
                  {
                    model: models.Location,
                    as: 'location'
                  }
                ]
              },
              {
                model: models.Addendum,
                as: 'addendumDetails',
              }
            ]
          }
        ]
      }]
    })
    ScheduledCemeteryService.addScope('miscServiceItemScope', (required = true) => ({
      include: [
        {
          model: models.AgreementLocationItem,
          as: 'agreementLocationItem',
          required: required,
          attributes: ['id'],
          include: [
            {
              model: models.LocationItem.scope('withSchedulingService'),
              as: 'locationItem',
              attributes: ['id']
            }, 
            {
              model: models.Agreement,
              as: 'agreementDetails',
              attributes: ['type', 'contractNumber', 'arrangerId'],
              include: [
                {
                  model: models.Employee,
                  as: 'arranger'
                },
                {
                  model: models.Location,
                  as: 'location'
                }
              ]
            },
            {
              model: models.Addendum,
              as: 'addendumDetails',
            }
          ]
        }
      ]
    }))
    ScheduledCemeteryService.addScope('workOrderScope', {
      include: [{
        model: models.WorkOrder,
        as: 'workOrder',
        where: {
          resourceType: 'ScheduledCemeteryService'
        },
        include: [
          {
            model: models.WorkOrderDetail,
            as: 'workOrderDetail',
            include: [
              {
                model: models.CremationStatus,
                as: 'cremationStatus'
              }
            ]
          },
          {
            model: models.EmployeeSchedule,
            as: 'assignedResources',
            where:{
              deletedAt : null,
              deletedBy: null
            },
            include: [
              {
                model: models.Employee,
                as: 'employee'
              }
            ]
          }
        ]
      }]
    })
    ScheduledCemeteryService.addScope('workOrderScopeDaySheet', (categoryId, crWhere, crRequired) => ({
      include: [{
        model: models.WorkOrder,
        where: {
          resourceType: 'ScheduledCemeteryService'
        },
        as: 'workOrder',
        include: [
          {
            model: models.WorkOrderDetail.scope('notDeleted'),
            as: 'workOrderDetail',
            include: [
              {
                model: models.CremationStatus,
                as: 'cremationStatus'
              },
              {
                model: models.CrematoryRetorts,
                as: 'crematoryRetort',
                where: crWhere,
                required: crRequired
              }
            ],
            required: crRequired
          },
          {
            model: models.WorkOrderChamberAccountabilityLog,
            as: 'ChamberAccountabilityLog',
            where:{
              "type":"chamberPlacement"
            },
            required: false,
            include :[
              {
              model: models.CrematoryRetorts,
              as: 'chamber',
              required: false,
              }
            ]
          },
          {
            model: models.EmployeeSchedule,
            as: 'assignedResources',
            where:{
              deletedAt : null,
              deletedBy: null
            },
            required: false,
            include: [
              {
                model: models.Employee,
                as: 'employee'
              }
            ]
          },
          {
            model: models.Note,
            as: 'notes',
            required: false,
            where: {
              categoryId: categoryId,
              resourceType: 'WorkOrder'
            }

          }
        ]
      }]
    }))
    ScheduledCemeteryService.addScope('workOrderStatusScope', {
      include: [{
        model: models.WorkOrder,
         where: {
          resourceType: 'ScheduledCemeteryService'
        },
        as: 'workOrder',
        include: [
          {
            model: models.WorkOrderStatus,
            as: 'status'
          }
        ]
      }]
    })
    ScheduledCemeteryService.addScope('workOrderNotesScope', {
      include: [{
        model: models.WorkOrder,
        as: 'workOrder',
        include: [
          {
            model: models.Note,
            as: 'notes',
            required: false,
            where: {
              resourceType: 'WorkOrder'
            }
          },
          {
            model: models.WorkOrderDetail,
            as: 'workOrderDetail',
            include: [
              {
                model: models.CrematoryRetorts,
                as: 'crematoryRetort'
              }
            ]
          }
        ]
      }]
    })
    ScheduledCemeteryService.addScope('closedWorkOrderScope', noteCategoryId => ({
      include: [
        {
          model: models.WorkOrder,
          where: {
            resourceType: 'ScheduledCemeteryService'
          },
          as: 'workOrder',
          include: [
              {
                  model: models.WorkOrderStatus,
                  as: 'status',
                  where: {
                      name: 'closed'
                  }
              },
              {
                  model: models.Note,
                  as: 'notes',
                  where: {
                      categoryId: noteCategoryId,
                      resourceType: 'WorkOrder'
                  },
                  required: false
              }
          ]
      }
      ]
    }))
    ScheduledCemeteryService.addScope('schedulingFileScope', {
      include: [{
        model: models.SchedulingFile,
        as: 'schedulingFile',
        where: { schedulingType: 'cemetery' },
        required: false,
        include: [{
          model: models.File,
          as: 'schedulingFileUrl',
          where: { resourceName: 'SchedulingFile' },
          required: false
        }]
      }]
    })
    ScheduledCemeteryService.hasMany(models.UrnTransfer, { foreignKey: 'resourceId', as: 'resourcesCemeteryUrnTransferDetails' })
  }
  return ScheduledCemeteryService
}
