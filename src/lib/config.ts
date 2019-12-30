import { isEmpty, isUndefined } from 'lodash';
import * as dotenv from 'dotenv';

// Load config into process.env
dotenv.config();

const requiredEnvs = [
    'SPREADSHEET_ID',
    'SHEET_NAME_NORDEA_LAURI',
    'SHEET_NAME_OP_LAURI',
    'SHEET_NAME_NORWEGIAN_LAURI',
    'SHEET_NAME_HANDELSBANKEN_LAURI',
    'SHEET_NAME_NORDEASE_BECKY',
    'FILE_DETECTION_NORDEA_LAURI',
    'FILE_DETECTION_OP_LAURI'
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
    SPREADSHEET_ID: process.env.SPREADSHEET_ID || '',
    LOG: process.env.LOG || 'info',
    SHEET_NAME_NORDEA_LAURI: process.env.SHEET_NAME_NORDEA_LAURI || '',
    SHEET_NAME_OP_LAURI: process.env.SHEET_NAME_OP_LAURI || '',
    SHEET_NAME_NORWEGIAN_LAURI: process.env.SHEET_NAME_NORWEGIAN_LAURI || '',
    SHEET_NAME_HANDELSBANKEN_LAURI: process.env.SHEET_NAME_HANDELSBANKEN_LAURI || '',
    SHEET_NAME_NORDEASE_BECKY: process.env.SHEET_NAME_NORDEASE_BECKY || '',
    FILE_DETECTION_NORDEA_LAURI: process.env.FILE_DETECTION_NORDEA_LAURI || '',
    FILE_DETECTION_OP_LAURI: process.env.FILE_DETECTION_OP_LAURI || '',
  };
  
  export default config;