<script lang="ts">
  import { onMount, onDestroy, createEventDispatcher } from 'svelte';
  import { BrowserMultiFormatReader, NotFoundException } from '@zxing/library';

  export let isActive = false;
  export let targetUPCs: string[] = []; // UPCs from current order to match against

  const dispatch = createEventDispatcher();
  let videoElement: HTMLVideoElement;
  let codeReader: BrowserMultiFormatReader;
  let scanning = false;
  let error = '';
  let lastScannedCode = '';
  let scanCooldown = false;

  onMount(() => {
    codeReader = new BrowserMultiFormatReader();
    console.log('[SCANNER] BarcodeScanner component mounted');
  });

  onDestroy(() => {
    stopScanning();
    console.log('[SCANNER] BarcodeScanner component destroyed');
  });

  async function startScanning() {
    if (scanning) return;
    
    try {
      error = '';
      scanning = true;
      console.log('[SCANNER] Starting camera access...');
      
      // Check if mediaDevices is available
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Camera access not supported in this environment');
      }
      
      // First, request camera permission explicitly
      console.log('[SCANNER] Requesting camera permission...');
      const constraints = {
        video: {
          facingMode: 'environment', // Try to use back camera first
          width: { min: 480, ideal: 720, max: 1920 },
          height: { min: 320, ideal: 480, max: 1080 }
        }
      };
      
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      
      // Stop the stream immediately - we just needed permission
      stream.getTracks().forEach(track => track.stop());
      console.log('[SCANNER] Camera permission granted');
      
      // Now get camera devices (should work after permission is granted)
      const videoInputDevices = await codeReader.listVideoInputDevices();
      console.log(`[SCANNER] Found ${videoInputDevices.length} camera devices`);
      
      if (videoInputDevices.length === 0) {
        // Try fallback approach - use default camera
        console.log('[SCANNER] No specific devices found, trying default camera...');
        
        codeReader.decodeFromVideoDevice(null, videoElement, (result, err) => {
          if (result && !scanCooldown) {
            const scannedCode = result.getText();
            console.log(`[SCANNER] Scanned code: ${scannedCode}`);
            
            // Prevent rapid duplicate scans
            if (scannedCode !== lastScannedCode) {
              lastScannedCode = scannedCode;
              handleScanResult(scannedCode);
              
              // Set cooldown to prevent rapid scanning
              scanCooldown = true;
              setTimeout(() => {
                scanCooldown = false;
              }, 2000);
            }
          }
          
          if (err && !(err instanceof NotFoundException)) {
            console.error('[SCANNER] Scanner error:', err);
          }
        });
        
        console.log('[SCANNER] Default camera started successfully');
        return;
      }

      // Use first available camera (usually back camera on mobile)
      const selectedDeviceId = videoInputDevices[0].deviceId;
      console.log(`[SCANNER] Using camera: ${videoInputDevices[0].label || selectedDeviceId}`);
      
      // Start decoding from video stream
      codeReader.decodeFromVideoDevice(selectedDeviceId, videoElement, (result, err) => {
        if (result && !scanCooldown) {
          const scannedCode = result.getText();
          console.log(`[SCANNER] Scanned code: ${scannedCode}`);
          
          // Prevent rapid duplicate scans
          if (scannedCode !== lastScannedCode) {
            lastScannedCode = scannedCode;
            handleScanResult(scannedCode);
            
            // Set cooldown to prevent rapid scanning
            scanCooldown = true;
            setTimeout(() => {
              scanCooldown = false;
            }, 2000);
          }
        }
        
        if (err && !(err instanceof NotFoundException)) {
          console.error('[SCANNER] Scanner error:', err);
        }
      });

      console.log('[SCANNER] Camera started successfully');

    } catch (e) {
      console.error('[SCANNER] Failed to start camera:', e);
      
      if (e instanceof Error) {
        if (e.name === 'NotAllowedError') {
          error = 'Camera permission denied. Please allow camera access in your device settings and try again.';
        } else if (e.name === 'NotFoundError') {
          error = 'No camera found. Please ensure your device has a camera.';
        } else if (e.name === 'NotReadableError') {
          error = 'Camera is already in use by another application.';
        } else if (e.name === 'OverconstrainedError') {
          error = 'Camera constraints not supported. Trying fallback...';
          // Try with basic constraints
          setTimeout(() => startScanningWithBasicConstraints(), 1000);
          return;
        } else {
          error = e.message || 'Failed to access camera';
        }
      } else {
        error = 'Failed to access camera';
      }
      
      scanning = false;
    }
  }

  async function startScanningWithBasicConstraints() {
    try {
      error = '';
      console.log('[SCANNER] Trying basic camera constraints...');
      
      // Use very basic constraints as fallback
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: true 
      });
      
      stream.getTracks().forEach(track => track.stop());
      console.log('[SCANNER] Basic camera permission granted');
      
      // Try to start with basic camera
      codeReader.decodeFromVideoDevice(null, videoElement, (result, err) => {
        if (result && !scanCooldown) {
          const scannedCode = result.getText();
          console.log(`[SCANNER] Scanned code: ${scannedCode}`);
          
          if (scannedCode !== lastScannedCode) {
            lastScannedCode = scannedCode;
            handleScanResult(scannedCode);
            
            scanCooldown = true;
            setTimeout(() => {
              scanCooldown = false;
            }, 2000);
          }
        }
        
        if (err && !(err instanceof NotFoundException)) {
          console.error('[SCANNER] Scanner error:', err);
        }
      });
      
      console.log('[SCANNER] Basic camera started successfully');
      
    } catch (e) {
      console.error('[SCANNER] Basic camera also failed:', e);
      error = 'Camera access failed. Please check your device permissions.';
      scanning = false;
    }
  }

  function handleScanResult(scannedCode: string) {
    console.log(`[SCANNER] Processing scanned UPC: ${scannedCode}`);
    console.log(`[SCANNER] Target UPCs (${targetUPCs.length}):`, targetUPCs);
    
    if (targetUPCs.length === 0) {
      console.log(`[SCANNER] ⚠️ No target UPCs to match against`);
      dispatch('scan-error', { 
        upc: scannedCode,
        message: `❌ No UPC data available for validation` 
      });
      return;
    }
    
    // Check if scanned UPC matches the target UPC
    const matchingProduct = targetUPCs.find(upc => upc === scannedCode);
    
    if (matchingProduct) {
      console.log(`[SCANNER] ✅ MATCH FOUND! UPC ${scannedCode} matches target`);
      dispatch('scan-success', { 
        upc: scannedCode,
        message: `✅ Item confirmed: ${scannedCode}` 
      });
    } else {
      console.log(`[SCANNER] ❌ NO MATCH. UPC ${scannedCode} does not match target UPCs: ${targetUPCs.join(', ')}`);
      dispatch('scan-error', { 
        upc: scannedCode,
        message: `❌ Wrong item scanned: ${scannedCode}` 
      });
    }
  }

  function stopScanning() {
    if (codeReader) {
      codeReader.reset();
    }
    scanning = false;
    lastScannedCode = '';
    scanCooldown = false;
    console.log('[SCANNER] Camera stopped');
  }

  function closeScanner() {
    stopScanning();
    dispatch('close');
  }

  // Auto-start/stop when isActive changes
  $: if (isActive && !scanning) {
    startScanning();
  } else if (!isActive && scanning) {
    stopScanning();
  }
</script>

<div class="scanner-container" class:active={isActive}>
  {#if isActive}
    <div class="scanner-wrapper">
      <!-- Video stream -->
      <video 
        bind:this={videoElement}
        class="scanner-video"
        autoplay
        muted
        playsinline
      />
      
      <!-- Scanner overlay with viewfinder -->
      <div class="scanner-overlay">
        <div class="scan-area">
          <div class="scan-corners">
            <div class="corner top-left"></div>
            <div class="corner top-right"></div>
            <div class="corner bottom-left"></div>
            <div class="corner bottom-right"></div>
          </div>
          <div class="scan-line"></div>
        </div>
        
        <div class="scan-instructions">
          <h3>Scan Product Barcode</h3>
          <p>Position barcode within the orange frame</p>
          <p class="target-count">{targetUPCs.length} items in this order</p>
          
          <button class="close-btn" on:click={closeScanner}>
            Cancel
          </button>
        </div>
      </div>

      <!-- Error display -->
      {#if error}
        <div class="error-message">
          <h4>Camera Error</h4>
          <p>{error}</p>
          <button on:click={closeScanner}>Close</button>
        </div>
      {/if}
    </div>
  {/if}
</div>

<style>
  .scanner-container {
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: #000;
    z-index: 10000;
    display: none;
  }

  .scanner-container.active {
    display: block;
  }

  .scanner-wrapper {
    position: relative;
    width: 100%;
    height: 100%;
  }

  .scanner-video {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }

  .scanner-overlay {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    background: rgba(0, 0, 0, 0.4);
  }

  .scan-area {
    width: 300px;
    height: 200px;
    position: relative;
    border: 2px solid rgba(255, 255, 255, 0.3);
    background: rgba(0, 0, 0, 0.1);
    margin-bottom: 2rem;
  }

  .scan-corners {
    position: absolute;
    top: -2px;
    left: -2px;
    right: -2px;
    bottom: -2px;
  }

  .corner {
    position: absolute;
    width: 30px;
    height: 30px;
    border: 4px solid #ff7300;
  }

  .corner.top-left {
    top: 0;
    left: 0;
    border-right: none;
    border-bottom: none;
  }

  .corner.top-right {
    top: 0;
    right: 0;
    border-left: none;
    border-bottom: none;
  }

  .corner.bottom-left {
    bottom: 0;
    left: 0;
    border-right: none;
    border-top: none;
  }

  .corner.bottom-right {
    bottom: 0;
    right: 0;
    border-left: none;
    border-top: none;
  }

  .scan-line {
    position: absolute;
    top: 50%;
    left: 10%;
    right: 10%;
    height: 2px;
    background: linear-gradient(90deg, transparent, #ff7300, transparent);
    animation: scan-sweep 2s ease-in-out infinite;
  }

  @keyframes scan-sweep {
    0%, 100% { opacity: 0.3; transform: translateY(-20px); }
    50% { opacity: 1; transform: translateY(20px); }
  }

  .scan-instructions {
    text-align: center;
    color: white;
    max-width: 300px;
  }

  .scan-instructions h3 {
    margin: 0 0 0.5rem 0;
    font-size: 1.2rem;
    color: #ff7300;
  }

  .scan-instructions p {
    margin: 0.25rem 0;
    font-size: 0.9rem;
    opacity: 0.9;
  }

  .target-count {
    color: #ff7300 !important;
    font-weight: bold;
    font-size: 0.8rem !important;
  }

  .close-btn {
    margin-top: 1.5rem;
    background: rgba(255, 255, 255, 0.2);
    color: white;
    border: 1px solid rgba(255, 255, 255, 0.3);
    padding: 0.75rem 1.5rem;
    border-radius: 0.5rem;
    cursor: pointer;
    font-size: 1rem;
    transition: background-color 0.2s;
  }

  .close-btn:hover {
    background: rgba(255, 255, 255, 0.3);
  }

  .error-message {
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    background: rgba(220, 53, 69, 0.95);
    color: white;
    padding: 2rem;
    border-radius: 0.5rem;
    text-align: center;
    max-width: 300px;
  }

  .error-message h4 {
    margin: 0 0 1rem 0;
    color: white;
  }

  .error-message p {
    margin: 0 0 1rem 0;
    opacity: 0.9;
  }

  .error-message button {
    background: white;
    color: #dc3545;
    border: none;
    padding: 0.5rem 1rem;
    border-radius: 0.25rem;
    cursor: pointer;
    font-weight: bold;
  }
</style>