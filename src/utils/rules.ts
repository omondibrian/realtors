import { inputRule, rule } from "graphql-shield";
import jwt from "jsonwebtoken";
import { checkFileSize } from ".";

export const isAuthenticated = rule({ cache: "contextual" })(
  async (_, args, ctx) => {
    return ctx.UserId !== null;
  }
);

export const signUpPayload = inputRule()((yup) => {
  const MAX_FILE_SIZE = 3 * 1024 * 1024;
  return yup.object({
    name: yup.string().required(),
    email: yup.string().email().required(),
    password: yup.string().required(),
    phoneNumber: yup.string().required(),
    role: yup.string().required(),
    accountState: yup.boolean().required(),
    profileImage: yup
      .mixed()
      .test({
        message: "Please provide only the image",
        test: async (file, context) => {
          const { fileName } = await file;
          return ["png", "jpg", "jpeg"].includes(fileName.spilt(".").pop());
        },
      })
      .test({
        message: "Maximum FileSize Exceeded",
        test: async (file, context) => {
          const fileObj = await file;
          let isValid = true;
          try {
            const size = await checkFileSize(fileObj, MAX_FILE_SIZE);
          } catch (error) {
            if (error === false) {
              isValid = false;
            }
          }
          return isValid;
        },
      }),
  });
});

export const updateProfilePayload = inputRule()((yup) => {
  const MAX_FILE_SIZE = 3 * 1024 * 1024;
  return yup.object({
    input: yup.object({
      password: yup.string().nullable(),
      profileImage: yup
        .mixed()
        .test({
          message: "Please provide only the image",
          test: async (file, context) => {
            const { fileName } = await file;
            return ["png", "jpg", "jpeg"].includes(fileName.spilt(".").pop());
          },
        })
        .test({
          message: "Maximum FileSize Exceeded",
          test: async (file, context) => {
            const fileObj = await file;
            let isValid = true;
            try {
              const size = await checkFileSize(fileObj, MAX_FILE_SIZE);
            } catch (error) {
              if (error === false) {
                isValid = false;
              }
            }
            return isValid;
          },
        })
        .nullable(),
    }),
  });
});

export const signInPayload = inputRule()((yup) =>
  yup.object({
    password: yup.string().required(),
    email: yup.string().email().required(),
  })
);
