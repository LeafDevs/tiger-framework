import { Worker } from 'worker_threads';
import { cpus } from 'os';
import path from 'path';
import chalk from 'chalk';

interface CompilationTask {
  id: string;
  source: string;
  resolve: (value: string) => void;
  reject: (reason: any) => void;
}

export class ThreadPool {
  private workers: Worker[] = [];
  private taskQueue: CompilationTask[] = [];
  private busyWorkers: Set<Worker> = new Set();
  private taskMap: Map<string, CompilationTask> = new Map();
  private isShuttingDown = false;
  private activeCompilations = 0;
  private maxConcurrentTasks: number;

  constructor(
    private maxThreads = Math.max(Math.floor(cpus().length * 0.75), 1),
    private maxQueueSize = 100
  ) {
    // Limit concurrent tasks to prevent memory issues
    this.maxConcurrentTasks = maxThreads * 2;
    this.initializeWorkers();
  }

  private initializeWorkers() {
    for (let i = 0; i < this.maxThreads; i++) {
      this.createWorker();
    }
  }

  private createWorker(): Worker {
    const worker = new Worker(path.join(__dirname, 'worker.js'));
    
    worker.on('message', (result: { success: boolean; id: string; html?: string; error?: string }) => {
      this.activeCompilations--;
      const task = this.taskMap.get(result.id);
      if (task) {
        if (result.success && result.html) {
          task.resolve(result.html);
        } else {
          task.reject(result.error || 'Compilation failed');
        }
        this.taskMap.delete(result.id);
        this.busyWorkers.delete(worker);
        
        // Process next task after a small delay to prevent CPU spikes
        setTimeout(() => this.processNextTask(worker), 10);
      }
    });

    worker.on('error', (error) => {
      this.handleWorkerError(worker);
    });

    worker.on('exit', (code) => {
      if (code !== 0 && !this.isShuttingDown) {
        this.handleWorkerError(worker);
      }
    });

    this.workers.push(worker);
    return worker;
  }

  private async handleWorkerError(worker: Worker) {
    const index = this.workers.indexOf(worker);
    if (index !== -1) {
      this.workers.splice(index, 1);
      this.busyWorkers.delete(worker);
      
      // Gracefully terminate the worker
      try {
        await worker.terminate();
      } catch (error) {
        // Ignore termination errors
      }

      if (!this.isShuttingDown) {
        const newWorker = this.createWorker();
        if (this.taskQueue.length > 0) {
          setTimeout(() => this.processNextTask(newWorker), 100);
        }
      }
    }
  }

  private processNextTask(worker: Worker) {
    if (this.isShuttingDown) return;
    
    if (this.taskQueue.length > 0 && this.activeCompilations < this.maxConcurrentTasks) {
      const task = this.taskQueue.shift()!;
      this.busyWorkers.add(worker);
      this.activeCompilations++;
      worker.postMessage({ source: task.source, id: task.id });
    }
  }

  public async compile(source: string): Promise<string> {
    if (this.isShuttingDown) {
      throw new Error('ThreadPool is shutting down');
    }

    return new Promise((resolve, reject) => {
      const task: CompilationTask = {
        id: Math.random().toString(36).substring(7),
        source,
        resolve,
        reject
      };

      // Prevent queue from growing too large
      if (this.taskQueue.length >= this.maxQueueSize) {
        reject(new Error('Compilation queue is full. Try again later.'));
        return;
      }

      this.taskMap.set(task.id, task);
      const availableWorker = this.workers.find(w => !this.busyWorkers.has(w));
      
      if (availableWorker && this.activeCompilations < this.maxConcurrentTasks) {
        this.busyWorkers.add(availableWorker);
        this.activeCompilations++;
        availableWorker.postMessage({ source: task.source, id: task.id });
      } else {
        this.taskQueue.push(task);
      }
    });
  }

  public async compileMultiple(sources: string[]): Promise<string[]> {
    // Process in chunks to prevent memory issues
    const chunkSize = Math.max(Math.floor(this.maxConcurrentTasks / 2), 1);
    const results: string[] = [];
    
    for (let i = 0; i < sources.length; i += chunkSize) {
      const chunk = sources.slice(i, i + chunkSize);
      const chunkResults = await Promise.all(chunk.map(source => this.compile(source)));
      results.push(...chunkResults);
    }
    
    return results;
  }

  public async shutdown(): Promise<void> {
    this.isShuttingDown = true;
    
    // Wait for active compilations to finish
    while (this.activeCompilations > 0) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    // Terminate all workers
    await Promise.all(this.workers.map(async worker => {
      try {
        await worker.terminate();
      } catch (error) {
        // Ignore termination errors
      }
    }));
    
    this.workers = [];
    this.taskQueue = [];
    this.busyWorkers.clear();
    this.taskMap.clear();
    this.activeCompilations = 0;
  }
} 