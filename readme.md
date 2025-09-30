# Face Verification System

A Node.js-based face verification system that compares two facial images and determines if they belong to the same person. Designed for identity verification applications like national ID card validation.

## Features

- **Face Detection**: Automatic face detection using SSD MobilenetV1
- **Face Comparison**: Euclidean distance-based face matching
- **Face Extraction**: Automatic cropping and saving of detected faces
- **Visualization**: Generated images with detection boxes and landmarks
- **Detailed Reporting**: JSON reports with verification results and metadata
- **Configurable Thresholds**: Adjustable similarity thresholds and quality checks

## Installation

1. **Clone or download the project files**

2. **Install dependencies**:

```
npm install
```

## Project Structure

```
project/
├── verify.js                 # Main verification script
├── models/                  # face-api.js model files
├── images/                  # Input images directory
│   ├── 0.jpg               # Reference image
│   └── 1.jpg               # Query image
└── verification_results/    # Auto-generated output directory
    ├── verify_*.json       # Verification reports
    ├── face_reference.jpg  # Extracted reference face
    ├── face_query.jpg      # Extracted query face
    ├── reference_detection.jpg # Reference with detection overlay
    └── query_detection.jpg     # Query with detection overlay
```

## Usage

### Basic Verification

```
node verify.js reference_image query_image
```

**Examples:**

```bash
node verify.js 0.jpg 1.png
node verify.js id_card_face.jpg selfie.jpg
node verify.js person_a.png person_b.jpg
```

## How It Works

1. **Input**: Two images (reference and query) placed in the `images/` directory
2. **Processing**:
   - Loads face detection models
   - Detects faces in both images
   - Extracts facial features and computes face descriptors
   - Calculates similarity distance between faces
3. **Output**:
   - Verification result (VERIFIED/REJECTED)
   - Similarity score and confidence percentage
   - Extracted face images
   - Detailed JSON report

### Output Explanation

**Console Output:**

```
Face Distance: 0.4231
Threshold: 0.6
Confidence: 29.5%
Detection Scores - Reference: 0.956, Query: 0.923
Reference face: face_reference.jpg
Query face: face_query.jpg
Processing time: 1.234 seconds
Report: verification_results/verify_1705311845123.json
VERIFIED
```

**Key Metrics:**

- **Face Distance**: Lower values indicate higher similarity (0 = identical)
- **Threshold**: Maximum distance for considering a match (configurable)
- **Confidence**: Match confidence from 0-100%
- **Detection Scores**: Face detection quality (0-1, higher is better)

## Configuration

Edit the `CONFIG` object in `verify.js` to adjust:

```javascript
const CONFIG = {
  distanceThreshold: 0.6, // Similarity threshold (0.4-0.6 recommended)
  zoomOutFactor: 0.3, // Face crop expansion margin
  outputDir: "verification_results", // Output directory
  faceQuality: 0.8, // Minimum face detection quality
};
```

### Threshold Guidelines

- **0.4**: Strict matching (low false positives, high false negatives)
- **0.5**: Balanced (recommended for most applications)
- **0.6**: Lenient matching (high false positives, low false negatives)

## JSON Report Format

Each verification generates a detailed JSON report:

```json
{
  "verificationId": "verify_1705311845123",
  "timestamp": "2024-01-15T10:30:45.123Z",
  "result": {
    "isMatch": true,
    "faceDistance": 0.4231,
    "threshold": 0.6,
    "confidence": 0.295,
    "status": "VERIFIED"
  },
  "referenceImage": {
    "filename": "0.jpg",
    "faceDetected": true,
    "detectionScore": 0.956,
    "faceFile": "face_reference.jpg",
    "coordinates": { "x": 100, "y": 150, "width": 200, "height": 200 },
    "imageDimensions": { "width": 800, "height": 600 }
  },
  "queryImage": {
    "filename": "1.jpg",
    "faceDetected": true,
    "detectionScore": 0.923,
    "faceFile": "face_query.jpg",
    "coordinates": { "x": 120, "y": 140, "width": 190, "height": 190 },
    "imageDimensions": { "width": 800, "height": 600 }
  }
}
```

## Error Handling

The system provides clear error messages for common issues:

- `Reference image not found: images/0.jpg` - Missing input file
- `Could not detect a face in the reference image` - No face detected
- `Low detection score in reference image: 0.65` - Poor quality face detection
- Model loading failures - Check model files in `models/` directory

## Requirements

- Node.js 14 or higher
- Supported image formats: JPEG, PNG, BMP
- Minimum face size: ~100x100 pixels for reliable detection
- Well-lit, front-facing images recommended

## Use Cases

- **Identity Verification**: Compare ID card photos with live selfies
- **Access Control**: Facial recognition for secure areas
- **Document Validation**: Verify consistency across identity documents
- **User Authentication**: Replace passwords with facial recognition

## Limitations

- Requires clear, front-facing facial images
- Performance depends on image quality and lighting
- Not designed for profile views or extreme angles
- Single face per image (multiple faces will use the first detection)

## Troubleshooting

1. **No faces detected**: Ensure images contain clear, front-facing faces
2. **Poor accuracy**: Adjust `distanceThreshold` in configuration
3. **Model loading errors**: Verify all model files are in `models/` directory
4. **Memory issues**: Reduce image sizes for better performance

## Contact

- **E-mail**: [xerxescode@gmail.com](mailto:xerxescode@gmail.com)
- **Telegram**: [t.me/xerxescoder](https://t.me/xerxescoder)

## License

This project is for educational and development purposes. Ensure compliance with local privacy regulations when deploying for production use.
