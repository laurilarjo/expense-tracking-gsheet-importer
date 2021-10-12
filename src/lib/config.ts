import { isEmpty, isUndefined } from 'lodash';
import * as dotenv from 'dotenv';
import * as sheetConfig from '../../sheet-config.json';
import { User } from './types';

// Load config into process.env
dotenv.config();

const requiredEnvs = [
    'EXCHANGERATES_API_KEY',
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
  LOG: process.env.LOG || 'info',
  EXCHANGERATES_API_KEY: process.env.EXCHANGERATES_API_KEY || '',
  USERS: sheetConfig.users as User[],
  SPREADSHEET_ID: sheetConfig.spreadsheetId,
};

export default config;