const UserTypeDefs = `#graphql
    scalar Upload
    type User{
      id:ID!
      name:String!
      email:String!
      profileImage:String!
      role: String!
      placementDate: String!
      accountState: Boolean!
    }
    type AccountNotActive{
      userID: String!
      message:String!
    }
    type DefaultResponse{
      message: String!,
    }

    type ApplicationErrors{
      errorMessage: String!,
      stack: String
    }
    type InvalidCredentials{
      msg: String!
    }
    type SignInResponse{
      message: String!
      user:User!
      token: String!
      refreshToken:String!
    }

    union SignInResult = SignInResponse | AccountNotActive | InvalidCredentials
    union DefaultResponseResult = DefaultResponse | ApplicationErrors
    union ProfileResults = User | ApplicationErrors
   
    type Query {
      fetchProfile:ProfileResults!
      verifyToken(token:String!):VerificationResults!
    }
    type OTPResponse{
      token:String!,
      message:String!,
    }

    union VerificationResults = OTPResponse | ApplicationErrors
    type Mutation{
      signUp(name:String!,email:String!,profileImage:Upload!,phoneNumber:String!
            ,password: String!,role: String,accountState: Boolean!
           ):DefaultResponseResult!

      signin( email: String!, password: String!): SignInResult!

      forgotPassword(email:String!):DefaultResponseResult!

      updateProfile(profileImage:Upload,password:String):ProfileResults!

      
    }
`;

export default UserTypeDefs;
