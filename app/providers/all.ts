import {BootSettings} from './config/boot_settings';
import {Configuration} from './config/configuration';
import {S3File} from './aws/s3file';
import {Cognito} from './aws/cognito';
import {Dynamo} from './aws/dynamo';
import {FBConnect} from './facebook/fb_connect';
import {FBJSSDK} from './facebook/fb_jssdk';
import {CachedReports} from './reports/cached_list';

export const FATHENS = [BootSettings, Configuration, S3File, Cognito, Dynamo, FBConnect, FBJSSDK, CachedReports];
