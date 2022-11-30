const PropertyTypeDefs = `#graphql
    type Book {
      title: String
      author: String
    }

    type Tenant {
        id:ID
        user:User
    }

    type PropertyManager{
        id:ID
        user:User
    }

    type Property{
        id:ID
        name:String
        imageUrl:String
        phoneNumber:String
        contact:String
        lat:Float
        long:Float
        manager:PropertyManager
        propertyUnits:[Unit]
    }

    type Unit {
        id:ID
        room:String
        imageUrl:String
        contact:String
        state:Boolean
        currentTenant:Tenant
        livingSpace:String
        ammenities:[String!]
        propertyId:String
        propertyOverview: [String]!
        pricePerMonth:String
    }

    type Query {
      books: [Book]
      #fetch unoccupied listings
      fetchPublicListings:ListingsResult!
      myListings:ListingsResult!  
      }

    type PropertyUpdate{
        name:String!
        phoneNumber:String!
        contact:String!  
        lat:Float!
        long:Float!
    }
     
    input UnitInput{
        room:String!
        imageUrl:Upload!
        contact:String! 
        state:Boolean!
        livingSpace:String!
        type:String!
        baths:Int!
        bedrooms:Int!
        ammenities:[String]!
        propertyId:String!
        propertyOverview: [String]!
        pricePerMonth:String
     }
    input UnitUpdates{
        room:String!
    }
 
    input OccupyRequestInput{
        unitID:String!
    }

    type PropertyPayload {
        property:Property!
        message:String!
    }

    type PropertiesPayload {
        property:[Property]!
        message:String!
    }

    type ListingsPayload {
        properties:[Property]!
        message:String!
    }

    type PropertyUpdatePayload {
        property:PropertyUpdate!
        message:String!
    } 

    type UnitPayload{
        unit:Unit!
        message:String!
    }
    union ListingsResult = ListingsPayload  | ApplicationErrors
    union PropertyResults = PropertyPayload | ApplicationErrors
    union UnitResults = UnitPayload | ApplicationErrors
    union PropertyUpdateResults = PropertyUpdatePayload | ApplicationErrors
    type Mutation{
        createPropertyListing(name:String!,phoneNumber:String!,contact:String!,lat:Float!,long:Float!,imageUrl:Upload!):PropertyResults!
        createUnit(room:String!,imageUrl:Upload!,contact:String!, propertyId:String!, state:Boolean!, livingSpace:String!, type:String!,  baths:Int!, bedrooms:Int!, ammenities:[String]!,pricePerMonth:String!,propertyOverview:[Upload!]!):UnitResults!
        updateUnit(room:String!,unitId:String!):UnitResults!
        updatePropertyListing(propertyId:ID!,name:String, phoneNumber:String,contact:String,lat:Float,long:Float):PropertyUpdateResults!
        occupyUnit(unitId:String!,tenantId:String!):UnitResults!
        leaveUnit(unitId:String!,tenantId:String!):UnitResults!
        deleteUnit(id:ID!):UnitResults!
        deletePropertyListing(id:ID!):PropertyResults!
    }
`;

export default PropertyTypeDefs;
