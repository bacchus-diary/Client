// https://cloud.google.com/vision/reference/rest/v1/images/annotate

export type FeatureType = "FACE_DETECTION" |
    "LANDMARK_DETECTION" |
    "LOGO_DETECTION" |
    "LABEL_DETECTION" |
    "TEXT_DETECTION" |
    "SAFE_SEARCH_DETECTION" |
    "IMAGE_PROPERTIES";

export type Feature = {
    type: FeatureType,
    maxResults: number
}

export type Request = {
    requests: AnnotateImageRequest[]
}

export type AnnotateImageRequest = {
    image: {
        content?: string, // BASE64
        source?: {
            gcs_image_uri: string
        }
    },
    features: Feature[],
    imageContext?: {
        latLongRect: {
            minLatLng: LatLng,
            maxLatLng: LatLng
        },
        languageHints: string[]
    }
}

export type Response = {
    responses: AnnotateImageResponse[]
}

export type AnnotateImageResponse = {
    faceAnnotations: FaceAnnotation[],
    landmarkAnnotations: EntityAnnotation[],
    logoAnnotations: EntityAnnotation[],
    labelAnnotations: EntityAnnotation[],
    textAnnotations: EntityAnnotation[],
    safeSearchAnnotation: SafeSearchAnnotation,
    imagePropertiesAnnotation: ImageProperties[],
    error: Status[]
}

export type LatLng = {
    latitude: number, // [-90.0, +90.0]
    longitude: number // [-180.0, +180.0]
}

export type Status = {
    code: number,
    message: string,
    details: any[]
}

export type FaceAnnotation = {
    boundingPoly: BoundingPoly,
    fdBoundingPoly: BoundingPoly,
    landmarks: Landmark[],
    rollAngle: number,
    panAngle: number,
    tiltAngle: number,
    detectionConfidence: number,
    landmarkingConfidence: number,
    joyLikelihood: Likelihood,
    sorrowLikelihood: Likelihood,
    angerLikelihood: Likelihood,
    surpriseLikelihood: Likelihood,
    underExposedLikelihood: Likelihood,
    blurredLikelihood: Likelihood,
    headwearLikelihood: Likelihood
}

export type EntityAnnotation = {
    mid: string,
    locale: string,
    description: string,
    score: number,
    confidence: number,
    topicality: number,
    boundingPoly: BoundingPoly,
    locations: LocationInfo[],
    properties: Property[],
}

export type BoundingPoly = {
    vertices: Vertix[]
}

export type Vertix = {
    x: number,
    y: number
}

export type LocationInfo = {
    latLng: LatLng
}

export type Property = {
    name: string,
    value: string
}

export type Landmark = {
    type: LandmarkType,
    position: {
        x: number,
        y: number,
        z: number
    }
}

export type ImageProperties = {
    dominantColors: {
        colors: ColorInfo[]
    }
}

export type ColorInfo = {
    color: {
        red: number, // [0, 1]
        green: number, // [0, 1]
        blue: number, // [0, 1]
        alpha: number // [0, 1]
    },
    score: number,
    pixelFraction: number
}

export type LandmarkType = "UNKNOWN_LANDMARK" |
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

export type SafeSearchAnnotation = {
    adult: Likelihood,
    spoof: Likelihood,
    medical: Likelihood,
    violence: Likelihood
}

export type Likelihood = "UNKNOWN" | "VERY_UNLIKELY" | "UNLIKELY" | "POSSIBLE" | "LIKELY" | "VERY_LIKELY";
