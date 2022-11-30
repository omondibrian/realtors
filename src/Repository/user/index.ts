import { IUser } from '../../types';
import { Repository } from '../IRepository';

export interface IUserRepository {
  insert(data: Omit<IUser, "placementDate">): Promise<IUser>;
  update(
    options: { field: "email" | "id"; value: string },
    data: Partial<IUser>
  ): Promise<IUser>;
  find(data: {
    field: "email" | "id";
    value: string;
  }): Promise<IUser | undefined>;
  findById(id: string): Promise<IUser | undefined>;
  Delete(id: string): Promise<IUser>;
  setToken(id: string, token: string): Promise<{ id?: string; token: string }>;
  getToken(
    token: string
  ): Promise<{ id?: string | undefined; token?: string; userId?: string }>;
}

export class UserRepository extends Repository implements IUserRepository {
  private _userProjections = {
    id: true,
    email: true,
    name: true,
    password: true,
    phoneNumber: true,
    profileImage: true,
    accountStatus: true,
    role: true,
    placementDate: true,
  };
  insert = async (data: Omit<IUser, "placementDate">): Promise<IUser> => {
    const results = await this.client.user.create({
      data: {
        email: data.email,
        name: data.name,
        phoneNumber: data.phoneNumber,
        profileImage: data.profileImage,
        token: Date.now().toLocaleString(),
        role: data.role === "PropertyManager" ? "PropertyManager" : "Tenant",
        password: data.password,
        accountStatus: data.accountStatus,
      },
      select: this._userProjections,
    });
     //check user type
     if(results.role == "Tenant"){
         await this.client.tenants.create({
          data:{
              lat :0.0,
              long : 0.0,
              userId: results.id
          }
         })     
    }else{
      await this.client.propertyManager.create({
        data:{
          userId: results.id
        }
      })
    }
    return {
      ...results,
      placementDate: this.fmtDate(results.placementDate),
    };
  };

  update = async (
    options: { field: "email" | "id"; value: string },
    data: Partial<IUser>
  ): Promise<IUser> => {
    const results = await this.client.user.update({
      where: {
        // id: options.value,
        [options.field]: options.value,
      },
      data: {
        // email: data.email,
        // name: data.name,
        token: data?.token,
        phoneNumber: data.phoneNumber,
        profileImage: data.profileImage,
        role: data.role === "PropertyManager" ? "PropertyManager" : "Tenant",
        password: data.password,
        accountStatus: data.accountStatus,
      },
      select: this._userProjections,
    });

    return {
      ...results,
      placementDate: this.fmtDate(results.placementDate),
    };
  };
  find = async (data: {
    field: "email" | "id";
    value: string;
  }): Promise<IUser | undefined> => {
    const results = await this.client.user.findUnique({
      where: {
        email: data.value,
      },
      select: this._userProjections,
    });
    if (results === null) return undefined;
    return {
      ...results,
      placementDate: this.fmtDate(results.placementDate),
    };
  };
  findById = async (id: string): Promise<IUser | undefined> => {
    const results = await this.client.user.findUnique({
      where: {
        id,
      },
      select: this._userProjections,
    });
    if (results === null) return undefined;
    return {
      ...results,
      placementDate: this.fmtDate(results.placementDate),
    };
  };
  Delete = async (id: string): Promise<IUser> => {
    const results = await this.client.user.delete({
      where: {
        id,
      },
      select: this._userProjections,
    });
    return {
      ...results,
      placementDate: this.fmtDate(results.placementDate),
    };
  };

  setToken = async (
    id: string,
    token: string
  ): Promise<{ id?: string | undefined; token: string }> => {
    const results = await this.client.passwordResets.create({
      data: {
        token,
        userId: id,
      },
      select: {
        id: true,
        token: true,
        // userId: true,
      },
    });
    return {
      token: results.token,
      id: results.id,
    };
  };
  getToken = async (
    token: string
  ): Promise<{ id?: string | undefined; token?: string; userId?: string }> => {
    const results = await this.client.passwordResets.findFirst({
      where: {
        token: {
          equals: token,
        },
      },
      select: {
        id: true,
        token: true,
        userId: true,
      },
    });
    return {
      token: results?.token,
      id: results?.id,
      userId: results?.userId,
    };
  };
}
