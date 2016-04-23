import {BootSettings} from './config/boot_settings';
import {Configuration} from './config/configuration';
import {Preferences} from './config/preferences';
import {S3File} from './aws/s3file';
import {Cognito} from './aws/cognito';
import {Dynamo} from './aws/dynamo/dynamo';
import {FBConnect} from './facebook/fb_connect';
import {FBJSSDK} from './facebook/fb_jssdk';
import {FBPublish} from './facebook/fb_publish';
import {CachedReports} from './reports/cached_list';
import {SearchReports} from './reports/search';
import {Photo} from './reports/photo';
import {CVision} from './cvision/cvision';
import {EtiquetteVision} from './cvision/etiquette';
import {Suggestions} from './suggestions/suggestions';
import {AmazonPAA} from './suggestions/amazon_paa';

export const FATHENS_PROVIDERS = [
    AmazonPAA,
    Suggestions,
    BootSettings,
    Configuration,
    Preferences,
    S3File,
    Cognito,
    Dynamo,
    FBConnect,
    FBJSSDK,
    FBPublish,
    CachedReports,
    SearchReports,
    Photo,
    CVision,
    EtiquetteVision
];
