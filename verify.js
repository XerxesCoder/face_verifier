// verify.js

const faceapi = require("face-api.js");
const canvas = require("canvas");
const fs = require("fs");
const path = require("path");

const { Canvas, Image, ImageData } = canvas;
faceapi.env.monkeyPatch({ Canvas, Image, ImageData });

const CONFIG = {
  distanceThreshold: 0.6,
  zoomOutFactor: 0.3,
  baseOutputDir: path.join(__dirname, "verification_reports"),
  faceQuality: 0.8,
};

async function loadModels() {
  const modelPath = path.join(__dirname, "models");
  await Promise.all([
    faceapi.nets.ssdMobilenetv1.loadFromDisk(modelPath),
    faceapi.nets.faceLandmark68Net.loadFromDisk(modelPath),
    faceapi.nets.faceRecognitionNet.loadFromDisk(modelPath),
  ]);
}

function createTimestampedDirectory() {
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const outputDir = path.join(CONFIG.baseOutputDir, timestamp);

  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  return outputDir;
}

function calculateZoomedOutBox(box, zoomFactor, imageWidth, imageHeight) {
  const { x, y, width, height } = box;
  const zoomOutX = width * zoomFactor;
  const zoomOutY = height * zoomFactor;

  const newX = Math.max(0, x - zoomOutX / 2);
  const newY = Math.max(0, y - zoomOutY / 2);
  const newWidth = Math.min(imageWidth - newX, width + zoomOutX);
  const newHeight = Math.min(imageHeight - newY, height + zoomOutY);

  return {
    x: Math.floor(newX),
    y: Math.floor(newY),
    width: Math.floor(newWidth),
    height: Math.floor(newHeight),
  };
}

async function extractAndSaveFace(image, detection, imageName, outputDir) {
  const imageWidth = image.width;
  const imageHeight = image.height;

  const zoomedBox = calculateZoomedOutBox(
    detection.detection.box,
    CONFIG.zoomOutFactor,
    imageWidth,
    imageHeight
  );

  const faceCanvas = canvas.createCanvas(zoomedBox.width, zoomedBox.height);
  const ctx = faceCanvas.getContext("2d");

  ctx.drawImage(
    image,
    zoomedBox.x,
    zoomedBox.y,
    zoomedBox.width,
    zoomedBox.height,
    0,
    0,
    zoomedBox.width,
    zoomedBox.height
  );

  const faceFilename = `face_${imageName}.jpg`;
  const facePath = path.join(outputDir, faceFilename);
  const buffer = faceCanvas.toBuffer("image/jpeg");
  fs.writeFileSync(facePath, buffer);

  return {
    filename: faceFilename,
    path: facePath,
    coordinates: zoomedBox,
    detectionScore: detection.detection.score,
  };
}

function generateVerificationReport(
  referenceData,
  queryData,
  faceDistance,
  isMatch,
  outputDir
) {
  const timestamp = new Date().toISOString();
  const reportId = `verify_${Date.now()}`;

  return {
    verificationId: reportId,
    timestamp: timestamp,
    result: {
      isMatch: isMatch,
      faceDistance: faceDistance,
      threshold: CONFIG.distanceThreshold,
      confidence: Math.max(0, 1 - faceDistance / CONFIG.distanceThreshold),
      status: isMatch ? "VERIFIED" : "REJECTED",
    },
    referenceImage: {
      filename: path.basename(referenceData.imagePath),
      faceDetected: referenceData.faceDetected,
      detectionScore: referenceData.detectionScore,
      faceFile: referenceData.faceFile,
      coordinates: referenceData.coordinates,
      imageDimensions: referenceData.imageDimensions,
    },
    queryImage: {
      filename: path.basename(queryData.imagePath),
      faceDetected: queryData.faceDetected,
      detectionScore: queryData.detectionScore,
      faceFile: queryData.faceFile,
      coordinates: queryData.coordinates,
      imageDimensions: queryData.imageDimensions,
    },
    outputDirectory: path.basename(outputDir),
  };
}

function saveVerificationReport(report, outputDir) {
  const reportPath = path.join(outputDir, `${report.verificationId}.json`);
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
  return reportPath;
}

async function drawFaceDetection(image, detection, outputPath) {
  const imgCanvas = canvas.createCanvas(image.width, image.height);
  const ctx = imgCanvas.getContext("2d");

  ctx.drawImage(image, 0, 0);

  const { x, y, width, height } = detection.detection.box;
  ctx.strokeStyle = "#00FF00";
  ctx.lineWidth = 3;
  ctx.strokeRect(x, y, width, height);

  if (detection.landmarks) {
    ctx.fillStyle = "#FF0000";
    detection.landmarks.positions.forEach((position) => {
      ctx.beginPath();
      ctx.arc(position.x, position.y, 2, 0, 2 * Math.PI);
      ctx.fill();
    });
  }

  ctx.fillStyle = "#00FF00";
  ctx.font = "16px Arial";
  ctx.fillText(`Score: ${detection.detection.score.toFixed(3)}`, x, y - 10);

  const buffer = imgCanvas.toBuffer("image/jpeg");
  fs.writeFileSync(outputPath, buffer);
}

async function runVerification(referenceImagePath, queryImagePath, outputDir) {
  if (!fs.existsSync(referenceImagePath)) {
    throw new Error(`Reference image not found: ${referenceImagePath}`);
  }
  if (!fs.existsSync(queryImagePath)) {
    throw new Error(`Query image not found: ${queryImagePath}`);
  }

  const referenceImage = await canvas.loadImage(referenceImagePath);
  const queryImage = await canvas.loadImage(queryImagePath);

  const referenceResult = await faceapi
    .detectSingleFace(referenceImage)
    .withFaceLandmarks()
    .withFaceDescriptor();

  const queryResult = await faceapi
    .detectSingleFace(queryImage)
    .withFaceLandmarks()
    .withFaceDescriptor();

  if (!referenceResult) {
    throw new Error("Could not detect a face in the reference image");
  }
  if (!queryResult) {
    throw new Error("Could not detect a face in the query image");
  }

  if (referenceResult.detection.score < CONFIG.faceQuality) {
    throw new Error(
      `Low detection score in reference image: ${referenceResult.detection.score}`
    );
  }
  if (queryResult.detection.score < CONFIG.faceQuality) {
    throw new Error(
      `Low detection score in query image: ${queryResult.detection.score}`
    );
  }

  const faceDistance = faceapi.euclideanDistance(
    referenceResult.descriptor,
    queryResult.descriptor
  );

  const isMatch = faceDistance < CONFIG.distanceThreshold;

  const referenceFaceData = await extractAndSaveFace(
    referenceImage,
    referenceResult,
    "reference",
    outputDir
  );

  const queryFaceData = await extractAndSaveFace(
    queryImage,
    queryResult,
    "query",
    outputDir
  );

  await drawFaceDetection(
    referenceImage,
    referenceResult,
    path.join(outputDir, "reference_detection.jpg")
  );

  await drawFaceDetection(
    queryImage,
    queryResult,
    path.join(outputDir, "query_detection.jpg")
  );

  const reportData = generateVerificationReport(
    {
      imagePath: referenceImagePath,
      faceDetected: true,
      detectionScore: referenceResult.detection.score,
      faceFile: referenceFaceData.filename,
      coordinates: referenceFaceData.coordinates,
      imageDimensions: {
        width: referenceImage.width,
        height: referenceImage.height,
      },
    },
    {
      imagePath: queryImagePath,
      faceDetected: true,
      detectionScore: queryResult.detection.score,
      faceFile: queryFaceData.filename,
      coordinates: queryFaceData.coordinates,
      imageDimensions: { width: queryImage.width, height: queryImage.height },
    },
    faceDistance,
    isMatch,
    outputDir
  );

  const reportPath = saveVerificationReport(reportData, outputDir);

  return {
    isMatch,
    faceDistance,
    confidence: reportData.result.confidence,
    referenceScore: referenceResult.detection.score,
    queryScore: queryResult.detection.score,
    reportPath,
    referenceFace: referenceFaceData.filename,
    queryFace: queryFaceData.filename,
    outputDir,
  };
}

async function main() {
  const args = process.argv.slice(2);

  if (args.length < 2) {
    console.error("Usage: node verify.js <reference_image> <query_image>");
    process.exit(1);
  }

  const referenceImagePath = path.join(__dirname, "images", args[0]);
  const queryImagePath = path.join(__dirname, "images", args[1]);

  try {
    const outputDir = createTimestampedDirectory();
    await loadModels();

    const startTime = Date.now();
    const result = await runVerification(
      referenceImagePath,
      queryImagePath,
      outputDir
    );
    const endTime = Date.now();

    console.log(`Face Distance: ${result.faceDistance.toFixed(4)}`);
    console.log(`Threshold: ${CONFIG.distanceThreshold}`);
    console.log(`Confidence: ${(result.confidence * 100).toFixed(1)}%`);
    console.log(
      `Detection Scores - Reference: ${result.referenceScore.toFixed(
        3
      )}, Query: ${result.queryScore.toFixed(3)}`
    );
    console.log(`Reference face: ${result.referenceFace}`);
    console.log(`Query face: ${result.queryFace}`);
    console.log(`Processing time: ${(endTime - startTime) / 1000} seconds`);
    console.log(`Output Directory: ${result.outputDir}`);
    console.log(`Report: ${result.reportPath}`);

    if (result.isMatch) {
      console.log("VERIFIED");
    } else {
      console.log("REJECTED");
    }
  } catch (error) {
    console.error(`Error: ${error.message}`);
    process.exit(1);
  }
}

main();
