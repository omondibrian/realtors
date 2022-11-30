import { PrismaClient } from "@prisma/client";

export class DBClient {
  private static instance: DBClient;

  private constructor() {}
  private _prisma = new PrismaClient();
  public get prisma() {
    return this._prisma;
  }

  public static getInstance() {
    if (!DBClient.instance) {
      DBClient.instance = new DBClient();
    }
    return DBClient.instance;
  }
}

// const client1 = DBClient.getInstance().prisma;

// const client2 = DBClient.getInstance().prisma;

// console.log(client1 === client2);
// // client.prisma.
