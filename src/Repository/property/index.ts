import { Repository } from "../IRepository";

import {
  PropertyInput,
  Property,
  UnitInput,
  Unit,
  UnitType,
} from "../../types";

interface IProperty extends PropertyInput {
  managerId: string;
  imageUrl: string;
}

interface IUnit extends UnitInput {
  imageUrl: string;
}
export interface IPropertyRepository {
  createProperty(property: IProperty): Promise<Property>;
  createUnit(unit: IUnit): Promise<Unit>;
  fetchUnits(propertyId: string): Promise<Array<Unit> | null>;
  fetchUnit(unitId: string): Promise<Unit | null>;
  fetchPublicListings(): Promise<Array<Property> | null>;
  fetchPrivateListings(pmId: string): Promise<Array<Property> | null>;
  updateUnit(unit: Partial<Unit>): Promise<Unit>;
  updateProperty(
    property: Partial<Omit<Property, "propertyUnits" | "manager">>
  ): Promise<Omit<Property, "propertyUnits" | "manager">>;
  deleteUnit(id: string): Promise<Unit | null>;
  deleteProperty(id: string): Promise<Property | null>;
  addOccupant(unitId: string, tenantId: string): Promise<Unit>;
  leaveUnit(unitId: string, tenantId: string): Promise<Unit>;
  countNoTenants(propertyId: string): Promise<number>;
  countNoUnits(propertyId: string): Promise<number>;
  countNoPropertiesListings(managerId: string): Promise<number>;
}

export class PropertyRepository
  extends Repository
  implements IPropertyRepository
{
  countNoTenants = async (propertyId: string): Promise<number> => {
    const tenantCount = await this.client.tenants.count({
      where: {
        id: propertyId,
      },
    });

    return tenantCount;
  };
  countNoUnits = async (propertyId: string): Promise<number> => {
    //count no of units currently occupied
    const unitCount = await this.client.unit.count({
      where: {
        occupiedBy: {
          unit: {
            propertyId,
          },
        },
      },
    });
    return unitCount;
  };
  countNoPropertiesListings = async (managerId: string): Promise<number> => {
    const propertyCount = await this.client.property.count({
      where: {
        managerId,
      },
    });
    return propertyCount;
  };
  private _propertyProjections = {
    id: true,
    name: true,
    contact: true,
    imageUrl: true,
    lat: true,
    long: true,
    phoneNumber: true,
    manager: true,
    units: true,
  };
  createProperty = async ({
    contact,
    imageUrl,
    lat,
    long,
    name,
    managerId,
    phoneNumber,
  }: IProperty): Promise<Property> => {
    const results = await this.client.property.create({
      data: {
        contact,
        imageUrl,
        name,
        phoneNumber,
        managerId,
        long,
        lat,
      },
      include: {
        manager: {
          include: {
            user: true,
          },
        },
      },
    });
    return {
      id: results.id,
      name: results.name,
      imageUrl: results.imageUrl,
      contact: results.contact,
      phoneNumber: results.phoneNumber,
      lat: results.lat,
      long: results.long,
      manager: {
        id: results.manager.id,
        user: {
          id: results.manager.user?.id,
          email: results.manager.user?.email!,
          name: results.manager.user?.name!!,
          phoneNumber: results.manager.user?.phoneNumber!,
          profileImage: results.manager.user?.profileImage!,
          role: results.manager.user?.role!,
          accountState: results.manager.user?.accountStatus!,
          placementDate: results.manager.user?.placementDate.toTimeString()!,
          // id:results.manager.user?.id!,
        },
      },
      propertyUnits: [],
    };
  };

  createUnit = async ({
    bedrooms,
    propertyOverview,
    ...rest
  }: IUnit): Promise<Unit> => {
    console.log({ bedrooms, propertyOverview, ...rest });
    const result = await this.client.unit.create({
      data: {
        ...rest,
        bedRooms: bedrooms,
        propertyOverview: propertyOverview as Array<string>,
      },
    });
    return {
      ...result,
      currentTenant: null,
      bedrooms: result.bedRooms,
      type: generateUnittype(result as unknown as Unit),
    };
  };
  fetchUnits = async (propertyId: string): Promise<Unit[]> => {
    const result = await this.client.unit.findMany({
      where: {
        propertyId,
      },
      include: {
        occupiedBy: {
          include: {
            tenant: {
              include: { user: true },
            },
          },
        },
      },
    });
    return result.map((u) => {
      return {
        ...u,
        currentTenant:
          u.occupiedBy !== null
            ? {
                id: u.occupiedBy.id,
                user: {
                  id: u.occupiedBy?.tenant.user?.id,
                  email: u.occupiedBy?.tenant.user?.email!,
                  name: u.occupiedBy?.tenant.user?.name!!,
                  phoneNumber: u.occupiedBy?.tenant.user?.phoneNumber!,
                  profileImage: u.occupiedBy?.tenant.user?.profileImage!,
                  role: u.occupiedBy?.tenant.user?.role!,
                  accountState: u.occupiedBy?.tenant.user?.accountStatus!,
                  placementDate:
                    u.occupiedBy?.tenant.user?.placementDate.toTimeString()!,
                },
              }
            : null,
        type: generateUnittype(u as unknown as Unit),
        bedrooms: u.bedRooms,
      };
    });
  };
  fetchUnit = async (unitId: string): Promise<Unit | null> => {
    const unit = await this.client.unit.findFirst({
      where: {
        id: unitId,
      },
      include: {
        occupiedBy: {
          include: {
            tenant: {
              include: { user: true },
            },
          },
        },
      },
    });
    return unit === null
      ? null
      : {
          ...unit,
          id: unit?.id,
          currentTenant:
            unit.occupiedBy !== null
              ? {
                  id: unit.occupiedBy.id,
                  user: {
                    id: unit.occupiedBy?.tenant.user?.id,
                    email: unit.occupiedBy?.tenant.user?.email!,
                    name: unit.occupiedBy?.tenant.user?.name!!,
                    phoneNumber: unit.occupiedBy?.tenant.user?.phoneNumber!,
                    profileImage: unit.occupiedBy?.tenant.user?.profileImage!,
                    role: unit.occupiedBy?.tenant.user?.role!,
                    accountState: unit.occupiedBy?.tenant.user?.accountStatus!,
                    placementDate:
                      unit.occupiedBy?.tenant.user?.placementDate.toTimeString()!,
                  },
                }
              : null,
          type: generateUnittype(unit as unknown as Unit),
          bedrooms: unit.bedRooms,
        };
  };

  fetchPublicListings = async (): Promise<Property[]> => {
    const listings = await this.client.property.findMany({
      include: {
        manager: {
          include: {
            user: true,
          },
        },
        units: {
          include: {
            occupiedBy: {
              include: {
                tenant: {
                  include: {
                    user: true,
                  },
                },
              },
            },
          },
        },
      },
    });
    return listings.map((p): Property => {
      return {
        id: p.id,
        contact: p.contact,
        imageUrl: p.imageUrl,
        lat: p.lat,
        long: p.long,
        name: p.name,
        phoneNumber: p.phoneNumber,
        manager: {
          id: p.manager.id,
          user: {
            id: p.manager.user?.id,
            name: p.manager.user?.name!,
            email: p.manager.user?.email!,
            phoneNumber: p.manager.user?.phoneNumber!,
            profileImage: p.manager.user?.profileImage!,
            role: p.manager.user?.role!,
            accountState: p.manager.user?.accountStatus!,
            placementDate: p.manager.user?.placementDate.toTimeString()!,
          },
        },
        propertyUnits: p.units.map((u): Unit => {
          return {
            ...u,
            bedrooms: u.bedRooms,
            type:
              u.type === "Luxurious"
                ? UnitType.Luxurious
                : u.type === "Normal"
                ? UnitType.Normal
                : UnitType.budget,
            currentTenant: {
              ...u.occupiedBy,
              id: u.id,
              user: {
                id: p.manager.user?.id + "",
                name: p.manager.user?.name!,
                email: p.manager.user?.email!,
                phoneNumber: p.manager.user?.phoneNumber!,
                profileImage: p.manager.user?.profileImage!,
                role: p.manager.user?.role!,
                accountState: p.manager.user?.accountStatus!,
                placementDate: p.manager.user?.placementDate.toTimeString()!,
              },
            },
          };
        }),
      };
    });
  };
  fetchPrivateListings = async (pmId: string): Promise<Property[]> => {
    const listings = await this.client.property.findMany({
      where:{
        managerId:pmId
      },
      include: {
        manager: {
          include: {
            user: true,
          },
        },
        units: {
          include: {
            occupiedBy: {
              include: {
                tenant: {
                  include: {
                    user: true,
                  },
                },
              },
            },
          },
        },
      },
    });
    return listings.map((p): Property => {
      return {
        id: p.id,
        contact: p.contact,
        imageUrl: p.imageUrl,
        lat: p.lat,
        long: p.long,
        name: p.name,
        phoneNumber: p.phoneNumber,
        manager: {
          id: p.manager.id,
          user: {
            id: p.manager.user?.id,
            name: p.manager.user?.name!,
            email: p.manager.user?.email!,
            phoneNumber: p.manager.user?.phoneNumber!,
            profileImage: p.manager.user?.profileImage!,
            role: p.manager.user?.role!,
            accountState: p.manager.user?.accountStatus!,
            placementDate: p.manager.user?.placementDate.toTimeString()!,
          },
        },
        propertyUnits: p.units.map((u): Unit => {
          return {
            ...u,
            bedrooms: u.bedRooms,
            type:
              u.type === "Luxurious"
                ? UnitType.Luxurious
                : u.type === "Normal"
                ? UnitType.Normal
                : UnitType.budget,
            currentTenant: {
              ...u.occupiedBy,
              id: u.id,
              user: {
                id: p.manager.user?.id + "",
                name: p.manager.user?.name!,
                email: p.manager.user?.email!,
                phoneNumber: p.manager.user?.phoneNumber!,
                profileImage: p.manager.user?.profileImage!,
                role: p.manager.user?.role!,
                accountState: p.manager.user?.accountStatus!,
                placementDate: p.manager.user?.placementDate.toTimeString()!,
              },
            },
          };
        }),
      };
    });
  };
  updateUnit = async (unit: Partial<Unit>): Promise<Unit> => {
    console.log(unit);
    const u = await this.client.unit.update({
      data: { room: unit.room! },
      where: {
        id: unit.id!,
      },
      include: {
        occupiedBy: {
          include: {
            tenant: {
              include: {
                user: true,
              },
            },
          },
        },
      },
    });
    return {
      ...u,
      bedrooms: u.bedRooms,
      type:
        u.type === "Luxurious"
          ? UnitType.Luxurious
          : u.type === "Normal"
          ? UnitType.Normal
          : UnitType.budget,
      currentTenant:
        u.occupiedBy === null
          ? null
          : {
              ...u.occupiedBy,
              id: u.occupiedBy.tenantId,
              user: {
                id: u.occupiedBy?.tenant.user?.id + "",
                name: u.occupiedBy?.tenant.user?.name!,
                email: u.occupiedBy?.tenant.user?.email!,
                phoneNumber: u.occupiedBy?.tenant.user?.phoneNumber!,
                profileImage: u.occupiedBy?.tenant.user?.profileImage!,
                role: u.occupiedBy?.tenant.user?.role!,
                accountState: u.occupiedBy?.tenant.user?.accountStatus!,
                placementDate:
                  u.occupiedBy?.tenant.user?.placementDate.toTimeString()!,
              },
            },
    };
  };
  updateProperty = async ({
    id,
    ...rest
  }: Partial<Omit<Property, "propertyUnits" | "manager">>): Promise<
    Omit<Property, "propertyUnits" | "manager">
  > => {
    const listings = await this.client.property.update({
      where: {
        id: id!,
      },
      data: rest,
    });

    return {
      id: listings.id,
      contact: listings.contact,
      imageUrl: listings.imageUrl,
      lat: listings.lat,
      long: listings.long,
      name: listings.name,
      phoneNumber: listings.phoneNumber,
    };
  };
  deleteUnit = async (id: string): Promise<Unit | null> => {
    const unit = await this.client.unit.findUnique({
      where: { id },
      include: {
        occupiedBy: {
          include: {
            tenant: {
              include: { user: true },
            },
          },
        },
      },
    });
    if (unit !== null) {
      if (unit.occupiedBy === null) {
        throw new Error("Invalid Operation cannot delete occupied unit");
      }
    } else {
      return null;
    }
    const unitToDelete = await this.client.unit.delete({ where: { id } });
    return unitToDelete === null
      ? null
      : {
          ...unit,
          id: unit?.id,
          currentTenant:
            unit.occupiedBy !== null
              ? {
                  id: unit.occupiedBy.id,
                  user: {
                    id: unit.occupiedBy?.tenant.user?.id,
                    email: unit.occupiedBy?.tenant.user?.email!,
                    name: unit.occupiedBy?.tenant.user?.name!!,
                    phoneNumber: unit.occupiedBy?.tenant.user?.phoneNumber!,
                    profileImage: unit.occupiedBy?.tenant.user?.profileImage!,
                    role: unit.occupiedBy?.tenant.user?.role!,
                    accountState: unit.occupiedBy?.tenant.user?.accountStatus!,
                    placementDate:
                      unit.occupiedBy?.tenant.user?.placementDate.toTimeString()!,
                  },
                }
              : null,
          type: generateUnittype(unit as unknown as Unit),
          bedrooms: unit.bedRooms,
        };
  };
  deleteProperty = async (id: string): Promise<Property | null> => {
    const currentlyOccupied = await this.countNoUnits(id);
    if (currentlyOccupied > 0) {
      throw new Error(
        "Invalid Operation cannot delete  property with occupied unit(s)"
      );
    }
    const listing = await this.client.property.delete({
      where: {
        id,
      },
      include: {
        manager: {
          include: {
            user: true,
          },
        },
        units: {
          include: {
            occupiedBy: {
              include: {
                tenant: {
                  include: {
                    user: true,
                  },
                },
              },
            },
          },
        },
      },
    });
    return {
      id: listing.id,
      contact: listing.contact,
      imageUrl: listing.imageUrl,
      lat: listing.lat,
      long: listing.long,
      name: listing.name,
      phoneNumber: listing.phoneNumber,
      manager: {
        id: listing.manager.id,
        user: {
          id: listing.manager.user?.id,
          name: listing.manager.user?.name!,
          email: listing.manager.user?.email!,
          phoneNumber: listing.manager.user?.phoneNumber!,
          profileImage: listing.manager.user?.profileImage!,
          role: listing.manager.user?.role!,
          accountState: listing.manager.user?.accountStatus!,
          placementDate: listing.manager.user?.placementDate.toTimeString()!,
        },
      },
      propertyUnits: listing.units.map((u): Unit => {
        return {
          ...u,
          bedrooms: u.bedRooms,
          type: generateUnittype(u as unknown as Unit),
          currentTenant: {
            ...u.occupiedBy,
            id: u.id,
            user: {
              id: listing.manager.user?.id + "",
              name: listing.manager.user?.name!,
              email: listing.manager.user?.email!,
              phoneNumber: listing.manager.user?.phoneNumber!,
              profileImage: listing.manager.user?.profileImage!,
              role: listing.manager.user?.role!,
              accountState: listing.manager.user?.accountStatus!,
              placementDate:
                listing.manager.user?.placementDate.toTimeString()!,
            },
          },
        };
      }),
    };
  };

  addOccupant = async (unitId: string, tenantId: string): Promise<Unit> => {
    //check if  the unit is currently occupied
    const currentTenant = await this.client.unit.findFirst({
      where: {
        occupiedBy: {
          unit: {
            id: unitId,
          },
        },
      },
    });
 
    if (currentTenant !== null) {
      throw new Error("Cannot Add New Entry To Currently Occupied Unit");
    }
    //we know that the unit is currently not occupied
    const res = await this.client.unitOccupant.create({
      include: {
        unit: true,
        tenant: {
          include: {
            user: true,
          },
        },
      },
      data: {
        tenantId,
        unitId,
      },
    });

    return {
      ...res.unit,
      type: generateUnittype(res.unit as unknown as Unit),
      bedrooms: res.unit.bedRooms,
      currentTenant: {
        ...res.tenant,
        id: res.tenantId,
        user: {
          id: res.tenant.user?.id + "",
          name: res.tenant.user?.name!,
          email: res.tenant.user?.email!,
          phoneNumber: res.tenant.user?.phoneNumber!,
          profileImage: res.tenant.user?.profileImage!,
          role: res.tenant.user?.role!,
          accountState: res.tenant.user?.accountStatus!,
          placementDate: res.tenant.user?.placementDate.toTimeString()!,
        },
      },
    };
  };
  leaveUnit = async (unitId: string, tenantId: string): Promise<Unit> => {
    const res = await this.client.unitOccupant.update({
      include: {
        unit: {
          include: {
            occupiedBy: {
              include: {
                tenant: {
                  include: {
                    user: true,
                  },
                },
              },
            },
          },
        },
      },
      where: {
        tenantId,
        unitId,
      },
      data:{
        isOccupied: false
      }
    });
    return {
      ...res.unit,
      type: generateUnittype(res.unit as unknown as Unit),
      bedrooms: res.unit.bedRooms,
      currentTenant: {
        ...res.unit.occupiedBy,
        id: res.tenantId,
        user: {
          id: res.unit.occupiedBy?.tenant.user?.id + "",
          name: res.unit.occupiedBy?.tenant.user?.name!,
          email: res.unit.occupiedBy?.tenant.user?.email!,
          phoneNumber: res.unit.occupiedBy?.tenant.user?.phoneNumber!,
          profileImage: res.unit.occupiedBy?.tenant.user?.profileImage!,
          role: res.unit.occupiedBy?.tenant.user?.role!,
          accountState: res.unit.occupiedBy?.tenant.user?.accountStatus!,
          placementDate:
            res.unit.occupiedBy?.tenant.user?.placementDate.toTimeString()!,
        },
      },
    };
  };
}

function generateUnittype(u: Unit) {
  return u.type.valueOf() === "Luxurious"
    ? UnitType.Luxurious
    : u.type.valueOf() === "Normal"
    ? UnitType.Normal
    : UnitType.budget;
}
