import { DBClient } from "../utils/PrismaClient";

export abstract class Repository {
  protected client = DBClient.getInstance().prisma;

  protected fmtDate(results: Date): string {
    return `${results.getDay()}-${results.getMonth()}-${results.getFullYear()}`;
  }
}
