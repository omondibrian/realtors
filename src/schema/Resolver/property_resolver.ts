import { ApolloServerErrorCode } from "@apollo/server/errors";
import { GraphQLError } from "graphql";
import { FileUpload } from "graphql-upload-ts";

import { MyContext } from "../..";
import { saveImage } from "../../utils";
import { PropertyRepository } from "./../../Repository/property";

import type {
  ImagePayload,
  ListingsPayload,
  ListingsResult,
  Property,
  PropertyInput,
  PropertyPayload,
  PropertyResults,
  PropertyUpdatePayload,
  PropertyUpdateResults,
  Unit,
  UnitInput,
  UnitPayload,
  UnitResults,
} from "../../types";
const books = [
  {
    title: "The Awakening",
    author: "Kate Chopin",
  },
  {
    title: "City of Glass",
    author: "Paul Auster",
  },
];
const repo = new PropertyRepository();
export const PropertyResolver = {
  PropertyResults: {
    __resolveType(obj: any) {
      if (obj.errorMessage) {
        return "ApplicationErrors";
      }

      if (obj.property) {
        return "PropertyPayload";
      }
      return null;
    },
  },
  PropertyUpdateResults: {
    __resolveType(obj: any) {
      if (obj.errorMessage) {
        return "ApplicationErrors";
      }

      if (obj.property) {
        return "PropertyUpdatePayload";
      }
      return null;
    },
  },
  UnitResults: {
    __resolveType(obj: any) {
      if (obj.errorMessage) {
        return "ApplicationErrors";
      }

      if (obj.unit) {
        return "UnitPayload";
      }
      return null;
    },
  },
  ListingsResult: {
    __resolveType(obj: any) {
      if (obj.errorMessage) {
        return "ApplicationErrors";
      }

      if (obj.properties) {
        return "ListingsPayload";
      }
      return null;
    },
  },
  Query: {
    books: (_: any, args: any, context: any) => {
      console.log(args);
      return books;
    },
    fetchPublicListings: async (): Promise<ListingsResult> => {
      try {
        const listings = await repo.fetchPublicListings();
        // const {propertyUnits} = newListing;
        console.log(listings);
        const result: ListingsPayload = {
          message: "public listings",
          properties: listings,
        };

        return result;
      } catch (error: any) {
        console.log(error);
        return {
          errorMessage: "Error while processing Request ",
          stack: error.stack,
        };
      }
     
    },
    myListings: async (_:any,args:{}): Promise<PropertyResults> => {
      throw new Error("Method not implemented.");
    },
  },
  Mutation: {
    createPropertyListing: async (
      _: any,
      args: PropertyInput,
      ctx: MyContext
    ): Promise<PropertyResults> => {
      let filePath: string = await saveImageToStorage(args.imageUrl);
      try {
        const newListing = await repo.createProperty({
          ...args,
          managerId: ctx.UserId!,
          imageUrl: filePath,
        });
        // const {propertyUnits} = newListing;
        console.log(newListing);
        const result: PropertyPayload = {
          message: "New Property created",
          property: newListing,
        };

        return result;
      } catch (error: any) {
        console.log(error);
        return {
          errorMessage: "Error while processing Request ",
          stack: error.stack,
        };
      }
    },
    createUnit: async (
      _: any,
      { imageUrl, propertyOverview, ...rest }: UnitInput,
      ctx: MyContext
    ): Promise<UnitResults> => {
      console.log(rest);
      let filePath: string = await saveImageToStorage(imageUrl);
      let fileOverviewPaths = await Promise.all(
        propertyOverview.map(async (p) => saveImageToStorage(p))
      );
      try {
        const newUnit = await repo.createUnit({
          ...rest,
          imageUrl: filePath,
          propertyOverview: fileOverviewPaths,
        });
        console.log(newUnit);
        const result: UnitPayload = {
          message: "New unit created",
          unit: newUnit,
        };

        return result;
      } catch (error: any) {
        console.log(error);
        return {
          errorMessage: "Error while processing Request ",
          stack: error.stack,
        };
      }
    },
    updateUnit: async (
      _: any,
      args: { room: string; unitId: string },
      ctx: MyContext
    ): Promise<UnitResults> => {
      try {
        let  unit: Unit | null = null;
        try {
          unit = await repo.fetchUnit(args.unitId);
          if (unit === null) {
            return {
              errorMessage: "Invalid Unit Identifier ",
            };
          }
        } catch (error) {
          return {
            errorMessage: "Invalid Unit Identifier ",
          };
        }
        const updatedUnit = await repo.updateUnit({
          id:unit.id,
          room: args.room,
        });
        console.log(updatedUnit);
        const result: UnitPayload = {
          message: "New unit updated",
          unit: updatedUnit,
        };

        return result;
      } catch (error: any) {
        console.log(error);
        return {
          errorMessage: "Error while processing Request ",
          stack: error.stack,
        };
      }
    },
    updatePropertyListing: async (
      _: any,
      { imageUrl, propertyId, ...rest }: PropertyInput,
      ctx: MyContext
    ): Promise<PropertyUpdateResults> => {
      let filePath: string = '';
      if(await imageUrl){
        filePath = await saveImageToStorage(imageUrl);
      }
      try {
        const data:Partial<Omit<Property, "propertyUnits" | "manager">> = {...rest,id: propertyId}
        if( filePath !== ''){
            data['imageUrl'] = filePath;
        }
        const updatedListing = await repo.updateProperty(data);
        console.log(updatedListing);
        const result: PropertyUpdatePayload = {
          message: " Property info updated",
          property: updatedListing,
        };

        return result;
      } catch (error: any) {
        console.log(error);
        return {
          errorMessage: "Error while processing Request ",
          stack: error.stack,
        };
      }
    },
    occupyUnit: async (
      _: any,
      args: { unitId: string; tenantId: string },
      ctx: MyContext
    ): Promise<UnitResults> => {
      try {
        const unit = await repo.addOccupant(args.unitId, args.tenantId);
        console.log(unit);
        const result: UnitPayload = {
          message: " tenant info has been updated",
          unit: unit!,
        };

        return result;
      } catch (error: any) {
        console.log(error.message);
        return {
          errorMessage: error.message || "Error while processing Request ",
          stack: error.stack,
        };
      }
    },
    leaveUnit: async (
      _: any,
      args: { unitId: string; tenantId: string },
      ctx: MyContext
    ): Promise<UnitResults> => {
      try {
        const unit = await repo.leaveUnit(args.unitId, args.tenantId);
        console.log(unit);
        const result: UnitPayload = {
          message: " tenant info has been updated",
          unit: unit!,
        };

        return result;
      } catch (error: any) {
        console.log(error);
        return {
          errorMessage: "Error while processing Request ",
          stack: error.stack,
        };
      }
    },
    deleteUnit: async (
      _: any,
      args: { id: string },
      ctx: MyContext
    ): Promise<UnitResults> => {
      try {
        const unit = await repo.deleteUnit(args.id);
        console.log(unit);
        const result: UnitPayload = {
          message: " unit info deleted",
          unit: unit!,
        };

        return result;
      } catch (error: any) {
        console.log(error.message);
        return {
          errorMessage: "Error while processing Request ",
          stack: error.stack,
        };
      }
    },
    deletePropertyListing: async (
      _: any,
      args: { id: string },
      ctx: MyContext
    ): Promise<PropertyResults> => {
      try {
        const property = await repo.deleteProperty(args.id);
        console.log(property);
        const result: PropertyPayload = {
          message: " property info deleted",
          property: property!,
        };

        return result;
      } catch (error: any) {
        console.log(error);
        return {
          errorMessage: "Error while processing Request ",
          stack: error.stack,
        };
      }
    },
  },
};
//TODO: handle multiple file uploads
async function saveImageToStorage(imageUrl: string | Promise<FileUpload>) {
  const unitImage = await imageUrl;
  let filePath: string = "";
  try {
    const data = await saveImage(unitImage as FileUpload);
    filePath = (data as ImagePayload).filePath;
  } catch (error) {
    throw new GraphQLError("Error while processing image", {
      extensions: {
        code: ApolloServerErrorCode.INTERNAL_SERVER_ERROR,
        http: {
          status: 500,
        },
      },
    });
  }
  return filePath;
}
