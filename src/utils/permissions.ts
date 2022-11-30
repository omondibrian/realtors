import { and, shield } from "graphql-shield";
import { isAuthenticated, signInPayload, signUpPayload, updateProfilePayload } from "./rules";

export const permissions = shield({
  Query: {
    fetchProfile:isAuthenticated,
  },
  Mutation: {
    signin: signInPayload,
    signUp: signUpPayload,
    updateProfile: isAuthenticated
  },
});