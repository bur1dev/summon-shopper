<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import { scan, Format, checkPermissions, requestPermissions } from '@tauri-apps/plugin-barcode-scanner';

  export let isActive = false;
  export let targetUPCs: string[] = []; // UPCs from current order to match against

  const dispatch = createEventDispatcher();
  let scanning = false;
  let error = '';

  async function startScanning() {
    if (scanning) return;
    
    try {
      error = '';
      scanning = true;
      console.log('[TAURI SCANNER] Starting camera access...');
      
      // Check permissions first
      const permissionStatus = await checkPermissions();
      console.log('[TAURI SCANNER] Permission status:', permissionStatus);
      
      if (permissionStatus === 'denied') {
        // Request permissions
        const requestResult = await requestPermissions();
        console.log('[TAURI SCANNER] Permission request result:', requestResult);
        
        if (requestResult === 'denied') {
          error = 'Camera permission denied. Please allow camera access in your device settings.';
          scanning = false;
          return;
        }
      }
      
      // Start scanning with UPC formats
      console.log('[TAURI SCANNER] Starting scan with UPC formats...');
      const result = await scan({ 
        formats: [Format.UPC_A, Format.UPC_E, Format.EAN13, Format.EAN8] 
      });
      
      console.log('[TAURI SCANNER] Scan result:', result);
      
      if (result && result.content) {
        const scannedCode = result.content;
        console.log(`[TAURI SCANNER] Scanned UPC: ${scannedCode}`);
        handleScanResult(scannedCode);
      } else {
        error = 'No barcode detected. Please try again.';
      }
      
    } catch (e) {
      console.error('[TAURI SCANNER] Failed to scan:', e);
      
      if (e instanceof Error) {
        if (e.message.includes('permission')) {
          error = 'Camera permission denied. Please allow camera access in your device settings.';
        } else if (e.message.includes('cancel')) {
          error = ''; // User cancelled, not an error
        } else {
          error = e.message || 'Failed to scan barcode';
        }
      } else {
        error = 'Failed to scan barcode';
      }
    } finally {
      scanning = false;
    }
  }

  function handleScanResult(scannedCode: string) {
    console.log(`[TAURI SCANNER] Processing scanned UPC: ${scannedCode}`);
    console.log(`[TAURI SCANNER] Target UPCs (${targetUPCs.length}):`, targetUPCs);
    
    if (targetUPCs.length === 0) {
      console.log(`[TAURI SCANNER] ⚠️ No target UPCs to match against`);
      dispatch('scan-error', { 
        upc: scannedCode,
        message: `❌ No UPC data available for validation` 
      });
      return;
    }
    
    // Check if scanned UPC matches the target UPC
    const matchingProduct = targetUPCs.find(upc => upc === scannedCode);
    
    if (matchingProduct) {
      console.log(`[TAURI SCANNER] ✅ MATCH FOUND! UPC ${scannedCode} matches target`);
      dispatch('scan-success', { 
        upc: scannedCode,
        message: `✅ Item confirmed: ${scannedCode}` 
      });
    } else {
      console.log(`[TAURI SCANNER] ❌ NO MATCH. UPC ${scannedCode} does not match target UPCs: ${targetUPCs.join(', ')}`);
      dispatch('scan-error', { 
        upc: scannedCode,
        message: `❌ Wrong item scanned: ${scannedCode}` 
      });
    }
  }

  function closeScanner() {
    scanning = false;
    dispatch('close');
  }

  // Auto-start when isActive changes
  $: if (isActive && !scanning) {
    startScanning();
  }
</script>

<div class="scanner-container" class:active={isActive}>
  {#if isActive}
    <div class="scanner-wrapper">
      
      <!-- Scanner instructions -->
      <div class="scanner-overlay">
        <div class="scan-instructions">
          <h3>Scan Product Barcode</h3>
          <p>Camera will open automatically</p>
          <p class="target-count">{targetUPCs.length} items in this order</p>
          
          {#if scanning}
            <div class="scanning-indicator">
              <div class="spinner"></div>
              <p>Opening camera...</p>
            </div>
          {/if}
          
          <button class="close-btn" on:click={closeScanner} disabled={scanning}>
            {scanning ? 'Scanning...' : 'Cancel'}
          </button>
        </div>
      </div>

      <!-- Error display -->
      {#if error}
        <div class="error-message">
          <h4>Scanner Error</h4>
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
    background: rgba(0, 0, 0, 0.8);
  }

  .scan-instructions {
    text-align: center;
    color: white;
    max-width: 300px;
    padding: 2rem;
    background: rgba(255, 255, 255, 0.1);
    border-radius: 1rem;
    backdrop-filter: blur(10px);
  }

  .scan-instructions h3 {
    margin: 0 0 1rem 0;
    font-size: 1.5rem;
    color: #ff7300;
  }

  .scan-instructions p {
    margin: 0.5rem 0;
    font-size: 1rem;
    opacity: 0.9;
  }

  .target-count {
    color: #ff7300 !important;
    font-weight: bold;
    font-size: 0.9rem !important;
    margin: 1rem 0 !important;
  }

  .scanning-indicator {
    margin: 1.5rem 0;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 1rem;
  }

  .spinner {
    width: 40px;
    height: 40px;
    border: 4px solid rgba(255, 115, 0, 0.3);
    border-top: 4px solid #ff7300;
    border-radius: 50%;
    animation: spin 1s linear infinite;
  }

  @keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
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

  .close-btn:hover:not(:disabled) {
    background: rgba(255, 255, 255, 0.3);
  }

  .close-btn:disabled {
    opacity: 0.5;
    cursor: not-allowed;
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
    backdrop-filter: blur(10px);
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