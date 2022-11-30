import { ApolloServerErrorCode } from "@apollo/server/errors";
import bcrypt from "bcrypt";
import { GraphQLError } from "graphql";
import { FileUpload, GraphQLUpload } from "graphql-upload-ts";
import jwt from "jsonwebtoken";

import { MyContext } from "../..";
import { UserRepository } from "../../Repository/user";
import NotificationService from "../../services/Email";
import { ImagePayload, SignUpPayload } from "../../types";
import { saveImage } from "../../utils";
import { ERROR_CODES } from "../../utils/errors";

const repo = new UserRepository();
const host = {
  user: process.env.SMTP_USER?.trim() as string,
  hostSMTP: process.env.SMTP_HOST?.trim() as string,
  password: process.env.SMTP_PASSWORD?.trim() as string,
};
const notification = new NotificationService(host);

export const UserResolver = {
  Upload: GraphQLUpload,
  SignInResult: {
    __resolveType(obj: any) {
      if (obj.user) {
        return "SignInResponse";
      }
      if (obj.userID) {
        return "AccountNotActive";
      }
      if (obj.msg) {
        return "InvalidCredentials";
      }
      return null;
    },
  },
  DefaultResponseResult: {
    __resolveType(obj: any) {
      if (obj.errorMessage) {
        return "ApplicationErrors";
      }

      if (obj.message) {
        return "DefaultResponse";
      }
      return null;
    },
  },
  ProfileResults: {
    __resolveType(obj: any) {
      if (obj.errorMessage) {
        return "ApplicationErrors";
      }

      if (obj.name) {
        return "User";
      }
      return null;
    },
  },
  VerificationResults: {
    __resolveType(obj: any) {
      if (obj.errorMessage) {
        return "ApplicationErrors";
      }

      if (obj.token) {
        return "OTPResponse";
      }
      return null;
    },
  },
  Query: {
   
    fetchProfile: async (_: any, args: { id: string }, ctx: MyContext) => {
      const profile = await repo.findById(ctx.UserId!);
      if (profile === undefined) {
        return {
          errorMessage: "no User found",
          stack: "",
        };
      }

      const { name, email, profileImage, role, placementDate, accountStatus } =
        profile;
      return {
        name,
        email,
        profileImage,
        role,
        placementDate,
        accountState: accountStatus,
      };
    },
    verifyToken: async (_: any, args: { token: string }) => {
      //fetch the token fro storage
      const savedToken = await repo.getToken(args.token);
      if (savedToken.token !== undefined) {
        // create and assign an authentification token
        const token = jwt.sign(
          { _id: savedToken.id },
          process.env.SECREATE_TOKEN?.trim() as string,
          {
            expiresIn: 10 * 60,
          }
        );

        return {
          message: "otp verification was successfull",
          token,
        };
      } else {
        return {
          errorMessage: "Invalid otp code ",
        };
      }
    },
  },
  Mutation: {
    signUp: async (parent: any, args: SignUpPayload, context: any) => {
      try {
        console.log(args);
        //find if their exists a user with the same email
        const existingUser = await repo.find({
          field: "email",
          value: args.email,
        });
        if (existingUser) {
          throw new GraphQLError(" Email Already in Use", {
            extensions: {
              code: ERROR_CODES.INVALID_INPUT,
              http: {
                status: 403,
              },
            },
          });
        }

        const profileImage = await args.profileImage;
        let filePath: string = "";
        try {
          const data = await saveImage(profileImage);
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

        // encrpte the password
        const encrptedPass = await encryptPassword(args.password);
        const savedUser = await repo.insert({
          name: args.name,
          email: args.email,
          password: encrptedPass,
          profileImage: filePath,
          accountStatus: args.accountStatus,
          phoneNumber: args.phoneNumber,
          role: args.role,
        });
        if (savedUser) {
          // compose an email
          const html = `
               Welcome <strong>${savedUser.name} </strong>,<br/>
               Thank you for joining Realtors Platform<br/><br/>
               Have a nice day.
           `;
          // send the email
          await notification.send({
            to: savedUser.email,
            from: process.env.Email as string,
            body: html,
            subject: "Account Registration",
            text: html,
          });
        }
        return {
          message: "received successfully",
        };
      } catch (error: any) {
        return {
          errorMessage: "Error occcured while registering user",
          code: process.env.Node_ENV === "development" ? error.code : "🔥🔥",
          stack:
            process.env.Node_ENV === "development" ? error.stack : "🔥🔥",
        };
      }
    },
    signin: async (
      _: any,
      args: { email: string; password: string },
      context: any
    ) => {
      //find if their exists a user with the same email
      const existingUser = await repo.find({
        field: "email",
        value: args.email,
      });
      console.log(existingUser)
      if (existingUser === undefined) {
        return {
          msg: "Error authenticating please try again !",
        };
      }
      console.log(existingUser);
      //check if account is active
      if (!existingUser.accountStatus) {
        return {
          userID: existingUser.id,
          message:
            "Access Denied 👺👺 - This account has been temporarily been disabled .Please activate your account",
        };
      }
      // check if password is correct
      const validPass = await bcrypt.compare(
        args.password,
        existingUser.password
      );
      if (!validPass) {
        return {
          msg: "Error authenticating please try again !",
        };
      }

      // create and assign an authentification token
      const token = jwt.sign(
        { _id: existingUser.id },
        process.env.SECREATE_TOKEN?.trim() as string,
        {
          expiresIn: 30 * 60,
        }
      );

      const refreshToken = jwt.sign(
        { _id: existingUser.id },
        process.env.SECREATE_TOKEN?.trim() as string,
        {
          expiresIn: 30 * 24 * 60 * 60,
        }
      );
      await repo.update(
        {
          field: "id",
          value: existingUser.id + "",
        },
        { ...existingUser, token: refreshToken }
      );

      return {
        message: "Login Successfull",
        user: { ...existingUser, accountState: existingUser.accountStatus },
        token,
        refreshToken,
      };
    },

    forgotPassword: async (_: any, args: { email: string }) => {
      const user = await repo.find({
        field: "email",
        value: args.email,
      });
      if (user === undefined) {
        return {
          errorMessage: "Invalid Request passed as input",
        };
      }
      //generate reset token
      const token = generateOtp();

      console.log(token);
      //save the token
      await repo.setToken(user?.id!, token);
      //send email notification to user
      const html = `
        Hello <strong>${user?.name} </strong>,<br/>
        Your password reset request has been processed successfully,
        to proceed enter the following token ${token} .<br/>
        Ingore this message if the requested wasn't made by you <br/><br/>
        Have a nice day.
    `;
      // send the email
      await notification.send({
        to: user?.email!,
        from: process.env.Email as string,
        body: html,
        subject: "Password Reset",
        text: html,
      });

      //return response

      return {
        message:
          "Password reset was successfull check your email for a reset token",
      };
    },
    updateProfile: async (
      _: any,
      args: { profileImage: Promise<FileUpload>; password: string },
      ctx: any
    ) => {
      const data: Record<string, any> = {};
      try {
        console.log(args)
        if (args.password) {
          // encrpte the password
          const encrptedPass = await encryptPassword(args.password);
          data["password"] = encrptedPass;
        } 
        if(await args.profileImage) {
          let filePath: string = "";
          filePath = await saveFile(args, filePath);
          data["profileImage"] = filePath;
        }
        const result = await repo.update(
          {
            field: "id",
            value: ctx.UserId,
          },
          data
        );
        const {
          name,
          email,
          profileImage,
          role,
          placementDate,
          accountStatus,
        } = result;
        return {
          name,
          email,
          profileImage,
          role,
          placementDate,
          accountState: accountStatus,
        };
      } catch (e: any) {
        console.log(e);
      }
    },
  },
};

async function encryptPassword(password: string) {
  return await bcrypt.hash(password, 10);
}

async function saveFile(
  args: { profileImage: Promise<FileUpload> },
  filePath: string
) {
  try {
    const data = await saveImage(await args.profileImage);
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

const generateOtp = () => {
  const digits = "0123456789",
    otpLength = 5;
  let otp = "";
  for (let i = 1; i < otpLength; i++) {
    const index = Math.floor(Math.random() * digits.length);
    otp += digits[index];
  }
  return otp;
};
