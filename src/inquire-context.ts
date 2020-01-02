import * as path from 'path';
import {argv} from 'yargs';

import { Context, User } from './lib/types'

async function inquireContext(): Promise<Context> {
    let context = { user: User.Becky} as Context;
    console.log('Here we will ask user for input');
    process.exit(1);
    
    return context;
}

export { inquireContext };
