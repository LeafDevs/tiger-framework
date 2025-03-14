import { parentPort, workerData } from 'worker_threads';
import { compileTigerToHTML } from './compiler';

// Worker receives source code and compiles it
async function compileInWorker() {
  try {
    const { source, id } = workerData;
    const html = await compileTigerToHTML(source);
    
    // Send the compiled result back to the main thread
    parentPort?.postMessage({
      success: true,
      id,
      html
    });
  } catch (error) {
    // Send error back to main thread
    parentPort?.postMessage({
      success: false,
      id: workerData.id,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}

compileInWorker(); 