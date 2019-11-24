import { isEmpty, isUndefined } from 'lodash';
require('dotenv').config();

const requiredEnvs = [
    'NORDEA_TRANSACTIONS_FILENAME',
    'SPREADSHEET_ID'
];

const unsetEnvs = requiredEnvs.filter((env) => isUndefined(process.env[env]));

if (!isEmpty(unsetEnvs)) {
    throw new Error(
      `Required ENV variables are not set: ${unsetEnvs.join(', ')}`
    );
  }

// Even required config variables should have default values, because
// otherwise their types are inferred to be `string | undefined` which can
// cause problems downstream. The unsetEnvs definition above takes
// care that we don't run with empty values for required envs.
const config = {
    NORDEA_TRANSACTIONS_FILENAME: process.env.NORDEA_TRANSACTIONS_FILENAME || '',
    SPREADSHEET_ID: process.env.SPREADSHEET_ID || '',
  };
  
  export default config;