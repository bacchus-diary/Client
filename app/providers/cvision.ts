import {Injectable} from 'angular2/core';
import {Http, Headers} from 'angular2/http';

import {Configuration} from './config/configuration';
import {toPromise} from '../util/promising';
import {Logger} from '../util/logging';

const logger = new Logger(CVision);

const urlGCV = "https://vision.googleapis.com/v1/images:annotate";

type FeaturesMap = {
    FACE_DETECTION?: number,
    LANDMARK_DETECTION?: number,
    LOGO_DETECTION?: number,
    LABEL_DETECTION?: number,
    TEXT_DETECTION?: number,
    SAFE_SEARCH_DETECTION?: number,
    IMAGE_PROPERTIES?: number
}

type _Features = 'FACE_DETECTION' |
    'LANDMARK_DETECTION' |
    'LOGO_DETECTION' |
    'LABEL_DETECTION' |
    'TEXT_DETECTION' |
    'SAFE_SEARCH_DETECTION' |
    'IMAGE_PROPERTIES';

type _FeatureMaxResults = {
    type: _Features,
    maxResults: number
}

type CVRequest = {
    requests: [
        {
            image: {
                content?: string, // BASE64
                source?: {
                    gcs_image_uri: string
                }
            },
            features: _FeatureMaxResults[],
            imageContext?: {
                latLongRect: {
                    minLatLng: _LatLng,
                    maxLatLng: _LatLng
                },
                languageHints: string[]
            }
        }
    ]
}

type CVResponse = {
    responses: [
        {
            faceAnnotations: _FaceAnnotation[],
            landmarkAnnotations: _EntityAnnotation[],
            logoAnnotations: _EntityAnnotation[],
            labelAnnotations: _EntityAnnotation[],
            textAnnotations: _EntityAnnotation[],
            safeSearchAnnotation: _SafeSearchAnnotation,
            imagePropertiesAnnotation: _ImageProperties[],
            error: _Status[]
        }
    ]
}

type _LatLng = {
    latitude: number, // [-90.0, +90.0]
    longitude: number // [-180.0, +180.0]
}

type _Status = {
    code: number,
    message: string,
    details: any[]
}

type _FaceAnnotation = {
    boundingPoly: _BoundingPoly,
    fdBoundingPoly: _BoundingPoly,
    landmarks: _Landmark[],
    rollAngle: number,
    panAngle: number,
    tiltAngle: number,
    detectionConfidence: number,
    landmarkingConfidence: number,
    joyLikelihood: _Likelihood,
    sorrowLikelihood: _Likelihood,
    angerLikelihood: _Likelihood,
    surpriseLikelihood: _Likelihood,
    underExposedLikelihood: _Likelihood,
    blurredLikelihood: _Likelihood,
    headwearLikelihood: _Likelihood
}

type _EntityAnnotation = {
    mid: string,
    locale: string,
    description: string,
    score: number,
    confidence: number,
    topicality: number,
    boundingPoly: _BoundingPoly,
    locations: _LocationInfo[],
    properties: _Property[],
}

type _BoundingPoly = {
    vertices: {
        x: number,
        y: number
    }[]
}

type _LocationInfo = {
    latLng: _LatLng
}

type _Property = {
    name: string,
    value: string
}

type _Landmark = {
    type: _Type,
    position: {
        x: number,
        y: number,
        z: number
    }
}

type _ImageProperties = {
    dominantColors: {
        colors: {
            color: {
                red: number, // [0, 1]
                green: number, // [0, 1]
                blue: number, // [0, 1]
                alpha: number // [0, 1]
            },
            score: number,
            pixelFraction: number
        }[]
    }
}

type _Type = "UNKNOWN_LANDMARK" |
    "LEFT_EYE" |
    "RIGHT_EYE" |
    "LEFT_OF_LEFT_EYEBROW" |
    "RIGHT_OF_LEFT_EYEBROW" |
    "LEFT_OF_RIGHT_EYEBROW" |
    "RIGHT_OF_RIGHT_EYEBROW" |
    "MIDPOINT_BETWEEN_EYES" |
    "NOSE_TIP" |
    "UPPER_LIP" |
    "LOWER_LIP" |
    "MOUTH_LEFT" |
    "MOUTH_RIGHT" |
    "MOUTH_CENTER" |
    "NOSE_BOTTOM_RIGHT" |
    "NOSE_BOTTOM_LEFT" |
    "NOSE_BOTTOM_CENTER" |
    "LEFT_EYE_TOP_BOUNDARY" |
    "LEFT_EYE_RIGHT_CORNER" |
    "LEFT_EYE_BOTTOM_BOUNDARY" |
    "LEFT_EYE_LEFT_CORNER" |
    "RIGHT_EYE_TOP_BOUNDARY" |
    "RIGHT_EYE_RIGHT_CORNER" |
    "RIGHT_EYE_BOTTOM_BOUNDARY" |
    "RIGHT_EYE_LEFT_CORNER" |
    "LEFT_EYEBROW_UPPER_MIDPOINT" |
    "RIGHT_EYEBROW_UPPER_MIDPOINT" |
    "LEFT_EAR_TRAGION" |
    "RIGHT_EAR_TRAGION" |
    "LEFT_EYE_PUPIL" |
    "RIGHT_EYE_PUPIL" |
    "FOREHEAD_GLABELLA" |
    "CHIN_GNATHION" |
    "CHIN_LEFT_GONION" |
    "CHIN_RIGHT_GONION";

type _SafeSearchAnnotation = {
    adult: _Likelihood,
    spoof: _Likelihood,
    medical: _Likelihood,
    violence: _Likelihood
}

type _Likelihood = 'UNKNOWN' | 'VERY_UNLIKELY' | 'UNLIKELY' | 'POSSIBLE' | 'LIKELY' | 'VERY_LIKELY';

export const Likelihood = {
    UNKNOWN: 0,
    VERY_UNLIKELY: 1,
    UNLIKELY: 2,
    POSSIBLE: 3,
    LIKELY: 4,
    VERY_LIKELY: 5
}

@Injectable()
export class CVision {
    constructor(private http: Http, private config: Configuration) { }

    async request(base64image: string, features: FeaturesMap): Promise<CVResponse> {
        const url = `${urlGCV}?key=${(await this.config.server).googleBrowserKey}`;
        const request: CVRequest = {
            requests: [{
                image: { content: base64image },
                features: Object.keys(features).map((name) => {
                    return {
                        type: name as _Features,
                        maxResults: features[name] as number
                    }
                })
            }]
        };
        const res = await toPromise(this.http.post(url, JSON.stringify(request), {
            headers: new Headers({ 'Content-Type': 'application/json' })
        }).retry(3).delay(1000));
        return JSON.parse(res.text());
    }
}
