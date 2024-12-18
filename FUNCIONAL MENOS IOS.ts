<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">


    <script src="https://aframe.io/releases/1.5.0/aframe.min.js"></script>
    <script src="https://cdn.jsdelivr.net/npm/mind-ar@1.2.5/dist/mindar-image-aframe.prod.js"></script>
    
    <script src="https://cdn.jsdelivr.net/npm/@mediapipe/control_utils"></script>
    <script src="https://cdn.jsdelivr.net/npm/@mediapipe/drawing_utils"></script>
    <script src="https://cdn.jsdelivr.net/npm/@mediapipe/selfie_segmentation"></script>
    <title>Background Replacement</title>
    <style>
        body {
            margin: 0;
            padding: 0;
        }
        .container {
            width: 100vw;
            height: 100vh;
            display: flex;
            justify-content: center;
            align-items: center;
            position: fixed;
            top: 0;
            left: 0;
        }
        .output_canvas {
            width: 100vw;
            height: 100vh;
            position: fixed;
            top: 0;
            left: 0;
            z-index: 1;
        }
        .input_video {
            display: none;
        }
        a-scene {
            position: fixed;
            width: 100vw;
            height: 100vh;
            z-index: 2;
        }
        #status {
            position: fixed;
            top: 20px;
            left: 50%;
            transform: translateX(-50%);
            background-color: rgba(0, 0, 0, 0.7);
            color: white;
            padding: 10px 20px;
            border-radius: 5px;
            z-index: 9999;
            font-size: 18px;
            font-family: Arial, sans-serif;
        }

        #arjs-video {
    position: fixed !important;
    top: 0;
    left: 0;
    flex: 1;
    z-index: -2;
    visibility: hidden;
}

.a-canvas {
    position: fixed !important;
    z-index: 1000;
}

.container {
    width: 100%;
    height: 100%;
    position: fixed;
    top: 0;
    left: 0;
    z-index: 1000; /* Ensure container is above AR elements */
}


    </style>



</head>
<body>
    <div class="container">
    

        <a-scene mindar-image="imageTargetSrc: https://mpalenque.github.io/shirt/assets/targets.mind; 
        filterMinCF: 0.9; 
        filterBeta: 0.0001; 
        warmupTolerance: 30; 
        missTolerance: 20; 
        trackingIntervalMilliseconds: 30;"
        color-space="sRGB" 
        renderer="colorManagement: true, physicallyCorrectLights" 
        vr-mode-ui="enabled: false" 
        device-orientation-permission-ui="enabled: false">

        <video class="input_video" playsinline></video>
        <canvas class="output_canvas"></canvas>

            <a-assets>
              <img id="card" src="/assets/yokkao.png" />
              <a-asset-item id="astro" src="https://mpalenque.github.io/shirt/assets/astro.glb"></a-asset-item>
            </a-assets>
      
            <a-camera position="0 0 0" look-controls="enabled: false"></a-camera>
      
            <a-entity mindar-image-target="targetIndex: 0">
              
           
              <a-gltf-model src="#astro" position="0.2 0 0.1" scale="0.4 0.4 0.4"
              animation="property: rotation; to: 0 360 0; loop: true; dur: 10000; easing: linear"
              animation__float="property: position; to: 0.2 0.2 0.1; dir: alternate; dur: 3000; loop: true; easing: easeInOutSine">
          </a-gltf-model>
            </a-entity>
      
            <!-- Adding lights -->
            <a-light type="ambient" color="#ffffff"></a-light>
            <a-light type="directional" color="#ffffff" intensity="0.5" position="1 1 0"></a-light>
          </a-scene>
    </div>

    <div id="status">Detection: not</div>



    
    <script>
        const videoElement = document.querySelector('.input_video');
        const canvasElement = document.querySelector('.output_canvas');
        const canvasCtx = canvasElement.getContext('2d');
        const statusElement = document.getElementById('status');
    
        let isDetected = true;
    
        // Create and load background video
        const bgVideo = document.createElement('video');
        bgVideo.src = 'https://mpalenque.github.io/shirt/assets/bg.mp4';
        bgVideo.loop = true;
        bgVideo.muted = true;
        bgVideo.play();
        
        // Set canvas size based on device
        function setCanvasSize() {
            const width = Math.min(window.innerWidth, 640);
            const height = (width * 4) / 3;
            canvasElement.width = width;
            canvasElement.height = height;
        }
        setCanvasSize();
        window.addEventListener('resize', setCanvasSize);
    
        function onResults(results) {
            canvasCtx.save();
            canvasCtx.clearRect(0, 0, canvasElement.width, canvasElement.height);
            
            if (isDetected) {
                // Draw the background video when marker is detected
                canvasCtx.drawImage(bgVideo, 0, 0, canvasElement.width, canvasElement.height);
            } else {
                // Draw the original video frame when marker is not detected
                canvasCtx.drawImage(results.image, 0, 0, canvasElement.width, canvasElement.height);
            }
            
            // Draw the segmentation mask
            if (results.segmentationMask) {
                // Create a temporary canvas for the person
                const tempCanvas = document.createElement('canvas');
                tempCanvas.width = canvasElement.width;
                tempCanvas.height = canvasElement.height;
                const tempCtx = tempCanvas.getContext('2d');
                
                // Draw the original video frame
                tempCtx.drawImage(results.image, 0, 0, canvasElement.width, canvasElement.height);
                
                // Apply the segmentation mask
                tempCtx.globalCompositeOperation = 'destination-in';
                tempCtx.drawImage(results.segmentationMask, 0, 0, canvasElement.width, canvasElement.height);
                
                // Draw the masked person over the background
                canvasCtx.drawImage(tempCanvas, 0, 0);
            }
            
            canvasCtx.restore();
        }

        const selfieSegmentation = new SelfieSegmentation({
            locateFile: (file) => {
                return `https://cdn.jsdelivr.net/npm/@mediapipe/selfie_segmentation/${file}`;
            }
        });
        
        selfieSegmentation.setOptions({
            modelSelection: 1,
        });

        selfieSegmentation.onResults(onResults);

        // iOS optimized video constraints
        const constraints = {
            video: {
                width: { ideal: 640 },
                height: { ideal: 480 },
                facingMode: 'user',
            }
        };

        // Start webcam with error handling
        async function startCamera() {
            try {
                const stream = await navigator.mediaDevices.getUserMedia(constraints);
                videoElement.srcObject = stream;
                await videoElement.play();

                const processFrame = async () => {
                    try {
                        await selfieSegmentation.send({ image: videoElement });
                    } catch (error) {
                        console.error('Frame processing error:', error);
                    }
                    requestAnimationFrame(processFrame);
                };
                
                requestAnimationFrame(processFrame);
            } catch (error) {
                console.error('Camera access error:', error);
                alert('Could not access camera. Please ensure camera permissions are granted.');
            }
        }

        // Add playsinline attribute dynamically for iOS
        videoElement.setAttribute('playsinline', true);
        videoElement.setAttribute('webkit-playsinline', true);

        // Start camera when page is fully loaded
        document.addEventListener('DOMContentLoaded', startCamera);

        // Update status based on image target detection
        const scene = document.querySelector('a-scene');
        scene.addEventListener('targetFound', () => {
            statusElement.textContent = 'Detection: Detected';
            isDetected = true;
        });
        scene.addEventListener('targetLost', () => {
            statusElement.textContent = 'Detection: Not detected';
            isDetected = false;
        });





        
        
    </script>
</body>
</html>