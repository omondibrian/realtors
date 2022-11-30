// import { GraphQLError } from 'graphql';

// throw new GraphQLError(message, {
//   extensions: { code: 'YOUR_ERROR_CODE', myCustomExtensions },
// });

export enum ERROR_CODES {
    UNAUTHENTICATED ='unauthencticated',
    INVALID_INPUT ='invalid_input',
    FORBIDDEN="forbidden"
}