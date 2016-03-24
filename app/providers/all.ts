import {BootSettings} from './config/boot_settings';
import {Configuration} from './config/configuration';
import {S3File} from './aws/s3file';
import {Cognito} from './aws/cognito';

export const FATHENS = [BootSettings, Configuration, S3File, Cognito];
