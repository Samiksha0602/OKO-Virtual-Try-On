# OKO – Virtual Try-On Glasses System 👓

An Augmented Reality (AR) powered virtual glasses try-on platform that allows users to visualize 3D eyewear models on their faces in real time using webcam-based facial tracking.

## Overview

**OKO** is a virtual eyewear try-on application designed to enhance the online glasses shopping experience. It uses real-time face detection and 3D rendering to overlay virtual glasses onto a user's face, allowing them to preview different eyewear styles without physically wearing them.

The platform also provides a shopkeeper dashboard to manage eyewear collections, upload 3D models, and organize frame information.

## Key Features

- **Real-Time Virtual Try-On:** Visualize 3D glasses models on your face using a webcam.
- **Facial Landmark Detection:** Detect facial landmarks using MediaPipe Face Landmarker.
- **3D Glasses Rendering:** Load and render GLB/GLTF glasses models using Three.js.
- **Dynamic Face Anchoring:** Position, scale, and rotate glasses according to facial orientation and eye landmarks.
- **Smooth AR Tracking:** Apply interpolation and smoothing to reduce jitter during facial movement.
- **Interactive AR Controls:** Adjust glasses position and scale for better alignment.
- **Shopkeeper Authentication:** Secure registration and login functionality.
- **Frame Management:** Add, search, edit, and delete eyewear frames.
- **Multi-Asset Upload:** Upload front-view images, left and right temple images, and 3D models.
- **Frame Categorization:** Organize frames into single-color and multi-color categories.
- **User-Specific Storage:** Maintain separate frame collections and uploaded assets for each shopkeeper.

## Technology Stack

| Component | Technologies |
|---|---|
| Frontend | React.js 18, JavaScript |
| Backend | Python, Flask |
| AR & Face Tracking | MediaPipe Face Landmarker |
| 3D Rendering | Three.js, GLTFLoader |
| Webcam | React Webcam, Browser MediaDevices API |
| HTTP Communication | Axios |
| Database | SQLite |
| ORM | Flask-SQLAlchemy, SQLAlchemy |
| Image Processing Dependencies | OpenCV, NumPy |
| Styling | Bootstrap 5, CSS |
| File Handling | Werkzeug |

## How It Works

### 1. Real-Time Face Detection

The application accesses the user's webcam through the browser's MediaDevices API.

MediaPipe Face Landmarker detects facial landmarks in real time, including:
- Left and right outer eye landmarks.
- Nose bridge.
- Nose tip.
- Forehead landmarks.

These landmarks provide reference points for positioning virtual glasses.

### 2. Facial Landmark-Based Alignment

The application calculates:
- Face position using facial anchor points.
- Face orientation using vectors derived from eye and nose landmarks.
- Glasses rotation using a quaternion derived from a face rotation matrix.
- Glasses scale using the distance between eye landmarks.

Interpolation and quaternion spherical linear interpolation (SLERP) are applied to smooth the position, scale, and rotation of the 3D glasses model.

### 3. 3D Model Rendering

Three.js is used to render the glasses model in a transparent WebGL scene.

The application:
- Loads GLB/GLTF models using GLTFLoader.
- Calculates model dimensions using a bounding box.
- Normalizes the model scale.
- Adjusts its position and orientation based on facial landmarks.
- Renders the model over the live webcam feed.

### AR Processing Workflow

```text
       Webcam Input
             |
             v
    MediaPipe Face Landmarker
             |
             v
     Facial Landmark Detection
             |
             v
     Calculate Face Geometry
             |
       +-----+------+
       |            |
   Position      Rotation
       |            |
       +-----+------+
             |
       Scale Calculation
             |
             v
      Smooth Interpolation
             |
             v
      Three.js 3D Rendering
             |
             v
    Real-Time Virtual Try-On
```

## System Architecture

The application consists of two primary components.

**1. Frontend – React.js**

- Registration and login interfaces.
- Shopkeeper dashboard.
- Eyewear frame management.
- Webcam integration.
- Real-time face tracking.
- 3D glasses rendering.

**2. Backend – Flask**

- REST API development.
- Shopkeeper registration and authentication.
- Secret-key-based API authentication.
- Eyewear frame CRUD operations.
- Image and 3D model uploads.
- User-specific file storage.
- Database operations using Flask-SQLAlchemy.

## Project Structure

```text
OKO-Virtual-Try-On/
│
├── backend/
│   ├── app.py
│   ├── models.py
│   ├── requirements.txt
│   ├── Procfile
│   ├── railway.toml
│   ├── instance/
│   │   └── spectacles.db
│   └── uploads/
│
└── frontend/
    ├── public/
    ├── src/
    │   ├── components/
    │   │   ├── Dashboard.js
    │   │   ├── FaceAnchoringAR.js
    │   │   ├── Login.js
    │   │   └── Register.js
    │   ├── App.js
    │   ├── App.css
    │   └── index.js
    ├── package.json
    └── package-lock.json
```

## Installation and Setup

### Prerequisites

- Node.js and npm
- Python 3.9+
- Webcam-enabled device
- Modern browser with WebGL support

### 1. Clone the Repository

```bash
git clone <YOUR_REPOSITORY_URL>
cd OKO-Virtual-Try-On
```

### 2. Set Up the Backend

Navigate to the backend directory:

```bash
cd backend
```

Create and activate a virtual environment:

**macOS/Linux**

```bash
python3 -m venv venv
source venv/bin/activate
```

**Windows**

```bash
python -m venv venv
venv\Scripts\activate
```

Install dependencies:

```bash
pip install -r requirements.txt
```

Start the Flask server:

```bash
python app.py
```

The backend runs at:

```text
http://localhost:5000
```

The SQLite database is created automatically when the application starts.

### 3. Set Up the Frontend

Open another terminal:

```bash
cd frontend
```

Install dependencies:

```bash
npm install
```

Start the React development server:

```bash
npm start
```

The frontend runs at:

```text
http://localhost:3000
```

### 4. Start Using OKO

1. Open the application in your browser.
2. Register as a shopkeeper.
3. Log in using your credentials.
4. Add eyewear frames with their images and 3D models.
5. Select a frame to activate AR mode.
6. Allow webcam access.
7. View the glasses aligned with your face in real time.
8. Adjust positioning and scale using the available controls.

## Backend API Endpoints

| Method | Endpoint | Description |
|---|---|---|
| POST | `/register` | Register a shopkeeper |
| POST | `/login` | Authenticate a shopkeeper |
| POST | `/frames` | Add a new eyewear frame |
| GET | `/frames` | Retrieve and search frames |
| PUT | `/frames/<frame_id>` | Update frame details |
| DELETE | `/frames/<frame_id>` | Delete an eyewear frame |
| GET | `/uploads/<username>/<filename>` | Retrieve uploaded assets |

Authenticated frame-management endpoints use the `Secret-Key` request header.

## Future Enhancements

- Integration of more eyewear styles and frame collections.
- Improved 3D model alignment and depth estimation.
- Face measurements for personalized frame recommendations.
- Advanced lighting and rendering for realistic eyewear visualization.
- Virtual frame comparison functionality.
- Enhanced mobile responsiveness.
- Cloud-based storage for 3D assets and images.

## Security Notes

- Passwords are stored using Werkzeug password hashing.
- API requests for frame management require a shopkeeper-specific secret key.
- Uploaded filenames are sanitized using Werkzeug's `secure_filename`.
- Uploaded assets are organized into user-specific directories.
- Credentials and sensitive configuration should not be committed to the repository.

## Acknowledgements

Developed as a collaborative project exploring Augmented Reality, computer vision, real-time facial tracking, and interactive 3D visualization for virtual eyewear try-on experiences.
